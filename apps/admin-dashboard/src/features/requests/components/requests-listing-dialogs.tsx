import type { RequestListRow as RequestRow } from '@/types/domain';
import { RequestDeleteDialog } from '@/features/requests/components/request-delete-dialog';
import { RequestExecuteWorkOrderDialog } from '@/features/requests/components/request-execute-work-order-dialog';
import { RequestRejectDialog } from '@/features/requests/components/request-reject-dialog';
import { RequestSummaryDialog } from '@/features/requests/components/request-summary-dialog';
import { RequestWorkOrderToggleDialog } from '@/features/requests/components/request-work-order-toggle-dialog';

interface RequestsListingDialogsProps {
  isViewDialogOpen: boolean;
  selectedRow: RequestRow | null;
  canShowExecuteWorkOrderButton: boolean;
  canApproveSelectedRow: boolean;
  canEditSelectedRow: boolean;
  pendingActionId: string | null;
  isDialogDownloading: boolean;
  onSetViewDialogOpen: (open: boolean) => void;
  onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  onWorkOrderAction: (row: RequestRow) => Promise<void>;
  onDialogEdit: () => void;
  onDialogDownload: () => void;
  onDialogDelete: () => void;
  onDialogResume: () => void;
  isExecuteWorkOrderDialogOpen: boolean;
  rowToExecuteWorkOrder: RequestRow | null;
  approverLabel: string;
  nowLabel: string;
  onSetExecuteWorkOrderDialogOpen: (open: boolean) => void;
  onSetRowToExecuteWorkOrder: (row: RequestRow | null) => void;
  onConfirmExecuteWorkOrder: () => Promise<void>;
  isWorkOrderToggleDialogOpen: boolean;
  isTogglingWorkOrder: boolean;
  workOrderToggleAction: 'pause' | 'resume' | null;
  workOrderToggleNotes: string;
  onSetWorkOrderToggleDialogOpen: (open: boolean) => void;
  onSetRowToToggleWorkOrder: (row: RequestRow | null) => void;
  onSetWorkOrderToggleAction: (action: 'pause' | 'resume' | null) => void;
  onSetWorkOrderToggleNotes: (notes: string) => void;
  onConfirmWorkOrderToggle: () => Promise<void>;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  onSetDeleteDialogOpen: (open: boolean) => void;
  onSetRowToDelete: (row: RequestRow | null) => void;
  onConfirmDelete: () => Promise<void>;
  isRejectDialogOpen: boolean;
  isRejecting: boolean;
  rejectFeedback: string;
  onSetRejectDialogOpen: (open: boolean) => void;
  onSetRowToReject: (row: RequestRow | null) => void;
  onSetRejectFeedback: (value: string) => void;
  onConfirmReject: () => Promise<void>;
}

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
            rowToExecuteWorkOrder &&
            pendingActionId === rowToExecuteWorkOrder.id
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
