import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Chip } from 'react-native-paper';
import { getAllBatches, deleteBatch, getCategories } from '../../src/database';
import {
  BatchDisplay,
  formatDate,
  getExpiryStatus,
  getDaysUntilExpiry,
  STATUS_COLORS,
  STATUS_LABELS,
} from '../../src/types';

const STATUS_FILTERS = [
  { label: 'Все', value: null },
  { label: 'Просрочено', value: 'expired' },
  { label: 'Критично', value: 'critical' },
  { label: 'Внимание', value: 'warning' },
  { label: 'Норма', value: 'ok' },
];

export default function SearchScreen() {
  const [allBatches, setAllBatches] = useState<BatchDisplay[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      setAllBatches(getAllBatches());
      setCategories(getCategories().map((c) => c.name));
    }, [])
  );

  const filtered = allBatches.filter((b) => {
    if (searchText && !b.itemName.toLowerCase().includes(searchText.toLowerCase())) return false;
    if (selectedCategory && b.categoryName !== selectedCategory) return false;
    if (selectedStatus) {
      const status = getExpiryStatus(b.daysUntilExpiry);
      if (status !== selectedStatus) return false;
    }
    return true;
  });

  const handleDelete = (batch: BatchDisplay) => {
    Alert.alert('Удалить партию', `Удалить ${batch.itemName} (${formatDate(batch.expiryDate)})?`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deleteBatch(batch.id);
          setAllBatches(getAllBatches());
        },
      },
    ]);
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
      <Text style={styles.emptyText}>
        {searchText || selectedCategory || selectedStatus ? 'Ничего не найдено' : 'Пока нет партий'}
      </Text>
    </View>
  );

  const toggleCategory = (cat: string | null) => {
    setSelectedCategory(selectedCategory === cat ? null : cat);
  };

  const toggleStatus = (status: string | null) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Поиск</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по названию..."
        value={searchText}
        onChangeText={setSearchText}
      />

      <View style={styles.chipsRow}>
        <Text style={styles.chipLabel}>Категория:</Text>
        <Chip
          selected={selectedCategory === null}
          onPress={() => toggleCategory(null)}
          style={styles.chip}
        >
          Все
        </Chip>
        {categories.map((cat) => (
          <Chip
            key={cat}
            selected={selectedCategory === cat}
            onPress={() => toggleCategory(cat)}
            style={styles.chip}
          >
            {cat}
          </Chip>
        ))}
      </View>

      <View style={styles.chipsRow}>
        <Text style={styles.chipLabel}>Статус:</Text>
        {STATUS_FILTERS.map((f) => (
          <Chip
            key={f.label}
            selected={selectedStatus === f.value}
            onPress={() => toggleStatus(f.value)}
            style={styles.chip}
          >
            {f.label}
          </Chip>
        ))}
      </View>

      <Text style={styles.resultCount}>
        {filtered.length} {filtered.length === 1 ? 'партия' : 'партий'}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBatchCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
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
  searchInput: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
  },
  chipLabel: {
    fontSize: 12,
    color: '#888',
    marginRight: 6,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 13,
    color: '#888',
    marginHorizontal: 16,
    marginBottom: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
});