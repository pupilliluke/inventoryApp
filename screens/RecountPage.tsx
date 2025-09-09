import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Card, Appbar, Button, ActivityIndicator, Title, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import CustomIconButton from '../components/CustomIconButton';
import { CountIcon, ResetIcon, SuccessIcon, ChartIcon } from '../components/CustomIcons';
import { recountedData } from '../data/recountedData';

interface RecountItem {
  code: string;
  name: string;
  count: number;
  previous: number;
}

export default function RecountPage() {
  const navigation = useNavigation();
  const { activeUser } = useSession();
  const { originalInventory } = useInventory();
  const [loading, setLoading] = useState(false);
  const [recountItems, setRecountItems] = useState<RecountItem[]>([]);

  const loadRecountData = async () => {
    setLoading(true);
    try {
      // Parse the tab-separated recount data (CODE, NAME, COUNT)
      const lines = recountedData.trim().split('\n');
      const items: RecountItem[] = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        
        const parts = trimmedLine.split('\t');
        const code = parts[0] || '';
        const name = parts[1] || '';
        const countStr = parts[2] || '';
        
        // If count is missing or empty, use -1 as specified
        const count = countStr.trim() === '' ? -1 : parseInt(countStr) || -1;
        
        // Find matching item in originalInventory and calculate showroom + closet
        const inventoryItem = originalInventory.find(item => item.code === code);
        const previous = inventoryItem ? (inventoryItem.showroom + inventoryItem.closet) : 0;
        
        return {
          code,
          name,
          count,
          previous,
        };
      }).filter(Boolean) as RecountItem[];

      setRecountItems(items);
    } catch (error) {
      console.error('Error loading recount data:', error);
      Alert.alert('Error', 'Failed to load recount data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecountData();
  }, [originalInventory]);

  const inventoryStats = useMemo(() => {
    const totalItems = recountItems.length;
    const itemsWithCount = recountItems.filter(item => item.count !== -1).length;
    const totalCount = recountItems.reduce((sum, item) => item.count !== -1 ? sum + item.count : sum, 0);
    const itemsWithoutCount = recountItems.filter(item => item.count === -1).length;
    
    return { totalItems, itemsWithCount, totalCount, itemsWithoutCount };
  }, [recountItems]);

  const handleRefreshRecount = () => {
    loadRecountData();
  };

  const renderRecountItem = ({ item }: { item: RecountItem }) => (
    <Card style={styles.itemCard}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemCode}>{item.code}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <View style={styles.quantityRow}>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Previous</Text>
              <Text style={[styles.quantityValue, { color: '#9C27B0' }]}>
                {item.previous}
              </Text>
            </View>
            <View style={styles.quantityContainer}>
              <Text style={styles.quantityLabel}>Count</Text>
              <Text style={[
                styles.quantityValue, 
                { color: item.count === -1 ? '#FF9800' : '#2196F3' }
              ]}>
                {item.count === -1 ? 'N/A' : item.count}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <CountIcon size={48} color="#9E9E9E" />
      </View>
      <Title style={styles.emptyTitle}>No Recount Data</Title>
      <Text style={styles.emptySubtitle}>
        Recount data will be loaded from the recount.txt file
      </Text>
      <Button
        mode="contained"
        onPress={handleRefreshRecount}
        style={styles.emptyButton}
        icon={() => <CountIcon size={20} color="#FFFFFF" />}
        disabled={loading}
      >
        Reload Data
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <CustomIconButton
          iconType="back"
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content
          title="Inventory Recount"
          titleStyle={styles.headerTitle}
        />
        <CustomIconButton
          iconType="chart"
          onPress={() => navigation.navigate('ReportPage' as never)}
        />
        <CustomIconButton
          iconType="refresh"
          onPress={handleRefreshRecount}
        />
      </Appbar.Header>

      <View style={styles.content}>
        {/* Stats Header */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inventoryStats.totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{inventoryStats.totalCount}</Text>
            <Text style={styles.statLabel}>Total Count</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF9800' }]}>{inventoryStats.itemsWithoutCount}</Text>
            <Text style={styles.statLabel}>No Count</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('ReportPage' as never)}
            style={[styles.actionButton, styles.reportButton]}
            contentStyle={styles.actionButtonContent}
            icon={() => <ChartIcon size={20} color="#FFFFFF" />}
          >
            View Report
          </Button>
          <Button
            mode="outlined"
            onPress={handleRefreshRecount}
            style={[styles.actionButton, styles.refreshButton]}
            contentStyle={styles.actionButtonContent}
            icon={() => <CountIcon size={20} color="#2196F3" />}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating={true} />
            <Text style={styles.loadingText}>Loading recount data...</Text>
          </View>
        ) : recountItems.length > 0 ? (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Recount Items</Text>
              <Chip
                style={styles.resultsChip}
                textStyle={styles.resultsChipText}
                icon={() => <SuccessIcon size={16} color="#4CAF50" />}
                compact
              >
                {recountItems.length} items loaded
              </Chip>
            </View>
            <FlatList
              data={recountItems}
              renderItem={renderRecountItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          </>
        ) : (
          <FlatList
            data={[]}
            renderItem={() => null}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.emptyListContainer}
          />
        )}
      </View>
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
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
    textAlign: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  actionButtonContent: {
    paddingVertical: 8,
  },
  reportButton: {
    backgroundColor: '#9C27B0',
  },
  refreshButton: {
    borderColor: '#2196F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  resultsChip: {
    backgroundColor: 'transparent',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  resultsChipText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  typeChip: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
  },
  typeChipText: {
    fontSize: 12,
    color: '#666666',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityContainer: {
    alignItems: 'center',
    marginLeft: 16,
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
});