import { type NavItem } from '@/types';

export const navItems: NavItem[] = [
  {
    title: 'Configurador de proformas',
    url: '/panel/configurator',
    icon: 'configurator',
    shortcut: ['w', 'w'],
    isActive: false,
    items: []
  },
  {
    title: 'Lista de solicitudes',
    url: '/panel/requests-list',
    icon: 'checklist',
    shortcut: ['e', 'e'],
    isActive: false,
    items: []
  },
  {
    title: 'Lista de ordenes de trabajo',
    url: '/panel/work-orders',
    icon: 'workOrders',
    shortcut: ['r', 'r'],
    isActive: false,
    items: []
  },
  {
    title: 'Servicios - Conf. Técnica',
    url: '/panel/services-catalog',
    icon: 'servicesCatalog',
    shortcut: ['t', 't'],
    isActive: false,
    items: []
  },
  {
    title: 'Base de datos de clientes',
    url: '/panel/clients',
    icon: 'teams',
    shortcut: ['c', 'c'],
    isActive: false,
    items: []
  },
  {
    title: 'Admin',
    url: '/panel/admin',
    icon: 'admin',
    shortcut: ['a', 'a'],
    isActive: false,
    items: []
  },
  {
    title: 'Configuración',
    url: '/panel/settings',
    icon: 'settings',
    shortcut: ['s', 's'],
    isActive: false,
    items: []
  }
];
