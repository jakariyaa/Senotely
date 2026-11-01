import { once } from 'node:events';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Pagination } from '../src/shared/pagination/pagination.js';
import type {
  AuthUser,
  ManagedUserInput,
  ManagedUserUpdate,
  PublicUser,
  UserRepository,
} from '../src/modules/users/user.repository.js';
import type {
  NoteData,
  NoteRepository,
} from '../src/modules/notes/note.repository.js';
import type {
  AuthorPosts,
  PostData,
  PostRepository,
} from '../src/modules/posts/post.repository.js';

process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough';
process.env.JWT_EXPIRES_IN = '1h';

const [
  { createApp },
  { AuthService },
  { NoteService },
  { UserService },
  { PostService },
  { JwtTokenService },
  { BcryptHasher },
] = await Promise.all([
  import('../src/createApp.js'),
  import('../src/modules/auth/auth.service.js'),
  import('../src/modules/notes/note.service.js'),
  import('../src/modules/users/user.service.js'),
  import('../src/modules/posts/post.service.js'),
  import('../src/shared/security/JwtTokenService.js'),
  import('../src/shared/security/BcryptHasher.js'),
]);

function makeId(value: number): string {
  return value.toString(16).padStart(24, '0');
}

class MemoryUsers implements UserRepository {
  records: AuthUser[] = [];
  private sequence = 0;

  async findAuthByEmail(email: string) {
    return this.records.find((user) => user.email === email) ?? null;
  }

  async findActorById(id: string) {
    const user = this.records.find((record) => record.id === id);
    return user ? { id: user.id, role: user.role } : null;
  }

  async findPublicById(id: string) {
    const user = this.records.find((record) => record.id === id);
    return user ? this.publicUser(user) : null;
  }

  async create(input: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>) {
    return this.insert({ ...input, role: 'user', interests: [] });
  }

  async createManaged(input: ManagedUserInput) {
    return this.insert(input);
  }

  async list(pagination: Pagination) {
    const records = [...this.records].sort((a, b) => b.id.localeCompare(a.id));
    return {
      data: records
        .slice(pagination.skip, pagination.skip + pagination.limit)
        .map((user) => this.publicUser(user)),
      total: records.length,
    };
  }

  async updateById(id: string, input: ManagedUserUpdate) {
    const user = this.records.find((record) => record.id === id);
    if (!user) return null;
    Object.assign(user, input);
    return this.publicUser(user);
  }

  async deleteById(id: string) {
    const index = this.records.findIndex((record) => record.id === id);
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }

  async groupByInterests(input: {
    interest?: string;
    page: number;
    limit: number;
    usersPerGroup: number;
  }) {
    const groups = new Map<string, PublicUser[]>();
    for (const user of this.records) {
      for (const interest of user.interests) {
        if (input.interest && interest !== input.interest) continue;
        groups.set(interest, [
          ...(groups.get(interest) ?? []),
          this.publicUser(user),
        ]);
      }
    }
    const all = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    const skip = (input.page - 1) * input.limit;
    return {
      items: all.slice(skip, skip + input.limit).map(([interest, users]) => ({
        interest,
        count: users.length,
        users: users
          .slice(0, input.usersPerGroup)
          .map(({ id, name, email }) => ({
            _id: id,
            name,
            email,
          })),
      })),
      total: all.length,
    };
  }

  private async insert(input: ManagedUserInput): Promise<PublicUser> {
    if (this.records.some((user) => user.email === input.email)) {
      throw Object.assign(new Error('duplicate key'), { code: 11000 });
    }
    const user: AuthUser = { id: makeId(++this.sequence), ...input };
    this.records.push(user);
    return this.publicUser(user);
  }

  private publicUser(user: AuthUser): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      interests: user.interests,
    };
  }
}

class MemoryNotes implements NoteRepository {
  records: NoteData[] = [];
  private sequence = 0;

