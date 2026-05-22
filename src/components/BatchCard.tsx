import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { BatchDisplay, formatDate } from '../types';
import ExpiryBadge from './ExpiryBadge';

interface Props {
  batch: BatchDisplay;
  onPress?: () => void;
  onLongPress?: () => void;
}

export default function BatchCard({ batch, onPress, onLongPress }: Props) {
  const daysText =
    batch.daysUntilExpiry < 0
      ? `Просрочена на ${Math.abs(batch.daysUntilExpiry)} дн`
      : `Осталось ${batch.daysUntilExpiry} дн`;

  const daysColor = batch.daysUntilExpiry < 0 ? '#D32F2F' : batch.daysUntilExpiry <= 30 ? '#F57C00' : '#388E3C';

  return (
    <Card style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.itemName}>{batch.itemName}</Text>
            <Text style={styles.meta}>
              {batch.categoryName} · {batch.locationName}
            </Text>
            <Text style={styles.meta}>Годен до: {formatDate(batch.expiryDate)}</Text>
            {batch.quantity > 0 && <Text style={styles.meta}>Кол-во: {batch.quantity}</Text>}
          </View>
          <View style={styles.right}>
            <ExpiryBadge daysUntilExpiry={batch.daysUntilExpiry} />
            <Text style={[styles.daysText, { color: daysColor }]}>{daysText}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  right: {
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
});
