import React, { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/database';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';

const theme = {
  colors: {
    primary: '#1565C0',
  },
};

export default function RootLayout() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    try {
      initDatabase();
      setDbInitialized(true);
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setDbError(error instanceof Error ? error.message : String(error));
      setDbInitialized(true); // Continue even if DB init fails
    }
  }, []);

  if (!dbInitialized) {
    return (
      <PaperProvider theme={theme}>
        <StatusBar style="light" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1565C0' }}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}