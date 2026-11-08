
import React, { useState } from 'react';

interface TopupPanelProps {
  apiBase: string;
  onTopupComplete: () => void | Promise<void>;
}

interface DemoCheckout {
  amount: number;
  description: string;
  reference: string;
  createdAt: number;
  status: 'pending' | 'succeeded';
}

export function TopupPanel({
  apiBase,
  onTopupComplete,
}: TopupPanelProps) {
  const [amount, setAmount] = useState('10.0');
  const [description, setDescription] = useState(
    'Campaign budget top-up'
  );
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<DemoCheckout | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0.1 ||
      numericAmount > 100
    ) {
      setError('Enter an amount between 0.1 and 100 XLM.');
      return;
    }

    setError('');

    setCheckout({
      amount: numericAmount,
      description: description.slice(0, 100),
      reference: `DEMO-${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    });
  };

  const handleDemoPay = async () => {
    if (!checkout || checkout.status === 'succeeded') return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/api/demo/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountXlm: checkout.amount,
          description: checkout.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Demo checkout failed.');
      }

      setCheckout(current =>
        current
          ? { ...current, status: 'succeeded' }
          : current
      );

      await onTopupComplete();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel topup-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="panel-title-text">Velo Top-Up</span>
        </div>

        <span className="panel-subtitle">
          Brand funds campaign budget
        </span>
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
        Demo checkout: create a transaction and confirm it using
        simulated funds. No Velo checkout, real payment, or
        blockchain transaction is used.
      </div>

      <form onSubmit={handleSubmit} className="topup-form">
        <div className="form-group">
          <label className="form-label" htmlFor="amount">
            Amount (XLM)
          </label>

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
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">
            Description
          </label>

          <input
            id="description"
            type="text"
            className="form-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Campaign budget top-up"
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
          Create Checkout Session
        </button>
      </form>

      {error && (
        <div className="topup-result visible error">
          <strong>Unable to continue</strong>
          <p>{error}</p>
        </div>
      )}

      {checkout && (
        <div className="topup-result visible success">
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>
            {checkout.status === 'succeeded'
              ? '✅ Demo Checkout Complete'
              : '✅ Checkout is Ready'}
          </div>

          <p>
            {checkout.status === 'succeeded'
              ? 'Simulated funds were added to the campaign budget.'
              : 'Review your transaction details and confirm the demo checkout.'}
          </p>

          <div
            style={{
              marginTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div>
              <strong>Transaction Details</strong>
            </div>

            <div>
              <span>Amount: </span>
              <strong>{checkout.amount.toFixed(1)} XLM</strong>
            </div>

            <div>
              <span>Description: </span>
              <strong>{checkout.description}</strong>
            </div>

            <div>
              <span>Transaction Reference: </span>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all',
                }}
              >
                {checkout.reference}
              </div>
            </div>

            <div>
              <span>Status: </span>
              <strong>
                {checkout.status === 'succeeded'
                  ? 'Demo payment completed'
                  : 'Awaiting demo confirmation'}
              </strong>
            </div>

            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
              }}
            >
              Created: {new Date(checkout.createdAt).toLocaleString()}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || checkout.status === 'succeeded'}
              onClick={handleDemoPay}
              style={{ width: '100%' }}
            >
              {loading
                ? 'Processing demo...'
                : checkout.status === 'succeeded'
                  ? 'Demo Payment Completed'
                  : 'Pay (Demo)'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
