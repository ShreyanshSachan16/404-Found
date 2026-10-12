import React from 'react';
import { AlertTriangle, ExternalLink, ArrowRight, ShieldAlert } from 'lucide-react';

export function DuplicateWarningModal({ candidates, onViewReport, onContinueAnyway, onCancel }) {
  const topCandidate = candidates[0]?.item || candidates[0];
  const simScore = candidates[0]?.similarityScore ? Math.round(candidates[0].similarityScore * 100) : 85;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '490px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.15rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-amber-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
              Duplicate Report Detected
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              AI similarity engine flagged a potential duplicate ({simScore}% coherence).
            </p>
          </div>
        </div>

        {/* Existing Item Dossier Snippet */}
        {topCandidate && (
          <div className="terminal-card" style={{ padding: '0.85rem', backgroundColor: 'var(--color-surface-lowest)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {topCandidate.primary_image ? (
                <img
                  src={topCandidate.primary_image}
                  alt={topCandidate.title}
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
                />
              ) : (
                <div style={{ width: '60px', height: '60px', backgroundColor: 'var(--color-surface-high)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)', fontSize: '11px' }}>
                  No photo
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.2rem' }}>
                  <span className={`badge ${topCandidate.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                    {topCandidate.type}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                    Reported {new Date(topCandidate.created_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topCandidate.title}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                  Location: {topCandidate.location} &bull; Category: {topCandidate.category}
                </p>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.4rem' }}>
                Did you mean this item?
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onViewReport(topCandidate.id)}
              >
                <ExternalLink size={13} />
                <span>[View Report]</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel}>
            Modify Details
          </button>
          <button
            type="button"
            className="btn btn-beacon btn-sm"
            onClick={onContinueAnyway}
          >
            <span>[Continue Anyway]</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
