import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useGoogleAuth, signInWithGoogleResponse } from '../lib/auth';
import { Colors } from '../constants/Colors';
import { api } from '../lib/api';

export default function LoginScreen() {
  const { request, response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (response) {
      setLoading(true);
      signInWithGoogleResponse(response)
        .then(async () => {
          await api.post('/auth/login');
          router.replace('/(tabs)/home');
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 RentRate</Text>
      <Text style={styles.subtitle}>Honest reviews from real tenants</Text>
      <TouchableOpacity
        style={styles.btn}
        disabled={!request || loading}
        onPress={() => promptAsync()}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Continue with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg, padding: 24 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 48, textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
