import type { RequestListRow as RequestRow } from '@/types/domain';

interface RequestDialogBanner {
  className: string;
  text: string;
}

interface RequestSummaryBannerProps {
  row: RequestRow;
  banner: RequestDialogBanner | null;
  onExecute: (row: RequestRow) => void;
  onEdit: () => void;
  onResume: () => void;
}

export function RequestSummaryBanner({
  row,
  banner,
  onExecute,
  onEdit,
  onResume
}: RequestSummaryBannerProps) {
  if (!banner) return null;

  return (
    <div className={`${banner.className} mx-0 mt-0 flex items-center justify-start gap-1`}>
      {row.status === 'submitted' && row.approvalStatus !== 'approved' ? (
        <span>
          Proforma lista. Preparada para ejecutar orden de trabajo.{' '}
          <button
            type='button'
            className='cursor-pointer text-blue-600 underline underline-offset-2 hover:text-blue-500'
            onClick={() => onExecute(row)}
          >
            Ejecutar
          </button>
        </span>
      ) : (
        <span>{banner.text}</span>
      )}

      {row.status === 'draft' ? (
        <button
          type='button'
          className='cursor-pointer text-blue-600 underline underline-offset-2 hover:text-blue-500'
          onClick={onEdit}
        >
          Editar
        </button>
      ) : row.status === 'work_order_paused' ? (
        <button
          type='button'
          className='cursor-pointer text-blue-600 underline underline-offset-2 hover:text-blue-500'
          onClick={onResume}
        >
          Reanudar
        </button>
      ) : null}
    </div>
  );
}
