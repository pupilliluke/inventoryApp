import React from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { PullListIcon, TruckIcon, LowStockIcon } from '../components/CustomIcons';
import { color, space, radius, font } from '../theme/tokens';

export default function TasksPage() {
  const navigation = useNavigation<any>();

  const options = [
    {
      key: 'PullLists',
      label: 'Pull Lists',
      description: 'Gather fireworks with quantities into shared lists.',
      Icon: PullListIcon,
    },
    {
      key: 'Truck',
      label: 'Truck',
      description: 'Build truck lists with text notes and item lists.',
      Icon: TruckIcon,
    },
    {
      key: 'LowQuantity',
      label: 'Low Quantity / Out',
      description: 'One shared list of items running low or out, with notes.',
      Icon: LowStockIcon,
    },
  ] as const;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Tasks" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        {options.map(({ key, label, description, Icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(key as never)}
          >
            <View style={styles.cardIcon}>
              <Icon size={26} color={color.accent} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDesc}>{description}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { padding: space.md, gap: space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.lg,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { ...font.title, fontSize: 17, marginBottom: 2 },
  cardDesc: { fontSize: 13, color: color.textMuted, lineHeight: 18 },
  chevron: { fontSize: 24, color: color.textMuted },
});
