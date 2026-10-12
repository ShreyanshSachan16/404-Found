import React, { useEffect, useState } from 'react';
import { ChevronRight, ShieldCheck, MapPin, Calendar, Layers, Eye } from 'lucide-react';

export function MatchConfidenceCard({ match, onViewDetails }) {
  const targetPercent = Math.round((match.overall_score || 0) * 100);
  const textPercent = Math.round((match.text_score || 0) * 100);
  const imagePercent = Math.round((match.image_score || 0) * 100);
  const locPercent = Math.round((match.location_score || 0) * 100);
  const datePercent = Math.round((match.date_score || 0) * 100);
  const catPercent = Math.round((match.category_score || 0) * 100);

  // Smooth count-up micro-interaction (0% -> target%)
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 650;
    const stepTime = 25;
    const increment = targetPercent / (duration / stepTime);

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetPercent) {
        setAnimatedScore(targetPercent);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetPercent]);

  const isHighConfidence = targetPercent >= 75;

  return (
    <div className="terminal-card" style={{ padding: '0', overflow: 'hidden' }}>
      {/* Dossier Header Strip */}
      <div 
        style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          padding: '0.65rem 1rem', backgroundColor: 'var(--color-surface-container)',
          borderBottom: '1px solid var(--color-border)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span className="font-mono text-xs font-semibold text-ivory uppercase" style={{ letterSpacing: '0.06em' }}>
            CANDIDATE DOSSIER
          </span>
          <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
            #{match.matched_item_id ? `REF-${match.matched_item_id}` : `ID-${match.id}`}
          </span>
        </div>

        {/* Confidence Pill */}
        <div className="badge badge-match" style={{ padding: '0.2rem 0.6rem' }}>
          <span className="pulse-dot-amber" style={{ width: '5px', height: '5px' }}></span>
          <span style={{ fontWeight: 700 }}>{animatedScore}% CONFIDENCE</span>
        </div>
      </div>

      <div style={{ padding: '1.15rem' }}>
        {/* Title & Metadata */}
        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
          {match.primary_image ? (
            <img 
              src={match.primary_image} 
              alt="" 
              style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-border)' }} 
            />
          ) : (
            <div style={{ width: '64px', height: '64px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-high)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)', flexShrink: 0 }}>
              <Layers size={20} />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {match.title || match.matched_title || 'Item Correlation'}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <MapPin size={12} style={{ color: 'var(--color-amber)' }} />
                <span>{match.location || 'Campus'}</span>
              </span>
              <span>&bull;</span>
              <span>{match.category || 'General'}</span>
            </div>
          </div>
        </div>

        {/* Granular Multi-Vector Metrics Box */}
        <div style={{ backgroundColor: 'var(--color-surface-lowest)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1rem', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>NEURAL VECTOR TELEMETRY</span>
            <span style={{ color: 'var(--color-success)' }}>Auto-Synced</span>
          </div>

          {/* Metric 1: Visual Features */}
          <div className="vector-progress-row">
            <div className="vector-progress-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Eye size={11} style={{ color: 'var(--color-amber)' }} />
                <span>Neural Visual Similarity</span>
              </span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-amber)' }}>{imagePercent}%</span>
            </div>
            <div className="vector-track">
              <div className="vector-fill fill-amber" style={{ width: `${imagePercent}%` }} />
            </div>
          </div>

          {/* Metric 2: Geo-Spatial Proximity */}
          <div className="vector-progress-row">
            <div className="vector-progress-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={11} style={{ color: 'var(--color-success)' }} />
                <span>Geo-Spatial Coherence</span>
              </span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-success)' }}>{locPercent}%</span>
            </div>
            <div className="vector-track">
              <div className="vector-fill fill-jade" style={{ width: `${locPercent}%` }} />
            </div>
          </div>

          {/* Metric 3: Time Vector */}
          <div className="vector-progress-row">
            <div className="vector-progress-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={11} style={{ color: 'var(--color-info)' }} />
                <span>Timestamp Alignment</span>
              </span>
              <span className="font-mono" style={{ fontWeight: 600, color: 'var(--color-info)' }}>{datePercent}%</span>
            </div>
            <div className="vector-track">
              <div className="vector-fill fill-cobalt" style={{ width: `${datePercent}%` }} />
            </div>
          </div>

          {/* Metric 4: Text Description */}
          <div className="vector-progress-row" style={{ marginBottom: 0 }}>
            <div className="vector-progress-header">
              <span>Text &amp; Descriptive Match</span>
              <span className="font-mono" style={{ fontWeight: 600 }}>{textPercent}%</span>
            </div>
            <div className="vector-track">
              <div className="vector-fill fill-amber" style={{ width: `${textPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onViewDetails && (
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', justifyContent: 'center' }} 
            onClick={() => onViewDetails(match.matched_item_id || match.found_item_id || match.lost_item_id)}
          >
            <span>Inspect Verification Vectors</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
