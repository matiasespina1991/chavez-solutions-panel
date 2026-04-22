import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ProformaSummaryPanel } from '@/features/proformas/components/proforma-summary-panel';
import { RequestSummaryActions } from '@/features/requests/components/request-summary-actions';
import { RequestSummaryBanner } from '@/features/requests/components/request-summary-banner';
import {
  formatDate,
  getRequestDialogBanner,
  getValidUntilMs
} from '@/features/requests/lib/request-status';
import type { RequestListRow as RequestRow } from '@/types/domain';

interface RequestSummaryDialogProps {
  open: boolean;
  selectedRow: RequestRow | null;
  canShowExecuteWorkOrderButton: boolean;
  canApproveSelectedRow: boolean;
  canEditSelectedRow: boolean;
  pendingActionId: string | null;
  isDialogDownloading: boolean;
  dialogActionButtonClass: string;
  onOpenChange: (open: boolean) => void;
  onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  onWorkOrderAction: (row: RequestRow) => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onResume: () => void;
}

export function RequestSummaryDialog({
  open,
  selectedRow,
  canShowExecuteWorkOrderButton,
  canApproveSelectedRow,
  canEditSelectedRow,
  pendingActionId,
  isDialogDownloading,
  dialogActionButtonClass,
  onOpenChange,
  onOpenExecuteWorkOrderDialog,
  onWorkOrderAction,
  onEdit,
  onDownload,
  onDelete,
  onResume
}: RequestSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-3xl'
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className='bg-background shrink-0 border-b px-6 py-4 pr-12'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <DialogTitle>Resumen de solicitud</DialogTitle>
              <DialogDescription>
                Vista consolidada de cliente, muestras, análisis y costos.
              </DialogDescription>
            </div>
            <RequestSummaryActions
              selectedRow={selectedRow}
              canShowExecuteWorkOrderButton={canShowExecuteWorkOrderButton}
              canApproveSelectedRow={canApproveSelectedRow}
              canEditSelectedRow={canEditSelectedRow}
              pendingActionId={pendingActionId}
              isDialogDownloading={isDialogDownloading}
              dialogActionButtonClass={dialogActionButtonClass}
              onOpenExecuteWorkOrderDialog={onOpenExecuteWorkOrderDialog}
              onWorkOrderAction={onWorkOrderAction}
              onEdit={onEdit}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          </div>
        </DialogHeader>

        {selectedRow && (
          <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
            <div className='space-y-5 px-6 py-5'>
              <RequestSummaryBanner
                row={selectedRow}
                banner={getRequestDialogBanner(selectedRow)}
                onExecute={onOpenExecuteWorkOrderDialog}
                onEdit={onEdit}
                onResume={onResume}
              />
              <ProformaSummaryPanel
                typeLabel={selectedRow.isWorkOrder ? 'Proforma + OT' : 'Proforma'}
                reference={selectedRow.reference}
                workOrderExecutedByEmail={
                  selectedRow.approvalStatus === 'approved'
                    ? (selectedRow.approvalActorEmail ?? null)
                    : null
                }
                validDaysLabel={
                  selectedRow.validDays ? `${selectedRow.validDays} días` : '—'
                }
                validUntilLabel={formatDate(
                  getValidUntilMs(selectedRow.createdAtMs, selectedRow.validDays)
                )}
                client={{
                  businessName: selectedRow.client.businessName || '—',
                  taxId: selectedRow.client.taxId || '—',
                  contactName: selectedRow.client.contactName || '—',
                  contactEmail: selectedRow.client.email || ''
                }}
                groups={selectedRow.serviceGroups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  items: group.items.map((item) => ({
                    id: item.serviceId,
                    label: item.parameterLabel,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountAmount: item.discountAmount
                  }))
                }))}
                pricing={{
                  subtotal: selectedRow.subtotal,
                  taxPercent: selectedRow.taxPercent,
                  total: selectedRow.total
                }}
                notes={selectedRow.notes}
                rejectionReason={
                  selectedRow.approvalStatus === 'rejected'
                    ? selectedRow.approvalFeedback
                    : null
                }
                showTotalUsdSuffix
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
