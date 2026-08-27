import { Link } from 'react-router-dom';
import { authContent } from '../content/auth.js';
import { usePreferences } from '../contexts/preferences.js';

export function ForbiddenPage() {
  const { language } = usePreferences();
  const copy = authContent[language];
  return (
    <main className="centered-state">
      <span className="state-code">403</span>
      <h1>{copy.forbiddenTitle}</h1>
      <p>{copy.forbiddenDescription}</p>
      <Link className="primary-button link-button" to="/profile">{copy.profile}</Link>
    </main>
  );
}
