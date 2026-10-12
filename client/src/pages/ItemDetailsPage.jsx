import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MatchConfidenceCard } from '../components/MatchConfidenceCard';
import { ClaimModal } from '../components/ClaimModal';
import { ItemQRCodeModal } from '../components/ItemQRCodeModal';
import { AnonymousChatModal } from '../components/AnonymousChatModal';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  MessageSquare, 
  QrCode, 
  CheckCircle2, 
  Trash2, 
  Eye, 
  Lock,
  Layers,
  Sparkles,
  Zap
} from 'lucide-react';

export function ItemDetailsPage({ itemId, onBack, onNavigateItem, onRequireAuth }) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Tabs: 'matches' vs 'claims'
  const [activeTab, setActiveTab] = useState('matches');

  const fetchItemDetails = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/items/${itemId}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('Item not found in ledger');
        return res.json();
      })
      .then(data => {
        setItem(data.item);
        setMatches(data.matches || []);
        setClaims(data.claims || []);
      })
      .catch(err => {
        console.error(err);
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItemDetails();
  }, [itemId]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this record from campus ledger?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete item');
      showToast('Record deleted.', 'info');
      onBack();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleConfirmReturn = async () => {
    if (!window.confirm('Mark this item as successfully returned to its verified owner?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/claims/${item.id}/return`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update return status');
      showToast('Handover confirmed! Item officially marked as RETURNED.', 'success');
      fetchItemDetails();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
        <span className="pulse-dot-amber" style={{ width: '12px', height: '12px', margin: '0 auto 1rem auto' }}></span>
        <div className="font-mono text-xs text-outline">LOCATING ASSET DOSSIER IN LEDGER...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="content-wrapper" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <h3>Asset Record Not Found</h3>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginTop: '1rem' }}>
          Back to Catalog
        </button>
      </div>
    );
  }

  const isOwner = user && user.id === item.user_id;
  const canModify = isOwner || isAdmin;
  const isFound = item.type === 'found';

  return (
    <div style={{ paddingTop: '1.25rem' }}>
      <div className="content-wrapper" style={{ maxWidth: '980px' }}>
        
        {/* Modals */}
        {showClaimModal && (
          <ClaimModal
            item={item}
            onClose={() => setShowClaimModal(false)}
            onSuccess={() => {
              fetchItemDetails();
              setActiveTab('claims');
            }}
          />
        )}

        {showQrModal && (
          <ItemQRCodeModal
            item={item}
            onClose={() => setShowQrModal(false)}
          />
        )}

        {showChatModal && (
          <AnonymousChatModal
            item={item}
            onClose={() => setShowChatModal(false)}
          />
        )}

        {/* Top Back Bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ArrowLeft size={14} />
            <span className="font-mono text-xs">Back to Ledger</span>
          </button>
        </div>

        {/* Main Asset Dossier Split Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          {/* Left Column: Visual Asset & Actions */}
          <div>
            <div className="terminal-card" style={{ padding: '0.65rem', overflow: 'hidden', marginBottom: '1rem' }}>
              {item.primary_image ? (
                <img
                  src={item.primary_image}
                  alt={item.title}
                  style={{ width: '100%', height: '330px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                />
              ) : (
                <div style={{ width: '100%', height: '280px', backgroundColor: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)' }}>
                  <Layers size={32} />
                </div>
              )}
            </div>

            {/* Actions Deck */}
            <div className="terminal-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {isFound && item.status !== 'RETURNED' && (
                <button
                  className="btn btn-beacon btn-lg"
                  onClick={() => {
                    if (!isAuthenticated) onRequireAuth();
                    else setShowClaimModal(true);
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Verify Ownership &amp; Claim Item</span>
                </button>
              )}

              <button
                className="btn btn-surface"
                onClick={() => {
                  if (!isAuthenticated) onRequireAuth();
                  else setShowChatModal(true);
                }}
              >
                <MessageSquare size={16} style={{ color: 'var(--color-amber)' }} />
                <span>Contact via Encrypted Relay</span>
              </button>

              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowQrModal(true)}
              >
                <QrCode size={15} />
                <span>View Secure Handshake QR Tag</span>
              </button>

              {canModify && item.status !== 'RETURNED' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleConfirmReturn}
                >
                  <CheckCircle2 size={15} />
                  <span>Confirm Custody Handover (Mark RETURNED)</span>
                </button>
              )}

              {canModify && (
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={handleDelete}
                  style={{ marginTop: '0.25rem' }}
                >
                  <Trash2 size={13} />
                  <span>Delete Asset Record</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Comparative Specs Matrix */}
          <div>
            <div className="terminal-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                    {item.type}
                  </span>
                  <span className="badge badge-match">
                    {item.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-outline)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <Eye size={12} />
                  <span>{item.views_count} scans</span>
                </div>
              </div>

              <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--color-ivory)', marginBottom: '0.75rem' }}>
                {item.title}
              </h1>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                {item.description}
              </p>

              {/* Comparative Specs Matrix (From Stitch Design) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem', backgroundColor: 'var(--color-surface-lowest)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>CAMPUS ZONE</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={12} style={{ color: 'var(--color-amber)' }} />
                    {item.location}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>CATEGORY</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{item.category}</span>
                </div>

                <div>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>INCIDENT DATE</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)', fontFamily: 'var(--font-mono)' }}>{item.date_lost_or_found}</span>
                </div>

                <div>
                  <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>BRAND &amp; COLOR</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{item.brand || 'N/A'} &bull; {item.color || 'N/A'}</span>
                </div>
              </div>

              {/* Current Storage Custody */}
              {item.current_storage_location && (
                <div style={{ backgroundColor: 'var(--color-surface-container)', border: '1px solid rgba(242, 184, 75, 0.3)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase', fontWeight: 700 }}>PHYSICAL CUSTODY LOCATION:</div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-ivory)' }}>{item.current_storage_location}</div>
                </div>
              )}

              {/* Identifying Marks */}
              <div style={{ backgroundColor: 'var(--color-surface-lowest)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  IDENTIFYING CHARACTERISTICS:
                </span>
                <span style={{ fontSize: '0.825rem', color: 'var(--color-muted)' }}>
                  {item.identifying_marks || 'No special marks disclosed publicly.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: AI Matches vs Claims */}
        <div style={{ borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'matches' ? 'btn-beacon' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', padding: '0.55rem 1.25rem' }}
            onClick={() => setActiveTab('matches')}
          >
            <Zap size={14} />
            <span>AI Potential Matches ({matches.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'claims' ? 'btn-beacon' : 'btn-secondary'}`}
            style={{ borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0', padding: '0.55rem 1.25rem' }}
            onClick={() => setActiveTab('claims')}
          >
            <ShieldCheck size={14} />
            <span>Ownership Verification Claims ({claims.length})</span>
          </button>
        </div>

        {/* Tab 1: AI Matches Section */}
        {activeTab === 'matches' && (
          <div>
            {matches.length === 0 ? (
              <div className="terminal-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <span className="pulse-dot-amber" style={{ width: '8px', height: '8px', margin: '0 auto 0.75rem auto' }}></span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
                  No High-Confidence Correlations Yet
                </h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.825rem', maxWidth: '420px', margin: '0.25rem auto 0 auto' }}>
                  The AI telemetry matcher monitors incoming intake reports. When a candidate matches with &ge;50% confidence, an alert will be dispatched.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {matches.map(m => (
                  <MatchConfidenceCard
                    key={m.id}
                    match={m}
                    onViewDetails={(matchedId) => onNavigateItem(matchedId)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Claims Review Section */}
        {activeTab === 'claims' && (
          <div>
            {claims.length === 0 ? (
              <div className="terminal-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <ShieldCheck size={32} style={{ color: 'var(--color-outline)', margin: '0 auto 0.5rem auto' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
                  No Claims Filed for this Asset
                </h3>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.825rem' }}>
                  If you lost this item, select "Verify Ownership &amp; Claim Item" above.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {claims.map(c => (
                  <div key={c.id} className="terminal-card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span className={`badge ${c.status === 'APPROVED' ? 'badge-found' : (c.status === 'REJECTED' ? 'badge-lost' : 'badge-pending')}`}>
                          {c.status}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                          Claim #{c.id} submitted {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--color-surface-lowest)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>OWNERSHIP STATEMENT:</span>
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-ivory)', marginTop: '0.2rem' }}>{c.proof_description}</p>
                    </div>

                    {(canModify || user?.id === c.claimant_id) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', fontSize: '0.8rem' }}>
                        {c.hidden_marks_answers && (
                          <div style={{ backgroundColor: 'var(--color-surface-lowest)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--color-amber)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>HIDDEN MARKS RESPONSE:</span>
                            <div style={{ color: 'var(--color-ivory)', marginTop: '0.15rem' }}>{c.hidden_marks_answers}</div>
                          </div>
                        )}
                        {c.secret_contents && (
                          <div style={{ backgroundColor: 'var(--color-surface-lowest)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--color-success)', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>INTERNAL CONTENTS RESPONSE:</span>
                            <div style={{ color: 'var(--color-ivory)', marginTop: '0.15rem' }}>{c.secret_contents}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
