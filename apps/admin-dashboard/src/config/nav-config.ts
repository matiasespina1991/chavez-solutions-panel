import { type NavItem } from '@/types';

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
    url: '/dashboard/requests-list',
    icon: 'checklist',
    shortcut: ['e', 'e'],
    isActive: false,
    items: []
  },
  {
    title: 'Lista de ordenes de trabajo',
    url: '/dashboard/work-orders',
    icon: 'workOrders',
    shortcut: ['r', 'r'],
    isActive: false,
    items: []
  },
  {
    title: 'Servicios - Conf. Técnica',
    url: '/dashboard/services-catalog',
    icon: 'servicesCatalog',
    shortcut: ['t', 't'],
    isActive: false,
    items: []
  },
  {
    title: 'Base de datos de clientes',
    url: '/dashboard/admin/clients',
    icon: 'teams',
    shortcut: ['c', 'c'],
    isActive: false,
    items: []
  },
  {
    title: 'Admin',
    url: '/dashboard/admin',
    icon: 'admin',
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
