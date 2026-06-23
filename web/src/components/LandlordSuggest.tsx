import { useState, useRef } from 'react';
import { api } from '../lib/api';

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
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/landlords/search?q=${encodeURIComponent(text)}`);
        setSuggestions(res.data.landlords);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const select = (landlord: Landlord) => {
    onChange(landlord.name, landlord._id);
    setSuggestions([]);
  };

  return (
    <div>
      <input
        className="form-input"
        placeholder="e.g. John Davidson (optional)"
        value={value}
        onChange={e => handleChange(e.target.value)}
      />
      {suggestions.length > 0 && (
        <div className="suggestions-dropdown">
          {suggestions.map(l => (
            <div key={l._id} className="suggestion-item" onClick={() => select(l)}>
              💡 {l.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}