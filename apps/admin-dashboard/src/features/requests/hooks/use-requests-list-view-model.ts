import { useMemo, useState } from 'react';
import type { RequestListRow as RequestRow } from '@/types/domain';
import type { RequestListSortKey } from '@/features/requests/components/request-list-table';
import {
  formatDate,
  getApprovalStatusLabel,
  getRowStatusLabel,
  getValidUntilMs
} from '@/features/requests/lib/request-status';

type SortDirection = 'asc' | 'desc';

interface UseRequestsListViewModelResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  visibleRows: RequestRow[];
  hasRows: boolean;
  hasVisibleRows: boolean;
  handleSort: (key: RequestListSortKey) => void;
  getSortIndicator: (key: RequestListSortKey) => string;
}

export const useRequestsListViewModel = (
  rows: RequestRow[]
): UseRequestsListViewModelResult => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<RequestListSortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (key: RequestListSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const getSortIndicator = (key: RequestListSortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedRows = useMemo(() => {
    const collator = new Intl.Collator('es', {
      sensitivity: 'base',
      numeric: true
    });

    const getString = (value: string | null | undefined) =>
      (value || '').trim();

    const sorted = [...rows].sort((left, right) => {
      let compare = 0;

      switch (sortKey) {
        case 'reference': {
          compare = collator.compare(left.reference, right.reference);
          break;
        }

        case 'client': {
          compare = collator.compare(
            left.clientBusinessName,
            right.clientBusinessName
          );
          break;
        }

        case 'samples': {
          compare = left.analysesCount - right.analysesCount;
          break;
        }

        case 'analyses': {
          compare = left.analysesCount - right.analysesCount;
          break;
        }

        case 'status': {
          compare = collator.compare(
            getRowStatusLabel(left),
            getRowStatusLabel(right)
          );
          break;
        }

        case 'notes': {
          compare = collator.compare(
            getString(left.notes),
            getString(right.notes)
          );
          break;
        }

        case 'total': {
          compare = left.total - right.total;
          break;
        }

        case 'updatedAt': {
          compare = left.updatedAtMs - right.updatedAtMs;
          break;
        }

        default: {
          compare = 0;
        }
      }

      if (compare === 0) {
        compare = collator.compare(left.reference, right.reference);
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
        row.reference,
        row.notes,
        row.matrix.join(','),
        row.status,
        row.approvalStatus ?? '',
        getApprovalStatusLabel(row),
        row.approvalFeedback,
        getRowStatusLabel(row),
        String(row.validDays ?? ''),
        formatDate(getValidUntilMs(row.createdAtMs, row.validDays)),
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
        ...row.sampleItems.flatMap((sample) => [
          sample.sampleCode,
          sample.sampleType
        ]),
        ...row.analysisItems.flatMap((analysis) => [
          analysis.parameterLabelEs,
          String(analysis.unitPrice)
        ]),
        ...row.serviceItems.flatMap((service) => [
          service.parameterLabel,
          service.tableLabel || '',
          service.unit || '',
          service.method || '',
          String(service.quantity),
          String(service.unitPrice),
          String(service.discountAmount)
        ])
      ];

      return searchableParts.join(' ').toLocaleLowerCase('es').includes(query);
    });
  }, [searchQuery, sortedRows]);

  const hasRows = useMemo(() => rows.length > 0, [rows.length]);
  const hasVisibleRows = useMemo(
    () => visibleRows.length > 0,
    [visibleRows.length]
  );

  return {
    searchQuery,
    setSearchQuery,
    visibleRows,
    hasRows,
    hasVisibleRows,
    handleSort,
    getSortIndicator
  };
};
