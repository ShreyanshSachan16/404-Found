import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';

import { HomePage } from './pages/HomePage';
import { BrowsePage } from './pages/BrowsePage';
import { ReportPage } from './pages/ReportPage';
import { ItemDetailsPage } from './pages/ItemDetailsPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();

  // Active page state: 'home' | 'browse' | 'report-lost' | 'report-found' | 'item-detail' | 'dashboard' | 'admin'
  const [activePage, setActivePage] = useState('home');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync hash routing on browser back/forward or reload
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('item-')) {
        const id = hash.replace('item-', '');
        setSelectedItemId(id);
        setActivePage('item-detail');
      } else if (hash.startsWith('recovery/')) {
        const id = hash.replace('recovery/', '').split('?')[0];
        setSelectedItemId(id);
        setActivePage('item-detail');
      } else if (['home', 'browse', 'report-lost', 'report-found', 'dashboard', 'admin'].includes(hash)) {
        setActivePage(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (page, itemId = null) => {
    if (page === 'item-detail' && itemId) {
      setSelectedItemId(itemId);
      window.location.hash = `item-${itemId}`;
    } else {
      window.location.hash = page;
    }
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activePage={activePage}
        setActivePage={(page) => navigateTo(page)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activePage === 'home' && (
          <HomePage
            onNavigate={(page) => navigateTo(page)}
            onSearchQuery={(q) => {
              setSearchQuery(q);
              navigateTo('browse');
            }}
          />
        )}

        {activePage === 'browse' && (
          <BrowsePage
            initialQuery={searchQuery}
            onSelectItem={(id) => navigateTo('item-detail', id)}
            onNavigateReport={(type) => navigateTo(type === 'found' ? 'report-found' : 'report-lost')}
          />
        )}

        {activePage === 'report-lost' && (
          <ReportPage
            mode="lost"
            onReportSuccess={(item) => navigateTo('item-detail', item.id)}
            onViewItem={(id) => navigateTo('item-detail', id)}
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'report-found' && (
          <ReportPage
            mode="found"
            onReportSuccess={(item) => navigateTo('item-detail', item.id)}
            onViewItem={(id) => navigateTo('item-detail', id)}
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'item-detail' && selectedItemId && (
          <ItemDetailsPage
            itemId={selectedItemId}
            onBack={() => navigateTo('browse')}
            onNavigateItem={(id) => navigateTo('item-detail', id)}
            onRequireAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'dashboard' && (
          <UserDashboardPage
            onNavigateItem={(id) => navigateTo('item-detail', id)}
            onNavigateReport={(type) => navigateTo(type === 'found' ? 'report-found' : 'report-lost')}
          />
        )}

        {activePage === 'admin' && (
          <AdminDashboardPage
            onNavigateItem={(id) => navigateTo('item-detail', id)}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* 404 FOUND Modern Footer */}
      <footer style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', padding: '2.5rem 0', marginTop: 'auto' }}>
        <div className="content-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-ivory)', letterSpacing: '-0.02em' }}>
                <span style={{ color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>404</span>
                <span style={{ color: 'var(--color-ivory)' }}>FOUND</span>
                <span className="beacon-pulse" style={{ width: '6px', height: '6px', marginLeft: '2px' }}></span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-amber)', backgroundColor: 'var(--color-amber-glow)', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius-sm)' }}>
                RECOVERY NETWORK
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)', margin: 0 }}>
              Not found? We'll find it. Campus recovery platform with multi-signal correlation matching.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            <span style={{ cursor: 'pointer', transition: 'color 0.15s ease' }} onClick={() => navigateTo('home')}>Home</span>
            <span style={{ cursor: 'pointer', transition: 'color 0.15s ease' }} onClick={() => navigateTo('browse')}>Browse Ledger</span>
            <span style={{ cursor: 'pointer', transition: 'color 0.15s ease' }} onClick={() => navigateTo('report-lost')}>Report Lost</span>
            <span style={{ cursor: 'pointer', transition: 'color 0.15s ease' }} onClick={() => navigateTo('report-found')}>Report Found</span>
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            &copy; {new Date().getFullYear()} 404 FOUND &bull; All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
