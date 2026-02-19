'use client';

import { navItems } from '@/config/nav-config';
import { db } from '@/lib/firebase';
import { usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { title: 'Organizador de Obras', link: '/dashboard/works-organizer' }
  ]
  // Add more custom mappings as needed
};

function buildNavTitleMap() {
  const map = new Map<string, string>();
  const walk = (items: typeof navItems) => {
    items.forEach((item) => {
      if (item.url && item.url !== '#') {
        map.set(item.url, item.title);
      }
      if (item.items?.length) {
        walk(item.items);
      }
    });
  };
  walk(navItems);
  return map;
}

export function useBreadcrumbs() {
  const pathname = usePathname();
  const [exhibitionTitle, setExhibitionTitle] = useState<string | null>(null);
  const [exhibitionId, setExhibitionId] = useState<string | null>(null);

  useEffect(() => {
    const match = pathname.match(/^\/dashboard\/exhibitions\/([^/]+)$/);
    if (!match) {
      setExhibitionId(null);
      setExhibitionTitle(null);
      return;
    }
    const nextId = match[1];
    setExhibitionId(nextId);
    let isActive = true;

    getDoc(doc(db, 'exhibitions', nextId))
      .then((snap) => {
        if (!isActive) return;
        const data = snap.data() as { title?: string } | undefined;
        setExhibitionTitle(data?.title?.trim() || null);
      })
      .catch(() => {
        if (isActive) setExhibitionTitle(null);
      });

    return () => {
      isActive = false;
    };
  }, [pathname]);

  const breadcrumbs = useMemo(() => {
    const navTitleMap = buildNavTitleMap();
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments
        .slice(0, index + 1)

        .join('/')}`;
      const mappedTitle = navTitleMap.get(path);
      const isExhibitionDetail =
        exhibitionId && path === `/dashboard/exhibitions/${exhibitionId}`;
      const isDashboardRoot = path === '/dashboard';
      return {
        title:
          (isDashboardRoot && 'Panel') ||
          (isExhibitionDetail && (exhibitionTitle || 'Exhibición')) ||
          mappedTitle ||
          segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [exhibitionId, exhibitionTitle, pathname]);

  return breadcrumbs;
}
