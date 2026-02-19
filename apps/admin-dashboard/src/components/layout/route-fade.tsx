'use client';

import { usePathname } from 'next/navigation';

export default function RouteFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className='animate-in fade-in flex min-h-0 flex-1 flex-col duration-[700ms]'
    >
      {children}
    </div>
  );
}
