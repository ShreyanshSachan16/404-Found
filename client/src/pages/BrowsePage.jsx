import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  X, 
  SlidersHorizontal, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';

export function BrowsePage({ initialQuery = '', onSelectItem, onNavigateReport }) {
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('newest');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nlpInsights, setNlpInsights] = useState(null);
  const [meta, setMeta] = useState({ categories: [], locations: [] });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => setMeta(data))
      .catch(err => console.error(err));
  }, []);

  const fetchItems = (pageNum = page) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (typeFilter) params.set('type', typeFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (locationFilter) params.set('location', locationFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (sortFilter) params.set('sort', sortFilter);
    params.set('page', pageNum);
    params.set('limit', 15);

    fetch(`/api/items?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setItems(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setNlpInsights(data.nlpInsights || null);
      })
      .catch(err => console.error('Failed to fetch items:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setPage(1);
    fetchItems(1);
  }, [typeFilter, categoryFilter, locationFilter, statusFilter, sortFilter]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchItems(newPage);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchItems(1);
  };

  const handleClearFilters = () => {
    setQuery('');
    setTypeFilter('');
    setCategoryFilter('');
    setLocationFilter('');
    setStatusFilter('');
    setSortFilter('newest');
    setNlpInsights(null);
  };

  return (
    <div style={{ paddingTop: '1.25rem' }}>
      <div className="content-wrapper" style={{ maxWidth: '980px' }}>
        
        {/* Header (From Stitch) */}
        <section style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-ivory)' }}>
                Find an item
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                {total} active campus recovery ledger records {totalPages > 1 ? `• Page ${page} of ${totalPages}` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)' }}>
              <span className="pulse-dot-amber" style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-success)', boxShadow: '0 0 8px var(--color-success)' }}></span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-success)', textTransform: 'uppercase', fontWeight: 600 }}>
                Live Sync
              </span>
            </div>
          </div>

          {/* Search Input Bar with Microphone/Clear Controls */}
          <div className="terminal-card" style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--color-surface-low)' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Search size={18} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
              <input 
                type="text"
                className="form-input"
                style={{ border: 'none', background: 'transparent', padding: '0.2rem 0', fontSize: '0.95rem' }}
                placeholder="Search or filter by building or keyword (e.g. blue Hydro Flask, Nike backpack)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button 
                  type="button" 
                  onClick={() => { setQuery(''); setNlpInsights(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={16} />
                </button>
              )}
              <button type="submit" className="btn btn-beacon btn-sm" style={{ flexShrink: 0 }}>
                Filter
              </button>
            </form>
          </div>

          {/* NLP Extracted Entity Chips */}
          {nlpInsights && (
            <div style={{ backgroundColor: 'var(--color-surface-lowest)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                <Zap size={12} />
                AI Parsed:
              </span>
              {nlpInsights.category && (
                <span className="badge badge-match" style={{ fontSize: '10px' }}>
                  Category: {nlpInsights.category}
                </span>
              )}
              {nlpInsights.object && (
                <span className="badge badge-match" style={{ fontSize: '10px' }}>
                  Object: {nlpInsights.object}
                </span>
              )}
              {nlpInsights.color && (
                <span className="badge badge-found" style={{ fontSize: '10px' }}>
                  Color: {nlpInsights.color}
                </span>
              )}
              {nlpInsights.location && (
                <span className="badge badge-lost" style={{ fontSize: '10px', color: 'var(--color-ivory)' }}>
                  Location: {nlpInsights.location}
                </span>
              )}
            </div>
          )}

          {/* Horizontal Category Filter Rail (From Stitch) */}
          <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
            <button
              type="button"
              className={`btn btn-sm ${!typeFilter && !categoryFilter ? 'btn-beacon' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.3rem 0.85rem', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => { setTypeFilter(''); setCategoryFilter(''); }}
            >
              All Items ({items.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'found' ? 'btn-beacon' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.3rem 0.85rem', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => setTypeFilter(typeFilter === 'found' ? '' : 'found')}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }}></span>
              Found Items
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === 'lost' ? 'btn-beacon' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.3rem 0.85rem', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => setTypeFilter(typeFilter === 'lost' ? '' : 'lost')}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-outline)', display: 'inline-block' }}></span>
              Lost Items
            </button>
            {meta.categories?.map(c => (
              <button
                key={c}
                type="button"
                className={`btn btn-sm ${categoryFilter === c ? 'btn-beacon' : 'btn-secondary'}`}
                style={{ borderRadius: 'var(--radius-full)', padding: '0.3rem 0.85rem', fontSize: '11px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}
                onClick={() => setCategoryFilter(categoryFilter === c ? '' : c)}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Sub-Header & Sort Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.35rem' }}>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              CAMPUS LEDGER FEED
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ width: 'auto', padding: '0.3rem 0.65rem', fontSize: '11px', fontFamily: 'var(--font-mono)', backgroundColor: 'var(--color-surface-container)', color: 'var(--color-amber)', border: '1px solid var(--color-border)' }}
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
              >
                <option value="newest">Sort: AI Match Confidence</option>
                <option value="date_event">Sort: Event Date</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>

              {(query || typeFilter || categoryFilter || locationFilter || statusFilter) && (
                <button className="btn btn-outline btn-sm" onClick={handleClearFilters} style={{ fontSize: '10px', padding: '0.25rem 0.5rem' }}>
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Feed List Items (From Stitch Feed Card Specs) */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--color-muted)' }}>
            <span className="pulse-dot-amber" style={{ width: '12px', height: '12px', margin: '0 auto 1rem auto' }}></span>
            <div className="font-mono text-xs text-outline">CALCULATING TELEMETRY CORRELATIONS...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="terminal-card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.4rem' }}>
              No Matching Records in Ledger
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.825rem', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
              Try loosening your search terms or exploring all campus zones.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '4rem' }}>
            {items.map(item => {
              const isHighMatch = item.status === 'POTENTIAL_MATCH' || item.relevanceScore > 0.6;
              return (
                <article
                  key={item.id}
                  className="terminal-card terminal-card-interactive"
                  style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}
                  onClick={() => onSelectItem(item.id)}
                >
                  {/* Subtle high match aura corner */}
                  {isHighMatch && (
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', background: 'radial-gradient(circle, rgba(242, 184, 75, 0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  )}

                  {/* Top Status Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                        {item.type}
                      </span>
                      {isHighMatch && (
                        <span className="badge badge-match">
                          <span className="pulse-dot-amber" style={{ width: '4px', height: '4px' }}></span>
                          {item.relevanceScore ? `${Math.round(item.relevanceScore * 100)}% RELEVANCE` : 'POTENTIAL MATCH'}
                        </span>
                      )}
                      <span className="badge badge-pending" style={{ fontSize: '9px' }}>
                        {item.status}
                      </span>
                    </div>

                    <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)' }}>
                      REF-{item.id.toString().padStart(4, '0')}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '84px', height: '84px', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: 'var(--color-surface-container)', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                      {item.primary_image ? (
                        <img src={item.primary_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)', fontSize: '10px' }}>
                          NO PHOTO
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.4rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <MapPin size={12} style={{ color: 'var(--color-amber)' }} />
                          <span className="truncate">{item.location}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{item.date_lost_or_found}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', lineClamp: 1, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Strip: Micro Tags & Action */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)' }}>
                      <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>VERIFICATION ACTIVE</span>
                      <span>&bull;</span>
                      <span>Category: {item.category}</span>
                    </div>

                    <button className="btn btn-beacon btn-sm" style={{ padding: '0.25rem 0.65rem', fontSize: '11px' }}>
                      Inspect Asset
                    </button>
                  </div>
                </article>
              );
            })}

            {/* Pagination Navigation */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem', padding: '1rem 0' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous Page
                </button>
                <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                  style={{ opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
