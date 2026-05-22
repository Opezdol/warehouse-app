import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBatches, getBatchStats } from '../../src/database';
import {
  BatchDisplay,
  formatDate,
  getExpiryStatus,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../src/types';

export default function MonitoringScreen() {
  const [batches, setBatches] = useState<BatchDisplay[]>([]);
  const [stats, setStats] = useState({ total: 0, expired: 0, expiringSoon: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setBatches(getAllBatches());
    setStats(getBatchStats());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const renderExpiryBadge = (days: number) => {
    const status = getExpiryStatus(days);
    const color = STATUS_COLORS[status];
    const label = STATUS_LABELS[status];
    return (
      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    );
  };

  const renderBatchCard = ({ item }: { item: BatchDisplay }) => {
    const daysText =
      item.daysUntilExpiry < 0
        ? `Просрочена на ${Math.abs(item.daysUntilExpiry)} дн`
        : `Осталось ${item.daysUntilExpiry} дн`;
    const daysColor = item.daysUntilExpiry < 0 ? '#D32F2F' : item.daysUntilExpiry <= 30 ? '#F57C00' : '#388E3C';

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.itemName}>{item.itemName}</Text>
            <Text style={styles.meta}>
              {item.categoryName} · {item.locationName}
            </Text>
            <Text style={styles.meta}>Годен до: {formatDate(item.expiryDate)}</Text>
            {item.quantity > 0 && <Text style={styles.meta}>Кол-во: {item.quantity}</Text>}
          </View>
          <View style={styles.cardRight}>
            {renderExpiryBadge(item.daysUntilExpiry)}
            <Text style={[styles.daysText, { color: daysColor }]}>{daysText}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>Пока нет партий</Text>
      <Text style={styles.emptySubtext}>Добавьте через Приёмку</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Мониторинг склада</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#1565C0' }]}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#D32F2F' }]}>
          <Text style={[styles.statValue, { color: '#D32F2F' }]}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Просрочено</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#F57C00' }]}>
          <Text style={[styles.statValue, { color: '#F57C00' }]}>{stats.expiringSoon}</Text>
          <Text style={styles.statLabel}>Истекают</Text>
        </View>
      </View>

      <FlatList
        data={batches}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBatchCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={batches.length === 0 ? styles.emptyList : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1565C0']} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    color: '#1565C0',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1565C0',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    padding: 14,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
});
