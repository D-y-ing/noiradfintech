import React, { useState, useEffect, useCallback } from 'react';
import { FeedPanel } from './components/FeedPanel';
import { DecisionLogPanel } from './components/DecisionLogPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { BudgetPanel } from './components/BudgetPanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { TopupPanel } from './components/TopupPanel';
import { CampaignPreviewPanel } from './components/CampaignPreviewPanel';
import { DemoTransactionJourney } from './components/DemoTransactionJourney';
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
    metrics: {
      views: number;
      shares: number;
      comments: number;
      likes: number;
    };
    timestamp: number;
    vvi: number;
    flagged: boolean;
  }>;
  candidates: number;
}

interface DecisionsResponse {
  decisions: Array<{
    decision: {
      candidate: {
        post: {
          id: string;
          creatorHandle: string;
          content: string;
        };
        vvi: number;
      };
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

interface TopupHistoryRecord {
  amountXlm: string;
  status: string;
  createdAt: number;
}

function App() {
  const [feed, setFeed] = useState<FeedResponse['posts']>([]);
  const [decisions, setDecisions] = useState<DecisionsResponse['decisions']>([]);
  const [topupHistory, setTopupHistory] = useState<TopupHistoryRecord[]>([]);
  const [budget, setBudget] = useState<BudgetResponse['budget'] | null>(null);
  const [guardrails, setGuardrails] = useState<BudgetResponse['guardrails'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'history'>('dashboard');

  const fetchJson = async (url: string) => {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}: ${res.statusText}`);
    }

    return res.json();
  };

  const fetchAll = useCallback(async () => {
    try {
      setError(null);

      const [feedRes, decisionsRes, budgetRes, topupRes] = await Promise.allSettled([
        fetchJson(`${API_BASE}/api/feed`),
        fetchJson(`${API_BASE}/api/decisions`),
        fetchJson(`${API_BASE}/api/budget`),
        fetchJson('/topup-history.json'),
      ]);

      if (feedRes.status === 'fulfilled') {
        setFeed(feedRes.value.posts || []);
      }

      if (decisionsRes.status === 'fulfilled') {
        setDecisions(decisionsRes.value.decisions || []);
      }

      if (budgetRes.status === 'fulfilled') {
        setBudget(budgetRes.value.budget || null);
        setGuardrails(budgetRes.value.guardrails || null);
      }

      if (topupRes.status === 'fulfilled' && Array.isArray(topupRes.value)) {
        setTopupHistory(topupRes.value);
      } else if (topupRes.status === 'rejected') {
        console.error('Could not load historical top-ups:', topupRes.reason);
      }

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

      setDecisions(prev => [{
        decision: {
          candidate: {
            post: {
              id: 'pending',
              creatorHandle: 'Running...',
              content: 'Agent analyzing viral posts...',
            },
            vvi: 0,
          },
          sponsor: 'Scanning',
          amountXlm: '0',
          reason: 'Agent is evaluating flagged posts. This may take 10-30 seconds.',
          brandSafe: true,
          timestamp: Date.now(),
        },
        status: 'pending',
        timestamp: Date.now(),
      }, ...prev]);

      const res = await fetch(`${API_BASE}/api/agent/run`, {
        method: 'POST',
      });

      const responseText = await res.text();
      let data: any;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `Agent endpoint returned a non-JSON response (${res.status}). ${responseText.slice(0, 180)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Agent request failed (${res.status})`);
      }

      if (data.results && data.results.length > 0) {
        setDecisions(prev => [
          ...data.results,
          ...prev.filter(d => d.decision.candidate.post.id !== 'pending'),
        ]);

        fetchAll();
      } else {
        const feedData = await fetchJson(`${API_BASE}/api/feed`);

        const candidateCount = Number(
          feedData.eligibleCandidates ?? feedData.candidates ?? 0
        );

        const flaggedCount = Number(feedData.candidates || 0);

        const reason = data.message ||
          candidateCount === 0 && flaggedCount === 0
            ? 'No posts currently meet VVI >= 50. The agent will keep monitoring the feed.'
            : candidateCount === 0
              ? `All ${flaggedCount} flagged post(s) have already been handled. The agent will pick up new candidates automatically.`
              : `${candidateCount} eligible flagged post(s) remain, but this scan returned no new decisions. The agent will retry automatically.`;

        setDecisions(prev =>
          prev.map(d =>
            d.decision.candidate.post.id === 'pending'
              ? {
                  ...d,
                  decision: {
                    ...d.decision,
                    reason,
                  },
                  status: 'skipped',
                }
              : d
          )
        );
      }
    } catch (e) {
      setDecisions(prev =>
        prev.filter(d => d.decision.candidate.post.id !== 'pending')
      );

      setError(e instanceof Error ? e.message : 'Agent run failed');
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
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-grid">
        {activeTab === 'dashboard' ? (
          <>
            <section className="workflow-overview">
              <div className="workflow-heading">
                <div>
                  <span className="workflow-eyebrow">HOW NOIRADFINTECH WORKS</span>
                  <h2>Autonomous Sponsorship Workflow</h2>
                  <p>Follow a creator opportunity from trend detection to a simulated settlement record.</p>
                </div>
                <span className="workflow-demo-label">DEMO ENVIRONMENT</span>
              </div>

              <div className="workflow-stages">
                <article className="workflow-stage">
                  <span className="workflow-number">01</span>
                  <div>
                    <h3>Detect</h3>
                    <p>Find trending creator posts and evaluate their Viral Velocity Index.</p>
                    <span>Social Feed · VVI</span>
                  </div>
                </article>

                <article className="workflow-stage">
                  <span className="workflow-number">02</span>
                  <div>
                    <h3>Analyze</h3>
                    <p>Compare eligible posts with sample sponsor campaigns.</p>
                    <span>Campaign Matching · Decision Log</span>
                  </div>
                </article>

                <article className="workflow-stage">
                  <span className="workflow-number">03</span>
                  <div>
                    <h3>Verify</h3>
                    <p>Demonstrate device, brand-safety, and spending-policy checks.</p>
                    <span>Noir Policy · Escrow Simulation</span>
                  </div>
                </article>

                <article className="workflow-stage">
                  <span className="workflow-number">04</span>
                  <div>
                    <h3>Settle</h3>
                    <p>Review a demo checkout, transaction reference, and sample webhook event.</p>
                    <span>Velo Checkout Demo · Webhook Demo</span>
                  </div>
                </article>
              </div>

              <p className="workflow-disclaimer">
                Important: Social metrics, policy checks, escrow, checkout, and webhook examples are demonstrations.
                No live platform APIs, on-chain contract execution, or real payments are performed here.
              </p>
            </section>
            <FeedPanel posts={feed} />

            <CampaignPreviewPanel apiBase={API_BASE} />
            <DemoTransactionJourney />

            <DecisionLogPanel
              decisions={decisions}
              onViewHistory={() => setActiveTab('history')}
            />

            <BudgetPanel
              budget={budget}
              guardrails={guardrails}
            />

            <TopupPanel apiBase={API_BASE} onTopupComplete={fetchAll} />
          </>
        ) : activeTab === 'analytics' ? (
          <AnalyticsPanel
            feed={feed}
            decisions={decisions}
          />
        ) : (
          <HistoryPanel
            decisions={decisions}
            topupHistory={topupHistory}
          />
        )}
      </main>

      <footer className="footer">
        <p>
          Agentic Ad Broker Ã¢â‚¬â€ Velo x Noir Hackathon 2026 |
          Simulated social feed | Testnet only
        </p>
      </footer>
    </div>
  );
}

export default App;


