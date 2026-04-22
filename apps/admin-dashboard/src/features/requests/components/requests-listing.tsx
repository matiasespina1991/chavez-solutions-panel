'use client';

import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  deleteProforma,
  approveProforma,
  rejectProforma,
  createWorkOrderFromRequest,
  pauseWorkOrderFromRequest,
  resumeWorkOrderFromRequest,
  generateProformaPreviewPdf,
  toProformaPreviewServiceLine
} from '@/features/configurator/services/configurations';
import { FIRESTORE_COLLECTIONS } from '@/constants/firestore';
import { normalizeMatrixArray } from '@/lib/request-normalizers';
import {
  firestoreTimestampToMs,
  formatFirestoreTimestamp
} from '@/lib/firestore-timestamps';
import type {
  RequestApprovalStatus,
  RequestListRow as RequestRow,
  RequestStatus
} from '@/types/domain';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  IconCircleCheckFilled,
  IconDotsVertical,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconSearch,
  IconTrash
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ProformaSummaryPanel } from '@/features/proformas/components/proforma-summary-panel';
import { RequestExecuteWorkOrderDialog } from '@/features/requests/components/request-execute-work-order-dialog';
import { RequestSummaryActions } from '@/features/requests/components/request-summary-actions';
import { RequestSummaryBanner } from '@/features/requests/components/request-summary-banner';
import { getFriendlyRequestErrorMessage } from '@/features/requests/lib/request-errors';
import { buildProformaPreviewPayloadFromRequestRow } from '@/features/requests/lib/request-preview';
import { showCallableErrorToast } from '@/lib/callable-toast';
import {
  formatDate,
  getApprovalStatusLabel,
  getRequestDialogBanner,
  getRowStatusLabel,
  getStatusDisplayLabel,
  getValidUntilMs,
  hasIssuedWorkOrder,
  isExpiredProforma
} from '@/features/requests/lib/request-status';

type SortKey =
  | 'reference'
  | 'client'
  | 'samples'
  | 'analyses'
  | 'status'
  | 'notes'
  | 'total'
  | 'updatedAt';

type SortDirection = 'asc' | 'desc';

