import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export async function hashPassword(rawPassword: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scrypt(rawPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(rawPassword: string, hashed: string): Promise<boolean> {
  const [salt, storedHash] = hashed.split(':');
  if (!salt || !storedHash) {
    return false;
  }
  const derivedKey = (await scrypt(rawPassword, salt, KEY_LENGTH)) as Buffer;
  return derivedKey.toString('hex') === storedHash;
}
