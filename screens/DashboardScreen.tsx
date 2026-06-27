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
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { useIsAdmin } from '../utils/admin';
import { subscribePullLists, pullListLineCount, pullListTotal, PullList } from '../utils/pullLists';
import { subscribeTrucks, truckLineCount, TruckList } from '../utils/trucks';
import { InventoryItem } from '../types/inventoryItem';
import { CONTAINER_COLORS } from '../components/InventoryRow';
import {
  PullListIcon,
  TruckIcon,
  LogIcon,
  AccountIcon,
  UsersIcon,
  CountIcon,
  ViewIcon,
  LowStockIcon,
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
  // InventoryContext is created with a null default, so the hook is loosely
  // typed; narrow to the fields this screen reads.
  const { originalInventory, loading } = useInventory() as unknown as {
    originalInventory: InventoryItem[];
    loading: boolean;
  };

  const [pullLists, setPullLists] = useState<PullList[]>([]);
  const [trucks, setTrucks] = useState<TruckList[]>([]);
  const [heroWidth, setHeroWidth] = useState(0);

  useEffect(() => subscribePullLists(setPullLists), []);
  useEffect(() => subscribeTrucks(setTrucks), []);

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

  const recentPullLists = pullLists.slice(0, 4);
  const recentTrucks = trucks.slice(0, 3);

  const quickActions = [
    {
      key: 'PullLists',
      label: 'Pull Lists',
      Icon: PullListIcon,
      onPress: () => navigation.navigate('PullLists'),
    },
    {
      key: 'Truck',
      label: 'Trucks',
      Icon: TruckIcon,
      onPress: () => navigation.navigate('Truck'),
    },
    {
      key: 'LowQuantity',
      label: 'Low Qty / Out',
      Icon: LowStockIcon,
      onPress: () => navigation.navigate('LowQuantity'),
    },
    {
      key: 'InventoryList',
      label: 'Inventory',
      Icon: ViewIcon,
      onPress: () => navigation.navigate('InventoryList'),
    },
    {
      key: 'LogPage',
      label: 'Activity',
      Icon: LogIcon,
      onPress: () => navigation.navigate('LogPage'),
    },
    ...(isAdmin
      ? [
          {
            key: 'UserListPage',
            label: 'Users',
            Icon: UsersIcon,
            onPress: () => navigation.navigate('UserListPage'),
          },
          {
            key: 'RecountPage',
            label: 'Recount',
            Icon: CountIcon,
            onPress: () => navigation.navigate('RecountPage'),
          },
        ]
      : []),
    {
      key: 'AccountPage',
      label: 'Account',
      Icon: AccountIcon,
      onPress: () => navigation.navigate('AccountPage'),
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
              <Text style={styles.heroEyebrow}>Phantom Warehouse</Text>
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

          {/* Trucks */}
          <View style={[styles.sectionHead, { marginTop: space.xl }]}>
            <Text style={styles.sectionLabel}>Trucks</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Truck')} activeOpacity={0.7}>
              <Text style={styles.sectionAction}>View all ›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listCard}>
            {recentTrucks.length === 0 ? (
              <View style={styles.emptyRow}>
                <TruckIcon size={22} color={color.textMuted} />
                <Text style={styles.emptyText}>No truck lists yet. Tap “View all” to create one.</Text>
              </View>
            ) : (
              recentTrucks.map((list, i) => {
                const mine = !!activeUser && list.ownerId === activeUser.id;
                const noteCount = (list.notes || []).length;
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[styles.listRow, i === recentTrucks.length - 1 && styles.listRowLast]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('TruckDetail', { listId: list.id })}
                  >
                    <View style={styles.listRowMain}>
                      <View style={styles.listTitleLine}>
                        <Text style={styles.listTitle} numberOfLines={1}>{list.title}</Text>
                        {mine && <Text style={styles.youBadge}>YOU</Text>}
                        {noteCount > 0 && (
                          <Text style={styles.noteBadge}>{noteCount} NOTE{noteCount === 1 ? '' : 'S'}</Text>
                        )}
                      </View>
                      <Text style={styles.listOwner} numberOfLines={1}>by {list.ownerName}</Text>
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={styles.listMetaValue}>{truckLineCount(list)}</Text>
                      <Text style={styles.listMetaLabel}>items</Text>
                    </View>
                    <Text style={styles.listWhen}>{formatWhen(list.updatedAt)}</Text>
                  </TouchableOpacity>
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

  // List cards (pull lists / trucks)
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
  noteBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: color.textSecondary,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
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
});
