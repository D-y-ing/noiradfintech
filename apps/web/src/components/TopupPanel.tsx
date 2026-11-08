
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
        current ? { ...current, status: 'succeeded' } : current
      );

      await onTopupComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong.'
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

      <div className="topup-demo-notice">
        <strong>Demo checkout</strong>
        <p>
          Create a checkout session, review your transaction, and
          confirm using simulated funds. No real payment is processed.
        </p>
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
        <div className="topup-checkout">
          <div className="topup-checkout-header">
            <div>
              <span className="topup-step-label">CHECKOUT SESSION</span>
              <h3>Transaction Details</h3>
            </div>

            <span
              className={`topup-status ${
                checkout.status === 'succeeded'
                  ? 'completed'
                  : 'pending'
              }`}
            >
              {checkout.status === 'succeeded'
                ? 'Completed'
                : 'Pending'}
            </span>
          </div>

          <div className="topup-amount-display">
            <span>Amount to top up</span>
            <strong>{checkout.amount.toFixed(1)} XLM</strong>
          </div>

          <div className="topup-detail-row">
            <span>Description</span>
            <strong>{checkout.description}</strong>
          </div>

          <div className="topup-detail-row">
            <span>Transaction Reference</span>
            <strong className="topup-reference">
              {checkout.reference}
            </strong>
          </div>

          <div className="topup-detail-row">
            <span>Created</span>
            <strong>
              {new Date(checkout.createdAt).toLocaleString()}
            </strong>
          </div>

          <div className="topup-detail-row">
            <span>Payment Status</span>
            <strong>
              {checkout.status === 'succeeded'
                ? 'Demo payment completed'
                : 'Awaiting confirmation'}
            </strong>
          </div>

          <div className="topup-payment-area">
            {checkout.status === 'succeeded' ? (
              <div className="topup-complete-message">
                Demo checkout completed successfully.
              </div>
            ) : (
              <>
                <p>
                  Review the transaction details before continuing.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={handleDemoPay}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Processing demo...' : 'Pay (Demo)'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
