import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StarRating } from './StarRating';
import { Colors } from '../constants/Colors';

type Property = {
  _id: string;
  formatted_address: string;
  avg_rating: number;
  review_count: number;
  landlord_id?: { name: string } | null;
};

export function PropertyCard({ property }: { property: Property }) {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PropertyDetail', { id: property._id })}
      activeOpacity={0.8}>
      <Text style={styles.address} numberOfLines={1}>{property.formatted_address}</Text>
      <View style={styles.row}>
        <StarRating value={property.avg_rating} size={14} />
        <Text style={styles.count}>{property.review_count} reviews</Text>
      </View>
      <Text style={styles.landlord}>
        {property.landlord_id ? property.landlord_id.name : 'Landlord unknown'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  address: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  count: { fontSize: 12, color: Colors.textSecondary },
  landlord: { fontSize: 12, color: Colors.primary },
});
