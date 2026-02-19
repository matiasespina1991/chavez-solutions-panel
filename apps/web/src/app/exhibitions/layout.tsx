import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exhibitions',
};

export default function ExhibitionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
