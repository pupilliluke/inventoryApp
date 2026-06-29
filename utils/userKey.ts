/**
 * Firebase Realtime Database keys may not contain '.', '#', '$', '[', ']' or '/'.
 * Emails contain '.' and '@', so we sanitize them into a safe key.
 *
 * This lives in its own dependency-free module so both `userSync` and `admin`
 * can use it without importing each other (which would create a require cycle).
 */
export function emailToUserKey(email: string): string {
  return email.trim().toLowerCase().replace(/[.#$/[\]]/g, '_');
}
