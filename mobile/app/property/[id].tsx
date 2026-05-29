import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StarRating } from '../../components/StarRating';
import { Colors } from '../../constants/Colors';

type Review = {
  _id: string;
  user_id: string;
  rating: number;
  text: string;
  createdAt: string;
};

type Property = {
  _id: string;
  formatted_address: string;
  avg_rating: number;
  review_count: number;
  landlord_id?: { name: string } | null;
  place_id?: string;
};

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/properties?_id=${id}`),
      api.get(`/reviews?property_id=${id}`),
    ])
      .then(([pRes, rRes]) => {
        setProperty(pRes.data.property);
        setReviews(rRes.data.reviews);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />;
  if (!property) return <Text style={{ padding: 24 }}>Property not found</Text>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.address}>{property.formatted_address}</Text>
        <Text style={styles.landlord}>
          {property.landlord_id ? `Landlord: ${property.landlord_id.name}` : 'Landlord unknown'}
        </Text>
        <View style={styles.ratingRow}>
          <Text style={styles.bigNum}>{property.avg_rating.toFixed(1)}</Text>
          <View>
            <StarRating value={property.avg_rating} size={18} />
            <Text style={styles.reviewCount}>{property.review_count} reviews</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.writeBtn}
        onPress={() => router.push({ pathname: '/review/add', params: { property_id: id, address: property.formatted_address } })}
      >
        <Text style={styles.writeBtnText}>✍ Write a Review</Text>
      </TouchableOpacity>

      <View style={styles.reviewList}>
        {reviews.map(r => (
          <View key={r._id} style={styles.reviewItem}>
            <View style={styles.reviewTop}>
              <StarRating value={r.rating} size={13} />
              <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.reviewText}>{r.text}</Text>
          </View>
        ))}
        {reviews.length === 0 && (
          <Text style={styles.noReviews}>No reviews yet. Be the first!</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  hero: {
    backgroundColor: Colors.textPrimary,
    padding: 20,
    paddingTop: 56,
  },
  back: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8 },
  address: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  landlord: { color: '#818cf8', fontSize: 12, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  bigNum: { color: '#fff', fontSize: 40, fontWeight: '800' },
  reviewCount: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
  writeBtn: {
    backgroundColor: Colors.success, margin: 16, padding: 14,
    borderRadius: 12, alignItems: 'center',
  },
  writeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewList: { paddingHorizontal: 16, paddingBottom: 32 },
  reviewItem: { borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: 12 },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewDate: { fontSize: 11, color: Colors.textSecondary },
  reviewText: { fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  noReviews: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24 },
});
