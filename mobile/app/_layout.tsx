import { useEffect, useState } from 'react';
import { Slot, router, useSegments } from 'expo-router';
import { onAuthChange } from '../lib/auth';
import type { User } from 'firebase/auth';

export default function RootLayout() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const segments = useSegments();

  useEffect(() => {
    return onAuthChange(u => setUser(u));
  }, []);

  useEffect(() => {
    if (user === undefined) return; // still loading
    const inAuth = segments[0] === 'login';
    if (!user && !inAuth) router.replace('/login');
    if (user && inAuth) router.replace('/(tabs)/home');
  }, [user, segments]);

  return <Slot />;
}
