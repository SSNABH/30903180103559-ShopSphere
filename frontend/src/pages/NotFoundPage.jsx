import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="centered-state">
      <span className="state-code">404</span>
      <h1>Page not found</h1>
      <p>The requested DECI.Project page does not exist.</p>
      <Link className="primary-button link-button" to="/">Return home</Link>
    </main>
  );
}
