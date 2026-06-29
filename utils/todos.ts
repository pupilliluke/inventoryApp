import { getDatabase, ref, push, set, update, remove, onValue } from 'firebase/database';
import { ActiveUser } from '../types/session';

/**
 * A single to-do: a line of (admin-editable) text assigned to a team member.
 * The assignee — or any admin — checks it off. `assigneeId` is the Firebase
 * user key (see emailToUserKey), so it matches `ActiveUser.id`.
 */
export interface TodoItem {
  id: string;
  text: string;
  assigneeId: string;
  assigneeName: string;
  done: boolean;
  doneBy: string;
  doneAt: string;
  createdAt: string;
  updatedAt: string;
}

const PATH = 'todos';

/** Create a to-do (admin action). Returns the new id. */
export async function createTodo(
  text: string,
  assignee: { id: string; name: string } | null
): Promise<string> {
  const db = getDatabase();
  const todoRef = push(ref(db, PATH));
  const now = new Date().toISOString();
  await set(todoRef, {
    id: todoRef.key,
    text: text.trim(),
    assigneeId: assignee?.id ?? '',
    assigneeName: assignee?.name ?? '',
    done: false,
    doneBy: '',
    doneAt: '',
    createdAt: now,
    updatedAt: now,
  });
  return todoRef.key as string;
}

/** Edit a to-do's text and/or assignee (admin action). */
export async function updateTodo(
  id: string,
  patch: { text?: string; assigneeId?: string; assigneeName?: string }
): Promise<void> {
  const db = getDatabase();
  await update(ref(db, `${PATH}/${id}`), {
    ...(patch.text !== undefined ? { text: patch.text.trim() } : {}),
    ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId } : {}),
    ...(patch.assigneeName !== undefined ? { assigneeName: patch.assigneeName } : {}),
    updatedAt: new Date().toISOString(),
  });
}

/** Check or uncheck a to-do, recording who did it. */
export async function setTodoDone(id: string, done: boolean, who: ActiveUser): Promise<void> {
  const db = getDatabase();
  await update(ref(db, `${PATH}/${id}`), {
    done,
    doneBy: done ? who.name : '',
    doneAt: done ? new Date().toISOString() : '',
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTodo(id: string): Promise<void> {
  const db = getDatabase();
  await remove(ref(db, `${PATH}/${id}`));
}

/**
 * Subscribe to every to-do. Open items come first, then completed ones; within
 * each group, newest first. Returns an unsubscribe.
 */
export function subscribeTodos(callback: (todos: TodoItem[]) => void): () => void {
  const db = getDatabase();
  return onValue(ref(db, PATH), (snapshot) => {
    const data = snapshot.val() || {};
    const todos: TodoItem[] = Object.entries(data).map(([id, raw]: [string, any]) => ({
      id,
      text: raw?.text ?? '',
      assigneeId: raw?.assigneeId ?? '',
      assigneeName: raw?.assigneeName ?? '',
      done: !!raw?.done,
      doneBy: raw?.doneBy ?? '',
      doneAt: raw?.doneAt ?? '',
      createdAt: raw?.createdAt ?? '',
      updatedAt: raw?.updatedAt ?? raw?.createdAt ?? '',
    }));
    todos.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    callback(todos);
  });
}
