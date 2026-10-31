'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register } from '@/lib/actions';
import { emptyActionState } from '@/lib/types';
import { ActionFeedback } from '@/components/action-feedback';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const action = mode === 'login' ? login : register;
  const [state, formAction, pending] = useActionState(action, emptyActionState);
  const registering = mode === 'register';

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {registering ? 'Create your account' : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {registering
            ? 'Your notes stay yours.'
            : 'Sign in to return to your notes.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {registering && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                maxLength={100}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={registering ? 'new-password' : 'current-password'}
              required
              minLength={8}
              maxLength={72}
            />
          </div>
          <ActionFeedback state={state} />
          <Button className="w-full" disabled={pending}>
            {pending
              ? 'Please wait…'
              : registering
                ? 'Create account'
                : 'Sign in'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          {registering ? 'Already have an account?' : 'New here?'}{' '}
          <Link
            className="font-medium text-foreground underline underline-offset-4"
            href={registering ? '/login' : '/register'}
          >
            {registering ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
