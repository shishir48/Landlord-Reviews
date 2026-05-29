import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useState, useRef } from 'react';
import { api } from '../lib/api';
import { Colors } from '../constants/Colors';

type Landlord = { _id: string; name: string };

type Props = {
  value: string;
  onChange: (name: string, id: string | null) => void;
};

export function LandlordSuggest({ value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<Landlord[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    onChange(text, null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/landlords/search?q=${encodeURIComponent(text)}`);
        setSuggestions(res.data.landlords);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const select = (landlord: Landlord) => {
    onChange(landlord.name, landlord._id);
    setSuggestions([]);
  };

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="e.g. John Davidson (optional)"
        placeholderTextColor={Colors.textSecondary}
        value={value}
        onChangeText={handleChange}
      />
      {suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map(l => (
            <TouchableOpacity key={l._id} style={styles.suggestion} onPress={() => select(l)}>
              <Text style={styles.suggName}>💡 {l.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 8, padding: 10, fontSize: 14, color: Colors.textPrimary,
  },
  dropdown: {
    backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde047',
    borderRadius: 8, marginTop: 4,
  },
  suggestion: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#fde047' },
  suggName: { fontSize: 13, color: '#854d0e' },
});
