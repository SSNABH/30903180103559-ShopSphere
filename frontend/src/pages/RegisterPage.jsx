import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { authContent } from '../content/auth.js';
import { useAuth } from '../contexts/auth.js';
import { usePreferences } from '../contexts/preferences.js';

function messageFrom(error) {
  const firstDetail = error.response?.data?.details?.[0]?.message;
  return firstDetail ?? error.response?.data?.message ?? 'Unable to create the account.';
}

export function RegisterPage() {
  const { language } = usePreferences();
  const { register, isAuthenticated } = useAuth();
  const copy = authContent[language];
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to="/profile" replace />;

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(form);
      navigate('/profile', { replace: true });
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
        <h1>{copy.registerTitle}</h1>
        <p>{copy.registerDescription}</p>
      </section>
      <form className="account-card two-column-form" onSubmit={submit}>
        <label>
          <span>{copy.name}</span>
          <input autoComplete="name" required minLength="2" value={form.name} onChange={change('name')} />
        </label>
        <label>
          <span>{copy.email}</span>
          <input type="email" autoComplete="email" required value={form.email} onChange={change('email')} />
        </label>
        <label className="full-field">
          <span>{copy.password}</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength="8"
            value={form.password}
            onChange={change('password')}
          />
          <small>8+ characters with uppercase, lowercase and a number.</small>
        </label>
        <label>
          <span>{copy.phone}</span>
          <input autoComplete="tel" value={form.phone} onChange={change('phone')} />
        </label>
        <label>
          <span>{copy.address}</span>
          <input autoComplete="street-address" value={form.address} onChange={change('address')} />
        </label>
        {error && <div className="form-message error full-field" role="alert">{error}</div>}
        <button className="primary-button full-field" type="submit" disabled={submitting}>
          {submitting ? copy.processing : copy.submitRegister}
        </button>
        <p className="account-switch full-field">
          {copy.haveAccount} <Link to="/login">{copy.signIn}</Link>
        </p>
      </form>
    </main>
  );
}
