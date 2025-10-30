import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { desc, eq } from 'drizzle-orm';

import { db } from './index';
import { user, type User } from './schema';
import { generateUUID, generateDummyPassword } from './utils';

export async function getUser(email: string): Promise<User | null> {
  try {
    const users = await db.select().from(user).where(eq(user.email, email));
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to get user from database', error);
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database', error);
    throw error;
  }
}

export async function createGuestUser() {
  const guestId = `guest-${Date.now()}`;
  const password = generateDummyPassword();
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const result = await db.insert(user).values({
      id: generateUUID(),
      email: guestId,
      password: hash,
    });
    return guestId;
  } catch (error) {
    console.error('Failed to create guest user in database', error);
    throw error;
  }
}
