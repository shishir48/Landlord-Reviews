import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { api } from '../lib/api';
import { PropertyCard } from '../components/PropertyCard';
import { Colors } from '../constants/Colors';

type Property = {
  _id: string;
  formatted_address: string;
  avg_rating: number;
  review_count: number;
  landlord_id?: { name: string } | null;
};

export function HomeScreen() {
  const [query, setQuery] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();

  const loadFeed = useCallback(async () => {
    try {
      setRefreshing(true);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setProperties([]);
      return;
    }
    try {
      const res = await api.get(`/properties/search?q=${encodeURIComponent(text)}`);
      setProperties(res.data.properties || []);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🏠 RentRate</Text>
        <TextInput
          style={styles.search}
          placeholder="Search address…"
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={searchPlaces}
        />
      </View>

      <FlatList
        data={properties}
        keyExtractor={p => p._id}
        renderItem={({ item }) => <PropertyCard property={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadFeed} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Search an address to find reviews</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddReview')}>
        <Text style={styles.fabText}>+ Add Review</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  logo: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});