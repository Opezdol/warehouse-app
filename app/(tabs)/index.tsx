import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAllBatches, getBatchStats, getExpiredBatches, getExpiringBatches, deleteBatch, addBatchFull } from '../../src/database';
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
  const [filter, setFilter] = useState<'all' | 'expired' | 'expiring'>('all');
  const [cleanupMode, setCleanupMode] = useState(false);
  const [undoItem, setUndoItem] = useState<BatchDisplay | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const undoRef = useRef<{ batch: BatchDisplay; timer: NodeJS.Timeout } | null>(null);

  const loadData = useCallback((activeFilter?: 'all' | 'expired' | 'expiring') => {
    const f = activeFilter ?? filter;
    setStats(getBatchStats());
    switch (f) {
      case 'expired':
        setBatches(getExpiredBatches());
        break;
      case 'expiring':
        setBatches(getExpiringBatches(30));
        break;
      default:
        setBatches(getAllBatches());
        break;
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {
        // Выход из режима очистки при переключении вкладки
        if (cleanupMode) setCleanupMode(false);
        if (undoRef.current) {
          clearTimeout(undoRef.current.timer);
          undoRef.current = null;
        }
      };
    }, [loadData, cleanupMode])
  );

  // Android Back button exits cleanup mode
  useEffect(() => {
    const onBackPress = () => {
      if (cleanupMode) {
        setCleanupMode(false);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [cleanupMode]);

  const handleFilterPress = (newFilter: 'all' | 'expired' | 'expiring') => {
    if (filter === newFilter) {
      setFilter('all');
      loadData('all');
    } else {
      setFilter(newFilter);
      loadData(newFilter);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const toggleCleanup = () => {
    setCleanupMode(prev => !prev);
  };

  const handleDelete = (batch: BatchDisplay) => {
    // Сохраняем для отмены
    if (undoRef.current) {
      clearTimeout(undoRef.current.timer);
    }

    deleteBatch(batch.id);
    setUndoItem(batch);
    setUndoCountdown(5);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = 5 - elapsed;
      if (remaining <= 0) {
        clearInterval(timer);
        setUndoItem(null);
        setUndoCountdown(0);
        undoRef.current = null;
      } else {
        setUndoCountdown(remaining);
      }
    }, 200);

    undoRef.current = { batch, timer };

    // Не блокируем — сразу обновляем список
    loadData();
  };

  const handleUndo = () => {
    const data = undoRef.current?.batch;
    if (!data) return;

    if (undoRef.current?.timer) {
      clearInterval(undoRef.current.timer);
    }
    undoRef.current = null;
    setUndoItem(null);
    setUndoCountdown(0);

    addBatchFull(data.itemId, data.locationId, data.expiryDate, data.quantity, data.receivedDate);
    loadData();
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
      <TouchableOpacity
        activeOpacity={cleanupMode ? 1 : 0.7}
        onLongPress={toggleCleanup}
        delayLongPress={500}
      >
        <View style={[styles.card, cleanupMode && styles.cardCleanup]}>
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
              {cleanupMode && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
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
      <View style={[styles.headerRow, cleanupMode && styles.headerCleanup]}>
        <Text style={styles.header}>
          {cleanupMode ? '✕ Режим очистки' : 'Мониторинг склада'}
        </Text>
        {cleanupMode && (
          <TouchableOpacity onPress={toggleCleanup} style={styles.exitBtn}>
            <Text style={styles.exitBtnText}>Выход</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={[
            styles.statCard,
            { borderLeftColor: '#1565C0' },
            filter === 'all' && styles.statCardActive,
          ]}
          onPress={() => handleFilterPress('all')}
          activeOpacity={0.7}
        >
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Всего</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statCard,
            { borderLeftColor: '#D32F2F' },
            filter === 'expired' && styles.statCardActive,
          ]}
          onPress={() => handleFilterPress('expired')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: '#D32F2F' }]}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Просрочено</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statCard,
            { borderLeftColor: '#F57C00' },
            filter === 'expiring' && styles.statCardActive,
          ]}
          onPress={() => handleFilterPress('expiring')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statValue, { color: '#F57C00' }]}>{stats.expiringSoon}</Text>
          <Text style={styles.statLabel}>Истекают</Text>
        </TouchableOpacity>
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

      {/* Undo bar */}
      {undoItem && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>
            Удалено: {undoItem.itemName} · Отмена {undoCountdown}с
          </Text>
          <TouchableOpacity style={styles.undoBtn} onPress={handleUndo}>
            <Text style={styles.undoBtnText}>ОТМЕНА</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  headerCleanup: {
    // no extra style needed, handled by header color change
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1565C0',
  },
  exitBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  statCardActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1565C0',
    borderLeftWidth: 4,
    elevation: 4,
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
  cardCleanup: {
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
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
  deleteBtn: {
    marginTop: 8,
    backgroundColor: '#D32F2F',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
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
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    elevation: 6,
  },
  undoText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  undoBtn: {
    backgroundColor: '#1565C0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  undoBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});