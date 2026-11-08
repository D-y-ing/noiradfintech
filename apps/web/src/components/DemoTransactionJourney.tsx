import React, { useState } from 'react';

const stages = [
  'Creator Detection',
  'Campaign Analysis',
  'Device Authorization Demo',
  'Policy Verification',
  'Escrow Reservation Demo',
  'Escrow Verification Demo',
  'Settlement Status Demo',
  'Webhook Event Demo',
];

export function DemoTransactionJourney() {
  const [amount, setAmount] = useState('3');
  const [status, setStatus] = useState('Ready');
  const [history, setHistory] = useState<string[]>([]);

  const runDemo = () => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setStatus('Please enter a valid amount.');
      return;
    }

    const allowed = value <= 5 && value <= 20;

    const events = [
      'A trending creator was detected by the VVI feed.',
      'Campaign Match Preview recommendation was reviewed.',
      'Simulated device authorization: APPROVED.',
      allowed
        ? 'Demo policy check: APPROVED within simulated limits.'
        : 'Demo policy check: REJECTED because the limit was exceeded.',
      ...(allowed
        ? [
            'Demo escrow reservation recorded. No funds moved.',
            'Demo escrow verification recorded. No contract was called.',
            'Simulated settlement completed. No payment was sent.',
            'Sample webhook event displayed. No cryptographic signature was verified.',
          ]
        : []),
    ];

    setHistory(events);
    setStatus(
      allowed
        ? 'Demo journey completed!'
        : 'Demo journey rejected by policy.'
    );
  };

  const resetDemo = () => {
    setAmount('3');
    setHistory([]);
    setStatus('Ready');
  };

  return (
    <section className="panel campaign-preview-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Demo Transaction Journey</h2>
          <p className="panel-subtitle">
            Detection → Analysis → Policy → Escrow → Settlement
          </p>
        </div>
      </div>

      <div className="preview-demo-notice">
        DEMO ONLY — No real payments, wallet authorization, contract
        execution, fund transfers, or cryptographic webhook verification.
      </div>

      <div className="preview-details">
        <div>
          <label>Demo sponsorship amount</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>
        <div>
          <span>Demo per-deal limit</span>
          <strong>5 Demo Credits</strong>
        </div>
        <div>
          <span>Demo daily limit</span>
          <strong>20 Demo Credits</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
        <button className="preview-button" onClick={runDemo}>
          Run Demo Journey
        </button>
        <button className="preview-button" onClick={resetDemo}>
          Reset
        </button>
      </div>

      <h3>{status}</h3>

      <div className="campaign-preview-list">
        {stages.map((item, index) => (
          <article className="campaign-preview-card" key={item}>
            <div className="preview-card-heading">
              <strong>{index + 1}. {item}</strong>
              <span>
                {history[index]
                  ? history[index].includes('REJECTED')
                    ? 'REJECTED'
                    : 'DEMO'
                  : 'WAITING'}
              </span>
            </div>
            <p className="preview-content">
              {history[index] || 'Waiting for demo journey...'}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
