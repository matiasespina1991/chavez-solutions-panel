'use client';

import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useAuthSession } from '@/contexts/auth-session';

const planCatalog = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    description: 'For lightweight editorial workflows',
    limits: { storage: 200, members: 5 },
    features: ['Basic analytics', 'Manual publishing queue', 'Email support']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$59',
    description: 'For teams shipping content weekly',
    limits: { storage: 500, members: 15 },
    features: [
      'Realtime analytics',
      'Advanced media processing',
      'Priority support',
      'Editorial automations'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For galleries and agencies',
    limits: { storage: 2000, members: 50 },
    features: [
      'Dedicated curator success',
      'Multi-brand workspaces',
      'Unlimited automations',
      'White glove onboarding'
    ]
  }
];

export default function BillingPage() {
  const { activeOrganization } = useAuthSession();
  const currentPlan =
    planCatalog.find((plan) => plan.id === activeOrganization.plan) ??
    planCatalog[0];

  const storageLimit = currentPlan.limits.storage;
  const usagePercent = Math.min(
    (activeOrganization.storageUsedGb / storageLimit) * 100,
    100
  );

  return (
    <PageContainer
      pageTitle='Billing & Plans'
      pageDescription={`Manage subscription and usage for ${activeOrganization.name}`}
    >
      <div className='grid gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-3'>
              <CardTitle className='text-2xl font-semibold'>
                {currentPlan.name} Plan
              </CardTitle>
              <Badge variant='secondary'>{currentPlan.price}/mo</Badge>
            </div>
            <CardDescription>{currentPlan.description}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>Storage usage</span>
                <span className='font-medium'>
                  {activeOrganization.storageUsedGb}GB / {storageLimit}GB
                </span>
              </div>
              <Progress value={usagePercent} className='mt-2' />
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <div className='rounded-lg border p-4'>
                <p className='text-xs uppercase text-muted-foreground'>
                  Members
                </p>
                <p className='text-2xl font-semibold'>
                  {activeOrganization.members}
                </p>
                <p className='text-muted-foreground text-sm'>
                  Limit {currentPlan.limits.members}
                </p>
              </div>
              <div className='rounded-lg border p-4'>
                <p className='text-xs uppercase text-muted-foreground'>
                  Workspace
                </p>
                <p className='text-2xl font-semibold'>
                  {activeOrganization.name}
                </p>
                <p className='text-muted-foreground text-sm'>
                  {activeOrganization.description}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-3'>
              <Button variant='outline'>Update payment method</Button>
              <Button>Review invoices</Button>
              <Button variant='secondary'>Upgrade workspace</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upgrade benefits</CardTitle>
            <CardDescription>
              Unlock automation, SLA support, and curated analytics.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {planCatalog.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'rounded-lg border p-4',
                  plan.id === currentPlan.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted'
                )}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-lg font-semibold'>{plan.name}</p>
                    <p className='text-muted-foreground text-sm'>
                      {plan.description}
                    </p>
                  </div>
                  <span className='text-sm font-semibold'>{plan.price}</span>
                </div>
                <ul className='text-muted-foreground mt-3 list-disc space-y-1 pl-4 text-sm'>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button
                  className='mt-4 w-full'
                  variant={plan.id === currentPlan.id ? 'secondary' : 'default'}
                >
                  {plan.id === currentPlan.id ? 'Current plan' : 'Switch plan'}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
