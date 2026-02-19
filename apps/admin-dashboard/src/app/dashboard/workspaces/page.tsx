'use client';

import PageContainer from '@/components/layout/page-container';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/contexts/auth-session';
import { cn } from '@/lib/utils';
import { IconUsersGroup, IconDatabase } from '@tabler/icons-react';

export default function WorkspacesPage() {
  const { organizations, activeOrgId, selectOrganization } = useAuthSession();

  return (
    <PageContainer
      pageTitle='Workspaces'
      pageDescription='Switch between teams and curate how each portfolio operates.'
    >
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {organizations.map((org) => (
          <Card
            key={org.id}
            className={cn(
              'border-muted transition-colors',
              org.id === activeOrgId && 'border-primary shadow-md'
            )}
          >
            <CardHeader>
              <CardTitle className='flex items-center justify-between text-xl'>
                {org.name}
                <Badge variant={org.plan === 'enterprise' ? 'default' : 'outline'}>
                  {org.plan}
                </Badge>
              </CardTitle>
              <CardDescription>{org.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3 text-sm'>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <IconUsersGroup className='size-4' />
                  {org.members} members
                </div>
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <IconDatabase className='size-4' />
                  {org.storageUsedGb} GB used
                </div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-between'>
              <Button
                variant={org.id === activeOrgId ? 'secondary' : 'outline'}
                onClick={() => selectOrganization(org.id)}
              >
                {org.id === activeOrgId ? 'Active workspace' : 'Set active'}
              </Button>
              <Button variant='ghost'>Open board</Button>
            </CardFooter>
          </Card>
        ))}
        <Card className='border-dashed'>
          <CardHeader>
            <CardTitle>New workspace</CardTitle>
            <CardDescription>
              Spin up a blank canvas for upcoming exhibitions or clients.
            </CardDescription>
          </CardHeader>
          <CardContent className='text-sm text-muted-foreground'>
            Configure Firebase Auth + Firestore metadata later. For now this is
            a placeholder action.
          </CardContent>
          <CardFooter>
            <Button className='w-full'>Create workspace</Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
}
