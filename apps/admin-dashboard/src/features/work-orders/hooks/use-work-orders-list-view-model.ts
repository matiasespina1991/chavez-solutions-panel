import { getWorkOrderStatusSearchTokens } from '@/features/work-orders/lib/work-order-status';
import type { WorkOrderListRow as WorkOrderRow } from '@/types/domain';
import { useMemo, useState } from 'react';

export type WorkOrderSortKey =
  | 'reference'
  | 'client'
  | 'samples'
  | 'analyses'
  | 'status'
  | 'total'
  | 'notes'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

export function useWorkOrdersListViewModel(rows: WorkOrderRow[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<WorkOrderSortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: WorkOrderSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const getSortIndicator = (key: WorkOrderSortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedRows = useMemo(() => {
    const collator = new Intl.Collator('es', {
      sensitivity: 'base',
      numeric: true
    });

    const getString = (value: string | null | undefined) => (value || '').trim();

    const sorted = [...rows].sort((left, right) => {
      let compare = 0;

      switch (sortKey) {
        case 'reference':
          compare = collator.compare(left.workOrderNumber, right.workOrderNumber);
          break;
        case 'client':
          compare = collator.compare(left.clientBusinessName, right.clientBusinessName);
          break;
        case 'samples':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'analyses':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'status':
          compare = collator.compare(
            getWorkOrderStatusSearchTokens(left).join(' '),
            getWorkOrderStatusSearchTokens(right).join(' ')
          );
          break;
        case 'total':
          compare = left.total - right.total;
          break;
        case 'notes':
          compare = collator.compare(getString(left.notes), getString(right.notes));
          break;
        case 'updatedAt':
          compare = left.updatedAtMs - right.updatedAtMs;
          break;
        default:
          compare = 0;
      }

      if (compare === 0) {
        compare = collator.compare(left.workOrderNumber, right.workOrderNumber);
      }

      return sortDirection === 'asc' ? compare : compare * -1;
    });

    return sorted;
  }, [rows, sortDirection, sortKey]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es');
    if (!query) return sortedRows;

    return sortedRows.filter((row) => {
      const searchableParts = [
        row.workOrderNumber,
        row.sourceReference,
        row.sourceRequestId,
        row.notes,
        row.matrix.join(','),
        ...getWorkOrderStatusSearchTokens(row),
        row.client.businessName,
        row.client.taxId,
        row.client.contactName,
        row.clientBusinessName,
        String(row.agreedCount),
        String(row.analysesCount),
        String(row.total),
        String(row.subtotal),
        String(row.taxPercent),
        row.updatedAtLabel,
        ...row.sampleItems.flatMap((sample) => [sample.sampleCode, sample.sampleType]),
        ...row.analysisItems.flatMap((analysis) => [
          analysis.parameterLabelEs,
          String(analysis.unitPrice)
        ])
      ];

      return searchableParts.join(' ').toLocaleLowerCase('es').includes(query);
    });
  }, [searchQuery, sortedRows]);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);
  const hasVisibleRows = useMemo(() => visibleRows.length > 0, [visibleRows.length]);

  return {
    searchQuery,
    setSearchQuery,
    visibleRows,
    hasRows,
    hasVisibleRows,
    handleSort,
    getSortIndicator
  };
}
