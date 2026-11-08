import React from 'react';

interface AnalyticsPanelProps {
  feed: any[];
  decisions: any[];
}

export function AnalyticsPanel({ feed, decisions }: AnalyticsPanelProps) {
  const platformStats = feed.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const paidDecisions = decisions.filter(d => d.status === 'paid');
  const blockedDecisions = decisions.filter(d => d.status === 'blocked');
  const totalSpent = paidDecisions.reduce((sum, d) => sum + parseFloat(d.decision.amountXlm || '0'), 0);
  const avgVvi = feed.length > 0 ? feed.reduce((sum, p) => sum + (p.vvi || 0), 0) / feed.length : 0;

  const platformNames: Record<string, string> = {
    x: 'X (Twitter)',
    tiktok: 'TikTok',
    instagram: 'Instagram',
    simulated: 'Simulated'
  };

  return (
    <section className="panel analytics-panel" style={{ gridColumn: '1 / -1' }}>
      <div className="panel-header">
        <div className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="12" x2="2" y2="12" />
            <path d="M5.45 12a9 9 0 0 1 14.1 0M17.55 12a9 9 0 0 1-14.1 0" />
          </svg>
          <span className="panel-title-text">Analytics Dashboard</span>
        </div>
      </div>

      <div className="budget-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="budget-card">
          <div className="budget-label">Total Posts</div>
          <div className="budget-value">{feed.length}</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Live feed items</div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Total Decisions</div>
          <div className="budget-value">{decisions.length}</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Agent actions taken</div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Paid Sponsorships</div>
          <div className="budget-value">{paidDecisions.length}</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Successful payments</div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Avg VVI</div>
          <div className="budget-value">{avgVvi.toFixed(1)}</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Average viral velocity</div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Total Spent</div>
          <div className="budget-value">{totalSpent.toFixed(2)} XLM</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Creator payouts</div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Blocked Attempts</div>
          <div className="budget-value">{blockedDecisions.length}</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem'}}>Guardrails triggered</div>
        </div>
      </div>

      <div className="budget-divider" />

      <div style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Platform Distribution</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(platformStats).map(([platform, count]) => (
            <div key={platform} className="guardrail-item">
              <span className="guardrail-label">{platformNames[platform] || platform}</span>
              <span className="guardrail-value">{count} posts</span>
            </div>
          ))}
        </div>
      </div>

      {decisions.length > 0 && (
        <>
          <div className="budget-divider" />
          <div style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>Recent Decisions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
              {decisions.slice(0, 5).map((d, idx) => (
                <div key={idx} className="guardrail-item">
                  <span className="guardrail-label" style={{ fontSize: '0.75rem' }}>
                    {d.decision.sponsor} → {d.decision.amountXlm} XLM
                  </span>
                  <span className="guardrail-value" style={{ fontSize: '0.7rem' }}>
                    {d.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}