  async create(owner: string, input: { title: string; content: string }) {
    const now = new Date(Date.now() + this.sequence).toISOString();
    const note = {
      id: makeId(++this.sequence),
      owner,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.records.unshift(note);
    return note;
  }

  async findOwnById(id: string, owner: string) {
    return (
      this.records.find((note) => note.id === id && note.owner === owner) ??
      null
    );
  }

  async findAnyById(id: string) {
    return this.records.find((note) => note.id === id) ?? null;
  }

  async updateOwn(
    id: string,
    owner: string,
    input: Partial<{ title: string; content: string }>,
  ) {
    const note = this.records.find(
      (record) => record.id === id && record.owner === owner,
    );
    if (!note) return null;
    Object.assign(note, input, { updatedAt: new Date().toISOString() });
    return note;
  }

  async deleteOwn(id: string, owner: string) {
    const index = this.records.findIndex(
      (note) => note.id === id && note.owner === owner,
    );
    if (index < 0) return false;
    this.records.splice(index, 1);
    return true;
  }

  async deleteByOwner(owner: string) {
    this.records = this.records.filter((note) => note.owner !== owner);
  }

  async listByOwner(owner: string, pagination: Pagination) {
    return this.list(
      this.records.filter((note) => note.owner === owner),
      pagination,
    );
  }

  async listAll(owner: string | undefined, pagination: Pagination) {
    return this.list(
      owner
        ? this.records.filter((note) => note.owner === owner)
        : this.records,
      pagination,
    );
  }

  private list(records: NoteData[], pagination: Pagination) {
    return {
      data: records.slice(pagination.skip, pagination.skip + pagination.limit),
      total: records.length,
    };
  }
}

class MemoryPosts implements PostRepository {
  records: Array<PostData & { author: string }> = [];
  private sequence = 0;

  constructor(private readonly users: MemoryUsers) {}

  async create(author: string, input: { title: string; content: string }) {
    const now = new Date().toISOString();
    const post = {
      id: makeId(++this.sequence),
      ...input,
      author,
      createdAt: now,
      updatedAt: now,
    };
    this.records.unshift(post);
    return post;
  }

  async findByAuthor(input: {
    userId: string;
    page: number;
    limit: number;
  }): Promise<AuthorPosts | null> {
    const user = await this.users.findPublicById(input.userId);
    if (!user) return null;
    const skip = (input.page - 1) * input.limit;
    return {
      user: { id: user.id, name: user.name },
      posts: this.records
        .filter((post) => post.author === input.userId)
        .slice(skip, skip + input.limit + 1)
        .map(({ author: _author, ...post }) => post),
    };
  }

