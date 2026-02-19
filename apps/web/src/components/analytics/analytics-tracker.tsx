'use client';

import { logEvent } from 'firebase/analytics';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { initAnalytics } from '@/utils/config/firebase';

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const analytics = initAnalytics();
    if (!analytics) {
      return;
    }

    logEvent(analytics, 'page_view', {
      page_path: pathname,
      page_location: window.location.href
    });
  }, [pathname]);

  return null;
}
