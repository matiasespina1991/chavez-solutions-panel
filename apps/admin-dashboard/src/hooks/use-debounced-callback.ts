import * as React from 'react';

import { useCallbackRef } from '@/hooks/use-callback-ref';

export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
) {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = React.useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (debounceTimerRef.current !== null) {
        globalThis.clearTimeout(debounceTimerRef.current);
      }
    },
    []
  );

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      if (debounceTimerRef.current !== null) {
        globalThis.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = globalThis.setTimeout(
        () => handleCallback(...args),
        delay
      );
    },
    [handleCallback, delay]
  );

  return setValue;
}