  async deleteByAuthor(author: string) {
    this.records = this.records.filter((post) => post.author !== author);
  }
}

const passwords = {
  hash: async (password: string) => `test-hash:${password}`,
  verify: async (password: string, hash: string) =>
    hash === `test-hash:${password}`,
};

let server: Server;
let baseUrl: string;
let users: MemoryUsers;
let notes: MemoryNotes;
let posts: MemoryPosts;
let tokens: InstanceType<typeof JwtTokenService>;

beforeEach(async () => {
  users = new MemoryUsers();
  notes = new MemoryNotes();
  posts = new MemoryPosts(users);
  tokens = new JwtTokenService();
  const app = createApp({
    authService: new AuthService(users, passwords, tokens),
    users,
    tokens,
    noteService: new NoteService(notes),
    userService: new UserService(users, passwords, notes, posts),
    postService: new PostService(posts),
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Test server did not bind');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request(path: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function jsonRequest(
  path: string,
  body: unknown,
  token?: string,
  method = 'POST',
) {
  return request(path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function register(email: string, name = 'Test User') {
  const response = await jsonRequest('/auth/register', {
    name,
    email,
    password: 'Test-Password-2026',
  });
  return {
    response,
    body: (await response.json()) as { token: string; user: PublicUser },
  };
}

async function createAdmin() {
  return users.createManaged({
    name: 'Test Admin',
    email: 'admin@test.example',
    passwordHash: 'test-hash:Admin-Password-2026',
    role: 'admin',
    interests: [],
  });
}

describe('API authentication, authorization, ownership, and pagination', () => {
  it('returns 413 when a JSON request exceeds the body limit', async () => {
    const response = await request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: 'a'.repeat(100 * 1024) }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
    });
  });

  it('forces public registration to user and keeps login failures indistinguishable', async () => {
    const registered = await jsonRequest('/auth/register', {
      name: 'Casey',
      email: 'casey@test.example',
      password: 'Test-Password-2026',
      role: 'admin',
    });
    const body = await registered.json();
    expect(registered.status).toBe(201);
    expect(body.user.role).toBe('user');
    expect(body.user).not.toHaveProperty('passwordHash');

    const unknown = await jsonRequest('/auth/login', {
      email: 'unknown@test.example',
      password: 'Test-Password-2026',
    });
    const wrong = await jsonRequest('/auth/login', {
      email: 'casey@test.example',
      password: 'Wrong-Password-2026',
    });
    expect([unknown.status, wrong.status]).toEqual([401, 401]);
    expect((await unknown.json()).error.message).toBe(
      (await wrong.json()).error.message,
    );

    const tampered = `${body.token.slice(0, -1)}${body.token.endsWith('a') ? 'b' : 'a'}`;
    const expired = jwt.sign({ sub: body.user.id }, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: -1,
    });
    for (const token of [tampered, expired]) {
      expect(
        (
          await request('/notes', {
            headers: { authorization: `Bearer ${token}` },
          })
        ).status,
      ).toBe(401);
    }
  });

  it('enforces RBAC and reloads a changed role from the repository', async () => {
    const { body: user } = await register('role@test.example');
    const admin = await createAdmin();
    const adminToken = tokens.sign(admin.id);
    const protectedLists = [
      '/users',
      '/users/by-interests',
      `/users/${user.user.id}`,
      '/admin/notes',
    ];
    for (const path of protectedLists) {
      expect((await request(path)).status).toBe(401);
      expect(
        (
          await request(path, {
            headers: { authorization: `Bearer ${user.token}` },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(path, {
            headers: { authorization: `Bearer ${adminToken}` },
          })
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await request('/users', {
          headers: { authorization: `Bearer ${user.token}` },
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request('/admin/notes', {
          headers: { authorization: `Bearer ${user.token}` },
        })
      ).status,
    ).toBe(403);
    expect((await request('/notes')).status).toBe(401);

    await users.updateById(user.user.id, { role: 'admin' });
    expect(
      (
        await request('/users', {
          headers: { authorization: `Bearer ${user.token}` },
        })
      ).status,
    ).toBe(200);
  });

  it('checks endpoint access for anonymous, user, and admin actors', async () => {
    const { body: user } = await register('matrix-user@test.example');
    const admin = await createAdmin();
    const adminToken = tokens.sign(admin.id);
    const note = await notes.create(user.user.id, {
      title: 'Matrix note',
      content: 'Authorization check',
    });
    const deleteCandidate = await users.createManaged({
      name: 'Delete Candidate',
      email: 'matrix-delete@test.example',
      passwordHash: 'test-hash:Admin-Password-2026',
      role: 'user',
      interests: [],
    });
    const actors = [
      { role: 'anonymous', token: undefined },
      { role: 'user', token: user.token },
      { role: 'admin', token: adminToken },
    ] as const;
    const matrix: Array<{
      method: string;
      path: string;
      body?: unknown;
      statuses: Record<(typeof actors)[number]['role'], number>;
    }> = [
      {
        method: 'GET',
        path: '/users/me',
        statuses: { anonymous: 401, user: 200, admin: 200 },
      },
      {
        method: 'GET',
        path: '/users',
        statuses: { anonymous: 401, user: 403, admin: 200 },
      },
      {
        method: 'POST',
        path: '/users',
        body: {},
        statuses: { anonymous: 401, user: 403, admin: 400 },
      },
      {
        method: 'GET',
        path: '/users/by-interests',
        statuses: { anonymous: 401, user: 403, admin: 200 },
      },
      {
        method: 'GET',
        path: `/users/${user.user.id}`,
        statuses: { anonymous: 401, user: 403, admin: 200 },
      },
      {
        method: 'PATCH',
        path: `/users/${user.user.id}`,
        body: {},
        statuses: { anonymous: 401, user: 403, admin: 400 },
      },
      {
        method: 'GET',
        path: '/admin/notes',
        statuses: { anonymous: 401, user: 403, admin: 200 },
      },
      {
        method: 'GET',
        path: '/notes',
        statuses: { anonymous: 401, user: 200, admin: 200 },
      },
      {
        method: 'POST',
        path: '/notes',
        body: {},
        statuses: { anonymous: 401, user: 400, admin: 400 },
      },
      {
        method: 'GET',
        path: `/notes/${note.id}`,
        statuses: { anonymous: 401, user: 200, admin: 200 },
      },
      {
        method: 'PATCH',
        path: `/notes/${note.id}`,
        body: {},
        statuses: { anonymous: 401, user: 400, admin: 400 },
      },
      {
        method: 'DELETE',
        path: `/notes/${note.id}`,
        statuses: { anonymous: 401, user: 204, admin: 404 },
      },
      {
        method: 'POST',
        path: '/posts',
        body: {},
        statuses: { anonymous: 401, user: 400, admin: 400 },
      },
    ];

    for (const endpoint of matrix) {
      for (const actor of actors) {
        const response = await request(endpoint.path, {
          method: endpoint.method,
          headers: {
            ...(actor.token ? { authorization: `Bearer ${actor.token}` } : {}),
            ...(endpoint.body ? { 'content-type': 'application/json' } : {}),
          },
          ...(endpoint.body ? { body: JSON.stringify(endpoint.body) } : {}),
        });
        expect(
          response.status,
          `${actor.role} ${endpoint.method} ${endpoint.path}`,
        ).toBe(endpoint.statuses[actor.role]);
      }
    }

    for (const actor of actors) {
      const response = await request(`/users/${user.user.id}/posts`, {
        headers: actor.token
          ? { authorization: `Bearer ${actor.token}` }
          : undefined,
      });
      expect(response.status, `${actor.role} public user posts`).toBe(200);
    }

    const deletionStatuses = { anonymous: 401, user: 403, admin: 204 };
    for (const actor of actors) {
      const response = await request(`/users/${deleteCandidate.id}`, {
        method: 'DELETE',
        headers: actor.token
          ? { authorization: `Bearer ${actor.token}` }
          : undefined,
      });
      expect(response.status, `${actor.role} DELETE /users/:id`).toBe(
        deletionStatuses[actor.role],
      );
    }
  });

  it('hides another user notes, paginates lists, and caps limits', async () => {
    const { body: owner } = await register('owner@test.example', 'Owner');
    const { body: other } = await register('other@test.example', 'Other');
    const created = await jsonRequest(
      '/notes',
      { title: 'First', content: 'One' },
      owner.token,
    );
    const note = (await created.json()) as NoteData;
    await jsonRequest(
      '/notes',
      { title: 'Second', content: 'Two' },
      owner.token,
    );
    await jsonRequest(
      '/notes',
      { title: 'Third', content: 'Three' },
      owner.token,
    );

    expect(
      (
        await request(`/notes/${note.id}`, {
          headers: { authorization: `Bearer ${other.token}` },
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await jsonRequest(
          `/notes/${note.id}`,
          { title: 'Changed' },
          other.token,
          'PATCH',
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/notes/${note.id}`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${other.token}` },
        })
      ).status,
    ).toBe(404);

    const page = await request('/notes?page=1&limit=2', {
      headers: { authorization: `Bearer ${owner.token}` },
    });
    const result = await page.json();
    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    const capped = await request('/notes?page=1&limit=101', {
      headers: { authorization: `Bearer ${owner.token}` },
    });
    expect((await capped.json()).meta.limit).toBe(100);
    expect(
      (
        await request('/notes?page=0', {
          headers: { authorization: `Bearer ${owner.token}` },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request('/notes/not-an-id', {
          headers: { authorization: `Bearer ${owner.token}` },
        })
      ).status,
    ).toBe(400);

    const admin = await createAdmin();
    const adminToken = tokens.sign(admin.id);
    expect(
      (
        await request(`/notes/${note.id}`, {
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await jsonRequest(
          `/notes/${note.id}`,
          { title: 'Changed' },
          adminToken,
          'PATCH',
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/notes/${note.id}`, {
          method: 'DELETE',
          headers: { authorization: `Bearer ${adminToken}` },
        })
      ).status,
    ).toBe(404);
  });

  it('protects admin self-actions, handles conflicts, and cascades user deletion', async () => {
    const admin = await createAdmin();
    admin.id = 'abcdef012345abcdef012345';
    users.records[0]!.id = admin.id;
    const adminToken = tokens.sign(admin.id);
    const uppercaseId = admin.id.toUpperCase();
    const selfRole = await jsonRequest(
      `/users/${uppercaseId}`,
      { role: 'user' },
      adminToken,
      'PATCH',
    );
    const selfDelete = await request(`/users/${uppercaseId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect([selfRole.status, selfDelete.status]).toEqual([403, 403]);

    const userResponse = await jsonRequest(
      '/users',
      {
        name: 'Cascade User',
        email: 'cascade@test.example',
        password: 'Test-Password-2026',
        interests: ['music'],
      },
      adminToken,
    );
    expect(userResponse.status).toBe(201);
    const user = (await userResponse.json()) as PublicUser;
    expect(
      (
        await jsonRequest(
          '/users',
          {
            name: 'Duplicate',
            email: user.email,
            password: 'Test-Password-2026',
          },
          adminToken,
        )
      ).status,
    ).toBe(409);

    const userLogin = await jsonRequest('/auth/login', {
      email: user.email,
      password: 'Test-Password-2026',
    });
    const login = (await userLogin.json()) as { token: string };
    const note = await jsonRequest(
      '/notes',
      { title: 'Cascade note', content: 'Remove me' },
      login.token,
    );
    expect(note.status).toBe(201);
    expect(
      (
        await jsonRequest(
          '/posts',
          { title: 'Cascade post', content: 'Remove me' },
          login.token,
        )
      ).status,
    ).toBe(201);
    const childId = user.id;
    const deleteTarget = await request(`/users/${childId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(deleteTarget.status).toBe(204);
    const remainingNotes = await request(`/admin/notes?userId=${childId}`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect((await remainingNotes.json()).meta.total).toBe(0);
    expect((await request(`/users/${childId}/posts`)).status).toBe(404);
    expect(
      (
        await request('/notes', {
          headers: { authorization: `Bearer ${login.token}` },
        })
      ).status,
    ).toBe(401);
  });

  it('hashes passwords with bcrypt cost 12', async () => {
    const hasher = new BcryptHasher();
    const hash = await hasher.hash('Test-Password-2026');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await hasher.verify('Test-Password-2026', hash)).toBe(true);
    expect(await hasher.verify('wrong', hash)).toBe(false);
  });

  it('returns grouped interests and only the requested author’s public posts', async () => {
    const admin = await createAdmin();
    const adminToken = tokens.sign(admin.id);
    for (const [name, email, interests] of [
      ['Music One', 'music-one@test.example', ['music', 'books']],
      ['Music Two', 'music-two@test.example', ['music']],
    ] as const) {
      const response = await jsonRequest(
        '/users',
        { name, email, password: 'Test-Password-2026', interests },
        adminToken,
      );
      expect(response.status).toBe(201);
    }
    const groups = await request('/users/by-interests?interest=music', {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect((await groups.json()).data).toMatchObject([
      { interest: 'music', count: 2 },
    ]);

    const first = await register('author-one@test.example', 'Author One');
    const second = await register('author-two@test.example', 'Author Two');
    await jsonRequest(
      '/posts',
      {
        title: 'First author',
        content: 'Public post',
        author: second.body.user.id,
      },
      first.body.token,
    );
    await jsonRequest(
      '/posts',
      { title: 'Second author', content: 'Another public post' },
      second.body.token,
    );
    const feed = await request(`/users/${first.body.user.id}/posts`);
    const result = await feed.json();
    expect(result.data.user).toEqual({
      id: first.body.user.id,
      name: 'Author One',
    });
    expect(
      result.data.posts.map((post: { title: string }) => post.title),
    ).toEqual(['First author']);
    const secondFeed = await request(`/users/${second.body.user.id}/posts`);
    expect(
      (await secondFeed.json()).data.posts.map(
        (post: { title: string }) => post.title,
      ),
    ).toEqual(['Second author']);
    expect(result.data.user).not.toHaveProperty('email');
    expect(result.data.user).not.toHaveProperty('passwordHash');
    expect(
      (await request('/users/507f1f77bcf86cd799439011/posts')).status,
    ).toBe(404);
  });
});
