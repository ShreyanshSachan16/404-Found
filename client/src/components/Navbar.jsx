import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  PlusCircle, 
  ShieldCheck, 
  LayoutDashboard, 
  Bell, 
  User, 
  LogOut, 
  ChevronDown, 
  Sparkles,
  Zap
} from 'lucide-react';

export function Navbar({ activePage, setActivePage, onOpenAuthModal }) {
  const { user, isAuthenticated, isAdmin, logout, isDemoEnabled, switchDemoUser } = useAuth();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const userRef = useRef(null);
  const demoRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifMenu(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
      if (demoRef.current && !demoRef.current.contains(e.target)) setShowDemoMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="navbar-terminal">
      <div className="navbar-inner">
        {/* Brand: 404 FOUND */}
        <div className="brand-badge" onClick={() => setActivePage('home')}>
          <div className="brand-icon-box">
            <span className="font-mono text-xs font-bold">404</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="brand-text-404">404</span>
              <span className="brand-text-found">
                FOUND
                <span className="pulse-dot-amber"></span>
              </span>
            </div>
            <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '2px' }}>
              Campus Network
            </span>
          </div>
        </div>

        {/* Center Links */}
        <ul className="nav-links-deck">
          <li>
            <button
              className={`nav-item-btn ${activePage === 'home' ? 'active' : ''}`}
              onClick={() => setActivePage('home')}
            >
              Home
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activePage === 'browse' ? 'active' : ''}`}
              onClick={() => setActivePage('browse')}
            >
              <Search size={14} /> Browse Catalog
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activePage === 'report-lost' ? 'active' : ''}`}
              onClick={() => setActivePage('report-lost')}
            >
              <PlusCircle size={14} /> Report Lost
            </button>
          </li>
          <li>
            <button
              className={`nav-item-btn ${activePage === 'report-found' ? 'active' : ''}`}
              onClick={() => setActivePage('report-found')}
            >
              <Zap size={14} style={{ color: 'var(--color-amber)' }} /> Report Found
            </button>
          </li>
          {isAuthenticated && (
            <li>
              <button
                className={`nav-item-btn ${activePage === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActivePage('dashboard')}
              >
                <LayoutDashboard size={14} /> My Dashboard
              </button>
            </li>
          )}
          {isAdmin && (
            <li>
              <button
                className={`nav-item-btn ${activePage === 'admin' ? 'active' : ''}`}
                onClick={() => setActivePage('admin')}
                style={{ color: 'var(--color-amber)', borderColor: 'rgba(242, 184, 75, 0.35)' }}
              >
                <ShieldCheck size={14} /> Admin Dispatch
              </button>
            </li>
          )}
        </ul>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Quick Demo Switcher (Available in development or when explicitly enabled) */}
          {isDemoEnabled && (
            <div style={{ position: 'relative' }} ref={demoRef}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                title="Switch demo role instantly"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderColor: 'rgba(242, 184, 75, 0.3)' }}
              >
                <span className="pulse-dot-amber" style={{ width: '5px', height: '5px' }}></span>
                <span className="font-mono">Demo Role</span>
                <ChevronDown size={12} />
              </button>

              {showDemoMenu && (
                <div 
                  className="terminal-card" 
                  style={{ 
                    position: 'absolute', top: '120%', right: 0, width: '230px', 
                    padding: '0.5rem', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '0.35rem',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', padding: '0.2rem 0.4rem', textTransform: 'uppercase' }}>
                    SWITCH DEMO USER:
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={() => { switchDemoUser('admin'); setShowDemoMenu(false); }}
                  >
                    <ShieldCheck size={14} style={{ color: 'var(--color-amber)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Campus Admin</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>admin@campus.edu</div>
                    </div>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={() => { switchDemoUser('alex'); setShowDemoMenu(false); }}
                  >
                    <User size={14} style={{ color: 'var(--color-info)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Alex Chen (Student)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>Lost Backpack reporter</div>
                    </div>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', width: '100%' }}
                    onClick={() => { switchDemoUser('sarah'); setShowDemoMenu(false); }}
                  >
                    <User size={14} style={{ color: 'var(--color-success)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Sarah Jenkins (Student)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>Found Backpack reporter</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notifications Bell */}
          {isAuthenticated && (
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                style={{ padding: '0.45rem', position: 'relative', borderRadius: 'var(--radius-sm)' }}
                aria-label="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: 'var(--color-amber)',
                      color: 'var(--color-obsidian)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div
                  className="terminal-card"
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '320px',
                    maxHeight: '380px',
                    overflowY: 'auto',
                    padding: '0.85rem',
                    zIndex: 200,
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}>
                    <span className="font-mono text-xs font-semibold uppercase text-ivory">Event Telemetry</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--color-amber)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                      >
                        Clear Unread
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--color-outline)', fontSize: '0.8rem' }}>
                      No notifications recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            padding: '0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: n.is_read ? 'transparent' : 'rgba(242, 184, 75, 0.06)',
                            border: '1px solid',
                            borderColor: n.is_read ? 'var(--color-border-subtle)' : 'rgba(242, 184, 75, 0.25)',
                            fontSize: '0.8rem'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.15rem' }}>
                            {n.title}
                          </div>
                          <div style={{ color: 'var(--color-muted)', fontSize: '0.75rem', lineHeight: 1.35 }}>
                            {n.message}
                          </div>
                          <div style={{ marginTop: '0.35rem', fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Account / Auth */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }} ref={userRef}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.65rem' }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-amber)',
                    color: 'var(--color-obsidian)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700
                  }}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.full_name?.split(' ')[0]}
                </span>
                <ChevronDown size={12} />
              </button>

              {showUserMenu && (
                <div
                  className="terminal-card"
                  style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '210px',
                    padding: '0.65rem',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}
                >
                  <div style={{ padding: '0.3rem 0.4rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.2rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.full_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>{user.email}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span className={`badge ${user.role === 'admin' ? 'badge-match' : 'badge-found'}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => { setActivePage('dashboard'); setShowUserMenu(false); }}
                  >
                    <LayoutDashboard size={14} /> Dashboard
                  </button>

                  {isAdmin && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'flex-start', color: 'var(--color-amber)' }}
                      onClick={() => { setActivePage('admin'); setShowUserMenu(false); }}
                    >
                      <ShieldCheck size={14} /> Admin Dispatch
                    </button>
                  )}

                  <button
                    className="btn btn-danger btn-sm"
                    style={{ justifyContent: 'flex-start', marginTop: '0.25rem' }}
                    onClick={() => { logout(); setShowUserMenu(false); }}
                  >
                    <LogOut size={14} /> Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-beacon btn-sm" onClick={onOpenAuthModal}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
