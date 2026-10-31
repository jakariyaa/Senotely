'use client';

import { useActionState } from 'react';
import {
  createManagedUser,
  deleteManagedUser,
  updateManagedUser,
} from '@/lib/actions';
import { ActionFeedback } from '@/components/action-feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/types';

export function CreateManagedUserForm() {
  const [state, action, pending] = useActionState(createManagedUser, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="create-name">Name</Label>
        <Input id="create-name" name="name" required maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-email">Email</Label>
        <Input id="create-email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-password">Temporary password</Label>
        <Input
          id="create-password"
          name="password"
          type="password"
          minLength={8}
          maxLength={72}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-role">Role</Label>
        <select
          id="create-role"
          name="role"
          defaultValue="user"
          className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="create-interests">Interests</Label>
        <Input
          id="create-interests"
          name="interests"
          placeholder="Reading, science, travel"
        />
        <p className="text-xs text-muted-foreground">
          Separate interests with commas.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button disabled={pending}>
          {pending ? 'Creating…' : 'Create user'}
        </Button>
        <ActionFeedback state={state} />
      </div>
    </form>
  );
}

export function ManagedUserRow({ user }: { user: User }) {
  const update = updateManagedUser.bind(null, user.id);
  const remove = deleteManagedUser.bind(null, user.id);
  const [state, action, pending] = useActionState(update, {});
  const [deleteState, deleteAction, deleting] = useActionState(remove, {});
  return (
    <div className="grid gap-4 border-t py-5 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,2fr)]">
      <div className="min-w-0">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-2 text-xs text-muted-foreground">{user.id}</p>
      </div>
      <div className="space-y-4">
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`name-${user.id}`}>Name</Label>
            <Input
              id={`name-${user.id}`}
              name="name"
              defaultValue={user.name}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`email-${user.id}`}>Email</Label>
            <Input
              id={`email-${user.id}`}
              name="email"
              type="email"
              defaultValue={user.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`role-${user.id}`}>Role</Label>
            <select
              id={`role-${user.id}`}
              name="role"
              defaultValue={user.role}
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`interests-${user.id}`}>Interests</Label>
            <Input
              id={`interests-${user.id}`}
              name="interests"
              defaultValue={user.interests.join(', ')}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`password-${user.id}`}>
              New password{' '}
              <span className="font-normal text-muted-foreground">
                (leave blank to keep current)
              </span>
            </Label>
            <Input
              id={`password-${user.id}`}
              name="password"
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Button size="sm" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
            <ActionFeedback state={state} />
          </div>
        </form>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                `Delete ${user.name}? Their notes and posts will also be removed.`,
              )
            )
              event.preventDefault();
          }}
          className="flex flex-wrap items-center gap-3 border-t pt-3"
        >
          <Button variant="destructive" size="sm" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete user'}
          </Button>
          <ActionFeedback state={deleteState} />
        </form>
      </div>
    </div>
  );
}
