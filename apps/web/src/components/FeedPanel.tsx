import React from 'react';

interface Post {
  id: string;
  creatorHandle: string;
  creatorWallet: string;
  platform: string;
  content: string;
  metrics: { views: number; shares: number; comments: number; likes: number };
  timestamp: number;
  vvi: number;
  flagged: boolean;
}

interface FeedPanelProps {
  posts: Post[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatTime(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function PlatformBadge({ platform }: { platform: string }) {
  const config: Record<string, { label: string; class: string }> = {
    x: { label: 'X', class: 'platform-x' },
    tiktok: { label: 'TikTok', class: 'platform-tiktok' },
    instagram: { label: 'IG', class: 'platform-instagram' },
    simulated: { label: 'Sim', class: 'platform-simulated' },
  };
  const c = config[platform] || config.simulated;
  return <span className={`platform-badge ${c.class}`}>{c.label}</span>;
}

export function FeedPanel({ posts }: FeedPanelProps) {
  // Sort: flagged first, then by VVI descending
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.flagged !== b.flagged) return b.flagged ? 1 : -1;
    return b.vvi - a.vvi;
  });

  return (
    <section className="panel feed-panel">
      <div className="panel-header">
        <div className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
            <path d="M4 16v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
            <line x1="4" y1="11" x2="20" y2="11" />
          </svg>
          <span className="panel-title-text">Live Feed</span>
        </div>
        <span className="panel-subtitle">{posts.length} posts • {posts.filter(p => p.flagged).length} flagged</span>
      </div>
            <div className="feed-source-notice">
        <strong>SIMULATED SOCIAL DATA</strong>
        <span>X, TikTok, and Instagram entries are demo records. Live platform API connections are not enabled.</span>
      </div>
      <div className="feed-platform-summary">
        <span>X: {posts.filter(p => p.platform === 'x').length} posts</span>
        <span>TikTok: {posts.filter(p => p.platform === 'tiktok').length} posts</span>
        <span>Instagram: {posts.filter(p => p.platform === 'instagram').length} posts</span>
      </div>
      <div className="feed-list">
        {sortedPosts.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No posts yet. Trigger a viral spike to see simulated content.
          </div>
        ) : (
          sortedPosts.map(post => (
            <article key={post.id} className={`feed-item ${post.flagged ? 'flagged' : ''}`}>
              <div className="vvi-badge">
                <span className="vvi-value">{post.vvi.toFixed(1)}</span>
                <span className="vvi-label">VVI</span>
              </div>
              <div className="feed-content">
                <div className="feed-meta">
                  <span className="creator-handle">{post.creatorHandle}</span>
                  <PlatformBadge platform={post.platform} />
                  <span className="feed-source-tag">DEMO DATA</span>
                  {post.flagged && <span className="flag-badge">âš¡ Flagged</span>}
                </div>
                <p className="feed-text">{post.content}</p>
                <div className="feed-metrics">
                  <span className="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--text-muted)'}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {formatNumber(post.metrics.views)}
                  </span>
                  <span className="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--text-muted)'}}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51a5 5 0 0 1 7.41 0"/><path d="M15.42 17.34a8 8 0 0 1-10.84 0"/></svg>
                    {formatNumber(post.metrics.shares)}
                  </span>
                  <span className="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--text-muted)'}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {formatNumber(post.metrics.comments)}
                  </span>
                  <span className="metric">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: 'var(--text-muted)'}}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {formatNumber(post.metrics.likes)}
                  </span>
                </div>
              </div>
              <div className="feed-actions">
                <span className="feed-timestamp">{formatTime(post.timestamp)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
