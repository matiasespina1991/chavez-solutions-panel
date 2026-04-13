'use client';

import { useEffect } from 'react';

export default function DashboardHistorySwipeGuard() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.add('dashboard-no-history-swipe');
    body.classList.add('dashboard-no-history-swipe');

    return () => {
      html.classList.remove('dashboard-no-history-swipe');
      body.classList.remove('dashboard-no-history-swipe');
    };
  }, []);

  return null;
}
