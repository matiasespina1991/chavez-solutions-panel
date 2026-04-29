import { RequestDeleteDialog } from '@/features/requests/components/request-delete-dialog';
import { RequestExecuteWorkOrderDialog } from '@/features/requests/components/request-execute-work-order-dialog';
import { RequestRejectDialog } from '@/features/requests/components/request-reject-dialog';
import { RequestSummaryDialog } from '@/features/requests/components/request-summary-dialog';
import { RequestWorkOrderToggleDialog } from '@/features/requests/components/request-work-order-toggle-dialog';
import type { RequestsListingDialogsProps } from '@/features/requests/lib/request-component-types';

export function RequestsListingDialogs({
  isViewDialogOpen,
  selectedRow,
  canShowExecuteWorkOrderButton,
  canApproveSelectedRow,
  canEditSelectedRow,
  pendingActionId,
  isDialogDownloading,
  onSetViewDialogOpen,
  onOpenExecuteWorkOrderDialog,
  onWorkOrderAction,
  onDialogEdit,
  onDialogDownload,
  onDialogDelete,
  onDialogResume,
  isExecuteWorkOrderDialogOpen,
  rowToExecuteWorkOrder,
  approverLabel,
  nowLabel,
  onSetExecuteWorkOrderDialogOpen,
  onSetRowToExecuteWorkOrder,
  onConfirmExecuteWorkOrder,
  isWorkOrderToggleDialogOpen,
  isTogglingWorkOrder,
  workOrderToggleAction,
  workOrderToggleNotes,
  onSetWorkOrderToggleDialogOpen,
  onSetRowToToggleWorkOrder,
  onSetWorkOrderToggleAction,
  onSetWorkOrderToggleNotes,
  onConfirmWorkOrderToggle,
  isDeleteDialogOpen,
  isDeleting,
  onSetDeleteDialogOpen,
  onSetRowToDelete,
  onConfirmDelete,
  isRejectDialogOpen,
  isRejecting,
  rejectFeedback,
  onSetRejectDialogOpen,
  onSetRowToReject,
  onSetRejectFeedback,
  onConfirmReject
}: RequestsListingDialogsProps) {
  return (
    <>
      <RequestSummaryDialog
        open={isViewDialogOpen}
        selectedRow={selectedRow}
        canShowExecuteWorkOrderButton={canShowExecuteWorkOrderButton}
        canApproveSelectedRow={canApproveSelectedRow}
        canEditSelectedRow={canEditSelectedRow}
        pendingActionId={pendingActionId}
        isDialogDownloading={isDialogDownloading}
        onOpenChange={onSetViewDialogOpen}
        onOpenExecuteWorkOrderDialog={onOpenExecuteWorkOrderDialog}
        onWorkOrderAction={(row) => {
          void onWorkOrderAction(row);
        }}
        onEdit={onDialogEdit}
        onDownload={() => {
          onDialogDownload();
        }}
        onDelete={onDialogDelete}
        onResume={onDialogResume}
      />

      <RequestExecuteWorkOrderDialog
        open={isExecuteWorkOrderDialogOpen}
        rowToExecuteWorkOrder={rowToExecuteWorkOrder}
        pendingActionId={pendingActionId}
        approverLabel={approverLabel}
        nowLabel={nowLabel}
        onOpenChange={(open) => {
          if (
            pendingActionId === rowToExecuteWorkOrder?.id
          ) {
            return;
          }

          onSetExecuteWorkOrderDialogOpen(open);
          if (!open) {
            onSetRowToExecuteWorkOrder(null);
          }
        }}
        onConfirm={onConfirmExecuteWorkOrder}
      />

      <RequestWorkOrderToggleDialog
        open={isWorkOrderToggleDialogOpen}
        isTogglingWorkOrder={isTogglingWorkOrder}
        workOrderToggleAction={workOrderToggleAction}
        workOrderToggleNotes={workOrderToggleNotes}
        onOpenChange={(open) => {
          if (isTogglingWorkOrder) return;
          onSetWorkOrderToggleDialogOpen(open);
          if (!open) {
            onSetRowToToggleWorkOrder(null);
            onSetWorkOrderToggleAction(null);
            onSetWorkOrderToggleNotes('');
          }
        }}
        onNotesChange={onSetWorkOrderToggleNotes}
        onConfirm={onConfirmWorkOrderToggle}
      />

      <RequestDeleteDialog
        open={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (isDeleting) return;
          onSetDeleteDialogOpen(open);
          if (!open) onSetRowToDelete(null);
        }}
        onConfirm={onConfirmDelete}
      />

      <RequestRejectDialog
        open={isRejectDialogOpen}
        isRejecting={isRejecting}
        rejectFeedback={rejectFeedback}
        onOpenChange={(open) => {
          if (isRejecting) return;
          onSetRejectDialogOpen(open);
          if (!open) {
            onSetRowToReject(null);
            onSetRejectFeedback('');
          }
        }}
        onRejectFeedbackChange={onSetRejectFeedback}
        onConfirm={onConfirmReject}
      />
    </>
  );
}
