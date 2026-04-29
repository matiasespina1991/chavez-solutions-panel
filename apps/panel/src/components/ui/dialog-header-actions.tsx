import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import type { ReactNode } from 'react';

export const DIALOG_HEADER_ACTION_BUTTON_CLASS =
  'h-[2.4rem] w-[2.4rem] cursor-pointer rounded-md border bg-background p-0 transition-colors duration-150 hover:bg-muted/60';

export interface DialogHeaderAction {
  id: string;
  icon: ReactNode;
  tooltip: ReactNode;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

interface DialogHeaderActionsProps {
  readonly actions: DialogHeaderAction[];
}

export function DialogHeaderActions({ actions }: DialogHeaderActionsProps) {
  return (
    <div className='flex items-center gap-1'>
      {actions.map((action) => (
        <Tooltip key={action.id}>
          <TooltipTrigger asChild>
            <span className='inline-flex'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className={`${DIALOG_HEADER_ACTION_BUTTON_CLASS} ${action.className ?? ''}`.trim()}
                aria-label={action.ariaLabel}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.icon}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{action.tooltip}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
