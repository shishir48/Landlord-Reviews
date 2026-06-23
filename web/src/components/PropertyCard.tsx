import { useNavigate } from 'react-router-dom';
import { StarRating } from './StarRating';

type Property = {
  _id: string;
  formatted_address: string;
  avg_rating: number;
  review_count: number;
  landlord_id?: { name: string } | null;
};

export function PropertyCard({ property }: { property: Property }) {
  const navigate = useNavigate();

  return (
    <div className="card" onClick={() => navigate(`/property/${property._id}`)}>
      <div className="card-address">{property.formatted_address}</div>
      <div className="card-row">
        <StarRating value={property.avg_rating} size={14} />
        <span className="card-count">{property.review_count} reviews</span>
      </div>
      <div className="card-landlord">
        {property.landlord_id ? property.landlord_id.name : 'Landlord unknown'}
      </div>
    </div>
  );
}