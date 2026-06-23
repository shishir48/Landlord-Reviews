type Props = {
  value: number;
  onPress?: (n: number) => void;
  size?: number;
};

export function StarRating({ value, onPress, size = 20 }: Props) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className="star"
          onClick={() => onPress?.(n)}
          style={{
            fontSize: size,
            color: n <= value ? '#f59e0b' : '#e2e8f0',
            cursor: onPress ? 'pointer' : 'default',
          }}>
          ★
        </span>
      ))}
    </div>
  );
}