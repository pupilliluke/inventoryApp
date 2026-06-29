import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AnimatedGridHero from '../components/AnimatedGridHero';
import UserBadge from '../components/UserBadge';
import NavMenu from '../components/NavMenu';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { useIsAdmin, usePendingUsers } from '../utils/admin';
import { subscribePullLists, pullListLineCount, pullListTotal, PullList } from '../utils/pullLists';
import { InventoryItem } from '../types/inventoryItem';
import { CONTAINER_COLORS } from '../components/InventoryRow';
import {
  subscribeMovements,
  withinRange,
  aggregateUsers,
  totals,
  Movement,
} from '../utils/analytics';
import {
  PullListIcon,
  UsersIcon,
  ViewIcon,
  CheckIcon,
} from '../components/CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatWhen(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function timeAgo(ts: number): string {
  if (!ts) return '';
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CONTAINER_LABELS: Record<number, string> = {
  1: 'C1',
  2: 'C2',
  3: 'C3',
  4: 'C4',
};

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { activeUser } = useSession();
  const isAdmin = useIsAdmin();
  const pendingUsers = usePendingUsers();
  // InventoryContext is created with a null default, so the hook is loosely
  // typed; narrow to the fields this screen reads.
  const { originalInventory, loading } = useInventory() as unknown as {
    originalInventory: InventoryItem[];
    loading: boolean;
  };

  const [pullLists, setPullLists] = useState<PullList[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [heroWidth, setHeroWidth] = useState(0);

  useEffect(() => subscribePullLists(setPullLists), []);
  useEffect(() => subscribeMovements(setMovements, 500), []);

  // Headline KPIs and per-container rollups, derived from the full (unfiltered)
  // inventory so the dashboard reflects the whole warehouse, not active filters.
  const stats = useMemo(() => {
    const items = originalInventory as InventoryItem[];
    let units = 0;
    const byContainer: Record<number, { items: number; units: number }> = {
      1: { items: 0, units: 0 },
      2: { items: 0, units: 0 },
      3: { items: 0, units: 0 },
      4: { items: 0, units: 0 },
    };
    for (const it of items) {
      units += (it.showroom || 0) + (it.warehouse || 0);
      const cat = it.containers?.category || 0;
      if (cat >= 1 && cat <= 4) {
        byContainer[cat].items += 1;
        byContainer[cat].units += it.containers?.quantity || 0;
      }
    }
    const containerUnits = Object.values(byContainer).reduce((s, c) => s + c.units, 0);
    return { itemCount: items.length, units, byContainer, containerUnits };
  }, [originalInventory]);

  const recentPullLists = pullLists.slice(0, 1);

  // Activity analytics over the last 7 days, derived from the parsed log feed.
  const activity = useMemo(() => {
    const recent = withinRange(movements, 7 * 24 * 60 * 60 * 1000, Date.now());
    return {
      totals: totals(recent),
      users: aggregateUsers(recent, 5),
    };
  }, [movements]);

  const quickActions = [
    {
      key: 'PullLists',
      label: 'Pull Lists',
      Icon: PullListIcon,
      onPress: () => navigation.navigate('PullLists'),
    },
    ...(isAdmin
      ? [
          {
            key: 'UserListPage',
            label: 'Users',
            Icon: UsersIcon,
            onPress: () => navigation.navigate('UserListPage'),
          },
        ]
      : []),
    {
      key: 'InventoryList',
      label: 'Inventory',
      Icon: ViewIcon,
      onPress: () => navigation.navigate('InventoryList'),
    },
  ];

  const onHeroLayout = (e: LayoutChangeEvent) => setHeroWidth(e.nativeEvent.layout.width);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated hero */}
        <View onLayout={onHeroLayout}>
          <AnimatedGridHero height={232} width={heroWidth || undefined} color="#7cb3e8" background={color.chromeAlt}>
            <View style={styles.heroTopBar}>
              <View style={styles.heroTopLeft}>
                <NavMenu />
                <Text style={styles.heroEyebrow}>Phantom Warehouse</Text>
              </View>
              <UserBadge />
            </View>

            <Text style={styles.heroGreeting}>
              {greeting()}
              {activeUser?.name ? `, ${activeUser.name.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.heroTitle}>Warehouse Dashboard</Text>

            <View style={styles.heroStats}>
              <HeroStat value={loading ? '—' : String(stats.itemCount)} label="Items" />
              <View style={styles.heroDivider} />
              <HeroStat value={loading ? '—' : String(stats.units)} label="Units" />
              <View style={styles.heroDivider} />
              <HeroStat value={String(pullLists.length)} label="Pull Lists" />
            </View>
          </AnimatedGridHero>
        </View>

        <View style={styles.body}>
          {/* Pending-approval notification (admins only) */}
          {isAdmin && pendingUsers.length > 0 && (
            <TouchableOpacity
              style={styles.approvalBanner}
              onPress={() => navigation.navigate('UserListPage')}
              activeOpacity={0.85}
            >
              <View style={styles.approvalBadge}>
                <Text style={styles.approvalBadgeText}>{pendingUsers.length}</Text>
              </View>
              <View style={styles.approvalTextWrap}>
                <Text style={styles.approvalTitle}>
                  {pendingUsers.length === 1
                    ? '1 user is waiting for approval'
                    : `${pendingUsers.length} users are waiting for approval`}
                </Text>
                <Text style={styles.approvalSub} numberOfLines={1}>
                  {pendingUsers.map((u) => u.name).join(', ')}
                </Text>
              </View>
              <Text style={styles.approvalAction}>Review ›</Text>
            </TouchableOpacity>
          )}

          {/* Tasks — entry point to pull lists, trucks, low stock & to-dos */}
          <TouchableOpacity
            style={styles.tasksCard}
            onPress={() => navigation.navigate('Tasks')}
            activeOpacity={0.85}
          >
            <View style={styles.tasksIcon}>
              <CheckIcon size={24} color={color.accent} />
            </View>
            <View style={styles.tasksBody}>
              <Text style={styles.tasksTitle}>Tasks</Text>
              <Text style={styles.tasksSub}>Pull lists, trucks, low stock & to-dos</Text>
            </View>
            <Text style={styles.tasksChevron}>›</Text>
          </TouchableOpacity>

          {/* Container status */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Container Status</Text>
            <Text style={styles.sectionMeta}>{stats.containerUnits} units staged</Text>
          </View>
          <View style={styles.containerGrid}>
            {[1, 2, 3, 4].map((cat) => {
              const c = CONTAINER_COLORS[cat];
              const data = stats.byContainer[cat];
              return (
                <View
                  key={cat}
                  style={[styles.containerCard, { borderColor: c.border, backgroundColor: c.bg }]}
                >
                  <View style={styles.containerCardTop}>
                    <Text style={[styles.containerTag, { color: c.text }]}>{CONTAINER_LABELS[cat]}</Text>
                    <View style={[styles.containerDot, { backgroundColor: c.text }]} />
                  </View>
                  <Text style={[styles.containerUnits, { color: c.text }]}>{loading ? '—' : data.units}</Text>
                  <Text style={styles.containerSub}>
                    {loading ? '' : `${data.items} ${data.items === 1 ? 'item' : 'items'}`}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Quick actions */}
          <Text style={[styles.sectionLabel, { marginTop: space.xl, marginBottom: space.sm }]}>
            Quick Actions
          </Text>
          <View style={styles.actionGrid}>
            {quickActions.map(({ key, label, Icon, onPress }) => (
              <TouchableOpacity key={key} style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
                <View style={styles.actionIcon}>
                  <Icon size={22} color={color.accent} />
                </View>
                <Text style={styles.actionLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pull Lists */}
          <View style={[styles.sectionHead, { marginTop: space.xl }]}>
            <Text style={styles.sectionLabel}>Pull Lists</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PullLists')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>View all ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
            {recentPullLists.length === 0 ? (
              <View style={styles.emptyRow}>
                <PullListIcon size={22} color={color.textMuted} />
                <Text style={styles.emptyText}>No pull lists yet. Tap “View all” to create one.</Text>
              </View>
            ) : (
              recentPullLists.map((list, i) => {
                const mine = !!activeUser && list.ownerId === activeUser.id;
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[styles.listRow, i === recentPullLists.length - 1 && styles.listRowLast]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PullListDetail', { listId: list.id })}
                  >
                    <View style={styles.listRowMain}>
                      <View style={styles.listTitleLine}>
                        <Text style={styles.listTitle} numberOfLines={1}>{list.title}</Text>
                        {mine && <Text style={styles.youBadge}>YOU</Text>}
                      </View>
                      <Text style={styles.listOwner} numberOfLines={1}>by {list.ownerName}</Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={styles.listMetaValue}>{pullListLineCount(list)}</Text>
                      <Text style={styles.listMetaLabel}>items</Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={styles.listMetaValue}>{pullListTotal(list)}</Text>
                      <Text style={styles.listMetaLabel}>units</Text>
                    </View>
                    <Text style={styles.listWhen}>{formatWhen(list.updatedAt)}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Activity analytics */}
          <View style={[styles.sectionHead, { marginTop: space.xl }]}>
            <Text style={styles.sectionLabel}>Activity · Last 7 Days</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>Analytics ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flowGrid}>
            <View style={[styles.flowCard, { borderColor: color.positive, backgroundColor: color.positiveBg }]}>
              <Text style={[styles.flowLabel, { color: color.positive }]}>Units In ▲</Text>
              <Text style={[styles.flowValue, { color: color.positive }]}>{activity.totals.inUnits}</Text>
            </View>
            <View style={[styles.flowCard, { borderColor: color.negative, backgroundColor: color.negativeBg }]}>
              <Text style={[styles.flowLabel, { color: color.negative }]}>Units Out ▼</Text>
              <Text style={[styles.flowValue, { color: color.negative }]}>{activity.totals.outUnits}</Text>
            </View>
            <View style={[styles.flowCard, { borderColor: color.border, backgroundColor: color.surface }]}>
              <Text style={[styles.flowLabel, { color: color.textSecondary }]}>Net</Text>
              <Text
                style={[
                  styles.flowValue,
                  { color: activity.totals.net > 0 ? color.positive : activity.totals.net < 0 ? color.negative : color.text },
                ]}
              >
                {activity.totals.net > 0 ? '+' : ''}{activity.totals.net}
              </Text>
            </View>
          </View>
          <View style={styles.flowMetaRow}>
            <Text style={styles.flowMetaText}>{activity.totals.movements} changes</Text>
            <Text style={styles.flowMetaDot}>·</Text>
            <Text style={styles.flowMetaText}>{activity.totals.activeItems} items touched</Text>
          </View>

          {/* Recent users */}
          <View style={[styles.sectionHead, { marginTop: space.xl }]}>
            <Text style={styles.sectionLabel}>Recent Users</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => navigation.navigate('UserListPage')} activeOpacity={0.7}>
                <Text style={styles.sectionAction}>View all ›</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.listCard}>
            {activity.users.length === 0 ? (
              <View style={styles.emptyRow}>
                <UsersIcon size={22} color={color.textMuted} />
                <Text style={styles.emptyText}>No recent activity yet. Changes show up here as the team works.</Text>
              </View>
            ) : (
              activity.users.map((u, i) => {
                const mine = !!activeUser && u.userId === activeUser.id;
                return (
                  <View
                    key={u.userId || u.userName}
                    style={[styles.listRow, i === activity.users.length - 1 && styles.listRowLast]}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(u.userName)}</Text>
                    </View>
                    <View style={styles.listRowMain}>
                      <View style={styles.listTitleLine}>
                        <Text style={styles.listTitle} numberOfLines={1}>{u.userName}</Text>
                        {mine && <Text style={styles.youBadge}>YOU</Text>}
                      </View>
                      <Text style={styles.listOwner} numberOfLines={1}>
                        {u.actions} {u.actions === 1 ? 'action' : 'actions'} · {timeAgo(u.lastTs)}
                      </Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={[styles.listMetaValue, { color: color.positive }]}>+{u.inUnits}</Text>
                      <Text style={styles.listMetaLabel}>in</Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={[styles.listMetaValue, { color: color.negative }]}>-{u.outUnits}</Text>
                      <Text style={styles.listMetaLabel}>out</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.appBg },
  scroll: { flex: 1 },

  // Hero
  heroTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  heroTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginLeft: -space.sm, // pull the menu button's tap padding to the edge
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '600',
    color: color.onChromeMuted,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: color.onChrome,
    letterSpacing: 0.3,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.lg,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  heroStat: { alignItems: 'center', minWidth: 56 },
  heroStatValue: {
    fontFamily: mono,
    fontSize: 20,
    fontWeight: '800',
    color: color.onChrome,
  },
  heroStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginHorizontal: space.md,
  },

  body: { padding: space.md },

  // Pending-approval banner
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.warningBg,
    borderWidth: 1,
    borderColor: color.warning,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.lg,
  },
  approvalBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.warning,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  approvalBadgeText: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  approvalTextWrap: { flex: 1 },
  approvalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: color.warning,
  },
  approvalSub: {
    fontSize: 12,
    color: color.textSecondary,
    marginTop: 1,
  },
  approvalAction: {
    fontSize: 12,
    fontWeight: '800',
    color: color.warning,
  },

  // Tasks entry card (above container status)
  tasksCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.xl,
  },
  tasksIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksBody: { flex: 1 },
  tasksTitle: { ...font.title, fontSize: 16 },
  tasksSub: { fontSize: 12, color: color.textMuted, marginTop: 2 },
  tasksChevron: { fontSize: 24, color: color.textMuted },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  sectionLabel: { ...font.label },
  sectionMeta: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: color.textMuted,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
    color: color.accent,
  },

  // Container cards
  containerGrid: {
    flexDirection: 'row',
    gap: space.sm,
  },
  containerCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
  },
  containerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerTag: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  containerDot: { width: 8, height: 8, borderRadius: 4 },
  containerUnits: {
    fontFamily: mono,
    fontSize: 24,
    fontWeight: '800',
    marginTop: space.sm,
  },
  containerSub: {
    fontSize: 10,
    fontWeight: '600',
    color: color.textSecondary,
    marginTop: 1,
  },

  // Quick actions
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  actionCard: {
    width: '23.5%',
    minWidth: 76,
    flexGrow: 1,
    alignItems: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space.md,
    gap: space.xs,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: color.text,
  },

  // List cards (pull lists / recent users)
  listCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  listRowLast: { borderBottomWidth: 0 },
  listRowMain: { flex: 1 },
  listTitleLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listTitle: { ...font.title, fontSize: 14, flexShrink: 1 },
  listOwner: { fontSize: 12, color: color.textMuted, marginTop: 2 },
  youBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: color.accent,
    backgroundColor: color.accentBg,
    borderWidth: 1,
    borderColor: color.accentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  listMeta: { alignItems: 'center', width: 40 },
  listMetaValue: { fontFamily: mono, fontSize: 15, fontWeight: '700', color: color.text },
  listMetaLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.textMuted,
  },
  listWhen: { fontSize: 11, color: color.textMuted, width: 40, textAlign: 'right' },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
  },
  emptyText: { flex: 1, fontSize: 13, color: color.textMuted, lineHeight: 18 },

  // Activity flow cards (in / out / net)
  flowGrid: { flexDirection: 'row', gap: space.sm },
  flowCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    alignItems: 'center',
  },
  flowLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  flowValue: { fontFamily: mono, fontSize: 24, fontWeight: '800', marginTop: space.xs },
  flowMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
    paddingHorizontal: space.xs,
  },
  flowMetaText: { fontSize: 11, fontWeight: '600', color: color.textMuted },
  flowMetaDot: { fontSize: 11, color: color.textMuted },

  // Recent-user avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: color.accentBg,
    borderWidth: 1,
    borderColor: color.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: color.accent, letterSpacing: 0.3 },
});
