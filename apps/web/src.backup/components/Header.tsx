import React from 'react';

interface HeaderProps {
  lastUpdate: Date | null;
  loading: boolean;
  error: string | null;
  onRunAgent: () => void;
  onForceOverspend: () => void;
  onTriggerSpike: () => void;
  activeTab: 'dashboard' | 'analytics';
  setActiveTab: (tab: 'dashboard' | 'analytics') => void;
}

import React from 'react';

export function Header({ lastUpdate, loading, error, onRunAgent, onForceOverspend, onTriggerSpike, activeTab, setActiveTab }: HeaderProps) {
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleClick = (action: () => void, message: string) => {
    setFeedback(message);
    action();
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-mark">AAB</div>
          <span>Agentic Ad Broker</span>
        </div>
        <span className={`status-badge ${loading ? 'loading' : error ? 'error' : 'live'}`}>
          <span className="status-dot" />
          {loading ? 'Loading' : error ? 'Error' : 'Live'}
        </span>
      </div>
      <div className="header-center">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>
      </div>
      <div className="header-right">
        <button className="btn btn-primary" onClick={() => handleClick(onRunAgent, 'Running agent cycle... analyzing viral posts')} disabled={loading} title="Manually trigger agent to scan feed and pay creators">
          ▶ Run Agent Cycle
        </button>
        <button className="btn btn-purple" onClick={() => handleClick(onTriggerSpike, 'Injecting viral spike... creating simulated viral content')} disabled={loading} title="Add more viral posts to the simulated feed for testing">
          ⚡ Trigger Viral Spike
        </button>
        <button className="btn btn-danger" onClick={() => handleClick(onForceOverspend, 'Attempting forced overspend (will be blocked by Noir on-chain guardrails)')} disabled={loading} title="Try to pay over the daily cap - Noir should block this on-chain">
          💥 Force Overspend
        </button>
        {feedback && <span className="last-update" style={{color: 'var(--text)', fontWeight: 600}}>{feedback}</span>}
        {lastUpdate && !feedback && (
          <span className="last-update">
            Updated: {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>
      {error && (
        <div className="error-toast" role="alert">
          {error}
        </div>
      )}
    </header>
  );
}