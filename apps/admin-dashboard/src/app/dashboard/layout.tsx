import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import DashboardHistorySwipeGuard from '@/components/layout/dashboard-history-swipe-guard';
import Header from '@/components/layout/header';
import RouteFade from '@/components/layout/route-fade';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Chavez Solutions Admin Dashboard',
  description: 'Admin dashboard para la gestión del sitio web'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <DashboardHistorySwipeGuard />
          <Header />
          {/* page main content */}
          <RouteFade>{children}</RouteFade>
          {/* page main content ends */}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
