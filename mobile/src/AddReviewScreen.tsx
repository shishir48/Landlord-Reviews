import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { api } from '../lib/api';
import { queueReview } from '../lib/offline';
import { StarRating } from '../components/StarRating';
import { LandlordSuggest } from '../components/LandlordSuggest';
import { Colors } from '../constants/Colors';

type ParamList = {
  AddReview: {
    place_id?: string;
    address?: string;
    property_id?: string;
  };
};

export function AddReviewScreen() {
  const route = useRoute<RouteProp<ParamList, 'AddReview'>>();
  const navigation = useNavigation<any>();
  const params = route.params || {};

  const [address, setAddress] = useState(params.address ?? '');
  const [placeId] = useState(params.place_id ?? null);
  const [propertyId] = useState(params.property_id ?? null);
  const [landlordName, setLandlordName] = useState('');
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!address) return Alert.alert('Address required');
    if (rating === 0) return Alert.alert('Please select a rating');
    if (!text.trim()) return Alert.alert('Please write a review');

    setSubmitting(true);
    try {
      // 1. Find or create property
      let pid = propertyId;
      if (!pid) {
        const pRes = await api.post('/properties', {
          place_id: placeId,
          formatted_address: address,
        });
        pid = pRes.data.property._id;
      }

      // 2. Attach landlord if provided
      let lid = landlordId;
      if (landlordName && !lid) {
        const lRes = await api.post('/landlords', { name: landlordName });
        lid = lRes.data.landlord._id;
      }
      if (lid) {
        await api.patch(`/properties/${pid}`, { landlord_id: lid });
      }

      // 3. Submit review
      const tenancy_period =
        fromDate || toDate
          ? { from: fromDate || undefined, to: toDate || undefined }
          : undefined;

      try {
        await api.post('/reviews', {
          property_id: pid,
          rating,
          text,
          tenancy_period,
        });
      } catch (err: any) {
        if (err?.response?.status === 409) {
          Alert.alert(
            'Already reviewed',
            'You have already reviewed this property.',
          );
          return;
        }
        // Offline — queue locally
        await queueReview({ property_id: pid!, rating, text, tenancy_period });
        Alert.alert(
          'Saved offline',
          'Your review will be submitted when you reconnect.',
        );
        navigation.goBack();
        return;
      }

      Alert.alert('Review submitted!');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Review</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>PROPERTY ADDRESS</Text>
        {address ? (
          <View style={styles.placeChip}>
            <Text style={styles.placeText}>📍 {address}</Text>
          </View>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Start typing address…"
            value={address}
            onChangeText={setAddress}
          />
        )}

        <Text style={styles.label}>LANDLORD NAME (OPTIONAL)</Text>
        <LandlordSuggest
          value={landlordName}
          onChange={(name, id) => {
            setLandlordName(name);
            setLandlordId(id);
          }}
        />

        <Text style={styles.label}>OVERALL RATING</Text>
        <StarRating value={rating} onPress={setRating} size={32} />

        <Text style={styles.label}>YOUR EXPERIENCE</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your experience…"
          multiline
          value={text}
          onChangeText={setText}
        />

        <Text style={styles.label}>TENANCY PERIOD (OPTIONAL)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="From (e.g. Jan 2023)"
            value={fromDate}
            onChangeText={setFromDate}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="To (e.g. Dec 2024)"
            value={toDate}
            onChangeText={setToDate}
          />
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={submit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: '#0891b2',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  cancel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  body: { padding: 16 },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textarea: { height: 90, textAlignVertical: 'top' },
  placeChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
  },
  placeText: { color: '#1d4ed8', fontSize: 13 },
  dateRow: { flexDirection: 'row', gap: 8 },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});