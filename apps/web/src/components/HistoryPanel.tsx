
import React, { useState } from 'react';

interface HistoryDecision {
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
  };
  txHash?: string;
  stellarExpertUrl?: string;
  status: 'pending' | 'paid' | 'blocked' | 'skipped' | 'failed';
  error?: string;
  timestamp: number;
}

interface TopupHistoryRecord {
  amountXlm: string;
  status: string;
  createdAt: number;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function HistoryPanel({
  decisions,
  topupHistory,
}: {
  decisions: HistoryDecision[];
  topupHistory: TopupHistoryRecord[];
}) {
  const [selectedTopup, setSelectedTopup] =
    useState<TopupHistoryRecord | null>(null);

  const totalRecords = decisions.length + topupHistory.length;

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div className="panel-title">🕘 Transaction History</div>
        <span className="panel-subtitle">
          {totalRecords} saved records
        </span>
      </div>

      <h3>Decision History</h3>

      {decisions.length === 0 ? (
        <div className="history-empty">
          No decision history yet. New agent actions will appear here.
        </div>
      ) : (
        <div className="history-list">
          {decisions.map((item, index) => (
            <article
              className="history-row"
              key={`${item.decision.candidate.post.id}-${item.timestamp}-${index}`}
            >
              <div className="history-row-top">
                <span className={`decision-status status-${item.status}`}>
                  {item.status}
                </span>
                <time>{formatTime(item.timestamp)}</time>
              </div>

              <div className="history-row-title">
                <strong>{item.decision.candidate.post.creatorHandle}</strong>
                <span>{item.decision.sponsor}</span>
                <span>{item.decision.amountXlm} XLM</span>
                <span>VVI {item.decision.candidate.vvi.toFixed(1)}</span>
              </div>

              <p>{item.decision.reason}</p>

              {item.error && (
                <p className="history-error">{item.error}</p>
              )}

              {item.stellarExpertUrl && (
                <a
                  href={item.stellarExpertUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction →
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <h3>Historical Velo Top-ups</h3>

      <p>
        These are previously saved top-up records. Their historical statuses
        have not been re-verified with Velo.
      </p>

      {topupHistory.length === 0 ? (
        <div className="history-empty">
          No historical top-up records found.
        </div>
      ) : (
        <div className="history-list">
          {topupHistory
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((item, index) => (
              <button
                type="button"
                className="history-row"
                key={`${item.createdAt}-${index}`}
                onClick={() => setSelectedTopup(item)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'inherit',
                  font: 'inherit',
                }}
              >
                <div className="history-row-top">
                  <span className="decision-status">
                    {item.status}
                  </span>
                  <time>{formatTime(item.createdAt)}</time>
                </div>

                <div className="history-row-title">
                  <strong>Historical top-up</strong>
                  <span>{item.amountXlm} XLM</span>
                </div>

                <p>Click to view transaction details →</p>
              </button>
            ))}
        </div>
      )}

      {selectedTopup && (
        <div
          className="topup-details-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedTopup(null)}
        >
          <div
            className="panel topup-details"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              background: '#151515',
              border: '1px solid #333',
              borderRadius: '12px',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <h3>Transaction Details</h3>
              <button
                type="button"
                onClick={() => setSelectedTopup(null)}
              >
                ✕
              </button>
            </div>

            <p>Historical Velo Top-up</p>

            <div className="history-row-title">
              <strong>Amount</strong>
              <span>{selectedTopup.amountXlm} XLM</span>
            </div>

            <div className="history-row-title">
              <strong>Recorded status</strong>
              <span>{selectedTopup.status}</span>
            </div>

            <div className="history-row-title">
              <strong>Date</strong>
              <span>{formatTime(selectedTopup.createdAt)}</span>
            </div>

            <p>
              This is an archived transaction record. Its current payment
              status has not been verified.
            </p>

            <button
              type="button"
              disabled
              style={{
                width: '100%',
                padding: '12px',
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              Pay — Unavailable
            </button>

            <p>
              Original checkout sessions are not reactivated from historical
              records.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
