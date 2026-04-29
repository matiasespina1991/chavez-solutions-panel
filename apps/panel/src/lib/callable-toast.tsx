'use client';

import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSION_DENIED_TOAST_MESSAGE } from '@/lib/callable-errors';

export const showCallableErrorToast = (message: string) => {
  if (message === PERMISSION_DENIED_TOAST_MESSAGE) {
    toast.error(message, { icon: <Ban className='h-4 w-4' /> });
    return;
  }

  toast.error(message);
};
