import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import CustomIconButton from './CustomIconButton';
import {
  HomeIcon, ViewIcon, CheckIcon, PullListIcon, TruckIcon, LowStockIcon,
  LogIcon, ChartIcon, UsersIcon, CountIcon, AccountIcon,
} from './CustomIcons';
import { useIsAdmin } from '../utils/admin';
import { color, space, radius, font } from '../theme/tokens';

interface NavItem {
  route: string;
  label: string;
  Icon: React.FC<{ size?: number; color?: string }>;
  admin?: boolean;
}

// Detail screens (PullListDetail / TruckDetail) are omitted because they
// require route params; the menu only links to top-level destinations.
const NAV_ITEMS: NavItem[] = [
  { route: 'Inventory', label: 'Dashboard', Icon: HomeIcon },
  { route: 'InventoryList', label: 'Inventory', Icon: ViewIcon },
  { route: 'Tasks', label: 'Tasks', Icon: CheckIcon },
  { route: 'PullLists', label: 'Pull Lists', Icon: PullListIcon },
  { route: 'Truck', label: 'Trucks', Icon: TruckIcon },
  { route: 'LowQuantity', label: 'Low Qty / Out', Icon: LowStockIcon },
  { route: 'LogPage', label: 'Activity Log', Icon: LogIcon },
  { route: 'ReportPage', label: 'Reports', Icon: ChartIcon },
  { route: 'UserListPage', label: 'Users', Icon: UsersIcon, admin: true },
  { route: 'RecountPage', label: 'Recount', Icon: CountIcon, admin: true },
  { route: 'AccountPage', label: 'Account', Icon: AccountIcon },
];

/**
 * Hamburger button that expands a collapsible drawer of every top-level screen.
 * Rendered inside ScreenHeader, so it shows on all secondary screens.
 */
export default function NavMenu() {
  const navigation = useNavigation<any>();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);

  // Name of the route currently on top of the stack, used to highlight it.
  const currentRoute = useNavigationState((state) =>
    state ? state.routes[state.index]?.name : undefined
  );

  const items = NAV_ITEMS.filter((it) => !it.admin || isAdmin);

  const go = (route: string) => {
    setOpen(false);
    if (route === currentRoute) return;
    // Defer until after the modal dismiss so the transition feels smooth.
    requestAnimationFrame(() => navigation.navigate(route));
  };

  return (
    <>
      <CustomIconButton iconType="menu" onPress={() => setOpen(true)} color={color.onChrome} />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Inner Pressable swallows taps so they don't close the drawer. */}
          <Pressable style={styles.panel} onPress={() => {}}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Menu</Text>
              <CustomIconButton
                iconType="close"
                onPress={() => setOpen(false)}
                color={color.onChrome}
                size={22}
              />
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {items.map(({ route, label, Icon }) => {
                const active = route === currentRoute;
                return (
                  <TouchableOpacity
                    key={route}
                    style={[styles.item, active && styles.itemActive]}
                    activeOpacity={0.7}
                    onPress={() => go(route)}
                  >
                    <View style={[styles.itemIcon, active && styles.itemIconActive]}>
                      <Icon size={20} color={active ? color.accent : color.textSecondary} />
                    </View>
                    <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    width: '80%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: color.surface,
    borderRightWidth: 1,
    borderRightColor: color.border,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.chrome,
    paddingHorizontal: space.md,
    paddingTop: space.xl,
    paddingBottom: space.sm,
    minHeight: 72,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: color.onChrome,
  },
  list: { paddingVertical: space.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginHorizontal: space.sm,
    marginVertical: 2,
    borderRadius: radius.md,
  },
  itemActive: { backgroundColor: color.accentBg },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: color.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconActive: { backgroundColor: color.surface },
  itemLabel: { ...font.title, fontSize: 15, color: color.text },
  itemLabelActive: { color: color.accent },
});
