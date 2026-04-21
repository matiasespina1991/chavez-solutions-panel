import { CallableRequest } from 'firebase-functions/v2/https';
type AppUserRole = 'admin' | 'order-supervisor' | 'logistics' | 'technician' | 'analyst' | 'editor' | 'viewer';
declare const PERMISSION_ROLE_MAP: {
    readonly 'requests.approve': ["admin", "order-supervisor"];
    readonly 'requests.reject': ["admin", "order-supervisor"];
    readonly 'requests.delete': ["admin", "order-supervisor"];
    readonly 'work_orders.execute': ["admin", "order-supervisor"];
    readonly 'work_orders.pause_resume': ["admin", "order-supervisor", "logistics", "technician"];
    readonly 'work_orders.complete': ["admin", "order-supervisor", "technician", "analyst"];
    readonly 'lab.save': ["admin", "order-supervisor", "technician", "analyst"];
    readonly 'services_catalog.read_history': ["admin", "editor"];
    readonly 'services_catalog.write': ["admin", "editor"];
    readonly 'services_catalog.delete': ["admin", "editor"];
    readonly 'services_catalog.import': ["admin", "editor"];
};
export type AppPermission = keyof typeof PERMISSION_ROLE_MAP;
export declare const requirePermission: (req: CallableRequest<unknown>, permission: AppPermission) => Promise<AppUserRole>;
export {};
