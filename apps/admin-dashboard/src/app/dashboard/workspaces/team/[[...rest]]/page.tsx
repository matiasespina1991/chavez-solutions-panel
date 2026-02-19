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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthSession } from '@/contexts/auth-session';

const mockMembers = [
  { name: 'Laura Butallo', role: 'Creative Director', email: 'studio@laurabutallo.com', status: 'Active' },
  { name: 'Mara Lobos', role: 'Producer', email: 'mara@laurabutallo.com', status: 'Active' },
  { name: 'Nico Prado', role: 'Tech wizard', email: 'nico@laurabutallo.com', status: 'Invited' },
  { name: 'Agus Mini', role: 'Social', email: 'agus@laurabutallo.com', status: 'Active' }
];

export default function TeamPage() {
  const { activeOrganization } = useAuthSession();

  return (
    <PageContainer
      pageTitle='Team Management'
      pageDescription={`Roles, invites and access control for ${activeOrganization.name}`}
    >
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Workspace status</CardTitle>
            <CardDescription>Who has access and how they collaborate.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4 text-sm'>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='font-semibold'>Plan</p>
                <p className='text-muted-foreground capitalize'>{activeOrganization.plan}</p>
              </div>
              <Badge variant='outline'>{activeOrganization.members} seats</Badge>
            </div>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='font-semibold'>Storage</p>
                <p className='text-muted-foreground'>{activeOrganization.storageUsedGb}GB in use</p>
              </div>
              <Button variant='ghost' size='sm'>
                Review access
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending invites</CardTitle>
            <CardDescription>Plug Firebase Auth later to drive real invites.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
              Drag contacts or paste emails to invite collaborators.
            </div>
            <Button className='w-full'>Invite collaborator</Button>
          </CardContent>
        </Card>
      </div>
      <Card className='mt-6'>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Everyone with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className='text-right'>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockMembers.map((member) => (
                <TableRow key={member.email}>
                  <TableCell className='font-medium'>{member.name}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell className='text-muted-foreground'>{member.email}</TableCell>
                  <TableCell className='text-right'>
                    <Badge variant={member.status === 'Active' ? 'secondary' : 'outline'}>
                      {member.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
