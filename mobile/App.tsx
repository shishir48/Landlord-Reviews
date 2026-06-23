import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { onAuthChange } from './lib/auth';
import { syncOfflineReviews } from './lib/offline';
import { AppState } from 'react-native';

function App(): React.JSX.Element {
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    return onAuthChange(u => setUser(u));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') syncOfflineReviews();
    });
    return () => sub.remove();
  }, []);

  if (user === undefined) {
    // Still loading auth state — could show splash here
    return <></>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppNavigator
        isAuthenticated={!!user}
        onLogin={() => {}}
        onSignOut={() => {}}
      />
    </SafeAreaProvider>
  );
}

export default App;