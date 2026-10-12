import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  ShieldCheck, 
  Users, 
  Package, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  Archive, 
  Activity, 
  Sliders, 
  Search,
  Eye,
  Trash2,
  Terminal,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export function AdminDashboardPage({ onNavigateItem }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('overview');

  // Claim review modal state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // AI settings state
  const [aiConfig, setAiConfig] = useState({
    TEXT_WEIGHT: 0.35,
    IMAGE_WEIGHT: 0.25,
    LOCATION_WEIGHT: 0.15,
    DATE_WEIGHT: 0.10,
    CATEGORY_WEIGHT: 0.15,
    MIN_MATCH_THRESHOLD: 0.50
  });

  const fetchAdminData = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/admin/dashboard-stats', { headers }).then(r => r.json()),
      fetch('/api/admin/users', { headers }).then(r => r.json()),
      fetch('/api/admin/claims', { headers }).then(r => r.json()),
      fetch('/api/items?limit=50', { headers }).then(r => r.json())
    ])
      .then(([statsData, usersData, claimsData, itemsData]) => {
        setStats(statsData);
        if (statsData.aiWeights) setAiConfig(statsData.aiWeights);
        setUsers(usersData.users || []);
        setClaims(claimsData.claims || []);
        setItems(itemsData.items || []);
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to load admin moderation data', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Handle Claim Review (Approve / Reject)
  const handleReviewClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClaim) return;

    setReviewing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/claims/${selectedClaim.id}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: reviewDecision,
          admin_notes: reviewNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      showToast(`Claim successfully ${reviewDecision.toLowerCase()}!`, 'success');
      setSelectedClaim(null);
      setReviewNotes('');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setReviewing(false);
    }
  };

  // Toggle user suspension
  const handleToggleSuspension = async (targetUser) => {
    const actionName = targetUser.is_suspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionName} user "${targetUser.full_name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/users/${targetUser.id}/toggle-suspension`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      showToast(data.message, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete item report
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Moderator Confirmation: Delete this report from campus records?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete report');
      showToast('Item report purged by administrator.', 'info');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Save AI weights
  const handleSaveAiWeights = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(aiConfig)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update AI settings');
      showToast('AI multi-signal weights updated across similarity pipeline!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Batch Archive
  const handleBatchArchive = async () => {
    if (!window.confirm('Archive unresolved reports older than 45 days?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/archive-old', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ days: 45 })
      });
      const data = await res.json();
      showToast(data.message, 'success');
      fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const pendingClaimsCount = claims.filter(c => c.status === 'VERIFICATION_PENDING').length;

  return (
    <div className="content-wrapper" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      {/* Moderation Review Modal */}
      {selectedClaim && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="beacon-pulse"></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CUSTODY MODERATION REVIEW
              </span>
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem' }}>
              Claim Verification #{selectedClaim.id}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
              Target: <strong style={{ color: 'var(--color-ivory)' }}>{selectedClaim.item_title}</strong> &bull; Claimant: <strong style={{ color: 'var(--color-ivory)' }}>{selectedClaim.claimant_name}</strong> ({selectedClaim.claimant_email})
            </p>

            {/* Evidence Comparison Table */}
            <div style={{ backgroundColor: 'var(--color-obsidian)', borderRadius: 'var(--radius-md)', padding: '1.15rem', marginBottom: '1.25rem', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '0.85rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Claimant Ownership Statement:</span>
                <p style={{ marginTop: '0.3rem', color: 'var(--color-ivory)', lineHeight: 1.5 }}>{selectedClaim.proof_description}</p>
              </div>

              {selectedClaim.hidden_marks_answers && (
                <div style={{ marginBottom: '0.85rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(242, 184, 75, 0.05)', border: '1px solid rgba(242, 184, 75, 0.2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Claimant Hidden Marks Answer:</span>
                  <p style={{ marginTop: '0.3rem', color: 'var(--color-ivory)' }}>{selectedClaim.hidden_marks_answers}</p>
                </div>
              )}

              {selectedClaim.item_actual_marks && (
                <div style={{ marginBottom: '0.85rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Actual Physical Marks On File (Zero-Knowledge):</span>
                  <p style={{ marginTop: '0.3rem', color: 'var(--color-ivory)' }}>{selectedClaim.item_actual_marks}</p>
                </div>
              )}

              {selectedClaim.secret_contents && (
                <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(112, 214, 160, 0.05)', border: '1px solid rgba(112, 214, 160, 0.2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-emerald)', textTransform: 'uppercase' }}>Claimant Internal Contents Answer:</span>
                  <p style={{ marginTop: '0.3rem', color: 'var(--color-ivory)' }}>{selectedClaim.secret_contents}</p>
                </div>
              )}

              {selectedClaim.receipt_image && (
                <div style={{ marginTop: '0.85rem', padding: '0.65rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-info)', textTransform: 'uppercase' }}>Uploaded Proof / Receipt Evidence:</span>
                  <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <a
                      href={selectedClaim.receipt_image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', textDecoration: 'none' }}
                    >
                      <Eye size={12} />
                      <span>Inspect Uploaded Receipt</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleReviewClaimSubmit}>
              <div className="form-group">
                <label className="form-label">Admin Custody Determination</label>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--color-emerald)', fontWeight: 600, fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={reviewDecision === 'APPROVED'}
                      onChange={() => setReviewDecision('APPROVED')}
                    />
                    <span>Approve Ownership</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--color-error)', fontWeight: 600, fontSize: '0.875rem' }}>
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewDecision === 'REJECTED'}
                      onChange={() => setReviewDecision('REJECTED')}
                    />
                    <span>Reject Claim</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Review Notes &amp; Pickup Counter Instructions</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. Identity verified via serial mark. Direct claimant to Station 3 desk."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedClaim(null)} disabled={reviewing}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={reviewing}>
                  {reviewing ? 'Committing...' : 'Confirm Determination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-amber)' }}>
              SYSTEM SECURITY &amp; MODERATION NODE
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-border)' }}></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              ADMIN PERMISSION TIER 1
            </span>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--color-ivory)', marginBottom: '0.5rem' }}>
            Campus Safety &amp; Ledger Control
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-muted)', margin: 0 }}>
            Centralized intake moderation, custody claims resolution, and AI weight hyper-parameter configuration.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleBatchArchive}>
          <Archive size={15} />
          <span>Batch Archive Inactive (&gt;45 Days)</span>
        </button>
      </section>

      {/* 6 KPI Cards Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>TOTAL USERS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-ivory)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.totalUsers || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>LOST REPORTS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-error)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.totalLost || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>FOUND REPORTS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.totalFound || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>PENDING CLAIMS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.activeClaims || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>RETURNED ITEMS</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.returnedItems || 0}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>RECOVERY RATE</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 600, color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', marginTop: '0.5rem' }}>
            {stats?.summary?.recoveryRate || '0%'}
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--color-surface)', padding: '0.3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflowX: 'auto', gap: '0.25rem' }}>
          <button className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('overview')}>
            <Activity size={14} />
            <span>Analytics &amp; Hotspots</span>
          </button>

          <button className={`btn btn-sm ${activeTab === 'claims' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('claims')}>
            <ShieldCheck size={14} />
            <span>Claims Queue ({pendingClaimsCount} Pending)</span>
          </button>

          <button className={`btn btn-sm ${activeTab === 'reports' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('reports')}>
            <Package size={14} />
            <span>Reports Ledger ({items.length})</span>
          </button>

          <button className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('users')}>
            <Users size={14} />
            <span>Campus Users ({users.length})</span>
          </button>

          <button className={`btn btn-sm ${activeTab === 'ai-config' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('ai-config')}>
            <Sliders size={14} />
            <span>AI Weights Configuration</span>
          </button>
        </div>
      </section>

      {/* Tab 1: Analytics & Hotspots */}
      {activeTab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {/* Category distribution */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
                Reports by Item Classification
              </h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>Categories</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.charts?.byCategory?.map(item => {
                const max = Math.max(...stats.charts.byCategory.map(x => x.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--color-ivory)' }}>{item.category}</span>
                      <strong style={{ color: 'var(--color-amber)' }}>{item.count} items</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill fill-amber" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campus Location Hotspots */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
                Campus Spatial Hotspots
              </h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>Location Nodes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {stats.charts?.byLocation?.map(item => {
                const max = Math.max(...stats.charts.byLocation.map(x => x.count), 1);
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={item.location}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--color-ivory)' }}>{item.location}</span>
                      <strong style={{ color: 'var(--color-emerald)' }}>{item.count} reports</strong>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill fill-emerald" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Claims Review Queue */}
      {activeTab === 'claims' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                CLAIMS LEDGER QUEUE
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginTop: '0.2rem' }}>
                Custody Ownership Verification Queue
              </h3>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>ITEM</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>CLAIMANT</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>SUBMITTED</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {claims.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-ivory)' }}>{c.item_title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{c.item_location}</div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ color: 'var(--color-ivory)' }}>{c.claimant_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{c.claimant_email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className={`badge ${c.status === 'APPROVED' ? 'badge-emerald' : (c.status === 'REJECTED' ? 'badge-lost' : 'badge-amber')}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedClaim(c)}>
                        <span>Inspect Verification</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Reports Moderation */}
      {activeTab === 'reports' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                GLOBAL ITEMS LEDGER
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginTop: '0.2rem' }}>
                Report Moderation &amp; Lifecycle Controls
              </h3>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>ITEM</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>TYPE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>LOCATION</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>CONTROLS</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-ivory)' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{item.category}</div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                        {item.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--color-muted)' }}>{item.location}</td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className="badge badge-amber">{item.status}</span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onNavigateItem(item.id)}>
                          <Eye size={13} />
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ color: 'var(--color-error)' }} onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: User Directory */}
      {activeTab === 'users' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                NODE DIRECTORY
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginTop: '0.2rem' }}>
                Campus User &amp; Staff Roles
              </h3>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>USER IDENTITY</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STUDENT ID / DEPT</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>ROLE</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>MODERATION</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-ivory)' }}>{u.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--color-muted)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)' }}>{u.student_id || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{u.department || 'Campus'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-amber' : 'badge-emerald'}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      {u.is_suspended ? (
                        <span className="badge badge-lost">SUSPENDED</span>
                      ) : (
                        <span className="badge badge-emerald">ACTIVE</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      {u.id !== user.id && (
                        <button
                          className={`btn btn-sm ${u.is_suspended ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ color: u.is_suspended ? 'inherit' : 'var(--color-error)' }}
                          onClick={() => handleToggleSuspension(u)}
                        >
                          {u.is_suspended ? 'Reactivate Node' : 'Suspend Account'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: AI Similarity Weights */}
      {activeTab === 'ai-config' && (
        <div className="glass-card" style={{ padding: '2rem', maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--color-amber-glow)', padding: '0.65rem', borderRadius: '50%', color: 'var(--color-amber)' }}>
              <Sliders size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
                AI Similarity Engine Weights
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
                Tune multi-signal vector weights applied during candidate cross-matching.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveAiWeights}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Text / Semantic NLP Cosine Weight</span>
                <strong style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.TEXT_WEIGHT * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.TEXT_WEIGHT}
                onChange={(e) => setAiConfig({ ...aiConfig, TEXT_WEIGHT: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Image Feature Similarity Weight</span>
                <strong style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.IMAGE_WEIGHT * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.IMAGE_WEIGHT}
                onChange={(e) => setAiConfig({ ...aiConfig, IMAGE_WEIGHT: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Spatial Proximity (Graph Adjacency)</span>
                <strong style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.LOCATION_WEIGHT * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.LOCATION_WEIGHT}
                onChange={(e) => setAiConfig({ ...aiConfig, LOCATION_WEIGHT: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Temporal Decay Function Weight</span>
                <strong style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.DATE_WEIGHT * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.DATE_WEIGHT}
                onChange={(e) => setAiConfig({ ...aiConfig, DATE_WEIGHT: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Category Alignment Weight</span>
                <strong style={{ color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.CATEGORY_WEIGHT * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.CATEGORY_WEIGHT}
                onChange={(e) => setAiConfig({ ...aiConfig, CATEGORY_WEIGHT: parseFloat(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Minimum Match Alert Threshold</span>
                <strong style={{ color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)' }}>{Math.round(aiConfig.MIN_MATCH_THRESHOLD * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0.3"
                max="0.8"
                step="0.05"
                className="form-input"
                style={{ padding: '0' }}
                value={aiConfig.MIN_MATCH_THRESHOLD}
                onChange={(e) => setAiConfig({ ...aiConfig, MIN_MATCH_THRESHOLD: parseFloat(e.target.value) })}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1.25rem' }}>
              Commit AI Neural Weights
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
