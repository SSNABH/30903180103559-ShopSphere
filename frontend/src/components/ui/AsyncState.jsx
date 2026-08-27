import { AlertTriangle, Inbox, LoaderCircle, RotateCcw } from 'lucide-react';

export function LoadingState({ title, description }) {
  return (
    <div className="async-state" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={30} aria-hidden="true" />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel }) {
  return (
    <div className="async-state error" role="alert">
      <AlertTriangle size={30} aria-hidden="true" />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {onRetry && (
        <button className="secondary-button" type="button" onClick={onRetry}>
          <RotateCcw size={16} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="async-state empty">
      <Inbox size={30} aria-hidden="true" />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
