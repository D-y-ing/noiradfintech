import React from 'react';

interface HistoryDecision {
  decision: {
    candidate: { post: { id: string; creatorHandle: string; content: string }; vvi: number };
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

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function HistoryPanel({ decisions }: { decisions: HistoryDecision[] }) {
  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div className="panel-title">🕘 Decision History</div>
        <span className="panel-subtitle">Latest {decisions.length} saved records</span>
      </div>
      {decisions.length === 0 ? (
        <div className="history-empty">No decision history yet. New agent actions will appear here.</div>
      ) : (
        <div className="history-list">
          {decisions.map((item, index) => (
            <article className="history-row" key={`${item.decision.candidate.post.id}-${item.timestamp}-${index}`}>
              <div className="history-row-top">
                <span className={`decision-status status-${item.status}`}>{item.status}</span>
                <time>{formatTime(item.timestamp)}</time>
              </div>
              <div className="history-row-title">
                <strong>{item.decision.candidate.post.creatorHandle}</strong>
                <span>{item.decision.sponsor}</span>
                <span>{item.decision.amountXlm} XLM</span>
                <span>VVI {item.decision.candidate.vvi.toFixed(1)}</span>
              </div>
              <p>{item.decision.reason}</p>
              {item.error && <p className="history-error">{item.error}</p>}
              {item.stellarExpertUrl && <a href={item.stellarExpertUrl} target="_blank" rel="noreferrer">View transaction ↗</a>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
