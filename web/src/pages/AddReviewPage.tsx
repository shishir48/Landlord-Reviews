import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { queueReview } from '../lib/offline';
import { StarRating } from '../components/StarRating';
import { LandlordSuggest } from '../components/LandlordSuggest';

export function AddReviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [address, setAddress] = useState(searchParams.get('address') ?? '');
  const placeId = searchParams.get('place_id');
  const propertyId = searchParams.get('property_id');
  const [landlordName, setLandlordName] = useState('');
  const [landlordId, setLandlordId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!address) return alert('Address required');
    if (rating === 0) return alert('Please select a rating');
    if (!text.trim()) return alert('Please write a review');

    setSubmitting(true);
    try {
      let pid = propertyId;
      if (!pid) {
        const pRes = await api.post('/properties', {
          place_id: placeId,
          formatted_address: address,
        });
        pid = pRes.data.property._id;
      }

      if (landlordName && !landlordId) {
        const lRes = await api.post('/landlords', { name: landlordName });
        const lid = lRes.data.landlord._id;
        await api.patch(`/properties/${pid}`, { landlord_id: lid });
      } else if (landlordId) {
        await api.patch(`/properties/${pid}`, { landlord_id: landlordId });
      }

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
          alert('You have already reviewed this property.');
          return;
        }
        await queueReview({ property_id: pid!, rating, text, tenancy_period });
        alert('Saved offline. Will sync when you reconnect.');
        navigate('/');
        return;
      }

      alert('Review submitted!');
      navigate('/');
    } catch (e) {
      console.error(e);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="review-header">
        <span className="back-link" onClick={() => navigate(-1)}>← Cancel</span>
        <h2>Add Review</h2>
      </div>

      <div className="page-body">
        <div className="form-group">
          <label className="form-label">PROPERTY ADDRESS</label>
          {address ? (
            <div className="place-chip">📍 {address}</div>
          ) : (
            <input
              className="form-input"
              placeholder="Start typing address…"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">LANDLORD NAME (OPTIONAL)</label>
          <LandlordSuggest
            value={landlordName}
            onChange={(name, id) => { setLandlordName(name); setLandlordId(id); }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">OVERALL RATING</label>
          <StarRating value={rating} onPress={setRating} size={32} />
        </div>

        <div className="form-group">
          <label className="form-label">YOUR EXPERIENCE</label>
          <textarea
            className="form-input"
            placeholder="Describe your experience…"
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">TENANCY PERIOD (OPTIONAL)</label>
          <div className="date-row">
            <input
              className="form-input"
              placeholder="From (e.g. Jan 2023)"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
            <input
              className="form-input"
              placeholder="To (e.g. Dec 2024)"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>

        <button
          className="btn btn-primary btn-block mb-40"
          disabled={submitting}
          onClick={submit}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}