import { redirect } from 'next/navigation';

interface DashboardLegacyCatchAllPageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export default async function DashboardLegacyCatchAllPage({
  params
}: DashboardLegacyCatchAllPageProps) {
  const { slug = [] } = await params;
  redirect(`/panel/${slug.join('/')}`);
}
