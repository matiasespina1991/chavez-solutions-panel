// src/index.ts
import { setGlobalOptions } from 'firebase-functions';
import admin from 'firebase-admin';

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

// Triggers
export { onImageUpload } from './triggers/onImageUpload.js';
export { onVideoUpload } from './triggers/onVideoUpload.js';
export { onProformaSubmitted } from './triggers/onProformaSubmitted.js';
export { onMailOutboxCreated } from './triggers/onMailOutboxCreated.js';

// Callable functions
export { generateDownloadUrl } from './callable/generateDownloadUrl.js';
export { regenerateDownloadUrl } from './callable/regenerateDownloadUrl.js';
export { validateDelete } from './callable/validateDelete.js';
export { createWorkOrder } from './callable/createWorkOrder.js';
export { approveProforma } from './callable/approveProforma.js';
export { rejectProforma } from './callable/rejectProforma.js';
export { pauseWorkOrder } from './callable/pauseWorkOrder.js';
export { resumeWorkOrder } from './callable/resumeWorkOrder.js';
export { completeWorkOrder } from './callable/completeWorkOrder.js';
export { saveWorkOrderLabAnalysis } from './callable/saveWorkOrderLabAnalysis.js';
export { deleteProforma } from './callable/deleteProforma.js';
export { importServicesFromCsv } from './callable/importServicesFromCsv.js';
export { saveServicesTechnicalChanges } from './callable/saveServicesTechnicalChanges.js';
export { createTechnicalService } from './callable/createTechnicalService.js';
export { listServiceHistory } from './callable/listServiceHistory.js';
export { restoreServiceHistory } from './callable/restoreServiceHistory.js';
export { deleteServiceHistory } from './callable/deleteServiceHistory.js';
export { generateProformaPreviewPdf } from './callable/generateProformaPreviewPdf.js';
export { sendProformaPreviewEmail } from './callable/sendProformaPreviewEmail.js';
