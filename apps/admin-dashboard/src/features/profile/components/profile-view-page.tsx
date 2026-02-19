'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthSession } from '@/contexts/auth-session';

export default function ProfileViewPage() {
  const { user } = useAuthSession();
  const displayName = user?.fullName ?? '';
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';

  return (
    <div className='grid w-full gap-6 md:grid-cols-2'>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Replace with Firebase Auth profile once wired up.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Display name</Label>
            <Input id='name' defaultValue={displayName} />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              defaultValue={email}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='role'>Role</Label>
            <Input id='role' defaultValue='Creative Director' />
          </div>
        </CardContent>
        <CardFooter>
          <Button className='w-full'>Save changes</Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Placeholder copy while Firebase Auth is pending.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='password'>Password</Label>
            <Input id='password' type='password' placeholder='••••••••' />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='twofactor'>Two factor backup email</Label>
            <Input id='twofactor' type='email' placeholder='security@email.com' />
          </div>
        </CardContent>
        <CardFooter>
          <Button variant='outline' className='w-full'>
            Configure security
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
