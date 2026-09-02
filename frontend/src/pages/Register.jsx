import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const HOLE_COUNT = 28;

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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
      await api.register(username, email, password);
      // Auto-login after registration
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
            "A film is never really good unless the camera is an eye in the head of a poet."
          </p>
          <p className="auth-panel-attr">— Orson Welles</p>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🎬</span>
            <span className="auth-logo-text">MovieChat</span>
          </div>

          <h1 className="auth-heading" style={{ fontSize: 28 }}>Create account</h1>
          <p className="auth-subheading">Join MovieChat and start rating movies with friends</p>

          <form className="auth-form" onSubmit={handleSubmit} id="register-form">
            <div className="form-group">
              <label className="form-label" htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="form-input"
                placeholder="Pick a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="alert alert-error" id="register-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              id="register-submit-btn"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login" id="register-login-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}