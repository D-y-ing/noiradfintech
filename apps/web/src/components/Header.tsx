import React from 'react';

interface HeaderProps {
  lastUpdate: Date | null;
  loading: boolean;
  error: string | null;
  onRunAgent: () => void;
  activeTab: 'dashboard' | 'analytics' | 'history';
  setActiveTab: (tab: 'dashboard' | 'analytics' | 'history') => void;
}

export function Header({ lastUpdate, loading, error, onRunAgent, activeTab, setActiveTab }: HeaderProps) {
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleClick = (message: string) => {
    setFeedback(message);
    onRunAgent();
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
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          🕘 History
        </button>
      </div>
      <div className="header-right">
        <button className="btn btn-primary" onClick={() => handleClick('Agent scanning viral posts and evaluating sponsorships')} disabled={loading} title="Scan viral posts and automatically evaluate eligible creator payments">
          ▶ Run Agent
        </button>
      </div>
      <div className="header-feedback" aria-live="polite">
        {feedback || (lastUpdate ? `Updated: ${lastUpdate.toLocaleTimeString()}` : '')}
      </div>
      {error && (
        <div className="error-toast" role="alert">
          {error}
        </div>
      )}
    </header>
  );
}
