import React, { useState } from 'react';

const stages = [
  'Creator Detection',
  'Campaign Analysis',
  'Device Authorization Demo',
  'Brand Safety Verification',
  'Spending Policy Verification',
  'Escrow Reservation Demo',
  'Escrow Verification Demo',
  'Settlement Status Demo',
  'Webhook Event Demo',
];

const PER_DEAL_LIMIT = 5;
const DAILY_LIMIT = 20;
const SIMULATED_DAILY_SPENT = 0;

export function DemoTransactionJourney() {
  const [amount, setAmount] = useState('3');
  const [content, setContent] = useState(
    'Creating helpful educational content and sharing creative ideas.'
  );
  const [device, setDevice] = useState('registered');
  const [status, setStatus] = useState('Ready');
  const [history, setHistory] = useState<string[]>([]);
  const [checks, setChecks] = useState<
    { name: string; passed: boolean; detail: string }[]
  >([]);

  const runDemo = () => {
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      setStatus('Please enter a valid demo amount.');
      setHistory([]);
      setChecks([]);
      return;
    }

    const restrictedWords = [
      'hate',
      'scam',
      'fraud',
      'gambling',
    ];

    const matchedWords = restrictedWords.filter(word =>
      content.toLowerCase().includes(word)
    );

    const devicePassed = device === 'registered';
    const brandSafe = matchedWords.length === 0;
    const dealPassed = value <= PER_DEAL_LIMIT;
    const dailyPassed =
      SIMULATED_DAILY_SPENT + value <= DAILY_LIMIT;

    const results = [
      {
        name: 'Device Authorization',
        passed: devicePassed,
        detail: devicePassed
          ? 'Demo device is marked as registered.'
          : 'Demo device is not registered.',
      },
      {
        name: 'Brand Safety',
        passed: brandSafe,
        detail: brandSafe
          ? 'No restricted demo keywords detected.'
          : `Demo keyword check detected: ${matchedWords.join(', ')}.`,
      },
      {
        name: 'Per-Deal Limit',
        passed: dealPassed,
        detail: dealPassed
          ? `${value} credits is within the ${PER_DEAL_LIMIT}-credit limit.`
          : `${value} credits exceeds the ${PER_DEAL_LIMIT}-credit limit.`,
      },
      {
        name: 'Daily Limit',
        passed: dailyPassed,
        detail: dailyPassed
          ? `${SIMULATED_DAILY_SPENT + value} of ${DAILY_LIMIT} demo credits used in this example.`
          : 'The simulated daily limit would be exceeded.',
      },
    ];

    const approved = results.every(item => item.passed);

    const events = [
      'A trending creator was detected by the VVI feed.',
      'Campaign Match Preview recommendation was reviewed.',
      devicePassed
        ? 'Simulated device authorization: APPROVED.'
        : 'Simulated device authorization: REJECTED.',
      brandSafe
        ? 'Demo brand-safety check: PASSED.'
        : 'Demo brand-safety check: FAILED.',
      dealPassed && dailyPassed
        ? 'Demo spending policy: PASSED.'
        : 'Demo spending policy: FAILED.',
      ...(approved
        ? [
            'Demo escrow reservation recorded. No funds moved.',
            'Demo escrow verification recorded. No contract was called.',
            'Simulated settlement completed. No payment was sent.',
            'Sample webhook event displayed. No cryptographic signature was verified.',
          ]
        : [
            'Escrow reservation skipped because policy checks failed.',
            'Escrow verification skipped.',
            'Settlement skipped. No payment was sent.',
            'Webhook event skipped.',
          ]),
    ];

    setChecks(results);
    setHistory(events);
    setStatus(
      approved
        ? 'DEMO APPROVED — All policy checks passed.'
        : 'DEMO REJECTED — One or more policy checks failed.'
    );
  };

  const resetDemo = () => {
    setAmount('3');
    setContent(
      'Creating helpful educational content and sharing creative ideas.'
    );
    setDevice('registered');
    setStatus('Ready');
    setHistory([]);
    setChecks([]);
  };

  return (
    <section className="panel campaign-preview-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">
            Demo Transaction Journey
          </h2>
          <p className="panel-subtitle">
            Detection → Analysis → Policy → Escrow → Settlement
          </p>
        </div>
      </div>

      <div className="preview-demo-notice">
        DEMO ONLY — All device, brand-safety, spending, escrow,
        and webhook results are simulated. No real payments,
        wallet authorization, or contract execution occur.
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
          <span>Per-deal demo limit</span>
          <strong>{PER_DEAL_LIMIT} Demo Credits</strong>
        </div>

        <div>
          <span>Daily demo limit</span>
          <strong>{DAILY_LIMIT} Demo Credits</strong>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <label>Simulated device status</label>
        <select
          value={device}
          onChange={e => setDevice(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 8 }}
        >
          <option value="registered">Registered demo device</option>
          <option value="unregistered">Unregistered demo device</option>
        </select>
      </div>

      <div style={{ marginTop: 18 }}>
        <label>Sample creator content for brand-safety check</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 8,
            resize: 'vertical',
          }}
        />
        <p className="preview-keywords">
          Demo keyword filter: hate, scam, fraud, gambling.
          This is not a complete moderation system.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
        <button
          className="preview-button"
          onClick={runDemo}
        >
          Run Policy & Transaction Demo
        </button>

        <button
          className="preview-button"
          onClick={resetDemo}
        >
          Reset
        </button>
      </div>

      <h3>{status}</h3>

      {checks.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3>Policy Verification Results</h3>

          <div className="campaign-preview-list">
            {checks.map(check => (
              <article
                className="campaign-preview-card"
                key={check.name}
              >
                <div className="preview-card-heading">
                  <strong>{check.name}</strong>
                  <span>
                    {check.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <p className="preview-content">
                  {check.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3>Transaction Timeline</h3>

        <div className="campaign-preview-list">
          {stages.map((item, index) => {
            const event = history[index];

            const failed = event?.includes('REJECTED') ||
              event?.includes('FAILED');

            return (
              <article
                className="campaign-preview-card"
                key={item}
              >
                <div className="preview-card-heading">
                  <strong>{index + 1}. {item}</strong>
                  <span>
                    {event
                      ? failed
                        ? 'FAILED'
                        : 'DEMO'
                      : 'WAITING'}
                  </span>
                </div>

                <p className="preview-content">
                  {event || 'Waiting for demo journey...'}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
