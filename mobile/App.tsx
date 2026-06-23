import React, { useEffect, useState } from 'react';
import { AppState, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AppNavigator } from './src/navigation/AppNavigator';
import { onAuthChange } from './lib/auth';
import { syncOfflineReviews } from './lib/offline';
import { Config } from './constants/Config';

// Configure Google Sign-In once at app startup
GoogleSignin.configure({
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
});

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