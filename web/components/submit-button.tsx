'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function SubmitButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} className={className}>
      {pending ? 'Saving…' : children}
    </Button>
  );
}
