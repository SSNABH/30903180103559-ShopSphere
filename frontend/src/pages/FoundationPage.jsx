import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Database, Server, ShieldCheck } from 'lucide-react';
import { foundationContent } from '../content/foundation.js';
import { usePreferences } from '../contexts/preferences.js';
import { api } from '../lib/api.js';

const icons = [ShieldCheck, Server, Database, Database];

async function fetchLiveness() {
  const response = await api.get('/health/live');
  return response.data;
}

export function FoundationPage() {
  const { language } = usePreferences();
  const copy = foundationContent[language];
  const healthUrl = `${api.defaults.baseURL}/health`;
  const health = useQuery({
    queryKey: ['health', 'live'],
    queryFn: fetchLiveness,
    retry: 1,
    refetchInterval: 30_000,
  });

  return (
    <main>
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="hero-description">{copy.description}</p>
          <div className="phase-pill">
            <span className="pulse" aria-hidden="true" />
            {copy.phase}
          </div>
        </div>

        <aside className="status-panel" aria-labelledby="system-status-title">
          <div className="status-heading">
            <div>
              <p className="micro-label">SYSTEM / 01</p>
              <h2 id="system-status-title">{copy.live}</h2>
            </div>
            <Server size={24} aria-hidden="true" />
          </div>
          <div className="status-reading">
            <span className={`status-dot ${health.isSuccess ? 'online' : health.isError ? 'offline' : ''}`} />
            <div>
              <strong>{health.isPending ? copy.checking : health.isSuccess ? copy.apiOnline : copy.apiOffline}</strong>
              <small>{health.data?.timestamp ?? 'http://localhost:5000/api'}</small>
            </div>
          </div>
          <a className="text-link" href={healthUrl} target="_blank" rel="noreferrer">
            {copy.openHealth}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </aside>
      </section>

      <section className="architecture" aria-labelledby="architecture-title">
        <div className="section-heading">
          <p className="micro-label">FOUNDATION / 04 SERVICES</p>
          <h2 id="architecture-title">{copy.architecture}</h2>
        </div>
        <div className="architecture-grid">
          {copy.stack.map((item, index) => {
            const Icon = icons[index];
            return (
              <article className="architecture-card" key={item.name}>
                <span className="card-number">0{index + 1}</span>
                <Icon size={26} aria-hidden="true" />
                <h3>{item.name}</h3>
                <p>{item.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="next-phase">
        <span className="next-index">02</span>
        <div>
          <p className="micro-label">AUTHENTICATION READY</p>
          <p>{copy.nextText}</p>
        </div>
      </section>
    </main>
  );
}
