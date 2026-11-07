import React, { useState } from 'react';

interface TopupPanelProps {
  apiBase: string;
  onTopupComplete: () => void;
}

export function TopupPanel({ apiBase, onTopupComplete }: TopupPanelProps) {
  const [amount, setAmount] = useState('10.0');
  const [description, setDescription] = useState('Campaign budget top-up');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    visible: boolean;
    success: boolean;
    message: string;
    checkoutUrl?: string;
    paymentIntentId?: string;
  }>({ visible: false, success: false, message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult({ visible: false, success: false, message: '' });

    try {
      const res = await fetch(`${apiBase}/api/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountXlm: amount, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout');
      }

      setResult({
        visible: true,
        success: true,
        message: 'Checkout session created! Click the link to complete the top-up.',
        checkoutUrl: data.checkoutUrl,
        paymentIntentId: data.paymentIntentId,
      });

      // Refresh budget after a delay
      setTimeout(onTopupComplete, 2000);
    } catch (error) {
      setResult({
        visible: true,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel topup-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="panel-title-text">Velo Top-Up</span>
        </div>
        <span className="panel-subtitle">Brand funds campaign budget</span>
      </div>

      <form onSubmit={handleSubmit} className="topup-form">
        <div className="form-group">
          <label className="form-label" htmlFor="amount">Amount (XLM)</label>
          <input
            id="amount"
            type="number"
            step="0.1"
            min="0.1"
            max="100"
            className="form-input"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="10.0"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            className="form-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Campaign budget top-up"
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Creating...' : 'Create Checkout Session'}
        </button>
      </form>

      {result.visible && (
        <div className={`topup-result visible ${result.success ? 'success' : 'error'}`}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
            {result.success ? '✅ Success' : '❌ Error'}
          </div>
          <div>{result.message}</div>
          {result.success && result.checkoutUrl && result.paymentIntentId && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a
                href={result.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="topup-link"
                style={{ textAlign: 'center', padding: '10px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)' }}
              >
                🔗 Open Velo Checkout →
              </a>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                Payment Intent: {result.paymentIntentId}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                After payment completes, the signed webhook will credit the budget automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}