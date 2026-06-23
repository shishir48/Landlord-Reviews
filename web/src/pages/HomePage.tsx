import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { PropertyCard } from '../components/PropertyCard';

type Property = {
  _id: string;
  formatted_address: string;
  avg_rating: number;
  review_count: number;
  landlord_id?: { name: string } | null;
};

export function HomePage() {
  const [query, setQuery] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const navigate = useNavigate();

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
    <div>
      <div className="header">
        <h1>🏠 RentRate</h1>
        <input
          className="search-input"
          placeholder="Search address…"
          value={query}
          onChange={e => searchPlaces(e.target.value)}
        />
      </div>

      <div className="page-body">
        {properties.length > 0 ? (
          properties.map(p => <PropertyCard key={p._id} property={p} />)
        ) : (
          <p className="empty-state">Search an address to find reviews</p>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/review/add')}>
        + Add Review
      </button>
    </div>
  );
}