export default function RequestsListing() {
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<RequestRow | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWorkOrderToggleDialogOpen, setIsWorkOrderToggleDialogOpen] =
    useState(false);
  const [rowToToggleWorkOrder, setRowToToggleWorkOrder] =
    useState<RequestRow | null>(null);
  const [workOrderToggleAction, setWorkOrderToggleAction] = useState<
    'pause' | 'resume' | null
  >(null);
  const [rowToDelete, setRowToDelete] = useState<RequestRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingWorkOrder, setIsTogglingWorkOrder] = useState(false);
  const [workOrderToggleNotes, setWorkOrderToggleNotes] = useState('');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rowToReject, setRowToReject] = useState<RequestRow | null>(null);
  const [isExecuteWorkOrderDialogOpen, setIsExecuteWorkOrderDialogOpen] =
    useState(false);
  const [rowToExecuteWorkOrder, setRowToExecuteWorkOrder] =
    useState<RequestRow | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isDialogDownloading, setIsDialogDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection('asc');
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const dialogActionButtonClass =
    'h-[2.4rem] w-[2.4rem] cursor-pointer rounded-md border bg-background p-0 transition-colors duration-150 hover:bg-muted/60';


  const openWorkOrderToggleDialog = (row: RequestRow) => {
    const workOrderIssued = hasIssuedWorkOrder(row);
    if (!workOrderIssued) return;

    const nextAction = row.status === 'work_order_paused' ? 'resume' : 'pause';
    setRowToToggleWorkOrder(row);
    setWorkOrderToggleAction(nextAction);
    setWorkOrderToggleNotes(row.notes || '');
    setIsWorkOrderToggleDialogOpen(true);
  };

  const handleConfirmWorkOrderToggle = async () => {
    if (!rowToToggleWorkOrder || !workOrderToggleAction) return;

    try {
      setIsTogglingWorkOrder(true);
      setPendingActionId(rowToToggleWorkOrder.id);

      const nextStatus: RequestStatus =
        workOrderToggleAction === 'resume'
          ? 'converted_to_work_order'
          : 'work_order_paused';

      if (workOrderToggleAction === 'resume') {
        await resumeWorkOrderFromRequest(
          rowToToggleWorkOrder.id,
          workOrderToggleNotes
        );
        toast.success(
          `Orden de trabajo ${rowToToggleWorkOrder.reference} reanudada`
        );
      } else {
        await pauseWorkOrderFromRequest(
          rowToToggleWorkOrder.id,
          workOrderToggleNotes
        );
        toast.success(
          `Orden de trabajo ${rowToToggleWorkOrder.reference} pausada`
        );
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === rowToToggleWorkOrder.id
            ? {
                ...row,
                status: nextStatus,
                notes: workOrderToggleNotes
              }
            : row
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === rowToToggleWorkOrder.id
          ? {
              ...prev,
              status: nextStatus,
              notes: workOrderToggleNotes
            }
          : prev
      );

      setIsWorkOrderToggleDialogOpen(false);
      setRowToToggleWorkOrder(null);
      setWorkOrderToggleAction(null);
      setWorkOrderToggleNotes('');
    } catch (error) {
      console.error('[Requests] toggle action error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo completar la acción.')
      );
    } finally {
      setIsTogglingWorkOrder(false);
      setPendingActionId(null);
    }
  };

  const handleWorkOrderAction = async (row: RequestRow) => {
    if (row.status === 'draft') {
      toast.error('No se puede emitir una orden de trabajo desde un borrador');
      return;
    }

    if (row.status === 'work_order_completed') {
      toast.error('La orden de trabajo ya se encuentra finalizada');
      return;
    }

    try {
      setPendingActionId(row.id);

      const workOrderIssued = hasIssuedWorkOrder(row);

      if (workOrderIssued) {
        openWorkOrderToggleDialog(row);
        return;
      } else {
        await createWorkOrderFromRequest(row.id);
        toast.success(`Orden de Trabajo emitida (${row.reference})`, {
          icon: <IconCircleCheckFilled className='h-4 w-4 text-emerald-600' />
        });
      }
    } catch (error) {
      console.error('[Requests] action error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo completar la acción de la orden de trabajo'
        )
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const handleApproveRequest = async (row: RequestRow) => {
    try {
      setPendingActionId(row.id);
      await approveProforma(row.id);
      await createWorkOrderFromRequest(row.id);

      toast.success(`Orden de trabajo ejecutada (${row.reference})`);
      const approverEmail = auth.currentUser?.email?.trim() || null;

      setRows((prev) =>
        prev.map((entry) =>
          entry.id === row.id
            ? {
                ...entry,
                status: 'converted_to_work_order',
                approvalStatus: 'approved',
                approvalActorEmail: approverEmail,
                isWorkOrder: true
              }
            : entry
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === row.id
          ? {
              ...prev,
              status: 'converted_to_work_order',
              approvalStatus: 'approved',
              approvalActorEmail: approverEmail,
              isWorkOrder: true
            }
          : prev
      );
    } catch (error) {
      console.error('[Requests] approve error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo ejecutar la orden de trabajo'
        )
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const openExecuteWorkOrderDialog = (row: RequestRow) => {
    setRowToExecuteWorkOrder(row);
    setIsExecuteWorkOrderDialogOpen(true);
  };

  const handleConfirmExecuteWorkOrder = async () => {
    if (!rowToExecuteWorkOrder) return;
    await handleApproveRequest(rowToExecuteWorkOrder);
    setIsExecuteWorkOrderDialogOpen(false);
    setRowToExecuteWorkOrder(null);
  };

  const openRejectDialog = (row: RequestRow) => {
    setRowToReject(row);
    setRejectFeedback(row.approvalFeedback || '');
    setIsRejectDialogOpen(true);
  };

  const handleConfirmRejectRequest = async () => {
    if (!rowToReject) return;

    const feedback = rejectFeedback.trim();

    if (!feedback) {
      toast.error('Debe ingresar un motivo de rechazo.');
      return;
    }

    try {
      setIsRejecting(true);
      setPendingActionId(rowToReject.id);

      await rejectProforma(rowToReject.id, feedback);

      toast.success(`Proforma ${rowToReject.reference} rechazada`);

      setRows((prev) =>
        prev.map((entry) =>
          entry.id === rowToReject.id
            ? {
                ...entry,
                status: 'draft',
                approvalStatus: 'rejected',
                approvalFeedback: feedback
              }
            : entry
        )
      );

      setSelectedRow((prev) =>
        prev && prev.id === rowToReject.id
          ? {
              ...prev,
              status: 'draft',
              approvalStatus: 'rejected',
              approvalFeedback: feedback
            }
          : prev
      );

      setIsRejectDialogOpen(false);
      setRowToReject(null);
      setRejectFeedback('');
    } catch (error) {
      console.error('[Requests] reject error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo rechazar la proforma')
      );
    } finally {
      setIsRejecting(false);
      setPendingActionId(null);
    }
  };

  const handleDeleteRequest = async () => {
    if (!rowToDelete) return;

    try {
      setIsDeleting(true);
      await deleteProforma(rowToDelete.id);
      toast.success('Solicitud eliminada correctamente');
      setIsDeleteDialogOpen(false);
      setRowToDelete(null);
      if (selectedRow?.id === rowToDelete.id) {
        setIsViewDialogOpen(false);
        setSelectedRow(null);
      }
    } catch (error) {
      console.error('[Requests] delete error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(error, 'No se pudo eliminar la solicitud')
      );
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleDialogDelete = () => {
    if (!selectedRow) return;
    setRowToDelete(selectedRow);
    setIsDeleteDialogOpen(true);
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

  const handleDialogResumeWorkOrder = () => {
    if (!selectedRow || selectedRow.status !== 'work_order_paused') return;
    openWorkOrderToggleDialog(selectedRow);
  };

  const handleDialogDownload = async () => {
    if (!selectedRow) return;

    try {
      setIsDialogDownloading(true);
      const result = await generateProformaPreviewPdf(
        buildProformaPreviewPayloadFromRequestRow(
          selectedRow,
          toProformaPreviewServiceLine
        )
      );

      const link = document.createElement('a');
      link.href = result.downloadURL;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF de proforma descargado.');
    } catch (error) {
      console.error('[Requests] download pdf error', error);
      showCallableErrorToast(
        getFriendlyRequestErrorMessage(
          error,
          'No se pudo descargar el PDF de la proforma.'
        )
      );
    } finally {
      setIsDialogDownloading(false);
    }
  };

  useEffect(() => {
    const requestsQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.REQUESTS),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const nextRows: RequestRow[] = snapshot.docs.map((docSnap) => {
          const value = docSnap.data() as Record<string, unknown>;

          const isWorkOrder = Boolean(value.isWorkOrder);
          const matrix = normalizeMatrixArray(value.matrix);
          const status =
            (value.status as RequestStatus) ?? ('draft' as RequestStatus);

          const rawApprovalStatus =
            typeof value.approval === 'object' && value.approval !== null
              ? (value.approval as { status?: unknown }).status
              : null;

          const approvalStatus: RequestApprovalStatus | null =
            rawApprovalStatus === 'pending' ||
            rawApprovalStatus === 'approved' ||
            rawApprovalStatus === 'rejected'
              ? rawApprovalStatus
              : null;

          const approvalFeedback =
            typeof value.approval === 'object' && value.approval !== null
              ? String((value.approval as { feedback?: string }).feedback ?? '')
              : '';
          const approvalActorEmail =
            typeof value.approval === 'object' && value.approval !== null
              ? String(
                  (
                    value.approval as {
                      approvedBy?: { email?: string | null } | null;
                    }
                  ).approvedBy?.email ?? ''
                ).trim() || null
              : null;
          const total =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number((value.pricing as { total?: number | null }).total ?? 0)
              : 0;
          const subtotal =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { subtotal?: number | null }).subtotal ?? 0
                )
              : 0;
          const taxPercent =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { taxPercent?: number | null })
                    .taxPercent ?? 15
                )
              : 15;
          const validDays =
            typeof value.pricing === 'object' && value.pricing !== null
              ? Number(
                  (value.pricing as { validDays?: number | null }).validDays ??
                    0
                )
              : 0;

          const createdAtMs =
            firestoreTimestampToMs(value.createdAt) ||
            firestoreTimestampToMs(value.updatedAt);

          const agreedCount =
            typeof value.samples === 'object' && value.samples !== null
              ? Number(
                  (value.samples as { agreedCount?: number }).agreedCount ?? 0
                )
              : 0;

          const legacyAnalysesCount =
            typeof value.analyses === 'object' && value.analyses !== null
              ? Array.isArray((value.analyses as { items?: unknown[] }).items)
                ? ((value.analyses as { items?: unknown[] }).items?.length ?? 0)
                : 0
              : 0;

          const clientBusinessName =
            typeof value.client === 'object' && value.client !== null
              ? String(
                  (value.client as { businessName?: string }).businessName ?? ''
                )
              : '';

          const client =
            typeof value.client === 'object' && value.client !== null
              ? {
                  businessName: String(
                    (value.client as { businessName?: string }).businessName ??
                      ''
                  ),
                  taxId: String(
                    (value.client as { taxId?: string }).taxId ?? ''
                  ),
                  contactName: String(
                    (value.client as { contactName?: string }).contactName ?? ''
                  ),
                  address: String(
                    (value.client as { address?: string }).address ?? ''
                  ),
                  city: String((value.client as { city?: string }).city ?? ''),
                  email: String(
                    (value.client as { email?: string }).email ?? ''
                  ),
                  phone: String(
                    (value.client as { phone?: string }).phone ?? ''
                  )
                }
              : {
                  businessName: '',
                  taxId: '',
                  contactName: '',
                  address: '',
                  city: '',
                  email: '',
                  phone: ''
                };

          const sampleItems =
            typeof value.samples === 'object' && value.samples !== null
              ? Array.isArray((value.samples as { items?: unknown[] }).items)
                ? ((value.samples as { items?: unknown[] }).items ?? []).map(
                    (item) => {
                      const rowItem = item as {
                        sampleCode?: string;
                        sampleType?: string;
                      };
                      return {
                        sampleCode: String(rowItem.sampleCode ?? '—'),
                        sampleType: String(rowItem.sampleType ?? 'Sin tipo')
                      };
                    }
                  )
                : []
              : [];

          const analysisItems =
            typeof value.analyses === 'object' && value.analyses !== null
              ? Array.isArray((value.analyses as { items?: unknown[] }).items)
                ? ((value.analyses as { items?: unknown[] }).items ?? []).map(
                    (item) => {
                      const rowItem = item as {
                        parameterLabelEs?: string;
                        unitPrice?: number | null;
                      };
                      return {
                        parameterLabelEs: String(
                          rowItem.parameterLabelEs ?? 'Parámetro'
                        ),
                        unitPrice: Number(rowItem.unitPrice ?? 0)
                      };
                    }
                  )
                : []
              : [];

          const rawServiceItems =
            value.services &&
            typeof value.services === 'object' &&
            !Array.isArray(value.services)
              ? (value.services as { items?: unknown[] }).items
              : Array.isArray(value.services)
                ? (value.services as unknown[])
                : [];

          const serviceItems = Array.isArray(rawServiceItems)
            ? rawServiceItems.map((item, index) => {
                const rowItem = item as {
                  serviceId?: string;
                  parameterId?: string;
                  parameterLabel?: string;
                  tableLabel?: string | null;
                  unit?: string | null;
                  method?: string | null;
                  rangeMin?: string;
                  rangeMax?: string;
                  quantity?: number;
                  unitPrice?: number | null;
                  discountAmount?: number | null;
                };
                const unitPrice = Number(rowItem.unitPrice ?? 0);
                const discountAmount = Number(rowItem.discountAmount ?? 0);
                return {
                  serviceId: String(
                    rowItem.serviceId ??
                      rowItem.parameterId ??
                      `service-${index}`
                  ),
                  parameterId: String(
                    rowItem.parameterId ?? rowItem.serviceId ?? `p-${index}`
                  ),
                  parameterLabel: String(
                    rowItem.parameterLabel ?? rowItem.parameterId ?? 'Servicio'
                  ),
                  tableLabel:
                    typeof rowItem.tableLabel === 'string'
                      ? rowItem.tableLabel
                      : null,
                  unit: typeof rowItem.unit === 'string' ? rowItem.unit : null,
                  method:
                    typeof rowItem.method === 'string' ? rowItem.method : null,
                  rangeMin: String(rowItem.rangeMin ?? ''),
                  rangeMax: String(rowItem.rangeMax ?? ''),
                  quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
                  unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
                  discountAmount:
                    Number.isFinite(discountAmount) && discountAmount >= 0
                      ? discountAmount
                      : 0
                };
              })
            : [];

          const normalizedServiceItems =
            serviceItems.length > 0
              ? serviceItems
              : analysisItems.map((analysis, index) => ({
                  serviceId: `legacy-${index}`,
                  parameterId: `legacy-${index}`,
                  parameterLabel: analysis.parameterLabelEs,
                  tableLabel: null,
                  unit: null,
                  method: null,
                  rangeMin: '',
                  rangeMax: '',
                  quantity: agreedCount > 0 ? agreedCount : 1,
                  unitPrice: Number(analysis.unitPrice ?? 0),
                  discountAmount: 0
                }));

          const rawGroupedServiceItems =
            value.services &&
            typeof value.services === 'object' &&
            !Array.isArray(value.services)
              ? (value.services as { grouped?: unknown[] }).grouped
              : [];

          const serviceGroups = Array.isArray(rawGroupedServiceItems)
            ? rawGroupedServiceItems
                .map((group, groupIndex) => {
                  const groupValue = group as {
                    name?: string;
                    items?: unknown[];
                  };
                  const mappedItems = Array.isArray(groupValue.items)
                    ? groupValue.items.map((item, itemIndex) => {
                        const rowItem = item as {
                          serviceId?: string;
                          parameterId?: string;
                          parameterLabel?: string;
                          tableLabel?: string | null;
                          unit?: string | null;
                          method?: string | null;
                          rangeMin?: string | null;
                          rangeMax?: string | null;
                          quantity?: number;
                          unitPrice?: number | null;
                          discountAmount?: number | null;
                        };
                        const unitPrice = Number(rowItem.unitPrice ?? 0);
                        const discountAmount = Number(
                          rowItem.discountAmount ?? 0
                        );
                        return {
                          serviceId: String(
                            rowItem.serviceId ??
                              rowItem.parameterId ??
                              `grouped-service-${groupIndex}-${itemIndex}`
                          ),
                          parameterId: String(
                            rowItem.parameterId ??
                              rowItem.serviceId ??
                              `grouped-parameter-${groupIndex}-${itemIndex}`
                          ),
                          parameterLabel: String(
                            rowItem.parameterLabel ??
                              rowItem.parameterId ??
                              'Servicio'
                          ),
                          tableLabel:
                            typeof rowItem.tableLabel === 'string'
                              ? rowItem.tableLabel
                              : null,
                          unit:
                            typeof rowItem.unit === 'string'
                              ? rowItem.unit
                              : null,
                          method:
                            typeof rowItem.method === 'string'
                              ? rowItem.method
                              : null,
                          rangeMin: String(rowItem.rangeMin ?? ''),
                          rangeMax: String(rowItem.rangeMax ?? ''),
                          quantity: Math.max(1, Number(rowItem.quantity ?? 1)),
                          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
                          discountAmount:
                            Number.isFinite(discountAmount) &&
                            discountAmount >= 0
                              ? discountAmount
                              : 0
                        };
                      })
                    : [];

                  return {
                    id: `group-${groupIndex}`,
                    name: String(
                      groupValue.name?.trim() || `Combo ${groupIndex + 1}`
                    ),
                    items: mappedItems
                  };
                })
                .filter((group) => group.items.length > 0)
            : [];

          const normalizedServiceGroups =
            serviceGroups.length > 0
              ? serviceGroups
              : normalizedServiceItems.length > 0
                ? [
                    {
                      id: 'fallback-group',
                      name: 'Combo 1',
                      items: normalizedServiceItems.map((item) => ({
                        serviceId: item.serviceId,
                        parameterId: item.parameterId,
                        parameterLabel: item.parameterLabel,
                        tableLabel: item.tableLabel,
                        unit: item.unit,
                        method: item.method,
                        rangeMin: item.rangeMin,
                        rangeMax: item.rangeMax,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discountAmount: item.discountAmount
                      }))
                    }
                  ]
                : [];

          return {
            id: docSnap.id,
            reference: String(value.reference ?? '—'),
            notes: String(value.notes ?? ''),
            isWorkOrder,
            matrix,
            status,
            approvalStatus,
            approvalActorEmail,
            approvalFeedback,
            validDays:
              Number.isFinite(validDays) && validDays > 0 ? validDays : null,
            createdAtMs,
            client,
            serviceItems: normalizedServiceItems,
            serviceGroups: normalizedServiceGroups,
            sampleItems,
            analysisItems,
            taxPercent: Number.isFinite(taxPercent) ? taxPercent : 15,
            clientBusinessName: clientBusinessName || '—',
            agreedCount,
            analysesCount: normalizedServiceItems.length || legacyAnalysesCount,
            total: Number.isFinite(total) ? total : 0,
            subtotal: Number.isFinite(subtotal) ? subtotal : 0,
            updatedAtLabel: formatFirestoreTimestamp(value.updatedAt),
            updatedAtMs: firestoreTimestampToMs(value.updatedAt)
          };
        });

        setRows(nextRows);
        setLoading(false);
      },
      (error) => {
        console.error('[Requests] load error', error);
        setRows([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedRow) return;

    const refreshedSelected = rows.find((row) => row.id === selectedRow.id);
    if (!refreshedSelected) {
      setIsViewDialogOpen(false);
      setSelectedRow(null);
      return;
    }

    setSelectedRow(refreshedSelected);
  }, [rows, selectedRow]);

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
        case 'reference':
          compare = collator.compare(left.reference, right.reference);
          break;
        case 'client':
          compare = collator.compare(
            left.clientBusinessName,
            right.clientBusinessName
          );
          break;
        case 'samples':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'analyses':
          compare = left.analysesCount - right.analysesCount;
          break;
        case 'status':
          compare = collator.compare(
            getRowStatusLabel(left),
            getRowStatusLabel(right)
          );
          break;
        case 'notes':
          compare = collator.compare(
            getString(left.notes),
            getString(right.notes)
          );
          break;
        case 'total':
          compare = left.total - right.total;
          break;
        case 'updatedAt':
          compare = left.updatedAtMs - right.updatedAtMs;
          break;
        default:
          compare = 0;
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

      <div className='max-w-full overflow-x-hidden rounded-md border'>
        <div className='max-h-[calc(100vh-240px)] overflow-x-hidden overflow-y-auto'>
          <table className='w-full table-fixed text-left text-sm'>
            <thead className='bg-muted text-muted-foreground sticky top-0 z-10'>
              <tr>
                <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('reference')}
                  >
                    Referencia{getSortIndicator('reference')}
                  </button>
                </th>
                <th className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('status')}
                  >
                    Estado{getSortIndicator('status')}
                  </button>
                </th>
                <th className='w-[8rem] px-3 py-3 md:w-[10rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('client')}
                  >
                    Cliente{getSortIndicator('client')}
                  </button>
                </th>
                <th className='w-[4.5rem] px-3 py-3 text-right md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('samples')}
                  >
                    Servicios{getSortIndicator('samples')}
                  </button>
                </th>
                <th className='w-[5.5rem] px-3 py-3 text-right md:w-[6rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('total')}
                  >
                    Total{getSortIndicator('total')}
                  </button>
                </th>
                <th className='w-[10rem] px-3 py-3 md:w-[19rem] md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('updatedAt')}
                  >
                    Última Actualización{getSortIndicator('updatedAt')}
                  </button>
                </th>
                <th className='min-w-0 px-3 py-3 md:px-4'>
                  <button
                    type='button'
                    className='cursor-pointer select-none'
                    onClick={() => handleSort('notes')}
                  >
                    Notas{getSortIndicator('notes')}
                  </button>
                </th>
                <th className='w-10 px-1 py-3 text-right md:w-12 md:px-2'></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const workOrderIssued = hasIssuedWorkOrder(row);
                const isWorkOrderPaused = row.status === 'work_order_paused';
                const isWorkOrderCompleted =
                  row.status === 'work_order_completed';
                const isDraft = row.status === 'draft';
                const isProformaExpired = isExpiredProforma(row);
                const canApproveProforma =
                  row.status === 'submitted' &&
                  !workOrderIssued &&
                  row.approvalStatus !== 'approved';
                const canRejectProforma =
                  row.status === 'submitted' && !workOrderIssued;
                const shouldBlockEmissionByApproval =
                  row.status === 'submitted' &&
                  !workOrderIssued &&
                  row.approvalStatus !== 'approved';

                return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer border-t transition-colors duration-200 ${
                      isWorkOrderCompleted
                        ? 'bg-emerald-50/40 hover:bg-emerald-50/40 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/10'
                        : 'hover:bg-muted/40'
                    }`}
                    onClick={() => {
                      setSelectedRow(row);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <td className='w-[8rem] px-3 py-3 md:w-[11rem] md:px-4'>
                      <span className={isDraft ? 'text-destructive' : ''}>
                        {row.reference}
                      </span>
                      {row.status === 'draft' ? (
                        <span className='text-muted-foreground ml-1 text-xs'>
                          {row.approvalStatus === 'rejected'
                            ? '(rechazada)'
                            : '(borrador)'}
                        </span>
                      ) : null}

                      {isProformaExpired && (
                        <span className='text-muted-foreground ml-1 text-xs'>
                          (vencida)
                        </span>
                      )}
                    </td>
                    <td
                      className={`w-[8rem] px-3 py-3 md:w-[11rem] md:px-4 ${
                        isProformaExpired ? 'text-destructive' : ''
                      }`}
                    >
                      {getStatusDisplayLabel(row)}
                    </td>
                    <td className='w-[8rem] px-3 py-3 md:w-[10rem] md:px-4'>
                      <span className='block w-full max-w-full truncate'>
                        {row.clientBusinessName}
                      </span>
                    </td>
                    <td className='w-[4.5rem] px-3 py-3 text-right md:px-4'>
                      {row.analysesCount}
                    </td>
                    <td className='w-[5.5rem] px-3 py-3 text-right md:w-[6rem] md:px-4'>
                      ${row.total.toFixed(2).replace('.', ',')}
                    </td>
                    <td className='w-[10rem] px-3 py-3 md:w-[19rem] md:px-4'>
                      <span className='block w-full max-w-full truncate'>
                        {row.updatedAtLabel}
                      </span>
                    </td>
                    <td className='min-w-0 px-3 py-3 md:px-4'>
                      {row.notes?.trim() ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className='block w-full max-w-full truncate align-bottom'>
                              {row.notes}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side='bottom'
                            className='max-w-[28rem] break-words whitespace-pre-wrap'
                          >
                            {row.notes}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className='w-10 px-1 py-3 text-right md:w-12 md:px-2'>
                      <div
                        className='flex justify-end'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              className='h-8 w-8 cursor-pointer p-0'
                              disabled={pendingActionId === row.id}
                            >
                              <span className='sr-only'>Abrir acciones</span>
                              <IconDotsVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end' side='bottom'>
                            <DropdownMenuItem
                              className='cursor-pointer transition-colors duration-150'
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedRow(row);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              Ver solicitud
                            </DropdownMenuItem>
                            {!isWorkOrderCompleted ? (
                              <>
                                {workOrderIssued && !isWorkOrderPaused ? (
                                  <Tooltip delayDuration={2000}>
                                    <TooltipTrigger asChild>
                                      <span className='block'>
                                        <DropdownMenuItem
                                          disabled
                                          className='text-muted-foreground cursor-not-allowed opacity-60'
                                        >
                                          Editar solicitud...
                                        </DropdownMenuItem>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      No se puede editar una orden de trabajo ya
                                      emitida
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <DropdownMenuItem
                                    className='cursor-pointer transition-colors duration-150'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      router.push(
                                        `/dashboard/configurator?requestId=${encodeURIComponent(row.id)}&tab=services`
                                      );
                                    }}
                                  >
                                    Editar solicitud...
                                  </DropdownMenuItem>
                                )}
                                {canApproveProforma ? (
                                  <DropdownMenuItem
                                    className='cursor-pointer justify-start text-emerald-600 transition-colors duration-150 focus:text-emerald-600'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openExecuteWorkOrderDialog(row);
                                    }}
                                    disabled={pendingActionId === row.id}
                                  >
                                    Ejecutar orden de trabajo
                                  </DropdownMenuItem>
                                ) : null}
                                {canRejectProforma ? (
                                  <DropdownMenuItem
                                    className='text-destructive focus:text-destructive cursor-pointer justify-start transition-colors duration-150'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openRejectDialog(row);
                                    }}
                                    disabled={pendingActionId === row.id}
                                  >
                                    Rechazar proforma
                                  </DropdownMenuItem>
                                ) : null}
                                {isDraft ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className='block'>
                                        <DropdownMenuItem
                                          disabled
                                          className='text-muted-foreground focus:text-muted-foreground cursor-not-allowed justify-start opacity-60'
                                        >
                                          Emitir orden de trabajo
                                        </DropdownMenuItem>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Finalice el borrador para poder emitir una
                                      Orden de trabajo
                                    </TooltipContent>
                                  </Tooltip>
                                ) : shouldBlockEmissionByApproval ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className='block'>
                                        <DropdownMenuItem
                                          disabled
                                          className='text-muted-foreground focus:text-muted-foreground cursor-not-allowed justify-start opacity-60'
                                        >
                                          Emitir orden de trabajo
                                        </DropdownMenuItem>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Debe aprobar la proforma antes de emitir
                                      la orden de trabajo
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <DropdownMenuItem
                                    className={`cursor-pointer justify-start transition-colors duration-150 ${
                                      !workOrderIssued
                                        ? 'text-foreground focus:text-foreground'
                                        : isWorkOrderPaused
                                          ? 'text-emerald-600 focus:text-emerald-600'
                                          : 'text-destructive focus:text-destructive'
                                    }`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleWorkOrderAction(row);
                                    }}
                                    disabled={pendingActionId === row.id}
                                  >
                                    {workOrderIssued ? (
                                      isWorkOrderPaused ? (
                                        <span className='inline-flex items-center justify-start gap-0'>
                                          <IconPlayerPlayFilled
                                            className='h-[0.64rem] w-[0.64rem] text-emerald-600'
                                            style={{
                                              transform: 'scale(0.9)',
                                              marginRight: '5px'
                                            }}
                                          />
                                          <span>Reanudar orden de trabajo</span>
                                        </span>
                                      ) : (
                                        <span className='inline-flex items-center justify-start gap-0'>
                                          <IconPlayerPauseFilled
                                            className='text-destructive h-[0.64rem] w-[0.64rem]'
                                            style={{
                                              transform: 'scale(0.9)',
                                              marginRight: '5px'
                                            }}
                                          />
                                          <span>Pausar</span>
                                        </span>
                                      )
                                    ) : (
                                      'Emitir orden de trabajo'
                                    )}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className='text-destructive focus:text-destructive cursor-pointer transition-colors duration-150'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setRowToDelete(row);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  disabled={isDeleting}
                                >
                                  <span className='inline-flex items-center justify-start gap-0'>
                                    <IconTrash
                                      className='text-destructive h-[0.64rem] w-[0.64rem]'
                                      style={{
                                        transform: 'scale(0.9)',
                                        marginRight: '5px'
                                      }}
                                    />
                                    <span>Eliminar Solicitud</span>
                                  </span>
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!hasVisibleRows ? (
            <div className='text-muted-foreground border-t p-8 text-center text-sm'>
              No se encontraron solicitudes para la búsqueda actual.
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
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
                onOpenExecuteWorkOrderDialog={openExecuteWorkOrderDialog}
                onWorkOrderAction={(row) => {
                  void handleWorkOrderAction(row);
                }}
                onEdit={handleDialogEdit}
                onDownload={() => {
                  void handleDialogDownload();
                }}
                onDelete={handleDialogDelete}
              />
            </div>
          </DialogHeader>

          {selectedRow && (
            <div className='max-h-[calc(90vh-88px)] overflow-y-auto overscroll-none'>
              <div className='space-y-5 px-6 py-5'>
                <RequestSummaryBanner
                  row={selectedRow}
                  banner={getRequestDialogBanner(selectedRow)}
                  onExecute={openExecuteWorkOrderDialog}
                  onEdit={handleDialogEdit}
                  onResume={handleDialogResumeWorkOrder}
                />
                <ProformaSummaryPanel
                  typeLabel={
                    selectedRow.isWorkOrder ? 'Proforma + OT' : 'Proforma'
                  }
                  reference={selectedRow.reference}
                  workOrderExecutedByEmail={
                    selectedRow.approvalStatus === 'approved'
                      ? (selectedRow.approvalActorEmail ?? null)
                      : null
                  }
                  validDaysLabel={
                    selectedRow.validDays
                      ? `${selectedRow.validDays} días`
                      : '—'
                  }
                  validUntilLabel={formatDate(
                    getValidUntilMs(
                      selectedRow.createdAtMs,
                      selectedRow.validDays
                    )
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

      <AlertDialog
        open={isWorkOrderToggleDialogOpen}
        onOpenChange={(open) => {
          if (isTogglingWorkOrder) return;
          setIsWorkOrderToggleDialogOpen(open);
          if (!open) {
            setRowToToggleWorkOrder(null);
            setWorkOrderToggleAction(null);
            setWorkOrderToggleNotes('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {workOrderToggleAction === 'resume'
                ? 'Confirmar reanudación de orden de trabajo'
                : 'Confirmar pausa de orden de trabajo'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {workOrderToggleAction === 'resume'
                ? '¿Está seguro de que desea reanudar esta orden de trabajo?'
                : '¿Está seguro de que desea pausar esta orden de trabajo?'}
            </AlertDialogDescription>
            <div className='space-y-2 pt-1'>
              <label className='text-sm font-medium'>Notas</label>
              <Textarea
                value={workOrderToggleNotes}
                onChange={(event) =>
                  setWorkOrderToggleNotes(event.target.value)
                }
                placeholder='Ingrese notas para la solicitud y la orden de trabajo'
                rows={4}
                disabled={isTogglingWorkOrder}
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isTogglingWorkOrder}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='cursor-pointer bg-black text-white hover:bg-black/90 disabled:bg-black disabled:text-white'
              onClick={handleConfirmWorkOrderToggle}
              disabled={isTogglingWorkOrder}
            >
              {isTogglingWorkOrder
                ? workOrderToggleAction === 'resume'
                  ? 'Reanudando…'
                  : 'Pausando…'
                : workOrderToggleAction === 'resume'
                  ? 'Reanudar orden de trabajo'
                  : 'Pausar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setIsDeleteDialogOpen(open);
          if (!open) setRowToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar eliminación de solicitud
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar esta solicitud? Esta acción la
              removerá y no podrá deshacerse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='cursor-pointer' disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 cursor-pointer text-white'
              onClick={handleDeleteRequest}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando…' : 'Eliminar Solicitud'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isRejectDialogOpen}
        onOpenChange={(open) => {
          if (isRejecting) return;
          setIsRejectDialogOpen(open);
          if (!open) {
            setRowToReject(null);
            setRejectFeedback('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar proforma</AlertDialogTitle>
            <AlertDialogDescription>
              Indique el motivo de rechazo para devolver la solicitud a
              borrador.
            </AlertDialogDescription>
            <div className='space-y-2 pt-1'>
              <label className='text-sm font-medium'>Motivo de rechazo</label>
              <Textarea
                value={rejectFeedback}
                onChange={(event) => setRejectFeedback(event.target.value)}
                placeholder='Escriba el motivo de rechazo'
                rows={4}
                disabled={isRejecting}
              />
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className='cursor-pointer'
              disabled={isRejecting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive hover:bg-destructive/90 disabled:bg-destructive cursor-pointer text-white disabled:text-white'
              onClick={handleConfirmRejectRequest}
              disabled={isRejecting}
            >
              {isRejecting ? 'Rechazando…' : 'Rechazar proforma'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
