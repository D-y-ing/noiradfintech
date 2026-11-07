import React, { useState, useEffect, useCallback } from 'react';
import { FeedPanel } from './components/FeedPanel';
import { DecisionLogPanel } from './components/DecisionLogPanel';
import { BudgetPanel } from './components/BudgetPanel';
import { TopupPanel } from './components/TopupPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { Header } from './components/Header';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface FeedResponse {
  posts: Array<{
    id: string;
    creatorHandle: string;
    creatorWallet: string;
    platform: string;
    content: string;
    metrics: { views: number; shares: number; comments: number; likes: number };
    timestamp: number;
    vvi: number;
    flagged: boolean;
  }>;
  candidates: number;
}

interface DecisionsResponse {
  decisions: Array<{
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
  }>;
}

interface BudgetResponse {
  budget: {
    escrowBalanceXlm: string;
    perDealCapXlm: string;
    dailySpentXlm: string;
    dailyCapXlm: string;
    expiresAt: number;
    lastTopupAt?: number;
  };
  guardrails: {
    dailySpentXlm: number;
    paidPostsCount: number;
    dailyResetAt: string;
  };
}

function App() {
  const [feed, setFeed] = useState<FeedResponse['posts']>([]);
  const [decisions, setDecisions] = useState<DecisionsResponse['decisions']>([]);
  const [budget, setBudget] = useState<BudgetResponse['budget'] | null>(null);
  const [guardrails, setGuardrails] = useState<BudgetResponse['guardrails'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics'>('dashboard');

  const fetchJson = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    return res.json();
  };

  const fetchAll = useCallback(async () => {
    try {
      setError(null);
      const [feedRes, decisionsRes, budgetRes] = await Promise.all([
        fetchJson(`${API_BASE}/api/feed`),
        fetchJson(`${API_BASE}/api/decisions`),
        fetchJson(`${API_BASE}/api/budget`),
      ]);
      setFeed(feedRes.posts || []);
      setDecisions(decisionsRes.decisions || []);
      setBudget(budgetRes.budget || null);
      setGuardrails(budgetRes.guardrails || null);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  const runAgent = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/agent/run`, { method: 'POST' });
      const data = await res.json();
      if (data.results) {
        setDecisions(prev => [...data.results, ...prev]);
        // Refresh budget after agent run
        fetchAll();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent run failed');
    } finally {
      setLoading(false);
    }
  };

  const forceOverspend = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/agent/overspend`, { method: 'POST' });
      const data = await res.json();
      if (data.result) {
        setDecisions(prev => [data.result, ...prev]);
        fetchAll();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Overspend failed');
    } finally {
      setLoading(false);
    }
  };

  const triggerSpike = async () => {
    setLoading(true);
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/feed/spike`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAll();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spike failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="app">
      <Header
        lastUpdate={lastUpdate}
        loading={loading}
        error={error}
        onRunAgent={runAgent}
        onForceOverspend={forceOverspend}
        onTriggerSpike={triggerSpike}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <main className="main-grid">
        {activeTab === 'dashboard' ? (
          <>
            <FeedPanel posts={feed} />
            <DecisionLogPanel decisions={decisions} />
            <BudgetPanel budget={budget} guardrails={guardrails} />
            <TopupPanel apiBase={API_BASE} onTopupComplete={fetchAll} />
          </>
        ) : (
          <AnalyticsPanel feed={feed} decisions={decisions} />
        )}
      </main>
      <footer className="footer">
        <p>Agentic Ad Broker — Velo x Noir Hackathon 2026 | Simulated social feed | Testnet only</p>
      </footer>
    </div>
  );
}

export default App;