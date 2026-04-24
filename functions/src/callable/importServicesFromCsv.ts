import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore.js';
import { requirePermission } from '../guards/require-permission.js';

const db = admin.firestore();
const SERVICES_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES;
const HISTORY_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY;
const HISTORY_META_COLLECTION = FIRESTORE_COLLECTIONS.SERVICES_HISTORY_META;
const HISTORY_META_DOC = 'current';
const BATCH_LIMIT = 400;

interface ImportServicesFromCsvRequest {
  csvContent?: string;
  fileName?: string;
}

type CsvRecord = Record<string, string>;

const parseCsvRows = (csvContent: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index];

    if (character === '"') {
      const nextCharacter = csvContent[index + 1];
      if (inQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && csvContent[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += character;
  }

  currentRow.push(currentField);
  rows.push(currentRow);

  return rows.filter((row) => row.some((value) => value.trim() !== ''));
};

const parseCsvRecords = (csvContent: string): CsvRecord[] => {
  const rows = parseCsvRows(csvContent);

  if (rows.length === 0) {
    throw new HttpsError('invalid-argument', 'CSV file is empty.');
  }

  const headers = rows[0].map((header, index) => {
    const normalized = header.trim();
    if (index === 0) {
      return normalized.replace(/^\uFEFF/, '');
    }

    return normalized;
  });

  if (!headers.some((header) => header.length > 0)) {
    throw new HttpsError('invalid-argument', 'CSV header row is invalid.');
  }

  const records: CsvRecord[] = [];

  rows.slice(1).forEach((row) => {
    const record: CsvRecord = {};

    headers.forEach((header, headerIndex) => {
      if (!header) return;
      record[header] = (row[headerIndex] ?? '').trim();
    });

    const hasData = Object.values(record).some((value) => value !== '');
    if (hasData) {
      records.push(record);
    }
  });

  return records;
};

const validateUniqueIds = (records: CsvRecord[]) => {
  const seenIds = new Set<string>();

  records.forEach((record) => {
    const id = (record.ID_CONFIG_PARAMETRO ?? '').trim();
    if (!id) return;

    if (id.includes('/')) {
      throw new HttpsError(
        'invalid-argument',
        `ID_CONFIG_PARAMETRO contains invalid character '/': ${id}`
      );
    }

    if (seenIds.has(id)) {
      throw new HttpsError(
        'invalid-argument',
        `Duplicated ID_CONFIG_PARAMETRO in CSV: ${id}`
      );
    }

    seenIds.add(id);
  });
};

const deleteExistingDocuments = async (
  docRefs: FirebaseFirestore.DocumentReference[]
) => {
  let batch = db.batch();
  let operationCount = 0;

  for (const docRef of docRefs) {
    batch.delete(docRef);
    operationCount += 1;

    if (operationCount === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};

const createHistorySnapshot = async (
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
  fileName: string | null
): Promise<string> => {
  const snapshotId = `${Date.now()}`;
  const historyDocRef = db.collection(HISTORY_COLLECTION).doc(snapshotId);
  const historyServicesRef = historyDocRef.collection('services');

  let batch = db.batch();
  let operationCount = 0;

  for (const doc of docs) {
    batch.set(historyServicesRef.doc(doc.id), doc.data());
    operationCount += 1;

    if (operationCount === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  await historyDocRef.set({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    fileName,
    serviceCount: docs.length,
  });

  await db
    .collection(HISTORY_META_COLLECTION)
    .doc(HISTORY_META_DOC)
    .set({ currentHistoryId: snapshotId }, { merge: true });

  return snapshotId;
};

const writeRecords = async (
  collectionRef: FirebaseFirestore.CollectionReference,
  records: CsvRecord[]
) => {
  let batch = db.batch();
  let operationCount = 0;

  for (const record of records) {
    const id = (record.ID_CONFIG_PARAMETRO ?? '').trim();
    const docRef = id ? collectionRef.doc(id) : collectionRef.doc();
    const persistedRecord: CsvRecord = {
      ...record,
      ID_CONFIG_PARAMETRO: id || docRef.id,
    };

    batch.set(docRef, persistedRecord);
    operationCount += 1;

    if (operationCount === BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
};

export const importServicesFromCsv = onCall(async (req) => {
  await requirePermission(req, 'services_catalog.import');

  const data = (req.data || {}) as ImportServicesFromCsvRequest;
  const csvContent =
    typeof data.csvContent === 'string' ? data.csvContent.trim() : '';

  if (!csvContent) {
    throw new HttpsError('invalid-argument', 'csvContent is required.');
  }

  const records = parseCsvRecords(csvContent);
  validateUniqueIds(records);

  const servicesRef = db.collection(SERVICES_COLLECTION);
  const existingSnapshot = await servicesRef.get();

  // Save existing state as history before replacement
  const existingDocs = existingSnapshot.docs;
  const fileName =
    typeof data.fileName === 'string' && data.fileName.trim()
      ? data.fileName.trim()
      : null;

  await createHistorySnapshot(existingDocs, fileName);

  // Delete current services
  const existingDocRefs = existingDocs.map((doc) => doc.ref);
  await deleteExistingDocuments(existingDocRefs);

  // Write new services from CSV
  await writeRecords(servicesRef, records);

  return {
    importedCount: records.length,
    deletedCount: existingDocRefs.length,
    fileName,
  };
});
