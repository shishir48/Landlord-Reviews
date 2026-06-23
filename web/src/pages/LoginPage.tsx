import { useState } from 'react';
import { signInWithGoogle } from '../lib/auth';
import { api } from '../lib/api';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      await api.post('/auth/login');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-title">🏠 RentRate</h1>
      <p className="login-subtitle">Honest reviews from real tenants</p>
      <button className="login-btn btn btn-primary" disabled={loading} onClick={handleLogin}>
        {loading ? <div className="spinner" /> : 'Continue with Google'}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}