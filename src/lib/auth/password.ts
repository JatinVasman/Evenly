import { hash, verify, type Options } from "@node-rs/argon2";

// Argon2id parameters aligned with OWASP recommendations
const ARGON2_OPTIONS: Options = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,       // 2 iterations
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against a stored Argon2id hash.
 * Returns false safely if verification fails or an invalid hash is provided.
 */
export async function verifyPassword(
  passwordHash: string,
  plainPassword: string
): Promise<boolean> {
  if (!passwordHash || !plainPassword) {
    return false;
  }
  try {
    return await verify(passwordHash, plainPassword, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}
