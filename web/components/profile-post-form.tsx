'use client';

import { useActionState } from 'react';
import { createPost } from '@/lib/actions';
import { emptyActionState } from '@/lib/types';
import { ActionFeedback } from '@/components/action-feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function ProfilePostForm({ profileId }: { profileId: string }) {
  const [state, action, pending] = useActionState(
    createPost.bind(null, profileId),
    emptyActionState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a post</CardTitle>
        <p className="text-sm text-muted-foreground">
          Posts are public and visible to anyone who visits this profile.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-title">Title</Label>
            <Input id="post-title" name="title" required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-content">Content</Label>
            <Textarea
              id="post-content"
              name="content"
              required
              maxLength={10000}
            />
          </div>
          <ActionFeedback state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? 'Publishing…' : 'Publish post'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
