import React from 'react';

interface AnalyticsPanelProps {
  feed: any[];
  decisions: any[];
}

export function AnalyticsPanel({ feed, decisions }: AnalyticsPanelProps) {
  // Simple analytics logic
  const platformStats = feed.reduce((acc, post) => {
    acc[post.platform] = (acc[post.platform] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <section className="panel analytics-panel" style={{ gridColumn: '1 / -1' }}>
      <h2 className="panel-title">Target Market Analytics</h2>
      <div className="budget-grid">
        <div className="budget-card">
          <div className="budget-label">Posts by Platform</div>
          <pre>{JSON.stringify(platformStats, null, 2)}</pre>
        </div>
        <div className="budget-card">
          <div className="budget-label">Total Decisions</div>
          <div className="budget-value">{decisions.length}</div>
        </div>
      </div>
    </section>
  );
}