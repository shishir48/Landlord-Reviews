import { useNavigate } from 'react-router-dom';
import { signOut, auth } from '../lib/auth';

export function ProfilePage() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="profile-page">
      <h2 className="profile-name">{user?.displayName ?? 'Tenant'}</h2>
      <p className="profile-email">{user?.email}</p>
      <button className="btn btn-danger" onClick={handleSignOut}>
        Sign Out
      </button>
    </div>
  );
}