import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { getToken } from '../src/api/client';
import LoadingScreen from '../src/components/LoadingScreen';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await getToken();
      setHasToken(!!token);
    } catch {
      setHasToken(false);
    } finally {
      setIsReady(true);
    }
  }

  useEffect(() => {
    if (!isReady) return;
    if (hasToken) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [isReady, hasToken]);

  if (!isReady) {
    return <LoadingScreen message="Initialisation…" />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
