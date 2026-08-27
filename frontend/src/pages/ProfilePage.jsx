import { useEffect, useState } from 'react';
import { authContent } from '../content/auth.js';
import { useAuth } from '../contexts/auth.js';
import { usePreferences } from '../contexts/preferences.js';

function messageFrom(error) {
  const firstDetail = error.response?.data?.details?.[0]?.message;
  return firstDetail ?? error.response?.data?.message ?? 'The request could not be completed.';
}

export function ProfilePage() {
  const { language } = usePreferences();
  const { user, updateProfile, changePassword } = useAuth();
  const copy = authContent[language];
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', address: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [profileState, setProfileState] = useState({ saving: false, message: '', error: '' });
  const [passwordState, setPasswordState] = useState({ saving: false, message: '', error: '' });

  useEffect(() => {
    setProfile({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      address: user.address ?? '',
    });
  }, [user]);

  function changeProfile(field) {
    return (event) => setProfile((current) => ({ ...current, [field]: event.target.value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileState({ saving: true, message: '', error: '' });
    try {
      await updateProfile(profile);
      setProfileState({ saving: false, message: copy.successProfile, error: '' });
    } catch (error) {
      setProfileState({ saving: false, message: '', error: messageFrom(error) });
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPasswordState({ saving: true, message: '', error: '' });
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPasswordState({ saving: false, message: copy.successPassword, error: '' });
    } catch (error) {
      setPasswordState({ saving: false, message: '', error: messageFrom(error) });
    }
  }

  return (
    <main className="profile-page">
      <header className="page-heading">
        <p className="eyebrow">{copy.accountEyebrow}</p>
        <h1>{copy.profileTitle}</h1>
        <p>{copy.profileDescription}</p>
      </header>

      <section className="profile-grid">
        <form className="account-card" onSubmit={saveProfile}>
          <div className="account-badges">
            <span>{copy.role}: <strong>{user.role}</strong></span>
            <span>{copy.status}: <strong>{copy.active}</strong></span>
          </div>
          <label><span>{copy.name}</span><input required minLength="2" value={profile.name} onChange={changeProfile('name')} /></label>
          <label><span>{copy.email}</span><input type="email" required value={profile.email} onChange={changeProfile('email')} /></label>
          <label><span>{copy.phone}</span><input value={profile.phone} onChange={changeProfile('phone')} /></label>
          <label><span>{copy.address}</span><textarea rows="3" value={profile.address} onChange={changeProfile('address')} /></label>
          {profileState.error && <div className="form-message error">{profileState.error}</div>}
          {profileState.message && <div className="form-message success">{profileState.message}</div>}
          <button className="primary-button" type="submit" disabled={profileState.saving}>
            {profileState.saving ? copy.processing : copy.save}
          </button>
        </form>

        <form className="account-card password-card" onSubmit={savePassword}>
          <h2>{copy.changePassword}</h2>
          <label>
            <span>{copy.currentPassword}</span>
            <input type="password" autoComplete="current-password" required value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
          </label>
          <label>
            <span>{copy.newPassword}</span>
            <input type="password" autoComplete="new-password" required minLength="8" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
          </label>
          {passwordState.error && <div className="form-message error">{passwordState.error}</div>}
          {passwordState.message && <div className="form-message success">{passwordState.message}</div>}
          <button className="secondary-button" type="submit" disabled={passwordState.saving}>
            {passwordState.saving ? copy.processing : copy.changePassword}
          </button>
        </form>
      </section>
    </main>
  );
}
