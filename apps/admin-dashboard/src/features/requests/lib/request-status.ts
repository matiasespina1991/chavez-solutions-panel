import { REQUEST_STATUS_LABEL_MAP } from '@/lib/status-labels';
import type { RequestListRow as RequestRow } from '@/types/domain';

export const hasIssuedWorkOrder = (row: RequestRow) =>
  row.status === 'converted_to_work_order' ||
  row.status === 'work_order_paused' ||
  row.status === 'work_order_completed';

export const getValidUntilMs = (createdAtMs: number, validDays: number | null) => {
  if (!createdAtMs || !validDays || validDays <= 0) return null;
  return createdAtMs + validDays * 24 * 60 * 60 * 1000;
};

export const formatDate = (valueMs: number | null) => {
  if (!valueMs) return '—';
  return new Date(valueMs).toLocaleDateString('es-EC');
};

export const formatDateLabel = (valueMs: number | null) => {
  if (!valueMs) return '—';
  return new Date(valueMs).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const getApprovalStatusLabel = (row: RequestRow) => {
  if (row.approvalStatus === 'approved') return 'Aprobada';
  if (row.approvalStatus === 'rejected') return 'Rechazada';
  if (row.status === 'submitted') return 'Pendiente';
  return '—';
};

export const isExpiredProforma = (row: RequestRow) => {
  if (row.status !== 'submitted') return false;
  const validUntilMs = getValidUntilMs(row.createdAtMs, row.validDays);
  if (!validUntilMs) return false;
  return validUntilMs < Date.now();
};

export const getRowStatusLabel = (row: RequestRow) => {
  if (isExpiredProforma(row)) return 'Proforma vencida';
  if (row.status === 'submitted') {
    return row.approvalStatus === 'approved'
      ? 'Proforma aprobada'
      : 'Proforma lista';
  }
  if (row.status === 'draft' && row.approvalStatus === 'rejected') {
    return 'Proforma rechazada';
  }
  return REQUEST_STATUS_LABEL_MAP[row.status];
};

export const getStatusDisplayLabel = (row: RequestRow) => {
  if (isExpiredProforma(row)) return 'Proforma vencida';
  if (row.status === 'submitted') {
    return row.approvalStatus === 'approved'
      ? 'Proforma aprobada'
      : '🟡 Proforma lista';
  }
  if (row.status === 'draft' && row.approvalStatus === 'rejected') {
    return '❌ Proforma rechazada';
  }
  if (row.status === 'draft') return '(Borrador)';
  if (row.status === 'work_order_paused') return '⏸️ OT pausada';
  if (row.status === 'work_order_completed') return '✅ Finalizada';
  if (row.status === 'converted_to_work_order') return '🟢 OT iniciada';
  return 'Cancelada';
};

export const getRequestDialogBanner = (row: RequestRow) => {
  if (row.status === 'work_order_completed') {
    return {
      className:
        'rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300',
      text: 'Orden de trabajo finalizada. ✅'
    };
  }

  if (row.status === 'work_order_paused') {
    return {
      className:
        'rounded-md border border-yellow-500/40 bg-yellow-400/15 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-300',
      text: 'Orden de trabajo pausada.'
    };
  }

  if (row.status === 'submitted' && row.approvalStatus !== 'approved') {
    return {
      className:
        'rounded-md border border-amber-500/40 bg-amber-400/15 px-3 py-2 text-sm text-amber-800 dark:text-amber-300',
      text: 'Proforma lista. Preparada para'
    };
  }

  if (row.status === 'submitted' && row.approvalStatus === 'approved') {
    return {
      className:
        'rounded-md border border-emerald-600/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300',
      text: 'Proforma aprobada. Lista para emitir OT.'
    };
  }

  if (row.status === 'cancelled') {
    return {
      className:
        'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
      text: 'Solicitud cancelada.'
    };
  }

  if (row.status === 'draft' && row.approvalStatus === 'rejected') {
    return {
      className:
        'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
      text: 'Proforma rechazada. Revise el motivo y edite la solicitud.'
    };
  }

  if (row.status === 'draft') {
    return {
      className:
        'rounded-md border border-slate-500/30 bg-slate-500/10 px-3 py-2 text-sm text-slate-700 dark:text-slate-300',
      text: 'Borrador.'
    };
  }

  return null;
};
