import type { RequestListRow as RequestRow } from '@/types/domain';

export interface RequestDialogBanner {
  className: string;
  text: string;
}

export interface RequestSummaryBannerProps {
  readonly row: RequestRow;
  readonly banner: RequestDialogBanner | null;
  readonly onExecute: (row: RequestRow) => void;
  readonly onEdit: () => void;
  readonly onResume: () => void;
}

export interface RequestSummaryActionsProps {
  readonly selectedRow: RequestRow | null;
  readonly canShowExecuteWorkOrderButton: boolean;
  readonly canApproveSelectedRow: boolean;
  readonly canEditSelectedRow: boolean;
  readonly pendingActionId: string | null;
  readonly isDialogDownloading: boolean;
  readonly onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  readonly onWorkOrderAction: (row: RequestRow) => void;
  readonly onEdit: () => void;
  readonly onDownload: () => void;
  readonly onDelete: () => void;
}

export interface RequestSummaryDialogProps {
  readonly open: boolean;
  readonly selectedRow: RequestRow | null;
  readonly canShowExecuteWorkOrderButton: boolean;
  readonly canApproveSelectedRow: boolean;
  readonly canEditSelectedRow: boolean;
  readonly pendingActionId: string | null;
  readonly isDialogDownloading: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onOpenExecuteWorkOrderDialog: (row: RequestRow) => void;
  readonly onWorkOrderAction: (row: RequestRow) => void;
  readonly onEdit: () => void;
  readonly onDownload: () => void;
  readonly onDelete: () => void;
  readonly onResume: () => void;
}

export type RequestListSortKey =
  | 'reference'
  | 'client'
  | 'samples'
  | 'analyses'
  | 'status'
  | 'notes'
  | 'total'
  | 'updatedAt';

export interface RequestListTableProps {
  readonly visibleRows: RequestRow[];
  readonly hasVisibleRows: boolean;
  readonly pendingActionId: string | null;
  readonly isDeleting: boolean;
  readonly onSort: (key: RequestListSortKey) => void;
  readonly getSortIndicator: (key: RequestListSortKey) => string;
  readonly onOpenSummary: (row: RequestRow) => void;
  readonly onEdit: (row: RequestRow) => void;
  readonly onExecuteWorkOrder: (row: RequestRow) => void;
  readonly onOpenRejectDialog: (row: RequestRow) => void;
  readonly onToggleWorkOrder: (row: RequestRow) => void;
  readonly onOpenDeleteDialog: (row: RequestRow) => void;
}

export interface RequestDeleteDialogProps {
  readonly open: boolean;
  readonly isDeleting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}

export interface RequestRejectDialogProps {
  readonly open: boolean;
  readonly isRejecting: boolean;
  readonly rejectFeedback: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRejectFeedbackChange: (value: string) => void;
  readonly onConfirm: () => void;
}

export interface RequestExecuteWorkOrderDialogProps {
  readonly open: boolean;
  readonly rowToExecuteWorkOrder: RequestRow | null;
  readonly pendingActionId: string | null;
  readonly approverLabel: string;
  readonly nowLabel: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
}

export interface RequestWorkOrderToggleDialogProps {
  readonly open: boolean;
  readonly isTogglingWorkOrder: boolean;
  readonly workOrderToggleAction: 'pause' | 'resume' | null;
  readonly workOrderToggleNotes: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onNotesChange: (value: string) => void;
  readonly onConfirm: () => void;
}

export interface RequestsListingDialogsProps {
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

export interface RequestsListingSearchProps {
  readonly searchQuery: string;
  readonly onSearchQueryChange: (value: string) => void;
}

export interface RequestsListingStateProps {
  readonly loading: boolean;
  readonly hasRows: boolean;
}
