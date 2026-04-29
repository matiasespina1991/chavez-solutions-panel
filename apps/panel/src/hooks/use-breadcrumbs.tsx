'use client';

import { navItems } from '@/config/nav-config';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/panel': [{ title: 'Configurador', link: '/panel/configurator' }],
  '/panel/admin': [
    { title: 'Panel', link: '/panel' },
    { title: 'Admin', link: '/panel/admin' }
  ],
  '/panel/admin/import-services': [
    { title: 'Panel', link: '/panel' },
    { title: 'Admin', link: '/panel/admin' },
    {
      title: 'Importar servicios',
      link: '/panel/admin/import-services'
    }
  ],
  '/panel/clients': [
    { title: 'Panel', link: '/panel' },
    {
      title: 'Base de datos de clientes',
      link: '/panel/clients'
    }
  ],
  '/panel/lab-analysis': [
    { title: 'Panel', link: '/panel' },
    {
      title: 'Registro de análisis de laboratorio',
      link: '/panel/lab-analysis'
    }
  ]
  // Add more custom mappings as needed
};

function buildNavTitleMap() {
  const map = new Map<string, string>();
  const walk = (items: typeof navItems) => {
    for (const item of items) {
      if (item.url && item.url !== '#') {
        map.set(item.url, item.title);
      }

      if (item.items?.length) {
        walk(item.items);
      }
    }
  };

  walk(navItems);
  return map;
}

export function useBreadcrumbs() {
  const pathname = usePathname();

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
      const isDashboardRoot = path === '/panel';
      return {
        title:
          (isDashboardRoot && 'Panel') ||
          mappedTitle ||
          segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
