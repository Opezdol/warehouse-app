import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getExpiryStatus, STATUS_COLORS, STATUS_LABELS } from '../types';

interface Props {
  daysUntilExpiry: number;
}

export default function ExpiryBadge({ daysUntilExpiry }: Props) {
  const status = getExpiryStatus(daysUntilExpiry);
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
