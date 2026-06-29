import { getDatabase, ref, onValue, update, remove } from 'firebase/database';

export interface NotReturningEntry {
  code: string;
  name: string;
}

// User-added "not getting back" items live here, keyed by code. The static seed
// list in data/notReturningItems.ts is always layered on top of these (see
// context/NotReturningContext). Item codes (e.g. "G-1105", "Z-F122", "45160")
// contain only letters, digits and hyphens, so they're safe as Firebase keys.
const PATH = 'notReturning';

/** Subscribe to the user-added not-returning items (keyed by code). */
export function subscribeNotReturningAdded(
  callback: (items: Record<string, NotReturningEntry>) => void
): () => void {
  const db = getDatabase();
  return onValue(ref(db, PATH), (snapshot) => {
    const raw = snapshot.val() || {};
    const out: Record<string, NotReturningEntry> = {};
    for (const [code, v] of Object.entries<any>(raw)) {
      if (v && typeof v === 'object' && v.code) {
        out[code] = { code: String(v.code), name: String(v.name || '') };
      }
    }
    callback(out);
  });
}

/** Add (or overwrite) a user-added not-returning item. */
export async function addNotReturning(item: NotReturningEntry): Promise<void> {
  const db = getDatabase();
  await update(ref(db, PATH), {
    [item.code]: { code: item.code, name: item.name },
  });
}

/** Remove a user-added not-returning item. Seed items cannot be removed. */
export async function removeNotReturning(code: string): Promise<void> {
  const db = getDatabase();
  await remove(ref(db, `${PATH}/${code}`));
}
