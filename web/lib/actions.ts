'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  api,
  ApiError,
  getCurrentUser,
  requireToken,
  tokenCookie,
} from './api';
import type { ActionState } from './types';

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
});
const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(100),
});
const noteSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().min(1).max(10000),
});
const userSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
  role: z.enum(['user', 'admin']),
  interests: z.array(z.string().trim().min(1).max(30)).max(20),
});
const userUpdateSchema = userSchema
  .omit({ password: true })
  .partial()
  .extend({
    password: z
      .string()
      .min(8)
      .max(72)
      .refine((value) => Buffer.byteLength(value, 'utf8') <= 72)
      .optional(),
  });
const idSchema = z.string().regex(/^[\da-f]{24}$/i);

function fields(formData: FormData, schema: z.ZodType) {
  return schema.safeParse(Object.fromEntries(formData));
}

function message(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'The request could not be completed. Try again.';
}

async function mutate(
  work: () => Promise<unknown>,
  paths: string[],
): Promise<ActionState> {
  try {
    await work();
    for (const path of paths) revalidatePath(path);
    return { message: 'Saved.' };
  } catch (error) {
    return { error: true, message: message(error) };
  }
}

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fields(formData, loginSchema);
  if (!parsed.success)
    return { error: true, message: 'Enter a valid email and password.' };
  let result: { token: string };
  try {
    result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    return { error: true, message: message(error) };
  }
  (await cookies()).set(tokenCookie, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  redirect('/notes');
}

export async function register(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fields(formData, registerSchema);
  if (!parsed.success)
    return { error: true, message: 'Check your name, email, and password.' };
  let result: { token: string };
  try {
    result = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    return { error: true, message: message(error) };
  }
  (await cookies()).set(tokenCookie, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  redirect('/notes');
}

export async function logout() {
  (await cookies()).delete(tokenCookie);
  redirect('/login');
}

export async function createNote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = fields(formData, noteSchema);
  if (!parsed.success)
    return { error: true, message: 'Enter a title and note.' };
  const token = await requireToken();
  return mutate(
    () =>
      api('/notes', {
        token,
        method: 'POST',
        body: JSON.stringify(parsed.data),
      }),
    ['/notes'],
  );
}

export async function updateNote(
  noteId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(noteId).success)
    return { error: true, message: 'Invalid note.' };
  const parsed = fields(
    formData,
    noteSchema.partial().refine((value) => Object.keys(value).length > 0),
  );
  if (!parsed.success)
    return { error: true, message: 'Enter a title or note.' };
  const token = await requireToken();
  return mutate(
    () =>
      api(`/notes/${noteId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(parsed.data),
      }),
    ['/notes'],
  );
}

export async function deleteNote(
  noteId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(noteId).success)
    return { error: true, message: 'Invalid note.' };
  const token = await requireToken();
  return mutate(
    () => api(`/notes/${noteId}`, { token, method: 'DELETE' }),
    ['/notes'],
  );
}

export async function createPost(
  profileId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(profileId).success)
    return { error: true, message: 'Invalid profile.' };
  const user = await getCurrentUser();
  if (!user || user.id !== profileId)
    return { error: true, message: 'You can only publish on your own page.' };
  const parsed = fields(formData, noteSchema);
  if (!parsed.success)
    return { error: true, message: 'Enter a title and post.' };
  const token = await requireToken();
  return mutate(
    () =>
      api('/posts', {
        token,
        method: 'POST',
        body: JSON.stringify(parsed.data),
      }),
    [`/users/${profileId}`],
  );
}

export async function createManagedUser(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = userSchema.safeParse({
    ...raw,
    interests:
      typeof raw.interests === 'string' && raw.interests.trim()
        ? raw.interests.split(',').map((value) => value.trim())
        : [],
  });
  if (!parsed.success)
    return { error: true, message: 'Check the user details and password.' };
  const token = await requireToken();
  return mutate(
    () =>
      api('/users', {
        token,
        method: 'POST',
        body: JSON.stringify(parsed.data),
      }),
    ['/admin/users'],
  );
}

export async function updateManagedUser(
  userId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(userId).success)
    return { error: true, message: 'Invalid user.' };
  const raw = Object.fromEntries(formData);
  const parsed = userUpdateSchema.safeParse({
    name: raw.name || undefined,
    email: raw.email || undefined,
    role: raw.role || undefined,
    password: raw.password || undefined,
    interests:
      typeof raw.interests === 'string'
        ? raw.interests
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
  });
  if (!parsed.success)
    return { error: true, message: 'Check the user details.' };
  const input = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(input).length === 0)
    return { error: true, message: 'Change at least one field.' };
  const token = await requireToken();
  return mutate(
    () =>
      api(`/users/${userId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    ['/admin/users'],
  );
}

export async function deleteManagedUser(
  userId: string,
  _previous: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(userId).success)
    return { error: true, message: 'Invalid user.' };
  const token = await requireToken();
  return mutate(
    () => api(`/users/${userId}`, { token, method: 'DELETE' }),
    ['/admin/users'],
  );
}
