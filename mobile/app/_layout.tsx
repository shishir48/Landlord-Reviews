import type { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Slot, router, useSegments } from 'expo-router';
import { onAuthChange } from '../lib/auth';
import { syncOfflineReviews } from '../lib/offline';

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();

  useEffect(() => {
    return onAuthChange(u => setUser(u));
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) router.replace('/login');
    if (user && inAuth) router.replace('/(tabs)/home');
  }, [user, segments]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') syncOfflineReviews();
    });
    return () => sub.remove();
  }, []);

  return <Slot />;
}
