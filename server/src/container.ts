import { AuthService } from './modules/auth/auth.service.js';
import { MongooseUserRepository } from './modules/users/user.mongoose.repository.js';
import { BcryptHasher } from './shared/security/BcryptHasher.js';
import { JwtTokenService } from './shared/security/JwtTokenService.js';
import type { TokenService } from './shared/security/TokenService.js';
import type { UserRepository } from './modules/users/user.repository.js';
import { MongooseNoteRepository } from './modules/notes/note.mongoose.repository.js';
import { NoteService } from './modules/notes/note.service.js';
import { MongoosePostRepository } from './modules/posts/post.mongoose.repository.js';
import { UserService } from './modules/users/user.service.js';
import { PostService } from './modules/posts/post.service.js';

const users = new MongooseUserRepository();
const passwords = new BcryptHasher();
const tokens = new JwtTokenService();
const notes = new MongooseNoteRepository();
const posts = new MongoosePostRepository();

export const container = {
  authService: new AuthService(users, passwords, tokens),
  users,
  tokens,
  noteService: new NoteService(notes),
  userService: new UserService(users, passwords, notes, posts),
  postService: new PostService(posts),
};

export type Container = {
  authService: AuthService;
  users: UserRepository;
  tokens: TokenService;
  noteService: NoteService;
  userService: UserService;
  postService: PostService;
};
