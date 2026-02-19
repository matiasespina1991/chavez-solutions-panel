'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildStorageUrl,
  clearCachedSignedUrl,
  getCachedSignedUrl,
  resolveSignedUrl
} from '@/lib/asset-url';

type AssetFile = {
  storagePath?: string | null;
  downloadURL?: string | null;
};

type Mode = 'none' | 'direct' | 'storage' | 'signed';

type Options = {
  preferDirect?: boolean;
};

export function useStorageAssetSrc(
  asset?: AssetFile | null,
  options?: Options
) {
  const preferDirect = options?.preferDirect ?? true;
  const directUrl = preferDirect ? (asset?.downloadURL ?? '') : '';
  const storagePath = asset?.storagePath ?? '';
  const storageUrl = useMemo(
    () => buildStorageUrl(storagePath) || '',
    [storagePath]
  );
  const cachedSigned = useMemo(
    () => (storagePath ? getCachedSignedUrl(storagePath) : null),
    [storagePath]
  );
  const initialSrc = directUrl || cachedSigned || storageUrl;

  const [src, setSrc] = useState(initialSrc);
  const [mode, setMode] = useState<Mode>(() => {
    if (directUrl) return 'direct';
    if (!storagePath) return 'none';
    return cachedSigned ? 'signed' : 'storage';
  });

  const triedSignedRef = useRef<boolean>(Boolean(cachedSigned));
  const resolvingRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    setSrc(initialSrc);
    if (directUrl) {
      setMode('direct');
    } else if (!storagePath) {
      setMode('none');
    } else {
      setMode(cachedSigned ? 'signed' : 'storage');
    }
    triedSignedRef.current = Boolean(cachedSigned);
  }, [initialSrc, storagePath, cachedSigned, directUrl]);

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
        setSrc(storageUrl);
        setMode(storageUrl ? 'storage' : 'none');
        triedSignedRef.current = false;
      } finally {
        resolvingRef.current = null;
      }
    })();
    resolvingRef.current = promise;
    return promise;
  }, [storagePath, storageUrl]);

  // If preferDirect is false and we don't have a signed URL, fetch it immediately
  useEffect(() => {
    if (
      !preferDirect &&
      storagePath &&
      !cachedSigned &&
      !resolvingRef.current
    ) {
      attemptSigned();
    }
  }, [preferDirect, storagePath, cachedSigned, attemptSigned]);

  const fallbackToStorage = useCallback(() => {
    setSrc(storageUrl);
    setMode(storageUrl ? 'storage' : 'none');
  }, [storageUrl]);

  const handleError = useCallback(() => {
    if (!storagePath) return;
    if (mode === 'direct') {
      fallbackToStorage();
      triedSignedRef.current = false;
      attemptSigned();
    } else if (mode === 'storage') {
      if (triedSignedRef.current) {
        return;
      }
      attemptSigned();
    } else if (mode === 'signed') {
      clearCachedSignedUrl(storagePath);
      triedSignedRef.current = false;
      fallbackToStorage();
      attemptSigned();
    }
  }, [attemptSigned, fallbackToStorage, mode, storagePath]);

  return {
    src,
    usingSignedUrl: mode === 'signed',
    hasSource: Boolean(src),
    handleError,
    forceSigned: attemptSigned
  };
}
