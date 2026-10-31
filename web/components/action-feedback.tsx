'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import type { ActionState } from '@/lib/types';

export function ActionFeedback({ state }: { state: ActionState }) {
  useEffect(() => {
    if (!state.message) return;
    if (state.error) toast.error(state.message);
    else toast.success(state.message);
  }, [state]);
  return null;
}
