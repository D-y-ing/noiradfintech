import React, { useState } from 'react';

interface TopupPanelProps {
  apiBase: string;
  onTopupComplete: () => void | Promise<void>;
}

export function TopupPanel({ apiBase, onTopupComplete }: TopupPanelProps) {
  const [amount, setAmount] = useState('10.0');
  const [description, setDescription] = useState('Campaign budget top-up');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    visible: boolean;
    success: boolean;
    message: string;
  }>({ visible: false, success: false, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 0.1 || numericAmount > 100) {
      setResult({
        visible: true,
        success: false,
        message: 'Enter an amount between 0.1 and 100 XLM.',
      });
      return;
    }

    setLoading(true);
    setResult({ visible: false, success: false, message: '' });

    try {
      const response = await fetch(`${apiBase}/api/demo/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountXlm: numericAmount,
          description: description.slice(0, 100),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add demo funds.');
      }

      setResult({
        visible: true,
        success: true,
        message: `Added ${data.amountXlm} simulated XLM to the campaign budget. No real payment was made.`,
      });

      await onTopupComplete();
    } catch (error) {
      setResult({
        visible: true,
        success: false,
        message: error instanceof Error ? error.message : 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel topup-panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-text">Velo Top-Up</span>
        </div>
        <span className="panel-subtitle">Demo Mode</span>
      </div>

      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '12px',
          padding: '8px',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}
      >
        Demo only: this adds simulated XLM to the dashboard balance.
        No Velo checkout, real money, or blockchain transaction is used.
      </div>

      <form onSubmit={handleSubmit} className="topup-form">
        <div className="form-group">
          <label className="form-label" htmlFor="demo-amount">
            Amount (XLM)
          </label>
          <input
            id="demo-amount"
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            className="form-input"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="demo-description">
            Description
          </label>
          <input
            id="demo-description"
            type="text"
            className="form-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={100}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Adding demo funds...' : 'Add Demo Funds'}
        </button>
      </form>

      {result.visible && (
        <div className={`topup-result visible ${result.success ? 'success' : 'error'}`}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
            {result.success ? 'Success' : 'Unable to add funds'}
          </div>
          <p>{result.message}</p>
        </div>
      )}
    </section>
  );
}