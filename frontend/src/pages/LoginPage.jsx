import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { authContent } from '../content/auth.js';
import { useAuth } from '../contexts/auth.js';
import { usePreferences } from '../contexts/preferences.js';

function messageFrom(error) {
  return error.response?.data?.message ?? 'Unable to sign in. Check the API connection and try again.';
}

export function LoginPage() {
  const { language } = usePreferences();
  const { login, isAuthenticated } = useAuth();
  const copy = authContent[language];
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from ?? '/profile', { replace: true });
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="account-layout">
      <section className="account-intro">
        <p className="eyebrow">{copy.accountEyebrow}</p>
        <h1>{copy.loginTitle}</h1>
        <p>{copy.loginDescription}</p>
      </section>
      <form className="account-card" onSubmit={submit}>
        <label>
          <span>{copy.email}</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          <span>{copy.password}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        {error && <div className="form-message error" role="alert">{error}</div>}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? copy.processing : copy.submitLogin}
        </button>
        <p className="account-switch">
          {copy.needAccount} <Link to="/register">{copy.register}</Link>
        </p>
      </form>
    </main>
  );
}
