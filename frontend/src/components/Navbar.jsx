import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { username, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!isLoggedIn) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/groups" className="navbar-logo" id="nav-logo">
          <span className="logo-icon">🎬</span>
          <span className="logo-text">Movie<span>Chat</span></span>
        </Link>

        <div className="navbar-right">
          {username && (
            <span className="navbar-username" id="nav-username">
              👤 {username}
            </span>
          )}
          <button
            id="nav-logout-btn"
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
