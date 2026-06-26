import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import ScreenHeader from '../components/ScreenHeader';
import { recountedData } from '../data/recountedData';
import { color, space, radius, font, mono } from '../theme/tokens';

interface ReportItem {
  code: string;
  name: string;
  count: number;
  previous: number;
  difference: number;
  type: string;
  status: 'increase' | 'decrease' | 'same' | 'no_count';
}

interface TypeSummary {
  type: string;
  totalItems: number;
  totalIncrease: number;
  totalDecrease: number;
  noCountItems: number;
  avgDifference: number;
}

const getFireworkType = (code: string, name: string): string => {
  const nameUpper = name.toUpperCase();
  const codePrefix = code.charAt(0);

  if (codePrefix === 'F' || nameUpper.includes('CRACKER') || nameUpper.includes('FIRECRACKER')) return 'Firecrackers';
  if (codePrefix === 'C' || nameUpper.includes('CANDLE') || nameUpper.includes('ROMAN')) return 'Roman Candles';
  if (codePrefix === 'G' || nameUpper.includes('SHELL') || nameUpper.includes('MORTAR') || nameUpper.includes('SHOT')) return 'Artillery Shells';
  if (codePrefix === 'H' || nameUpper.includes('FOUNTAIN')) return 'Fountains';
  if (codePrefix === 'O' || nameUpper.includes('ROCKET')) return 'Rockets';
  if (codePrefix === 'S' || nameUpper.includes('SPARKLER')) return 'Sparklers';
  if (codePrefix === 'P' || nameUpper.includes('SMOKE')) return 'Smoke';
  if (codePrefix === 'A' || nameUpper.includes('ASST') || nameUpper.includes('ASSORTMENT')) return 'Assortments';
  if (codePrefix === 'E' || nameUpper.includes('ERUPTION') || nameUpper.includes('CONE')) return 'Novelties';
  if (codePrefix === 'J' || nameUpper.includes('BLOOM') || nameUpper.includes('BUTTERFLY')) return 'Ground Effects';
  if (codePrefix === 'K' || codePrefix === 'L' || codePrefix === 'M' || codePrefix === 'N') return 'Specialty Items';
  if (codePrefix === 'I' || nameUpper.includes('POPPER')) return 'Poppers & Snaps';
  if (codePrefix === 'Z' || nameUpper.includes('FUSE') || nameUpper.includes('RACK')) return 'Accessories';
  return 'Other';
};

