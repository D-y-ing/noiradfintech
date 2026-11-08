import React from 'react';

interface Budget {
  escrowBalanceXlm: string;
  perDealCapXlm: string;
  dailySpentXlm: string;
  dailyCapXlm: string;
  expiresAt: number;
  lastTopupAt?: number;
}

interface Guardrails {
  dailySpentXlm: number;
  paidPostsCount: number;
  dailyResetAt: string;
}

interface BudgetPanelProps {
  budget: Budget | null;
  guardrails: Guardrails | null;
}

function formatXLM(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(7).replace(/\.?0+$/, '');
}

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function BudgetPanel({ budget, guardrails }: BudgetPanelProps) {
  if (!budget) {
    return (
      <section className="panel budget-panel">
        <div className="panel-header">
          <div className="panel-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Budget & Guardrails
          </div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading budget...
        </div>
      </section>
    );
  }

  const dailySpentPct = (parseFloat(budget.dailySpentXlm) / parseFloat(budget.dailyCapXlm)) * 100;
  const escrowPct = (parseFloat(budget.escrowBalanceXlm) / 100) * 100; // Assuming 100 initial
  const daysLeft = Math.max(0, Math.ceil((budget.expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <section className="panel budget-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="panel-title-text">Budget & Guardrails</span>
        </div>
        <span className="panel-subtitle">Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</span>
      </div>

      <div className="budget-grid">
        <div className="budget-card primary">
          <div className="budget-label">Escrow Balance</div>
          <div className="budget-value">{formatXLM(budget.escrowBalanceXlm)} XLM</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)'}}>
            Funds available for agent to pay creators
          </div>
        </div>
        <div className="budget-card">
          <div className="budget-label">Per-Deal Cap</div>
          <div className="budget-value">{formatXLM(budget.perDealCapXlm)} XLM</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)'}}>
            Max per sponsorship payment
          </div>
        </div>
        <div className={`budget-card ${dailySpentPct > 80 ? 'warning' : ''} ${dailySpentPct >= 100 ? 'danger' : ''}`}>
          <div className="budget-label">Daily Spent / Cap</div>
          <div className="budget-value">
            {formatXLM(budget.dailySpentXlm)} / {formatXLM(budget.dailyCapXlm)}
          </div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)'}}>
            {dailySpentPct.toFixed(0)}% used today
          </div>
        </div>
        <div className={`budget-card ${parseFloat(budget.escrowBalanceXlm) < 10 ? 'warning' : ''} ${parseFloat(budget.escrowBalanceXlm) < 1 ? 'danger' : 'success'}`}>
          <div className="budget-label">Min Escrow Left</div>
          <div className="budget-value">1.0 XLM</div>
          <div className="budget-label" style={{marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)'}}>
            Reserve to keep escrow active
          </div>
        </div>
      </div>

      <div className="budget-divider" />

      <div className="guardrails-list">
        <div className="guardrail-item" style={{gridColumn: '1 / -1', backgroundColor: 'var(--bg)', padding: '10px 12px', marginBottom: '8px', borderRadius: 'var(--radius-sm)'}}>
          <span className="guardrail-label" style={{fontWeight: 600, color: 'var(--text)'}}>What are Guardrails?</span>
          <span className="guardrail-value" style={{fontSize: '0.75rem', textAlign: 'right', maxWidth: '60%'}}>Hard limits enforced by code + Noir on-chain to prevent runaway spending</span>
        </div>
        <div className="guardrail-item">
          <span className="guardrail-label">Daily Spent (Guardrails)</span>
          <span className="guardrail-value">{formatXLM(guardrails?.dailySpentXlm || 0)} XLM</span>
        </div>
        <div className="guardrail-item">
          <span className="guardrail-label">Posts Paid Today</span>
          <span className="guardrail-value">{guardrails?.paidPostsCount || 0}</span>
          <div className="budget-label" style={{fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px'}}>Unique posts paid this 24h window</div>
        </div>
        <div className="guardrail-item">
          <span className="guardrail-label">Daily Resets At</span>
          <span className="guardrail-value">{guardrails?.dailyResetAt ? new Date(guardrails.dailyResetAt).toLocaleString() : '—'}</span>
          <div className="budget-label" style={{fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px'}}>Counters reset at this time daily</div>
        </div>
        <div className="guardrail-item">
          <span className="guardrail-label">Policy Expires</span>
          <span className="guardrail-value">{formatDate(budget.expiresAt)}</span>
          <div className="budget-label" style={{fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px'}}>Agent key expires, payments stop</div>
        </div>
        {budget.lastTopupAt && (
          <div className="guardrail-item">
            <span className="guardrail-label">Last Top-up</span>
            <span className="guardrail-value">{formatDate(Math.floor(budget.lastTopupAt / 1000))}</span>
          </div>
        )}
      </div>
    </section>
  );
}