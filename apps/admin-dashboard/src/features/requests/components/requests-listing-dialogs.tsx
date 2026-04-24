import type { RequestListRow as RequestRow } from '@/types/domain';
import { RequestDeleteDialog } from '@/features/requests/components/request-delete-dialog';
import { RequestExecuteWorkOrderDialog } from '@/features/requests/components/request-execute-work-order-dialog';
import { RequestRejectDialog } from '@/features/requests/components/request-reject-dialog';
import { RequestSummaryDialog } from '@/features/requests/components/request-summary-dialog';
import { RequestWorkOrderToggleDialog } from '@/features/requests/components/request-work-order-toggle-dialog';

interface RequestsListingDialogsProps {
  readonly isViewDialogOpen: boolean;
  readonly selectedRow: RequestRow | null;
  readonly canShowExecuteWorkOrderButton: boolean;
  readonly canApproveSelectedRow: boolean;
  readonly canEditSelectedRow: boolean;
  readonly pendingActionId: string | null;
  readonly isDialogDownloading: boolean;
  readonly onSetViewDialogOpen: (open: boolean) => void;
  readonly onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  readonly onWorkOrderAction: (row: RequestRow) => Promise<void>;
  readonly onDialogEdit: () => void;
  readonly onDialogDownload: () => void;
  readonly onDialogDelete: () => void;
  readonly onDialogResume: () => void;
  readonly isExecuteWorkOrderDialogOpen: boolean;
  readonly rowToExecuteWorkOrder: RequestRow | null;
  readonly approverLabel: string;
  readonly nowLabel: string;
  readonly onSetExecuteWorkOrderDialogOpen: (open: boolean) => void;
  readonly onSetRowToExecuteWorkOrder: (row: RequestRow | null) => void;
  readonly onConfirmExecuteWorkOrder: () => Promise<void>;
  readonly isWorkOrderToggleDialogOpen: boolean;
  readonly isTogglingWorkOrder: boolean;
  readonly workOrderToggleAction: 'pause' | 'resume' | null;
  readonly workOrderToggleNotes: string;
  readonly onSetWorkOrderToggleDialogOpen: (open: boolean) => void;
  readonly onSetRowToToggleWorkOrder: (row: RequestRow | null) => void;
  readonly onSetWorkOrderToggleAction: (action: 'pause' | 'resume' | null) => void;
  readonly onSetWorkOrderToggleNotes: (notes: string) => void;
  readonly onConfirmWorkOrderToggle: () => Promise<void>;
  readonly isDeleteDialogOpen: boolean;
  readonly isDeleting: boolean;
  readonly onSetDeleteDialogOpen: (open: boolean) => void;
  readonly onSetRowToDelete: (row: RequestRow | null) => void;
  readonly onConfirmDelete: () => Promise<void>;
  readonly isRejectDialogOpen: boolean;
  readonly isRejecting: boolean;
  readonly rejectFeedback: string;
  readonly onSetRejectDialogOpen: (open: boolean) => void;
  readonly onSetRowToReject: (row: RequestRow | null) => void;
  readonly onSetRejectFeedback: (value: string) => void;
  readonly onConfirmReject: () => Promise<void>;
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
