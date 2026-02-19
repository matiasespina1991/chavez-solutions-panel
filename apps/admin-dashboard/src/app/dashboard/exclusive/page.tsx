'use client';

import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BadgeCheck, Lock } from 'lucide-react';
import { useAuthSession } from '@/contexts/auth-session';

export default function ExclusivePage() {
  const { activeOrganization } = useAuthSession();
  const hasAccess = activeOrganization.plan !== 'starter';

  return (
    <PageContainer>
      {hasAccess ? (
        <div className='space-y-6'>
          <div>
            <h1 className='flex items-center gap-2 text-3xl font-bold tracking-tight'>
              <BadgeCheck className='h-7 w-7 text-green-600' />
              Exclusive Automations
            </h1>
            <p className='text-muted-foreground'>
              {activeOrganization.name} unlocked creative intelligence for{' '}
              <span className='font-semibold'>{activeOrganization.plan}</span>{' '}
              workspaces.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Curated insights</CardTitle>
              <CardDescription>
                Hook Firebase Analytics + BigQuery later to feed this module.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 text-sm text-muted-foreground'>
              <p>• Spotlight suggestions picked 6 new hero artworks.</p>
              <p>• Editorial workflow predicts 3 intense weeks ahead.</p>
              <p>• VIP collectors engaged with 4 behind-the-scenes drops.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='flex h-full items-center justify-center'>
          <Alert>
            <Lock className='h-5 w-5 text-yellow-600' />
            <AlertDescription>
              <div className='mb-1 text-lg font-semibold'>
                Upgrade to unlock pro automations.
              </div>
              <div className='text-muted-foreground'>
                Workflow intelligence lives on Pro and Enterprise tiers. Visit{' '}
                <a className='underline' href='/dashboard/billing'>
                  Billing &amp; Plans
                </a>{' '}
                to upgrade your workspace.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </PageContainer>
  );
}
