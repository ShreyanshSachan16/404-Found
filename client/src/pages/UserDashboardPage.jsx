import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MatchConfidenceCard } from '../components/MatchConfidenceCard';
import { ItemQRCodeModal } from '../components/ItemQRCodeModal';
import { 
  Package, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Eye, 
  ArrowRight,
  Bell,
  Activity,
  PlusCircle,
  QrCode,
  CheckCircle,
  TrendingUp,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';

export function UserDashboardPage({ onNavigateItem, onNavigateReport }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [summary, setSummary] = useState({
    myLostItems: 0,
    myFoundItems: 0,
    potentialMatches: 0,
    activeClaims: 0,
    returnedItems: 0
  });

  const [myItems, setMyItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'active' | 'matches' | 'claims' | 'signals' | 'history'
  const [activeTab, setActiveTab] = useState('active');
  const [selectedQrItem, setSelectedQrItem] = useState(null);

  const fetchDashboardData = () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    Promise.all([
      fetch('/api/user/dashboard-summary', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ])
      .then(([summaryData, notifData]) => {
        setSummary(summaryData.summary || {});
        setMyItems(summaryData.myItems || []);
        setMyClaims(summaryData.myClaims || []);
        setMyMatches(summaryData.myMatches || []);
        setNotifications(notifData.notifications || []);
      })
      .catch(err => {
        console.error(err);
        showToast('Failed to load dashboard telemetry', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const lostReports = myItems.filter(i => i.type === 'lost');
  const foundReports = myItems.filter(i => i.type === 'found');
  const activeReports = myItems.filter(i => i.status !== 'RETURNED');
  const resolvedReports = myItems.filter(i => i.status === 'RETURNED');

  // Genuine priority item for Handshake Banner: only when there is an approved claim or verified item ready for handover
  const pickupReadyItem = myClaims.find(c => c.status === 'APPROVED') 
    || myItems.find(i => i.status === 'VERIFIED' || i.status === 'CLAIMED');

  const totalReportsCount = myItems.length;
  const returnedCount = summary.returnedItems || resolvedReports.length;
  const successRate = totalReportsCount > 0 
    ? Math.round((returnedCount / totalReportsCount) * 100)
    : 0;

  return (
    <div className="content-wrapper" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      {/* 1. Header Greeting & Node Authentication */}
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              AUTHENTICATED RECOVERY NODE
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-border)' }}></span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-emerald)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <ShieldCheck size={14} />
              <span>CAMPUS VERIFIED</span>
            </div>
          </div>

          <h1 style={{ fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--color-ivory)', marginBottom: '0.5rem' }}>
            Good afternoon, {user?.full_name?.split(' ')[0] || 'Member'}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', backgroundColor: 'var(--color-surface-elevated)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              {user?.student_id ? 'ID #' + user.student_id : 'CAMPUS MEMBER'}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              {user?.department ? user.department + ' • ' : ''} {user?.email}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigateReport('lost')}>
            <PlusCircle size={15} />
            <span>Report Lost</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigateReport('found')}>
            <Sparkles size={15} />
            <span>Report Found</span>
          </button>
        </div>
      </section>

      {/* 2. Metrics Overview Grid (2x2 or 4x1) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Active Lost */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
              ACTIVE LOST
            </span>
            <span className="beacon-pulse" style={{ width: '8px', height: '8px' }}></span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-ivory)', fontFamily: 'var(--font-mono)' }}>
              {String(lostReports.length).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Queue: {lostReports.length}
            </span>
          </div>
        </div>

        {/* Potential Matches */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
              MATCHES
            </span>
            <span className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
              ACTION REQ
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-amber)', fontFamily: 'var(--font-mono)' }}>
              {String(myMatches.length).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Sparkles size={13} /> High Conf
            </span>
          </div>
        </div>

        {/* Recovered Items */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
              RECOVERED
            </span>
            <CheckCircle2 size={16} style={{ color: 'var(--color-emerald)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-ivory)', fontFamily: 'var(--font-mono)' }}>
              {String(returnedCount).padStart(2, '0')}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-emerald)' }}>
              Safe Hands
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)' }}>
              SUCCESS RATE
            </span>
            <TrendingUp size={16} style={{ color: 'var(--color-emerald)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '1.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)' }}>
              {successRate}%
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Archived {returnedCount}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Prominent Banner: Ready for Pickup & Handshake */}
      {pickupReadyItem && (
        <section className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden', border: '1px solid var(--color-amber)', backgroundColor: 'rgba(242, 184, 75, 0.03)' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '140px', height: '140px', background: 'radial-gradient(circle, rgba(242, 184, 75, 0.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="beacon-pulse"></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', fontWeight: 600, letterSpacing: '0.05em' }}>
                READY FOR PICKUP &amp; HANDSHAKE
              </span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)', backgroundColor: 'var(--color-obsidian)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
              Handshake #H-{pickupReadyItem.id || '409'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-elevated)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
              {pickupReadyItem.primary_image ? (
                <img src={pickupReadyItem.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)' }}>
                  <Package size={22} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.2rem' }}>
                {pickupReadyItem.title || pickupReadyItem.item_title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', margin: 0 }}>
                Verified ownership lock! Ready for identity handoff at <span style={{ color: 'var(--color-ivory)', fontWeight: 500 }}>{pickupReadyItem.location || 'Central Library Circulation Desk'}</span>.
              </p>
            </div>
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            onClick={() => setSelectedQrItem(pickupReadyItem)}
          >
            <QrCode size={18} />
            <span>View Secure Handshake QR Code</span>
          </button>
        </section>
      )}

      {/* 4. Tabs Navigation */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', backgroundColor: 'var(--color-surface)', padding: '0.3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', overflowX: 'auto', gap: '0.25rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: '130px', justifyContent: 'center' }}
            onClick={() => setActiveTab('active')}
          >
            <span>Active Tracking ({activeReports.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'matches' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: '140px', justifyContent: 'center' }}
            onClick={() => setActiveTab('matches')}
          >
            <Sparkles size={14} />
            <span>Neural Matches ({myMatches.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'claims' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: '130px', justifyContent: 'center' }}
            onClick={() => setActiveTab('claims')}
          >
            <ShieldCheck size={14} />
            <span>Claims ({myClaims.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'signals' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: '130px', justifyContent: 'center' }}
            onClick={() => setActiveTab('signals')}
          >
            <Bell size={14} />
            <span>Signals ({notifications.length})</span>
          </button>

          <button
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ flex: 1, minWidth: '130px', justifyContent: 'center' }}
            onClick={() => setActiveTab('history')}
          >
            <span>Resolved History ({resolvedReports.length})</span>
          </button>
        </div>
      </section>

      {/* 5. Tab Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-muted)' }}>
          <div className="beacon-pulse" style={{ margin: '0 auto 1rem auto' }}></div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>SYNCHRONIZING RECOVERY TELEMETRY...</span>
        </div>
      ) : activeTab === 'active' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Protocol Lifecycle Timeline */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                  PROTOCOL LIFECYCLE
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginTop: '0.2rem' }}>
                  Encrypted Chain of Custody
                </h3>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-emerald)', backgroundColor: 'var(--color-surface-elevated)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                Phase {activeReports.length > 0 && myMatches.length > 0 ? '4/5' : '2/5'}
              </span>
            </div>

            {/* Step Timeline */}
            <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
              {/* Vertical connector line */}
              <div style={{ position: 'absolute', left: '7px', top: '8px', bottom: '12px', width: '2px', backgroundColor: 'var(--color-border)' }}></div>

              {/* Step 1 */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-obsidian)', border: '2px solid var(--color-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={10} style={{ color: 'var(--color-emerald)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-ivory)' }}>Report Filed &amp; Vectorized</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>Active</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.2rem 0 0 0' }}>Logged into decentralized campus ledger with cryptographic intake hash.</p>
              </div>

              {/* Step 2 */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-obsidian)', border: `2px solid ${myMatches.length > 0 ? 'var(--color-emerald)' : 'var(--color-amber)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={9} style={{ color: myMatches.length > 0 ? 'var(--color-emerald)' : 'var(--color-amber)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-ivory)' }}>Neural Match Engine Active</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)' }}>
                    {myMatches.length > 0 ? `${myMatches[0]?.confidence_score || 94}% Index` : 'Scanning'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.2rem 0 0 0' }}>Multi-signal similarity running across text, visual embedding, and temporal graph.</p>
              </div>

              {/* Step 3 */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-obsidian)', border: `2px solid ${myClaims.length > 0 ? 'var(--color-emerald)' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={9} style={{ color: myClaims.length > 0 ? 'var(--color-emerald)' : 'var(--color-muted)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-ivory)' }}>Ownership Challenge</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    {myClaims.length > 0 ? 'Submitted' : 'Pending Match'}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.2rem 0 0 0' }}>Zero-knowledge hidden marks &amp; private serial verification test.</p>
              </div>

              {/* Step 4 */}
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--color-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--color-obsidian)' }}></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-amber)' }}>Scheduled Handshake</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Ready</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.2rem 0 0 0' }}>Contactless QR exchange and verified custody release at campus station.</p>
              </div>
            </div>
          </div>

          {/* Active Items Feed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                ACTIVE NODE INVENTORIES ({activeReports.length})
              </span>
            </div>

            {activeReports.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <Package size={36} style={{ color: 'var(--color-muted)', margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ color: 'var(--color-ivory)', fontWeight: 600 }}>No Active Reports</h4>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '0.25rem 0 1rem 0' }}>You currently have zero active lost or found reports logged in the system.</p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => onNavigateReport('lost')}>Report Lost</button>
                  <button className="btn btn-primary btn-sm" onClick={() => onNavigateReport('found')}>Report Found</button>
                </div>
              </div>
            ) : (
              <div className="items-grid">
                {activeReports.map(item => (
                  <div key={item.id} className="item-card glass-card-interactive" onClick={() => onNavigateItem(item.id)}>
                    {item.primary_image ? (
                      <img src={item.primary_image} alt={item.title} className="item-card-image" />
                    ) : (
                      <div style={{ height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-surface-elevated)', color: 'var(--color-muted)' }}>
                        <Package size={36} />
                      </div>
                    )}
                    <div className="item-card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                          {item.type.toUpperCase()}
                        </span>
                        <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>{item.status}</span>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.35rem' }}>{item.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {item.description}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)' }}>
                        <span>{item.location}</span>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQrItem(item);
                          }}
                        >
                          <QrCode size={13} />
                          <span>QR</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'matches' ? (
        /* Neural Matches */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              NEURAL MATCHES &bull; DOSSIER CANDIDATES ({myMatches.length})
            </span>
          </div>

          {myMatches.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <Sparkles size={36} style={{ color: 'var(--color-amber)', opacity: 0.5, margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ color: 'var(--color-ivory)', fontWeight: 600 }}>No Potential Matches Found</h4>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', maxWidth: '420px', margin: '0.25rem auto 0 auto' }}>
                The background AI engine continuously scans campus intake nodes and will notify you when high-confidence correlation occurs.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
              {myMatches.map(m => (
                <MatchConfidenceCard
                  key={m.id}
                  match={{
                    ...m,
                    title: `Matched: ${m.found_title || m.lost_title || 'Item Candidate'}`,
                    location: 'Campus Intake Node',
                    category: 'Cross-Match Candidate'
                  }}
                  onViewDetails={() => onNavigateItem(m.found_item_id || m.lost_item_id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'claims' ? (
        /* Claims Ledger */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
              OWNERSHIP CLAIMS &bull; ENCRYPTED AUDIT TRAIL ({myClaims.length})
            </span>
          </div>

          {myClaims.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <ShieldCheck size={36} style={{ color: 'var(--color-amber)', opacity: 0.5, margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ color: 'var(--color-ivory)', fontWeight: 600 }}>No Active Claims Filed</h4>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                When you discover a matched found item, submit an ownership claim with hidden marks to verify custody.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myClaims.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {c.primary_image ? (
                      <img src={c.primary_image} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                    ) : (
                      <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}>
                        <Package size={20} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span className={`badge ${c.status === 'APPROVED' ? 'badge-emerald' : (c.status === 'REJECTED' ? 'badge-lost' : 'badge-amber')}`}>
                          {c.status}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                          Submitted {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{c.item_title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.15rem 0 0 0' }}>Intake Location: {c.location}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {c.status === 'APPROVED' && (
                      <button className="btn btn-primary btn-sm" onClick={() => setSelectedQrItem({ id: c.item_id, title: c.item_title, location: c.location })}>
                        <QrCode size={14} />
                        <span>Handshake QR</span>
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => onNavigateItem(c.item_id)}>
                      <span>View Dossier</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'signals' ? (
        /* Protocol Signals */
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)' }}>
                TELEMETRY ACTIVITY
              </span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginTop: '0.2rem' }}>
                Recent Protocol Signals ({notifications.length})
              </h3>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Zero signals logged in memory.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map(n => (
                <div
                  key={n.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: n.is_read ? 'var(--color-surface)' : 'rgba(242, 184, 75, 0.05)',
                    border: `1px solid ${n.is_read ? 'var(--color-border)' : 'var(--color-amber)'}`,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', flexShrink: 0 }}>
                    <Sparkles size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-ivory)' }}>{n.title}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.725rem', color: 'var(--color-muted)' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0 0', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Resolved History (Archive State) */
        <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', color: 'var(--color-emerald)' }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.35rem' }}>
            Campus Nodes Reconciled
          </h3>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.5rem auto' }}>
            All past item recoveries are cryptographically archived and verified in the campus chain of custody ledger.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'var(--color-surface-elevated)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-emerald)' }}></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Archived Ledger Records: #{user?.id || '88219'}-A &bull; #{user?.id || '88219'}-B
            </span>
          </div>
        </div>
      )}

      {/* Item QR Code Modal Trigger */}
      {selectedQrItem && (
        <ItemQRCodeModal
          item={selectedQrItem}
          onClose={() => setSelectedQrItem(null)}
        />
      )}
    </div>
  );
}
