'use client';

import { storage } from '@/utils/config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';

type CacheEntry = {
  url: string;
};

const CACHE_KEY = 'lbw_asset_signed_urls';
const memoryCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();
let cacheHydrated = false;

function isBrowser() {
  return typeof window !== 'undefined';
}

function hydrateCache() {
  if (cacheHydrated || !isBrowser()) return;
  cacheHydrated = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    Object.entries(parsed).forEach(([path, entry]) => {
      if (!entry?.url) return;
      memoryCache.set(path, entry);
    });
  } catch (err) {
    console.error('[assetUrl] Failed to hydrate cache', err);
  }
}

function persistCache() {
  if (!isBrowser()) return;
  try {
    const payload: Record<string, CacheEntry> = {};
    memoryCache.forEach((entry, path) => {
      payload[path] = entry;
    });
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[assetUrl] Failed to persist cache', err);
  }
}

export function buildStorageUrl(storagePath?: string | null) {
  if (!storagePath) return '';
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucket) {
    console.error('[assetUrl] Missing NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    return '';
  }
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://storage.googleapis.com/${bucket}/${encodedPath}`;
}

function pruneEntry(path: string) {
  if (!memoryCache.has(path)) return;
  memoryCache.delete(path);
  persistCache();
}

export function getCachedSignedUrl(storagePath: string) {
  hydrateCache();
  const entry = memoryCache.get(storagePath);
  if (!entry) return null;
  return entry.url;
}

export function cacheSignedUrl(storagePath: string, url: string) {
  memoryCache.set(storagePath, { url });
  persistCache();
}

export function clearCachedSignedUrl(storagePath: string) {
  if (!memoryCache.has(storagePath)) return;
  memoryCache.delete(storagePath);
  persistCache();
}

async function fetchSignedUrl(storagePath: string) {
  try {
    const signedUrl = await getDownloadURL(ref(storage, storagePath));
    cacheSignedUrl(storagePath, signedUrl);
    return signedUrl;
  } catch (err) {
    console.error('[assetUrl] Failed to resolve signed URL', storagePath, err);
    throw err;
  }
}

export async function resolveSignedUrl(storagePath: string) {
  const cached = getCachedSignedUrl(storagePath);
  if (cached) return cached;
  if (inflight.has(storagePath)) return inflight.get(storagePath)!;
  const request = fetchSignedUrl(storagePath)
    .catch((err) => {
      inflight.delete(storagePath);
      throw err;
    })
    .then((url) => {
      inflight.delete(storagePath);
      return url;
    });
  inflight.set(storagePath, request);
  return request;
}
