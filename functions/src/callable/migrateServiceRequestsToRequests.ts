import { HttpsError, onCall } from 'firebase-functions/v2/https';
import admin from 'firebase-admin';

const db = admin.firestore();

type LooseRecord = Record<string, unknown>;

const toServiceItemFromUnknown = (
  item: unknown,
  index: number
): LooseRecord | null => {
  if (!item || typeof item !== 'object') return null;
  const row = item as LooseRecord;

  const serviceId = String(
    row.serviceId ?? row.parameterId ?? row.id ?? `service-${index}`
  );
  const parameterId = String(row.parameterId ?? row.serviceId ?? serviceId);
  const parameterLabel = String(
    row.parameterLabel ?? row.parameterLabelEs ?? row.parameterId ?? serviceId
  );
  const quantity = Math.max(1, Number(row.quantity ?? 1));
  const unitPriceRaw = Number(row.unitPrice ?? 0);
  const discountRaw = Number(row.discountAmount ?? 0);

  return {
    serviceId,
    parameterId,
    parameterLabel,
    tableLabel: typeof row.tableLabel === 'string' ? row.tableLabel : null,
    unit: typeof row.unit === 'string' ? row.unit : null,
    method: typeof row.method === 'string' ? row.method : null,
    rangeMin: String(row.rangeMin ?? ''),
    rangeMax: String(row.rangeMax ?? ''),
    quantity: Number.isFinite(quantity) ? quantity : 1,
    unitPrice: Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0,
    discountAmount:
      Number.isFinite(discountRaw) && discountRaw >= 0 ? discountRaw : 0
  };
};

const toServiceItemsFromAnalyses = (analyses: unknown): LooseRecord[] => {
  if (!analyses || typeof analyses !== 'object') return [];
  const items = (analyses as { items?: unknown[] }).items;
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as LooseRecord;
      return toServiceItemFromUnknown(
        {
          serviceId: row.parameterId ?? `legacy-${index}`,
          parameterId: row.parameterId ?? `legacy-${index}`,
          parameterLabel: row.parameterLabelEs ?? `Servicio ${index + 1}`,
          tableLabel: null,
          unit: row.unit ?? null,
          method: row.method ?? null,
          rangeMin: '',
          rangeMax: '',
          quantity: 1,
          unitPrice: Number(row.unitPrice ?? 0),
          discountAmount: Number(row.discountAmount ?? 0)
        },
        index
      );
    })
    .filter((entry): entry is LooseRecord => Boolean(entry));
};

export const migrateServiceRequestsToRequests = onCall(async (req) => {
  if (!req.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const sourceSnapshot = await db.collection('service_requests').get();

  let migrated = 0;
  let skipped = 0;
  let migratedWithLegacyAnalyses = 0;

  const batch = db.batch();
  let currentBatchOps = 0;

  for (const docSnap of sourceSnapshot.docs) {
    const data = (docSnap.data() ?? {}) as LooseRecord;
    const targetRef = db.collection('requests').doc(docSnap.id);

    const serviceItemsFromItems = (() => {
      if (!data.services) return [];
      if (Array.isArray(data.services)) {
        return data.services
          .map((item, index) => toServiceItemFromUnknown(item, index))
          .filter((entry): entry is LooseRecord => Boolean(entry));
      }
      if (
        typeof data.services === 'object' &&
        data.services !== null &&
        Array.isArray((data.services as { items?: unknown[] }).items)
      ) {
        return ((data.services as { items?: unknown[] }).items ?? [])
          .map((item, index) => toServiceItemFromUnknown(item, index))
          .filter((entry): entry is LooseRecord => Boolean(entry));
      }
      return [];
    })();

    const serviceItemsFromAnalyses = toServiceItemsFromAnalyses(data.analyses);

    const serviceItems =
      serviceItemsFromItems.length > 0
        ? serviceItemsFromItems
        : serviceItemsFromAnalyses;

    const groupedFromExisting =
      data.services &&
      typeof data.services === 'object' &&
      !Array.isArray(data.services) &&
      Array.isArray((data.services as { grouped?: unknown[] }).grouped)
        ? ((data.services as { grouped?: unknown[] }).grouped ?? [])
            .map((group) => {
              if (!group || typeof group !== 'object') return null;
              const row = group as LooseRecord;
              const items = Array.isArray(row.items)
                ? row.items
                    .map((item, index) => toServiceItemFromUnknown(item, index))
                    .filter((entry): entry is LooseRecord => Boolean(entry))
                : [];
              return {
                name:
                  typeof row.name === 'string' && row.name.trim().length > 0
                    ? row.name.trim()
                    : 'Combo 1',
                items
              };
            })
            .filter(
              (entry): entry is { name: string; items: LooseRecord[] } =>
                Boolean(entry) && entry.items.length > 0
            )
        : [];

    const grouped =
      groupedFromExisting.length > 0
        ? groupedFromExisting
        : serviceItems.length > 0
          ? [{ name: 'Combo 1', items: serviceItems }]
          : [];

    const { analyses, ...rest } = data;
    const nextData: LooseRecord = {
      ...rest,
      services: {
        items: serviceItems,
        grouped
      },
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      migratedBy: {
        uid: req.auth?.uid ?? null,
        email: req.auth?.token?.email ?? null
      }
    };

    if (serviceItemsFromItems.length === 0 && serviceItemsFromAnalyses.length > 0) {
      migratedWithLegacyAnalyses += 1;
    }

    batch.set(targetRef, nextData, { merge: false });
    currentBatchOps += 1;
    migrated += 1;

    if (currentBatchOps >= 450) {
      await batch.commit();
      currentBatchOps = 0;
    }
  }

  if (currentBatchOps > 0) {
    await batch.commit();
  }

  return {
    sourceCollection: 'service_requests',
    targetCollection: 'requests',
    scanned: sourceSnapshot.size,
    migrated,
    migratedWithLegacyAnalyses,
    skipped
  };
});

