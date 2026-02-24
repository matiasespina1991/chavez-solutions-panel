'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';

/**
 * Simplified navigation hook.
 * Firebase auth/analytics will drive visibility later; for now everything stays visible.
 */
export function useFilteredNavItems(items: NavItem[]) {
  const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV ?? 'dev';
  const restrictNav = deployEnv === 'prod';

  return useMemo(() => {
    if (!restrictNav) {
      return items;
    }

    const allowedUrls = new Set([
      '/dashboard/service-requests',
      '/dashboard/work-orders',
      '/dashboard/settings',
      '/dashboard/configurator'
    ]);

    const filterItems = (entries: NavItem[]): NavItem[] =>
      entries
        .map((entry) => ({
          ...entry,
          items: entry.items ? filterItems(entry.items) : []
        }))
        .filter(
          (entry) =>
            allowedUrls.has(entry.url) ||
            (entry.items && entry.items.length > 0)
        );

    return filterItems(items);
  }, [items, restrictNav]);
}
