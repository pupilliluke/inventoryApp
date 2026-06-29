import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { useIsAdmin, isAdminEmail, isAdminRole } from '../utils/admin';
import { TodoItem, subscribeTodos, createTodo, updateTodo, setTodoDone, deleteTodo } from '../utils/todos';
import { appendLog, LogMessages } from '../utils/logging';
import ScreenHeader from '../components/ScreenHeader';
import CustomIconButton from '../components/CustomIconButton';
import { CheckIcon } from '../components/CustomIcons';
import { color, space, radius, font } from '../theme/tokens';

interface Assignee {
  id: string;
  name: string;
}

const UNASSIGNED: Assignee = { id: '', name: 'Unassigned' };

export default function TodoPage() {
  const navigation = useNavigation<any>();
  const { activeUser } = useSession();
  const isAdmin = useIsAdmin();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newAssignee, setNewAssignee] = useState<Assignee>(UNASSIGNED);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editAssignee, setEditAssignee] = useState<Assignee>(UNASSIGNED);

  const [todoToDelete, setTodoToDelete] = useState<TodoItem | null>(null);

  // Sort/filter by completion state.
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  useEffect(() => subscribeTodos(setTodos), []);
  useEffect(() => {
    const usersRef = ref(db, 'users');
    return onValue(usersRef, (snapshot) => setUsers(snapshot.val() || {}));
  }, []);

  // Approved (assignable) users, alphabetical, with "Unassigned" first.
  const assignees = useMemo<Assignee[]>(() => {
    const list = Object.entries(users)
      .map(([key, u]: [string, any]) => ({ key, raw: u }))
      .filter(({ raw }) => {
        const admin = isAdminEmail(raw?.email) || isAdminRole(raw);
        return admin || raw?.status !== 'pending';
      })
      .map(({ key, raw }) => ({ id: key, name: raw?.name ?? key }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [UNASSIGNED, ...list];
  }, [users]);

  const canToggle = (todo: TodoItem) =>
    isAdmin || (!!activeUser && todo.assigneeId === activeUser.id);

  const handleToggle = async (todo: TodoItem) => {
    if (!activeUser || !canToggle(todo)) return;
    const next = !todo.done;
    try {
      await setTodoDone(todo.id, next, activeUser);
      await appendLog({
        userId: activeUser.id,
        userName: activeUser.name,
        message: LogMessages.todoToggled(activeUser, todo.text, next),
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to update the to-do.');
      console.error(err);
    }
  };

  const handleAdd = async () => {
    if (!newText.trim()) {
      Alert.alert('Error', 'Please enter to-do text.');
      return;
    }
    try {
      await createTodo(newText, newAssignee.id ? newAssignee : null);
      if (activeUser) {
        await appendLog({
          userId: activeUser.id,
          userName: activeUser.name,
          message: LogMessages.todoCreated(activeUser, newText.trim(), newAssignee.name),
        });
      }
      setNewText('');
      setNewAssignee(UNASSIGNED);
      setShowAdd(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to add the to-do.');
      console.error(err);
    }
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditAssignee(todo.assigneeId ? { id: todo.assigneeId, name: todo.assigneeName } : UNASSIGNED);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditAssignee(UNASSIGNED);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editText.trim()) {
      Alert.alert('Error', 'To-do text cannot be empty.');
      return;
    }
    const oldText = todos.find((t) => t.id === editingId)?.text ?? '';
    try {
      await updateTodo(editingId, {
        text: editText,
        assigneeId: editAssignee.id,
        assigneeName: editAssignee.id ? editAssignee.name : '',
      });
      if (activeUser) {
        await appendLog({
          userId: activeUser.id,
          userName: activeUser.name,
          message: LogMessages.todoEdited(activeUser, oldText, editText.trim(), editAssignee.name),
        });
      }
      cancelEdit();
    } catch (err) {
      Alert.alert('Error', 'Failed to save the to-do.');
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!todoToDelete) return;
    try {
      await deleteTodo(todoToDelete.id);
      if (activeUser) {
        await appendLog({
          userId: activeUser.id,
          userName: activeUser.name,
          message: LogMessages.todoDeleted(activeUser, todoToDelete.text),
        });
      }
      setTodoToDelete(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete the to-do.');
      console.error(err);
    }
  };

  const openCount = todos.filter((t) => !t.done).length;
  const doneCount = todos.length - openCount;
  const visibleTodos =
    filter === 'open' ? todos.filter((t) => !t.done)
    : filter === 'done' ? todos.filter((t) => t.done)
    : todos;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="To-Do"
        onBack={() => navigation.goBack()}
        right={
          isAdmin ? (
            <CustomIconButton iconType="add" onPress={() => setShowAdd((s) => !s)} color={color.onChrome} />
          ) : undefined
        }
      />

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}>
          {/* Add form (admin) */}
          {isAdmin && showAdd && (
            <View style={styles.panel}>
              <Text style={styles.sectionLabel}>New To-Do</Text>
              <TextInput
                value={newText}
                onChangeText={setNewText}
                style={styles.field}
                placeholder="What needs doing?"
                placeholderTextColor={color.textMuted}
                multiline
              />
              <Text style={[styles.sectionLabel, { marginTop: space.md }]}>Assign To</Text>
              <AssigneePicker assignees={assignees} selectedId={newAssignee.id} onSelect={setNewAssignee} />
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.btnGhost}
                  onPress={() => { setShowAdd(false); setNewText(''); setNewAssignee(UNASSIGNED); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleAdd} activeOpacity={0.8}>
                  <Text style={styles.btnPrimaryText}>Add To-Do</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.headingRow}>
            <Text style={styles.heading}>To-Dos · {todos.length}</Text>
            {openCount > 0 && (
              <View style={styles.openChip}>
                <Text style={styles.openChipText}>{openCount} open</Text>
              </View>
            )}
          </View>

          {/* Sort/filter by completion state */}
          {todos.length > 0 && (
            <View style={styles.segment}>
              {([
                { key: 'all', label: `All · ${todos.length}` },
                { key: 'open', label: `Open · ${openCount}` },
                { key: 'done', label: `Done · ${doneCount}` },
              ] as const).map(({ key, label }) => {
                const active = filter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    onPress={() => setFilter(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {todos.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyText}>No to-dos yet</Text>
              <Text style={styles.emptySubtext}>
                {isAdmin ? 'Tap + to add the first one.' : 'Nothing assigned right now.'}
              </Text>
            </View>
          ) : visibleTodos.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyText}>{filter === 'open' ? 'Nothing open' : 'Nothing completed'}</Text>
              <Text style={styles.emptySubtext}>
                {filter === 'open' ? 'All to-dos are checked off.' : 'No to-dos have been completed yet.'}
              </Text>
            </View>
          ) : (
            <View style={styles.table}>
              {visibleTodos.map((todo, i) => {
                const isEditing = editingId === todo.id;
                const mine = !!activeUser && todo.assigneeId === activeUser.id;
                const toggleable = canToggle(todo);
                const last = i === visibleTodos.length - 1;

                if (isEditing) {
                  return (
                    <View key={todo.id} style={[styles.row, styles.rowEditing, last && styles.rowLast]}>
                      <TextInput
                        value={editText}
                        onChangeText={setEditText}
                        style={styles.field}
                        placeholder="To-do text"
                        placeholderTextColor={color.textMuted}
                        multiline
                        autoFocus
                      />
                      <Text style={[styles.sectionLabel, { marginTop: space.sm }]}>Assign To</Text>
                      <AssigneePicker assignees={assignees} selectedId={editAssignee.id} onSelect={setEditAssignee} />
                      <View style={styles.formActions}>
                        <TouchableOpacity style={styles.btnGhost} onPress={cancelEdit} activeOpacity={0.8}>
                          <Text style={styles.btnGhostText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={saveEdit} activeOpacity={0.8}>
                          <Text style={styles.btnPrimaryText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }

                return (
                  <View key={todo.id} style={[styles.row, last && styles.rowLast]}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        todo.done && styles.checkboxDone,
                        !toggleable && styles.checkboxDisabled,
                      ]}
                      onPress={() => handleToggle(todo)}
                      disabled={!toggleable}
                      activeOpacity={0.7}
                    >
                      {todo.done && <CheckIcon size={16} color={color.textInverse} />}
                    </TouchableOpacity>

                    <View style={styles.rowBody}>
                      <Text style={[styles.todoText, todo.done && styles.todoTextDone]}>{todo.text}</Text>
                      <View style={styles.metaLine}>
                        <View style={[styles.assigneeChip, mine && styles.assigneeChipMine]}>
                          <Text style={[styles.assigneeChipText, mine && styles.assigneeChipTextMine]} numberOfLines={1}>
                            {todo.assigneeName || 'Unassigned'}{mine ? ' · You' : ''}
                          </Text>
                        </View>
                        {todo.done && todo.doneBy ? (
                          <Text style={styles.doneBy} numberOfLines={1}>✓ {todo.doneBy}</Text>
                        ) : null}
                      </View>
                    </View>

                    {isAdmin && (
                      <View style={styles.rowActions}>
                        <CustomIconButton iconType="edit" size={18} color={color.warning} onPress={() => startEdit(todo)} />
                        <CustomIconButton iconType="delete" size={18} color={color.negative} onPress={() => setTodoToDelete(todo)} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete confirmation */}
      <Portal>
        <Modal
          visible={!!todoToDelete}
          onDismiss={() => setTodoToDelete(null)}
          contentContainerStyle={styles.dialog}
          dismissable
        >
          <Text style={styles.dialogTitle}>Delete To-Do</Text>
          <Text style={styles.dialogBody}>
            Delete “{todoToDelete?.text}”? <Text style={styles.dialogDanger}>This cannot be undone.</Text>
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setTodoToDelete(null)} activeOpacity={0.8}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={confirmDelete} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

function AssigneePicker({
  assignees,
  selectedId,
  onSelect,
}: {
  assignees: Assignee[];
  selectedId: string;
  onSelect: (a: Assignee) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
      {assignees.map((a) => {
        const active = a.id === selectedId;
        return (
          <TouchableOpacity
            key={a.id || 'unassigned'}
            style={[styles.pickerChip, active && styles.pickerChipActive]}
            onPress={() => onSelect(a)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pickerChipText, active && styles.pickerChipTextActive]}>{a.name}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1 },
  scroll: { flex: 1 },

  panel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.lg,
  },
  sectionLabel: { ...font.label, marginBottom: space.sm },
  field: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    backgroundColor: color.surface,
    color: color.text,
    minHeight: 44,
  },
  formActions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { ...font.label, fontSize: 12, marginBottom: space.sm },
  openChip: {
    backgroundColor: color.accentBg,
    borderWidth: 1,
    borderColor: color.accentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    marginBottom: space.sm,
  },
  openChipText: { fontSize: 11, fontWeight: '700', color: color.accent },

  // Completion sort/filter segmented control
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
    padding: 2,
    marginBottom: space.md,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.accent,
  },
  segmentText: { fontSize: 12, fontWeight: '700', color: color.textSecondary },
  segmentTextActive: { color: color.accent },

  table: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowEditing: { flexDirection: 'column', alignItems: 'stretch', backgroundColor: color.surfaceAlt },
  rowBody: { flex: 1 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxDone: { backgroundColor: color.positive, borderColor: color.positive },
  checkboxDisabled: { opacity: 0.4 },

  todoText: { fontSize: 15, color: color.text, lineHeight: 21 },
  todoTextDone: { textDecorationLine: 'line-through', color: color.textMuted },

  metaLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs, flexWrap: 'wrap' },
  assigneeChip: {
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 1,
    maxWidth: 200,
  },
  assigneeChipMine: { backgroundColor: color.accentBg, borderColor: color.accentBorder },
  assigneeChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: color.textSecondary,
  },
  assigneeChipTextMine: { color: color.accent },
  doneBy: { fontSize: 11, fontWeight: '700', color: color.positive },

  // Assignee picker
  pickerRow: { gap: space.sm, paddingVertical: 2, paddingRight: space.sm },
  pickerChip: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  pickerChipActive: { backgroundColor: color.accentBg, borderColor: color.accent },
  pickerChipText: { fontSize: 13, fontWeight: '600', color: color.textSecondary },
  pickerChipTextActive: { color: color.accent, fontWeight: '700' },

  emptyPanel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.xl,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, fontWeight: '600', color: color.textSecondary, textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: color.textMuted, textAlign: 'center', marginTop: space.xs },

  // Buttons
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: color.textSecondary },
  btnPrimary: {
    flex: 1,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: color.textInverse },
  btnDanger: {
    flex: 1,
    backgroundColor: color.negative,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },

  // Dialog
  dialog: {
    backgroundColor: color.surface,
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.xl,
    maxWidth: 420,
    width: '88%',
    alignSelf: 'center',
  },
  dialogTitle: { ...font.title, fontSize: 16, marginBottom: space.sm },
  dialogBody: { fontSize: 14, color: color.textSecondary, lineHeight: 21 },
  dialogDanger: { color: color.negative, fontWeight: '700' },
  dialogActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
});
