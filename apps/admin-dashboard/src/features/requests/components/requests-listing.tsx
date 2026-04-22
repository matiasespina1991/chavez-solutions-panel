'use client';

import type { RequestListRow as RequestRow } from '@/types/domain';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  RequestListTable
} from '@/features/requests/components/request-list-table';
import { RequestsListingState } from '@/features/requests/components/requests-listing-state';
import { RequestsListingDialogs } from '@/features/requests/components/requests-listing-dialogs';
import { useRequestActions } from '@/features/requests/hooks/use-request-actions';
import { useRequestsRealtime } from '@/features/requests/hooks/use-requests-realtime';
import { useRequestsListViewModel } from '@/features/requests/hooks/use-requests-list-view-model';
import { useRequestSummaryViewModel } from '@/features/requests/hooks/use-request-summary-view-model';
import { RequestsListingSearch } from '@/features/requests/components/requests-listing-search';
import { useRequestListTableActions } from '@/features/requests/hooks/use-request-list-table-actions';

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

  const {
    canApproveSelectedRow,
    canShowExecuteWorkOrderButton,
    canEditSelectedRow,
    approverLabel,
    nowLabel,
    handleDialogEdit
  } = useRequestSummaryViewModel({
    selectedRow,
    onCloseSummaryDialog: closeSummaryDialog,
    onNavigateToConfigurator: (requestId) => {
      router.push(
        `/dashboard/configurator?requestId=${encodeURIComponent(requestId)}&tab=services`
      );
    }
  });
  const {
    handleOpenSummary,
    handleEdit,
    handleExecuteWorkOrder,
    handleOpenReject,
    handleToggleWorkOrder,
    handleOpenDelete
  } = useRequestListTableActions({
    onOpenSummaryDialog: (row) => {
      setSelectedRow(row);
      setIsViewDialogOpen(true);
    },
    onNavigateToConfigurator: (requestId) => {
      router.push(
        `/dashboard/configurator?requestId=${encodeURIComponent(requestId)}&tab=services`
      );
    },
    onOpenExecuteWorkOrderDialog: openExecuteWorkOrderDialog,
    onOpenRejectDialog: openRejectDialog,
    onToggleWorkOrder: handleWorkOrderAction,
    onOpenDeleteDialog: (row) => {
      setRowToDelete(row);
      setIsDeleteDialogOpen(true);
    }
  });

  if (loading || !hasRows) {
    return <RequestsListingState loading={loading} hasRows={hasRows} />;
  }

  return (
    <div className='space-y-3'>
      <RequestsListingSearch
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <RequestListTable
        visibleRows={visibleRows}
        hasVisibleRows={hasVisibleRows}
        pendingActionId={pendingActionId}
        isDeleting={isDeleting}
        onSort={handleSort}
        getSortIndicator={getSortIndicator}
        onOpenSummary={handleOpenSummary}
        onEdit={handleEdit}
        onExecuteWorkOrder={handleExecuteWorkOrder}
        onOpenRejectDialog={handleOpenReject}
        onToggleWorkOrder={handleToggleWorkOrder}
        onOpenDeleteDialog={handleOpenDelete}
      />

      <RequestsListingDialogs
        isViewDialogOpen={isViewDialogOpen}
        selectedRow={selectedRow}
        canShowExecuteWorkOrderButton={canShowExecuteWorkOrderButton}
        canApproveSelectedRow={canApproveSelectedRow}
        canEditSelectedRow={canEditSelectedRow}
        pendingActionId={pendingActionId}
        isDialogDownloading={isDialogDownloading}
        onSetViewDialogOpen={setIsViewDialogOpen}
        onOpenExecuteWorkOrderDialog={openExecuteWorkOrderDialog}
        onWorkOrderAction={handleWorkOrderAction}
        onDialogEdit={handleDialogEdit}
        onDialogDownload={() => {
          void handleDialogDownload();
        }}
        onDialogDelete={handleDialogDelete}
        onDialogResume={handleDialogResumeWorkOrder}
        isExecuteWorkOrderDialogOpen={isExecuteWorkOrderDialogOpen}
        rowToExecuteWorkOrder={rowToExecuteWorkOrder}
        approverLabel={approverLabel}
        nowLabel={nowLabel}
        onSetExecuteWorkOrderDialogOpen={setIsExecuteWorkOrderDialogOpen}
        onSetRowToExecuteWorkOrder={setRowToExecuteWorkOrder}
        onConfirmExecuteWorkOrder={handleConfirmExecuteWorkOrder}
        isWorkOrderToggleDialogOpen={isWorkOrderToggleDialogOpen}
        isTogglingWorkOrder={isTogglingWorkOrder}
        workOrderToggleAction={workOrderToggleAction}
        workOrderToggleNotes={workOrderToggleNotes}
        onSetWorkOrderToggleDialogOpen={setIsWorkOrderToggleDialogOpen}
        onSetRowToToggleWorkOrder={setRowToToggleWorkOrder}
        onSetWorkOrderToggleAction={setWorkOrderToggleAction}
        onSetWorkOrderToggleNotes={setWorkOrderToggleNotes}
        onConfirmWorkOrderToggle={handleConfirmWorkOrderToggle}
        isDeleteDialogOpen={isDeleteDialogOpen}
        isDeleting={isDeleting}
        onSetDeleteDialogOpen={setIsDeleteDialogOpen}
        onSetRowToDelete={setRowToDelete}
        onConfirmDelete={handleDeleteRequest}
        isRejectDialogOpen={isRejectDialogOpen}
        isRejecting={isRejecting}
        rejectFeedback={rejectFeedback}
        onSetRejectDialogOpen={setIsRejectDialogOpen}
        onSetRowToReject={setRowToReject}
        onSetRejectFeedback={setRejectFeedback}
        onConfirmReject={handleConfirmRejectRequest}
      />
    </div>
  );
}