export default function ReportPage() {
  const navigation = useNavigation();
  const { originalInventory } = useInventory();
  const [reportData, setReportData] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateReport = () => {
      setLoading(true);
      const lines = recountedData.trim().split('\n');
      const items: ReportItem[] = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        const parts = trimmedLine.split('\t');
        const code = parts[0] || '';
        const name = parts[1] || '';
        const countStr = parts[2] || '';
        const count = countStr.trim() === '' ? -1 : parseInt(countStr) || -1;
        const inventoryItem = originalInventory.find(item => item.code === code);
        const previous = inventoryItem ? inventoryItem.showroom : 0;
        const difference = count === -1 ? 0 : count - previous;

        let status: 'increase' | 'decrease' | 'same' | 'no_count';
        if (count === -1) status = 'no_count';
        else if (difference > 0) status = 'increase';
        else if (difference < 0) status = 'decrease';
        else status = 'same';

        return { code, name, count, previous, difference, type: getFireworkType(code, name), status };
      }).filter(Boolean) as ReportItem[];

      setReportData(items);
      setLoading(false);
    };

    if (originalInventory.length > 0) generateReport();
  }, [originalInventory]);

  const reportStats = useMemo(() => {
    const totalItems = reportData.length;
    const increases = reportData.filter(item => item.status === 'increase');
    const decreases = reportData.filter(item => item.status === 'decrease');
    const same = reportData.filter(item => item.status === 'same');
    const noCounts = reportData.filter(item => item.status === 'no_count');
    const totalIncrease = increases.reduce((sum, item) => sum + item.difference, 0);
    const totalDecrease = Math.abs(decreases.reduce((sum, item) => sum + item.difference, 0));
    return {
      totalItems,
      increases: increases.length,
      decreases: decreases.length,
      same: same.length,
      noCounts: noCounts.length,
      totalIncrease,
      totalDecrease,
      netChange: totalIncrease - totalDecrease,
    };
  }, [reportData]);

  const typeSummaries = useMemo(() => {
    const typeMap = new Map<string, ReportItem[]>();
    reportData.forEach(item => {
      if (!typeMap.has(item.type)) typeMap.set(item.type, []);
      typeMap.get(item.type)!.push(item);
    });
    const summaries: TypeSummary[] = Array.from(typeMap.entries()).map(([type, items]) => {
      const withCounts = items.filter(item => item.status !== 'no_count');
      const totalIncrease = items.filter(item => item.difference > 0).reduce((sum, item) => sum + item.difference, 0);
      const totalDecrease = Math.abs(items.filter(item => item.difference < 0).reduce((sum, item) => sum + item.difference, 0));
      const avgDifference = withCounts.length > 0 ? withCounts.reduce((sum, item) => sum + item.difference, 0) / withCounts.length : 0;
      return {
        type,
        totalItems: items.length,
        totalIncrease,
        totalDecrease,
        noCountItems: items.filter(item => item.status === 'no_count').length,
        avgDifference,
      };
    });
    return summaries.sort((a, b) => b.totalItems - a.totalItems);
  }, [reportData]);

  const biggestDiscrepancies = useMemo(() => {
    return reportData
      .filter(item => item.status !== 'no_count')
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 10);
  }, [reportData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Generating Report…" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing inventory data…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const diffColor = (d: number) => (d > 0 ? color.positive : d < 0 ? color.negative : color.textMuted);
  const fmtDiff = (d: number) => `${d > 0 ? '+' : ''}${d}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Inventory Report" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: space.xl }}>
        {/* Overview */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statGrid}>
          {[
            { label: 'Total', value: reportStats.totalItems, c: color.text },
            { label: 'Increases', value: reportStats.increases, c: color.positive },
            { label: 'Decreases', value: reportStats.decreases, c: color.negative },
            { label: 'No Count', value: reportStats.noCounts, c: color.warning },
          ].map(s => (
            <View key={s.label} style={styles.statCell}>
              <Text style={[styles.statValue, { color: s.c }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net Change</Text>
          <Text style={[styles.netValue, { color: diffColor(reportStats.netChange) }]}>{fmtDiff(reportStats.netChange)}</Text>
        </View>

        {/* Summary by type */}
        <Text style={[styles.sectionTitle, { marginTop: space.xl }]}>Summary by Type</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Type</Text>
            <Text style={[styles.th, styles.thNum]}>Items</Text>
            <Text style={[styles.th, styles.thNum]}>+Inc</Text>
            <Text style={[styles.th, styles.thNum]}>-Dec</Text>
            <Text style={[styles.th, styles.thNum]}>N/A</Text>
          </View>
          {typeSummaries.map((item, idx) => (
            <View key={item.type} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
              <Text style={[styles.tdType, { flex: 2 }]}>{item.type}</Text>
              <Text style={[styles.td, styles.thNum]}>{item.totalItems}</Text>
              <Text style={[styles.td, styles.thNum, { color: color.positive }]}>+{item.totalIncrease}</Text>
              <Text style={[styles.td, styles.thNum, { color: color.negative }]}>-{item.totalDecrease}</Text>
              <Text style={[styles.td, styles.thNum, { color: color.textMuted }]}>{item.noCountItems}</Text>
            </View>
          ))}
        </View>

        {/* Biggest discrepancies */}
        <Text style={[styles.sectionTitle, { marginTop: space.xl }]}>Biggest Discrepancies</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>Item</Text>
            <Text style={[styles.th, styles.thNum]}>Prev</Text>
            <Text style={[styles.th, styles.thNum]}>Count</Text>
            <Text style={[styles.th, styles.thNum]}>Diff</Text>
          </View>
          {biggestDiscrepancies.map((item, idx) => (
            <View key={item.code} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
              <View style={{ flex: 1, paddingRight: space.sm }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={[styles.td, styles.thNum]}>{item.previous}</Text>
              <Text style={[styles.td, styles.thNum]}>{item.count}</Text>
              <Text style={[styles.td, styles.thNum, { color: diffColor(item.difference), fontWeight: '700' }]}>{fmtDiff(item.difference)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1, padding: space.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: color.textMuted },
  sectionTitle: { ...font.label, fontSize: 12, marginBottom: space.sm },

  statGrid: {
    flexDirection: 'row',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.md,
  },
  statValue: { fontFamily: mono, fontSize: 22, fontWeight: '700' },
  statLabel: { ...font.label, fontSize: 9, marginTop: 2 },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingVertical: space.sm,
  },
  netLabel: { ...font.label },
  netValue: { fontFamily: mono, fontSize: 18, fontWeight: '700' },

  table: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  th: { ...font.label },
  thNum: { width: 52, textAlign: 'right' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  trAlt: { backgroundColor: color.surfaceAlt },
  td: { fontFamily: mono, fontSize: 13, color: color.text, textAlign: 'right' },
  tdType: { fontSize: 13, fontWeight: '600', color: color.text },
  code: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  name: { fontSize: 12, color: color.textSecondary, marginTop: 1 },
});
