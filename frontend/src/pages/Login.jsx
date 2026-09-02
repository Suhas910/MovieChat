import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

// Generate filmstrip holes for the decorative panel
const HOLE_COUNT = 28;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login(username, password);
      login(data.access_token);
      navigate('/groups');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left: cinematic panel */}
      <div className="auth-cinema-panel">
        <div className="auth-filmstrip">
          {Array.from({ length: HOLE_COUNT }).map((_, i) => (
            <div key={i} className="auth-filmstrip-hole" />
          ))}
        </div>

        <div className="auth-panel-content">
          <p className="auth-panel-quote">
            "Cinema is a mirror by which we often see ourselves."
          </p>
          <p className="auth-panel-attr">— Wim Wenders</p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🎬</span>
            <span className="auth-logo-text">MovieChat</span>
          </div>

          <h1 className="auth-heading" style={{ fontSize: 28 }}>Welcome back</h1>
          <p className="auth-subheading">Sign in to your account to continue</p>

          <form className="auth-form" onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error" id="login-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register" id="login-register-link">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}