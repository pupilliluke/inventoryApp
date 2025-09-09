import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, Card, Appbar, Chip, Title, DataTable } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import CustomIconButton from '../components/CustomIconButton';
import { ChartIcon, BackIcon } from '../components/CustomIcons';
import { recountedData } from '../data/recountedData';

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
  
  // Categorize by code prefix and name patterns
  if (codePrefix === 'F' || nameUpper.includes('CRACKER') || nameUpper.includes('FIRECRACKER')) {
    return 'Firecrackers';
  }
  if (codePrefix === 'C' || nameUpper.includes('CANDLE') || nameUpper.includes('ROMAN')) {
    return 'Roman Candles';
  }
  if (codePrefix === 'G' || nameUpper.includes('SHELL') || nameUpper.includes('MORTAR') || nameUpper.includes('SHOT')) {
    return 'Artillery Shells';
  }
  if (codePrefix === 'H' || nameUpper.includes('FOUNTAIN')) {
    return 'Fountains';
  }
  if (codePrefix === 'O' || nameUpper.includes('ROCKET')) {
    return 'Rockets';
  }
  if (codePrefix === 'S' || nameUpper.includes('SPARKLER')) {
    return 'Sparklers';
  }
  if (codePrefix === 'P' || nameUpper.includes('SMOKE')) {
    return 'Smoke';
  }
  if (codePrefix === 'A' || nameUpper.includes('ASST') || nameUpper.includes('ASSORTMENT')) {
    return 'Assortments';
  }
  if (codePrefix === 'E' || nameUpper.includes('ERUPTION') || nameUpper.includes('CONE')) {
    return 'Novelties';
  }
  if (codePrefix === 'J' || nameUpper.includes('BLOOM') || nameUpper.includes('BUTTERFLY')) {
    return 'Ground Effects';
  }
  if (codePrefix === 'K' || codePrefix === 'L' || codePrefix === 'M' || codePrefix === 'N') {
    return 'Specialty Items';
  }
  if (codePrefix === 'I' || nameUpper.includes('POPPER')) {
    return 'Poppers & Snaps';
  }
  if (codePrefix === 'Z' || nameUpper.includes('FUSE') || nameUpper.includes('RACK')) {
    return 'Accessories';
  }
  
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
      
      // Parse the recounted data and generate report
      const lines = recountedData.trim().split('\n');
      const items: ReportItem[] = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        const parts = trimmedLine.split('\t');
        const code = parts[0] || '';
        const name = parts[1] || '';
        const countStr = parts[2] || '';
        const count = countStr.trim() === '' ? -1 : parseInt(countStr) || -1;
        
        // Find matching item in originalInventory
        const inventoryItem = originalInventory.find(item => item.code === code);
        const previous = inventoryItem ? (inventoryItem.showroom + inventoryItem.closet) : 0;
        const difference = count === -1 ? 0 : count - previous;
        
        let status: 'increase' | 'decrease' | 'same' | 'no_count';
        if (count === -1) {
          status = 'no_count';
        } else if (difference > 0) {
          status = 'increase';
        } else if (difference < 0) {
          status = 'decrease';
        } else {
          status = 'same';
        }
        
        return {
          code,
          name,
          count,
          previous,
          difference,
          type: getFireworkType(code, name),
          status,
        };
      }).filter(Boolean) as ReportItem[];

      setReportData(items);
      setLoading(false);
    };

    if (originalInventory.length > 0) {
      generateReport();
    }
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
      if (!typeMap.has(item.type)) {
        typeMap.set(item.type, []);
      }
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

  const renderDiscrepancyItem = ({ item }: { item: ReportItem }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemRow}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemCode}>{item.code}</Text>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Chip style={styles.typeChip} textStyle={styles.typeChipText} compact>
              {item.type}
            </Chip>
          </View>
          <View style={styles.numbersContainer}>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Prev</Text>
              <Text style={styles.numberValue}>{item.previous}</Text>
            </View>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Count</Text>
              <Text style={styles.numberValue}>{item.count}</Text>
            </View>
            <View style={styles.numberItem}>
              <Text style={styles.numberLabel}>Diff</Text>
              <Text style={[
                styles.differenceValue,
                { color: item.difference > 0 ? '#4CAF50' : item.difference < 0 ? '#F44336' : '#666666' }
              ]}>
                {item.difference > 0 ? '+' : ''}{item.difference}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTypeSummary = ({ item }: { item: TypeSummary }) => (
    <DataTable.Row>
      <DataTable.Cell style={styles.typeCell}>
        <Text style={styles.typeName}>{item.type}</Text>
      </DataTable.Cell>
      <DataTable.Cell numeric>{item.totalItems}</DataTable.Cell>
      <DataTable.Cell numeric style={{ backgroundColor: item.totalIncrease > 0 ? '#E8F5E8' : 'transparent' }}>
        <Text style={{ color: '#4CAF50' }}>+{item.totalIncrease}</Text>
      </DataTable.Cell>
      <DataTable.Cell numeric style={{ backgroundColor: item.totalDecrease > 0 ? '#FFEBEE' : 'transparent' }}>
        <Text style={{ color: '#F44336' }}>-{item.totalDecrease}</Text>
      </DataTable.Cell>
      <DataTable.Cell numeric>{item.noCountItems}</DataTable.Cell>
    </DataTable.Row>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header style={styles.header}>
          <CustomIconButton iconType="back" onPress={() => navigation.goBack()} />
          <Appbar.Content title="Generating Report..." titleStyle={styles.headerTitle} />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Analyzing inventory data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <CustomIconButton iconType="back" onPress={() => navigation.goBack()} />
        <Appbar.Content title="Inventory Report" titleStyle={styles.headerTitle} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Overall Stats */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Overview</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reportStats.totalItems}</Text>
                <Text style={styles.statLabel}>Total Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#4CAF50' }]}>{reportStats.increases}</Text>
                <Text style={styles.statLabel}>Increases</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#F44336' }]}>{reportStats.decreases}</Text>
                <Text style={styles.statLabel}>Decreases</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FF9800' }]}>{reportStats.noCounts}</Text>
                <Text style={styles.statLabel}>No Count</Text>
              </View>
            </View>
            <View style={styles.netChangeContainer}>
              <Text style={styles.netChangeLabel}>Net Change:</Text>
              <Text style={[
                styles.netChangeValue,
                { color: reportStats.netChange > 0 ? '#4CAF50' : reportStats.netChange < 0 ? '#F44336' : '#666666' }
              ]}>
                {reportStats.netChange > 0 ? '+' : ''}{reportStats.netChange}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Type Summary Table */}
        <Card style={styles.tableCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Summary by Type</Title>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title style={styles.typeHeaderCell}>Type</DataTable.Title>
                <DataTable.Title numeric>Items</DataTable.Title>
                <DataTable.Title numeric>+Inc</DataTable.Title>
                <DataTable.Title numeric>-Dec</DataTable.Title>
                <DataTable.Title numeric>N/A</DataTable.Title>
              </DataTable.Header>
              <FlatList
                data={typeSummaries}
                renderItem={renderTypeSummary}
                keyExtractor={(item) => item.type}
                scrollEnabled={false}
              />
            </DataTable>
          </Card.Content>
        </Card>

        {/* Biggest Discrepancies */}
        <View style={styles.discrepanciesSection}>
          <Title style={styles.sectionTitle}>Biggest Discrepancies</Title>
          <FlatList
            data={biggestDiscrepancies}
            renderItem={renderDiscrepancyItem}
            keyExtractor={(item) => item.code}
            scrollEnabled={false}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  netChangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  netChangeLabel: {
    fontSize: 16,
    color: '#666666',
    marginRight: 8,
  },
  netChangeValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  tableCard: {
    marginBottom: 16,
    elevation: 2,
  },
  typeHeaderCell: {
    flex: 2,
  },
  typeCell: {
    flex: 2,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  discrepanciesSection: {
    marginBottom: 16,
  },
  itemCard: {
    marginBottom: 8,
    elevation: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  itemName: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#F0F0F0',
  },
  typeChipText: {
    fontSize: 10,
    color: '#666666',
  },
  numbersContainer: {
    flexDirection: 'row',
  },
  numberItem: {
    alignItems: 'center',
    marginLeft: 12,
  },
  numberLabel: {
    fontSize: 10,
    color: '#666666',
  },
  numberValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 2,
  },
  differenceValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});