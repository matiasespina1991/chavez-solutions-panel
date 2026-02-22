import { NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: 'Configurador',
    url: '/dashboard/configurator',
    icon: 'works',
    shortcut: ['w', 'w'],
    isActive: false,
    items: []
  },
  {
    title: 'Exhibiciones',
    url: '/dashboard/exhibitions',
    icon: 'exhibitions',
    shortcut: ['e', 'e'],
    isActive: false,
    items: []
  },
  {
    title: 'About Me',
    url: '/dashboard/about-me',
    icon: 'about',
    shortcut: ['a', 'm'],
    isActive: false,
    items: []
  },
  {
    title: 'Contacto',
    url: '/dashboard/contact',
    icon: 'contact',
    shortcut: ['c', 'c'],
    isActive: false,
    items: []
  },
  {
    title: 'Galería',
    url: '/dashboard/gallery',
    icon: 'gallery',
    shortcut: ['m', 'm'],
    isActive: false,
    items: []
  },
  {
    title: 'Workspaces',
    url: '/dashboard/workspaces',
    icon: 'workspace',
    isActive: false,
    items: []
  },
  {
    title: 'Teams',
    url: '/dashboard/workspaces/team',
    icon: 'teams',
    isActive: false,
    items: []
  },
  {
    title: 'Product',
    url: '/dashboard/product',
    icon: 'product',
    shortcut: ['p', 'p'],
    isActive: false,
    items: []
  },
  {
    title: 'Kanban',
    url: '/dashboard/kanban',
    icon: 'kanban',
    shortcut: ['k', 'k'],
    isActive: false,
    items: []
  },
  {
    title: 'Pro',
    url: '#', // Placeholder as there is no direct link for the parent
    icon: 'pro',
    isActive: true,
    items: [
      {
        title: 'Exclusive',
        url: '/dashboard/exclusive',
        icon: 'exclusive',
        shortcut: ['m', 'm']
      }
    ]
  },
  {
    title: 'Configuración',
    url: '/dashboard/settings',
    icon: 'settings',
    shortcut: ['s', 's'],
    isActive: false,
    items: []
  }
  // {
  //   title: 'Mi Cuenta',
  //   url: '/dashboard/settings', // Placeholder as there is no direct link for the parent
  //   icon: 'account',
  //   isActive: true,
  //   items: [
  //     // {
  //     //   title: 'Profile',
  //     //   url: '/dashboard/profile',
  //     //   icon: 'profile',
  //     //   shortcut: ['m', 'm']
  //     // },
  //     {
  //       title: 'Configuración',
  //       url: '/dashboard/settings',
  //       icon: 'settings',
  //       shortcut: ['s', 's']
  //     }
  //     // {
  //     //   title: 'Login',
  //     //   shortcut: ['l', 'l'],
  //     //   url: '/',
  //     //   icon: 'login'
  //     // }
  //   ]
  // }
];
