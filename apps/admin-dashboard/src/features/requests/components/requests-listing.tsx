'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Input } from '@/components/ui/input';
import type {
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import { auth } from '@/lib/firebase';
import { IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  RequestListTable
} from '@/features/requests/components/request-list-table';
import { RequestExecuteWorkOrderDialog } from '@/features/requests/components/request-execute-work-order-dialog';
import { RequestDeleteDialog } from '@/features/requests/components/request-delete-dialog';
import { RequestRejectDialog } from '@/features/requests/components/request-reject-dialog';
import { RequestSummaryDialog } from '@/features/requests/components/request-summary-dialog';
import { RequestWorkOrderToggleDialog } from '@/features/requests/components/request-work-order-toggle-dialog';
import { useRequestActions } from '@/features/requests/hooks/use-request-actions';
import { useRequestsRealtime } from '@/features/requests/hooks/use-requests-realtime';
import { useRequestsListViewModel } from '@/features/requests/hooks/use-requests-list-view-model';
import { hasIssuedWorkOrder } from '@/features/requests/lib/request-status';

export default function RequestsListing() {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = useState<RequestRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const closeSummaryDialog = useCallback(() => {
    setIsViewDialogOpen(false);
  }, []);
  const syncSelectedRow = useCallback((row: RequestRow | null) => {
    setSelectedRow(row);
  }, []);
  const { rows, setRows, loading } = useRequestsRealtime({
    selectedRow,
    onCloseSummary: closeSummaryDialog,
    onSelectedRowSync: syncSelectedRow
  });
  const {
    pendingActionId,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isWorkOrderToggleDialogOpen,
    setIsWorkOrderToggleDialogOpen,
    rowToToggleWorkOrder,
    setRowToToggleWorkOrder,
    workOrderToggleAction,
    setWorkOrderToggleAction,
    workOrderToggleNotes,
    setWorkOrderToggleNotes,
    isDeleting,
    isTogglingWorkOrder,
    isRejectDialogOpen,
    setIsRejectDialogOpen,
    setRowToDelete,
    rowToReject,
    setRowToReject,
    isExecuteWorkOrderDialogOpen,
    setIsExecuteWorkOrderDialogOpen,
    rowToExecuteWorkOrder,
    setRowToExecuteWorkOrder,
    rejectFeedback,
    setRejectFeedback,
    isRejecting,
    isDialogDownloading,
    handleConfirmWorkOrderToggle,
    handleWorkOrderAction,
    openExecuteWorkOrderDialog,
    handleConfirmExecuteWorkOrder,
    openRejectDialog,
    handleConfirmRejectRequest,
    handleDeleteRequest,
    handleDialogDelete,
    handleDialogResumeWorkOrder,
    handleDialogDownload
  } = useRequestActions({
    selectedRow,
    setRows,
    setSelectedRow,
    onCloseSummaryDialog: closeSummaryDialog
  });
  const {
    searchQuery,
    setSearchQuery,
    visibleRows,
    hasRows,
    hasVisibleRows,
    handleSort,
    getSortIndicator
  } = useRequestsListViewModel(rows);

  const dialogActionButtonClass =
    'h-[2.4rem] w-[2.4rem] cursor-pointer rounded-md border bg-background p-0 transition-colors duration-150 hover:bg-muted/60';

  const handleDialogEdit = () => {
    if (!selectedRow) return;

    if (hasIssuedWorkOrder(selectedRow)) {
      return;
    }

    setIsViewDialogOpen(false);
    router.push(
      `/dashboard/configurator?requestId=${encodeURIComponent(selectedRow.id)}&tab=services`
    );
  };

  const canApproveSelectedRow =
    selectedRow?.status === 'submitted' &&
    selectedRow.approvalStatus !== 'approved';
  const canExecuteApprovedSelectedRow =
    selectedRow?.status === 'submitted' &&
    selectedRow.approvalStatus === 'approved' &&
    !hasIssuedWorkOrder(selectedRow);
  const canShowExecuteWorkOrderButton =
    canApproveSelectedRow || canExecuteApprovedSelectedRow;
  const canEditSelectedRow = selectedRow
    ? !hasIssuedWorkOrder(selectedRow)
    : false;

  if (loading) {
    return (
      <DataTableSkeleton
        columnCount={9}
        rowCount={8}
        filterCount={0}
        withViewOptions={false}
        withPagination={false}
        cellWidths={[
          '10rem',
          '14rem',
          '6rem',
          '6rem',
          '6rem',
          '8rem',
          '12rem',
          '20rem',
          '3rem'
        ]}
      />
    );
  }

  if (!hasRows) {
    return (
      <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
        Aún no hay solicitudes de servicio registradas.
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='relative max-w-[19.5rem]'>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder='Buscar en todas las solicitudes...'
          className='pr-10'
        />
        <IconSearch className='text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2' />
      </div>

      <RequestListTable
        visibleRows={visibleRows}
        hasVisibleRows={hasVisibleRows}
        pendingActionId={pendingActionId}
        isDeleting={isDeleting}
        onSort={handleSort}
        getSortIndicator={getSortIndicator}
        onOpenSummary={(row) => {
          setSelectedRow(row);
          setIsViewDialogOpen(true);
        }}
        onEdit={(row) => {
          router.push(
            `/dashboard/configurator?requestId=${encodeURIComponent(row.id)}&tab=services`
          );
        }}
        onExecuteWorkOrder={openExecuteWorkOrderDialog}
        onOpenRejectDialog={openRejectDialog}
        onToggleWorkOrder={(row) => {
          void handleWorkOrderAction(row);
        }}
        onOpenDeleteDialog={(row) => {
          setRowToDelete(row);
          setIsDeleteDialogOpen(true);
        }}
      />

      <RequestSummaryDialog
        open={isViewDialogOpen}
        selectedRow={selectedRow}
        canShowExecuteWorkOrderButton={canShowExecuteWorkOrderButton}
        canApproveSelectedRow={canApproveSelectedRow}
        canEditSelectedRow={canEditSelectedRow}
        pendingActionId={pendingActionId}
        isDialogDownloading={isDialogDownloading}
        dialogActionButtonClass={dialogActionButtonClass}
        onOpenChange={setIsViewDialogOpen}
        onOpenExecuteWorkOrderDialog={openExecuteWorkOrderDialog}
        onWorkOrderAction={(row) => {
          void handleWorkOrderAction(row);
        }}
        onEdit={handleDialogEdit}
        onDownload={() => {
          void handleDialogDownload();
        }}
        onDelete={handleDialogDelete}
        onResume={handleDialogResumeWorkOrder}
      />

      <RequestExecuteWorkOrderDialog
        open={isExecuteWorkOrderDialogOpen}
        rowToExecuteWorkOrder={rowToExecuteWorkOrder}
        pendingActionId={pendingActionId}
        approverLabel={
          auth.currentUser?.displayName ||
          auth.currentUser?.email ||
          'Usuario autenticado'
        }
        nowLabel={new Date().toLocaleString('es-EC', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })}
        onOpenChange={(open) => {
          if (
            rowToExecuteWorkOrder &&
            pendingActionId === rowToExecuteWorkOrder.id
          ) {
            return;
          }
          setIsExecuteWorkOrderDialogOpen(open);
          if (!open) {
            setRowToExecuteWorkOrder(null);
          }
        }}
        onConfirm={handleConfirmExecuteWorkOrder}
      />

      <RequestWorkOrderToggleDialog
        open={isWorkOrderToggleDialogOpen}
        isTogglingWorkOrder={isTogglingWorkOrder}
        workOrderToggleAction={workOrderToggleAction}
        workOrderToggleNotes={workOrderToggleNotes}
        onOpenChange={(open) => {
          if (isTogglingWorkOrder) return;
          setIsWorkOrderToggleDialogOpen(open);
          if (!open) {
            setRowToToggleWorkOrder(null);
            setWorkOrderToggleAction(null);
            setWorkOrderToggleNotes('');
          }
        }}
        onNotesChange={setWorkOrderToggleNotes}
        onConfirm={handleConfirmWorkOrderToggle}
      />

      <RequestDeleteDialog
        open={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setIsDeleteDialogOpen(open);
          if (!open) setRowToDelete(null);
        }}
        onConfirm={handleDeleteRequest}
      />

      <RequestRejectDialog
        open={isRejectDialogOpen}
        isRejecting={isRejecting}
        rejectFeedback={rejectFeedback}
        onOpenChange={(open) => {
          if (isRejecting) return;
          setIsRejectDialogOpen(open);
          if (!open) {
            setRowToReject(null);
            setRejectFeedback('');
          }
        }}
        onRejectFeedbackChange={setRejectFeedback}
        onConfirm={handleConfirmRejectRequest}
      />
    </div>
  );
}
