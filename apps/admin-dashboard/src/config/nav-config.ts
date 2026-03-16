import { NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: 'Configurador de proformas',
    url: '/dashboard/configurator',
    icon: 'configurator',
    shortcut: ['w', 'w'],
    isActive: false,
    items: []
  },
  {
    title: 'Lista de solicitudes',
    url: '/dashboard/service-requests',
    icon: 'list',
    shortcut: ['e', 'e'],
    isActive: false,
    items: []
  },
  {
    title: 'Lista de ordenes de trabajo',
    url: '/dashboard/work-orders',
    icon: 'checklist',
    shortcut: ['r', 'r'],
    isActive: false,
    items: []
  },
  {
    title: 'Admin',
    url: '/dashboard/admin',
    icon: 'account',
    shortcut: ['a', 'a'],
    isActive: false,
    items: []
  },
  {
    title: 'Configuración',
    url: '/dashboard/settings',
    icon: 'settings',
    shortcut: ['s', 's'],
    isActive: false,
    items: []
  }
];
