import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, signOut } from '../lib/auth';
import { Colors } from '../constants/Colors';

type Props = {
  onSignOut: () => void;
};

export function ProfileScreen({ onSignOut }: Props) {
  const user = auth.currentUser;

  const handleSignOut = async () => {
    await signOut();
    onSignOut();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.displayName ?? 'Tenant'}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <TouchableOpacity style={styles.btn} onPress={handleSignOut}>
        <Text style={styles.btnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    padding: 24,
  },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 14, color: Colors.textSecondary, marginBottom: 32 },
  btn: {
    backgroundColor: Colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});