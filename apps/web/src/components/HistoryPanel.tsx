import React from 'react';

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
                  View transaction ↗
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
              <article
                className="history-row"
                key={`${item.createdAt}-${index}`}
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

                <p>Previously recorded top-up. Historical record only.</p>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}