import React, { useState } from 'react';

interface CampaignPreview {
  postId: string;
  creatorHandle: string;
  platform: string;
  content: string;
  vvi: number;
  campaign: string;
  category: string;
  campaignFit: number;
  matchedKeywords: string[];
  demoValue: number;
  brandSafe: boolean;
  reason: string;
  source: string;
}

interface PreviewResponse {
  success: boolean;
  simulated: boolean;
  previews: CampaignPreview[];
  message?: string;
}

interface CampaignPreviewPanelProps {
  apiBase: string;
}

export function CampaignPreviewPanel({ apiBase }: CampaignPreviewPanelProps) {
  const [previews, setPreviews] = useState<CampaignPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePreviews = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/api/agent/previews`);
      const data = await response.json() as PreviewResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not generate campaign previews.');
      }

      setPreviews(data.previews || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel campaign-preview-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Campaign Match Previews</h2>
          <p className="panel-subtitle">
            Read-only sponsorship recommendations using demo campaigns.
          </p>
        </div>

        <button
          className="preview-button"
          onClick={generatePreviews}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Previews'}
        </button>
      </div>

      <div className="preview-demo-notice">
        DEMO ONLY — Values are simulated Demo Credits, not money or payments.
        Recommendations use a rule-based demo engine, not an AI model.
      </div>

      {error && <p className="preview-error">{error}</p>}

      {!loading && previews.length === 0 && !error && (
        <p className="preview-empty">
          Click Generate Previews to match eligible trending posts with sample campaigns.
        </p>
      )}

      <div className="campaign-preview-list">
        {previews.map((preview) => (
          <article className="campaign-preview-card" key={preview.postId}>
            <div className="preview-card-heading">
              <strong>{preview.creatorHandle}</strong>
              <span>{preview.platform}</span>
            </div>

            <p className="preview-content">{preview.content}</p>

            <div className="preview-details">
              <div>
                <span>Campaign</span>
                <strong>{preview.campaign}</strong>
              </div>
              <div>
                <span>Campaign fit</span>
                <strong>{preview.campaignFit}%</strong>
              </div>
              <div>
                <span>VVI</span>
                <strong>{preview.vvi.toLocaleString()}</strong>
              </div>
              <div>
                <span>Demo value</span>
                <strong>{preview.demoValue} Demo Credits</strong>
              </div>
            </div>

            <p className="preview-reason">{preview.reason}</p>

            <p className="preview-keywords">
              Matched keywords: {preview.matchedKeywords.length
                ? preview.matchedKeywords.join(', ')
                : 'None'}
            </p>

            <span className={preview.brandSafe ? 'preview-safety limited' : 'preview-safety warning'}>
              {preview.brandSafe
                ? 'No flagged demo keywords found (limited check)'
                : 'Potentially sensitive keywords found — review needed'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
