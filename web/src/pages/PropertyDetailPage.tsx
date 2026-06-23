import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { StarRating } from '../components/StarRating';

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
};

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
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

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }
  if (!property) {
    return <div className="page-body"><p>Property not found</p></div>;
  }

  return (
    <div>
      <div className="hero">
        <span className="hero-back" onClick={() => navigate(-1)}>← Back</span>
        <div className="hero-address">{property.formatted_address}</div>
        <div className="hero-landlord">
          {property.landlord_id
            ? `Landlord: ${property.landlord_id.name}`
            : 'Landlord unknown'}
        </div>
        <div className="hero-rating">
          <span className="hero-big-num">{(property.avg_rating ?? 0).toFixed(1)}</span>
          <div>
            <StarRating value={property.avg_rating} size={18} />
            <div className="hero-count">{property.review_count} reviews</div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <button
          className="btn btn-success btn-block mb-24"
          onClick={() => navigate(`/review/add?property_id=${id}&address=${encodeURIComponent(property.formatted_address)}`)}>
          ✍ Write a Review
        </button>

        {reviews.length === 0 ? (
          <p className="empty-state">No reviews yet. Be the first!</p>
        ) : (
          reviews.map(r => (
            <div key={r._id} className="review-item">
              <div className="review-top">
                <StarRating value={r.rating} size={13} />
                <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="review-text">{r.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}