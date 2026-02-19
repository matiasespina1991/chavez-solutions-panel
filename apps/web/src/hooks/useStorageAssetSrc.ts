'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssetFile } from '@/utils/types/media';
import {
  clearCachedSignedUrl,
  getCachedSignedUrl,
  resolveSignedUrl,
} from '@/utils/storage/assetUrl';

type Mode = 'none' | 'signed';

type Options = {
  preferDirect?: boolean;
};

export function useStorageAssetSrc(
  asset?: AssetFile | null,
  _options?: Options
) {
  const storagePath = asset?.storagePath ?? '';
  const cachedSigned = useMemo(
    () => (storagePath ? getCachedSignedUrl(storagePath) : null),
    [storagePath]
  );
  const initialSrc = cachedSigned || '';

  const [src, setSrc] = useState(initialSrc);
  const [mode, setMode] = useState<Mode>(() => {
    if (!storagePath) return 'none';
    return cachedSigned ? 'signed' : 'none';
  });

  const triedSignedRef = useRef<boolean>(Boolean(cachedSigned));
  const resolvingRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setSrc(initialSrc);
    if (!storagePath) {
      setMode('none');
    } else {
      setMode(cachedSigned ? 'signed' : 'none');
    }
    triedSignedRef.current = Boolean(cachedSigned);
  }, [initialSrc, storagePath, cachedSigned]);

  const attemptSigned = useCallback(async () => {
    if (!storagePath) return;
    if (resolvingRef.current) return resolvingRef.current;
    const promise = (async () => {
      triedSignedRef.current = true;
      try {
        const signedUrl = await resolveSignedUrl(storagePath);
        setSrc(signedUrl);
        setMode('signed');
      } catch (err) {
        console.error(
          '[useStorageAssetSrc] Signed URL resolution failed',
          storagePath,
          err
        );
        clearCachedSignedUrl(storagePath);
        setSrc('');
        setMode('none');
        triedSignedRef.current = false;
      } finally {
        resolvingRef.current = null;
      }
    })();
    resolvingRef.current = promise;
    return promise;
  }, [storagePath]);

  useEffect(() => {
    if (!storagePath) return;
    if (cachedSigned) return;
    attemptSigned();
  }, [storagePath, cachedSigned, attemptSigned]);

  const handleError = useCallback(() => {
    if (!storagePath) return;
    clearCachedSignedUrl(storagePath);
    triedSignedRef.current = false;
    setSrc('');
    setMode('none');
    attemptSigned();
  }, [attemptSigned, storagePath]);

  return {
    src,
    usingSignedUrl: mode === 'signed',
    hasSource: Boolean(src),
    handleError,
    forceSigned: attemptSigned,
  };
}
