import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  value: number;
  onPress?: (n: number) => void;
  size?: number;
};

export function StarRating({ value, onPress, size = 20 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => onPress?.(n)}
          disabled={!onPress}
          activeOpacity={0.7}>
          <Text style={[styles.star, { fontSize: size, color: n <= value ? '#f59e0b' : '#e2e8f0' }]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  star: { lineHeight: undefined as any },
});
