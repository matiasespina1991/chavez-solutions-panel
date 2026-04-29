'use client';

import { WorkOrderCompleteDialog } from '@/features/work-orders/components/work-order-complete-dialog';
import { WorkOrderSummaryDialog } from '@/features/work-orders/components/work-order-summary-dialog';
import { WorkOrdersListTable } from '@/features/work-orders/components/work-orders-list-table';
import { WorkOrdersListingSearch } from '@/features/work-orders/components/work-orders-listing-search';
import { WorkOrdersListingState } from '@/features/work-orders/components/work-orders-listing-state';
import { useWorkOrderActions } from '@/features/work-orders/hooks/use-work-order-actions';
import { useWorkOrdersListViewModel } from '@/features/work-orders/hooks/use-work-orders-list-view-model';
import { useWorkOrdersRealtime } from '@/features/work-orders/hooks/use-work-orders-realtime';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function WorkOrdersListing() {
  const router = useRouter();
  const [selectedRow, setSelectedRow] = useState<WorkOrderRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const { rows, loading } = useWorkOrdersRealtime();
  const {
    searchQuery,
    setSearchQuery,
    visibleRows,
    hasRows,
    hasVisibleRows,
    handleSort,
    getSortIndicator
  } = useWorkOrdersListViewModel(rows);
  const {
    pendingActionId,
    isCompleteDialogOpen,
    setIsCompleteDialogOpen,
    setRowToComplete,
    isCompleting,
    handleConfirmCompleteWorkOrder,
    handleDialogDownload,
    handleDialogPrint
  } = useWorkOrderActions({ selectedRow });

  if (loading || !hasRows) {
    return <WorkOrdersListingState loading={loading} hasRows={hasRows} />;
  }

  return (
    <div className='space-y-3'>
      <WorkOrdersListingSearch
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      <WorkOrdersListTable
        visibleRows={visibleRows}
        hasVisibleRows={hasVisibleRows}
        pendingActionId={pendingActionId}
        getSortIndicator={getSortIndicator}
        onSort={handleSort}
        onOpenSummary={(row) => {
          setSelectedRow(row);
          setIsViewDialogOpen(true);
        }}
        onOpenLabAnalysis={(row) => {
          router.push(
            `/panel/lab-analysis?workOrderId=${encodeURIComponent(row.id)}`
          );
        }}
        onOpenCompleteDialog={(row) => {
          setRowToComplete(row);
          setIsCompleteDialogOpen(true);
        }}
      />

      <WorkOrderSummaryDialog
        open={isViewDialogOpen}
        selectedRow={selectedRow}
        onOpenChange={setIsViewDialogOpen}
        onDownload={handleDialogDownload}
        onPrint={handleDialogPrint}
      />

      <WorkOrderCompleteDialog
        open={isCompleteDialogOpen}
        isCompleting={isCompleting}
        onOpenChange={(open) => {
          if (isCompleting) return;
          setIsCompleteDialogOpen(open);
          if (!open) setRowToComplete(null);
        }}
        onConfirm={handleConfirmCompleteWorkOrder}
      />
    </div>
  );
}
