import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthChange } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { AddReviewPage } from './pages/AddReviewPage';
import { syncOfflineReviews } from './lib/offline';

// Track auth state globally so all pages share it
let globalUser: any = undefined;
const listeners: Array<(user: any) => void> = [];

onAuthChange(u => {
  globalUser = u;
  listeners.forEach(fn => fn(u));
  if (u) syncOfflineReviews();
});

export function useUser() {
  const [user, setUser] = useState(globalUser);
  useEffect(() => {
    listeners.push(setUser);
    return () => {
      const idx = listeners.indexOf(setUser);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);
  return user;
}

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = useUser();
  const [tab, setTab] = useState(window.location.pathname.startsWith('/profile') ? 'profile' : 'home');

  const handleTabClick = (t: string) => {
    setTab(t);
    if (t === 'home') navigate('/');
    else navigate('/profile');
  };

  return (
    <div>
      <div className="nav-bar">
        <div
          className={`nav-link ${tab === 'home' ? 'active' : ''}`}
          onClick={() => handleTabClick('home')}>
          🏠 Home
        </div>
        <div
          className={`nav-link ${tab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabClick('profile')}>
          👤 {user?.displayName || 'Profile'}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const user = useUser();

  if (user === undefined) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/" element={<Layout><HomePage /></Layout>} />
      <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
      <Route path="/property/:id" element={<Layout><PropertyDetailPage /></Layout>} />
      <Route path="/review/add" element={<AddReviewPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}