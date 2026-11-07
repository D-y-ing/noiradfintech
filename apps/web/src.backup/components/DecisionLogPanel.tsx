import React from 'react';

interface Decision {
  decision: {
    candidate: { post: { id: string; creatorHandle: string; content: string }; vvi: number };
    sponsor: string;
    amountXlm: string;
    reason: string;
    brandSafe: boolean;
    timestamp: number;
  };
  txHash?: string;
  stellarExpertUrl?: string;
  status: 'pending' | 'paid' | 'blocked' | 'skipped' | 'failed';
  error?: string;
  timestamp: number;
}

interface DecisionLogPanelProps {
  decisions: Decision[];
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString();
}

function StatusBadge({ status }: { status: Decision['status'] }) {
  const config: Record<Decision['status'], { label: string; class: string }> = {
    paid: { label: 'PAID', class: 'status-paid' },
    blocked: { label: 'BLOCKED', class: 'status-blocked' },
    skipped: { label: 'SKIPPED', class: 'status-skipped' },
    pending: { label: 'PENDING', class: 'status-pending' },
    failed: { label: 'FAILED', class: 'status-failed' },
  };
  const c = config[status];
  return <span className={`decision-status ${c.class}`}>{c.label}</span>;
}

export function DecisionLogPanel({ decisions }: DecisionLogPanelProps) {
  return (
    <section className="panel decision-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 17h8" />
            <path d="M8 21h8" />
          </svg>
          <span className="panel-title-text">Decision Log</span>
        </div>
        <span className="panel-subtitle">{decisions.length} decisions</span>
      </div>
      <div className="decision-list">
        {decisions.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No decisions yet. Run the agent cycle to evaluate flagged posts.
          </div>
        ) : (
          decisions.map((d, idx) => (
            <article key={`${d.decision.candidate.post.id}-${idx}`} className="decision-item">
              <div className="decision-header">
                <StatusBadge status={d.status} />
                <span className="decision-sponsor">{d.decision.sponsor}</span>
                <span className="decision-amount">{d.decision.amountXlm} XLM</span>
              </div>
              <div className="decision-meta">
                <span>@{d.decision.candidate.post.creatorHandle}</span>
                <span>VVI: {d.decision.candidate.vvi.toFixed(1)}</span>
                <span>Brand Safe: {d.decision.brandSafe ? '✅' : '❌'}</span>
                <span>{formatTime(d.timestamp)}</span>
              </div>
              <div className="decision-reason">
                {d.decision.reason}
              </div>
              <div className="decision-footer">
                {d.stellarExpertUrl && (
                  <a href={d.stellarExpertUrl} target="_blank" rel="noopener noreferrer" className="tx-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Stellar Expert
                  </a>
                )}
                {d.error && (
                  <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    {d.error}
                  </span>
                )}
                <span className="decision-timestamp">
                  {new Date(d.timestamp).toISOString()}
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}