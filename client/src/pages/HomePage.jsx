import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  ArrowRight,
  MapPin,
  Clock,
  CheckCircle2,
  Layers,
  Zap,
  ShieldCheck,
  Eye,
  Activity,
  Compass,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

function extractClientNLP(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      object: 'Any Item',
      color: 'All Colors',
      location: 'All Zones',
      timing: 'Active Ledger'
    };
  }

  // Clean punctuation while preserving alphanumeric words and spaces
  const clean = query.toLowerCase().replace(/[^\w\s-]/g, ' ');

  // 1. Color extraction with word boundary checks
  const colors = [
    'black', 'blue', 'navy', 'red', 'green', 'white', 'silver',
    'grey', 'gray', 'charcoal', 'yellow', 'gold', 'purple',
    'pink', 'orange', 'brown', 'beige', 'tan', 'cream'
  ];
  let foundColor = null;
  for (const c of colors) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(clean)) {
      foundColor = c;
      break;
    }
  }

  // 2. Compound objects and synonyms (order: most specific phrases first)
  const compoundObjects = [
    { pattern: /\b(hydro\s*flask|water\s*bottle|flask|tumbler|thermos)\b/i, name: 'Water Bottle' },
    { pattern: /\b(macbook\s*air|macbook\s*pro|macbook|laptop|notebook\s*computer)\b/i, name: 'Laptop' },
    { pattern: /\b(airpods\s*pro|airpods|earbuds|headphones|earphones)\b/i, name: 'Earbuds / AirPods' },
    { pattern: /\b(student\s*id|campus\s*card|id\s*card|badge)\b/i, name: 'Student ID' },
    { pattern: /\b(iphone|smartphone|cellphone|mobile\s*phone|phone)\b/i, name: 'Phone' },
    { pattern: /\b(backpack|rucksack|bookbag|knapsack|duffel|tote\s*bag|bag)\b/i, name: 'Backpack' },
    { pattern: /\b(calculator|scientific\s*calculator)\b/i, name: 'Calculator' },
    { pattern: /\b(keys|keychain|car\s*key|fob|key\s*fob)\b/i, name: 'Keys' },
    { pattern: /\b(wallet|purse|billfold|clutch)\b/i, name: 'Wallet' },
    { pattern: /\b(jacket|hoodie|coat|sweater|sweatshirt)\b/i, name: 'Clothing' },
    { pattern: /\b(charger|charging\s*cable|power\s*adapter)\b/i, name: 'Charger' },
    { pattern: /\b(glasses|sunglasses|spectacles|frames)\b/i, name: 'Eyewear' },
    { pattern: /\b(umbrella)\b/i, name: 'Umbrella' },
    { pattern: /\b(smartwatch|watch|apple\s*watch)\b/i, name: 'Watch' }
  ];

  let foundObjectName = null;
  for (const entry of compoundObjects) {
    if (entry.pattern.test(clean)) {
      foundObjectName = entry.name;
      break;
    }
  }

  // 3. Location extraction
  const locationPatterns = [
    { pattern: /\b(main\s*library|library|study\s*pods?)\b/i, name: 'Main Library' },
    { pattern: /\b(student\s*union|cafeteria|canteen|dining)\b/i, name: 'Student Union / Cafeteria' },
    { pattern: /\b(gym|athletics|fitness|sports\s*center)\b/i, name: 'Athletics Center / Gym' },
    { pattern: /\b(science|engineering|lab|complex)\b/i, name: 'Science & Engineering Complex' },
    { pattern: /\b(lecture\s*hall|central\s*lecture|auditorium)\b/i, name: 'Central Lecture Hall' },
    { pattern: /\b(bookstore|campus\s*store)\b/i, name: 'Campus Bookstore' },
    { pattern: /\b(dorm|dormitories|quad|residence)\b/i, name: 'Campus Dormitories' },
    { pattern: /\b(parking|garage)\b/i, name: 'Parking Structure' }
  ];

  let foundLocationName = null;
  for (const entry of locationPatterns) {
    if (entry.pattern.test(clean)) {
      foundLocationName = entry.name;
      break;
    }
  }

  // 4. Fallback for object: only pick residual query tokens that were NOT part of color or location
  if (!foundObjectName) {
    const stopwords = new Set([
      'near', 'in', 'at', 'the', 'a', 'an', 'on', 'with', 'and', 'or',
      'for', 'to', 'from', 'my', 'i', 'lost', 'found', 'is', 'it', 'floor'
    ]);
    const words = clean.trim().split(/\s+/).filter(w => {
      const lower = w.toLowerCase();
      if (stopwords.has(lower)) return false;
      if (foundColor && lower === foundColor) return false;
      if (foundLocationName && foundLocationName.toLowerCase().includes(lower)) return false;
      return lower.length > 2;
    });

    if (words.length > 0) {
      foundObjectName = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    } else {
      foundObjectName = 'Any Item';
    }
  }

  return {
    object: foundObjectName,
    color: foundColor ? (foundColor.charAt(0).toUpperCase() + foundColor.slice(1)) : 'All Colors',
    location: foundLocationName || 'Campus Wide',
    timing: 'Live Index'
  };
}

export function HomePage({ onNavigate, onSearchQuery }) {
  const [nlQuery, setNlQuery] = useState('black backpack near library');
  const [recentItems, setRecentItems] = useState([]);
  const [activeChip, setActiveChip] = useState('Black backpack');
  const [scanningActive, setScanningActive] = useState(false);
  const [stats, setStats] = useState({
    returnedItems: 0,
    activeItems: 0,
    resolutionRate: 0,
    totalItems: 0
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/items?limit=6').then(res => res.json()),
      fetch('/api/items/stats').then(res => res.json()).catch(() => null)
    ])
      .then(([itemsData, statsData]) => {
        setRecentItems(itemsData.items || []);
        if (statsData) {
          setStats(statsData);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const nlpParams = extractClientNLP(nlQuery);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (nlQuery.trim()) {
      onSearchQuery(nlQuery.trim());
      onNavigate('browse');
    }
  };

  const handleChipClick = (val) => {
    setActiveChip(val);
    setNlQuery(val);
    setScanningActive(true);
    setTimeout(() => setScanningActive(false), 600);
  };

  return (
    <div style={{ paddingTop: '1.25rem' }}>
      <div className="content-wrapper" style={{ maxWidth: '980px' }}>

        {/* 1. Live Campus Recovery Activity Ribbon */}
        <section style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: 'var(--color-surface-low)', padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <span className="pulse-dot-amber" style={{ width: '8px', height: '8px' }}></span>
              <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--color-ivory)', fontWeight: 600 }}>{stats.returnedItems || 0} items returned</span> &bull; {stats.resolutionRate || 0}% resolution rate &bull; {stats.activeItems || recentItems.length} active in ledger
              </p>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '10px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              <CheckCircle2 size={13} />
              <span>LIVE PROTOCOL</span>
            </span>
          </div>
        </section>

        {/* 2. Hero Section: Editorial Typography & Dual Actions */}
        <section style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Eyebrow Pill */}
          <div
            style={{
              alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-surface-container)',
              border: '1px solid var(--color-border)'
            }}
          >
            <span className="pulse-dot-amber" style={{ width: '6px', height: '6px' }}></span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              AI-Powered Campus Recovery Network
            </span>
          </div>

          {/* Heading */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.1 }}>
              Lost something?<br />
              <span style={{ color: 'var(--color-amber)' }}>We'll find it.</span>
            </h1>
            <p style={{ fontSize: '0.975rem', color: 'var(--color-muted)', maxWidth: '680px', lineHeight: 1.55 }}>
              Report what you lost or found. <strong>404 FOUND</strong> uses intelligent multi-vector telemetry across campus locations, timestamps, and neural visual recognition to reconnect belongings with rightful owners.
            </p>
          </div>

          {/* Dual Primary & Secondary Action Set */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.35rem' }}>
            <button
              className="btn btn-beacon btn-lg"
              style={{ flex: '1 1 240px', justifyContent: 'space-between' }}
              onClick={() => onNavigate('report-lost')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={18} />
                <span>Report Lost Item</span>
              </span>
              <ArrowRight size={18} />
            </button>

            <button
              className="btn btn-surface btn-lg"
              style={{ flex: '1 1 240px', justifyContent: 'space-between' }}
              onClick={() => onNavigate('browse')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} style={{ color: 'var(--color-amber)' }} />
                <span>Browse Found Items</span>
              </span>
              <span className="badge badge-match" style={{ fontSize: '9px', padding: '0.15rem 0.4rem' }}>LIVE CATALOG</span>
            </button>
          </div>
        </section>

        {/* 3. Neural Query Engine Deck (Natural Language Comprehension) */}
        <section style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Cpu size={16} style={{ color: 'var(--color-amber)' }} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Neural Query Engine</h2>
            </div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>
              Telemetry v2.4 Active
            </span>
          </div>

          {/* Input Bar */}
          <div className="terminal-card" style={{ padding: '0.85rem', backgroundColor: 'var(--color-surface-container)' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Search size={18} style={{ color: 'var(--color-amber)', flexShrink: 0 }} />
              <input
                type="text"
                className="form-input"
                style={{ border: 'none', background: 'transparent', padding: '0.35rem 0', fontSize: '0.95rem' }}
                placeholder="Ask in natural language: e.g. blue Hydro Flask at gym..."
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
              />
              <button type="submit" className="btn btn-beacon btn-sm" style={{ flexShrink: 0 }}>
                Query
              </button>
            </form>

            {/* Micro Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflowX: 'auto', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', marginTop: '0.65rem' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>Try:</span>
              {['Black backpack', 'AirPods Pro', 'Hydro Flask', 'Student ID', 'MacBook Air'].map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  style={{
                    backgroundColor: activeChip === chip ? 'var(--color-amber-glow)' : 'var(--color-surface-lowest)',
                    color: activeChip === chip ? 'var(--color-amber)' : 'var(--color-muted)',
                    border: '1px solid',
                    borderColor: activeChip === chip ? 'rgba(242, 184, 75, 0.4)' : 'var(--color-border)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Extracted Search Filter Card */}
          <div style={{ backgroundColor: 'var(--color-surface-lowest)', borderRadius: 'var(--radius-md)', padding: '0.85rem', border: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Zap size={12} style={{ color: 'var(--color-amber)' }} />
                Extracted Search Filters
              </span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>Deterministic Query Parser</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <div style={{ backgroundColor: 'var(--color-surface-low)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>OBJECT</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{nlpParams.object}</span>
              </div>
              <div style={{ backgroundColor: 'var(--color-surface-low)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>COLOR SPEC</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{nlpParams.color}</span>
              </div>
              <div style={{ backgroundColor: 'var(--color-surface-low)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>LOCATION PIN</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{nlpParams.location}</span>
              </div>
              <div style={{ backgroundColor: 'var(--color-surface-low)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase', display: 'block' }}>INDEX STATUS</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-ivory)' }}>{nlpParams.timing}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Interactive Match Verification Showcase */}
        <section style={{ marginBottom: '3.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Active Correlation Pipeline</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Live multi-signal match verification</p>
            </div>
            <span className="badge badge-match" style={{ padding: '0.2rem 0.6rem' }}>
              <span className="pulse-dot-amber" style={{ width: '5px', height: '5px' }}></span>
              STREAMING
            </span>
          </div>

          {/* Match Node Canvas */}
          <div className="terminal-card" style={{ padding: '1rem', backgroundColor: 'var(--color-surface-low)', position: 'relative', overflow: 'hidden' }}>
            {/* Top Card: LOST */}
            <div style={{ backgroundColor: 'var(--color-surface-container)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: '#181B21', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=150&q=80" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <span className="badge badge-lost">LOST</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>#REP-8902</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ivory)' }}>Black Nike Backpack</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Main Library, Floor 3 &bull; Yesterday</div>
                </div>
              </div>
              <Compass size={20} style={{ color: 'var(--color-outline)' }} />
            </div>

            {/* Connecting AI Match Conduit */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.85rem 0' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--color-amber), transparent)' }}></div>
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.85rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--color-surface-high)', border: '1px solid rgba(242, 184, 75, 0.4)' }}>
                <span className="pulse-dot-amber" style={{ width: '6px', height: '6px' }}></span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-amber)' }}>
                  AI MATCH 94% CONFIDENCE
                </span>
              </div>
            </div>

            {/* Bottom Card: FOUND */}
            <div style={{ backgroundColor: 'var(--color-surface-container)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-sm)', backgroundColor: '#181B21', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=150&q=80" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                    <span className="badge badge-found">FOUND</span>
                    <span style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)' }}>#FND-4318</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ivory)' }}>Matte Black Nike Rucksack</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Library Study Pod 2 &bull; Yesterday</div>
                </div>
              </div>
              <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
            </div>

            {/* Granular Multi-Vector Metrics Drawer */}
            <div style={{ marginTop: '0.75rem', backgroundColor: 'var(--color-surface-lowest)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div className="vector-progress-row">
                <div className="vector-progress-header">
                  <span>Neural Visual Similarity</span>
                  <span className="font-mono" style={{ color: 'var(--color-amber)', fontWeight: 600 }}>96%</span>
                </div>
                <div className="vector-track">
                  <div className="vector-fill fill-amber" style={{ width: '96%' }} />
                </div>
              </div>

              <div className="vector-progress-row">
                <div className="vector-progress-header">
                  <span>Geo-Spatial Coherence (40m radius)</span>
                  <span className="font-mono" style={{ color: 'var(--color-success)', fontWeight: 600 }}>100%</span>
                </div>
                <div className="vector-track">
                  <div className="vector-fill fill-jade" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="vector-progress-row" style={{ marginBottom: 0 }}>
                <div className="vector-progress-header">
                  <span>Timestamp Vector Alignment</span>
                  <span className="font-mono" style={{ color: 'var(--color-info)', fontWeight: 600 }}>91%</span>
                </div>
                <div className="vector-track">
                  <div className="vector-fill fill-cobalt" style={{ width: '91%' }} />
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', marginTop: '0.65rem', justifyContent: 'center' }}
              onClick={() => onNavigate('browse')}
            >
              <span>Inspect Verification Vectors in Catalog</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* 5. Protocol Flow (4 Steps from Stitch) */}
        <section style={{ marginBottom: '3.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              PROTOCOL FLOW
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-ivory)' }}>
              Campus Recovery in 4 Steps
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
            <div className="terminal-card" style={{ padding: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                01
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem' }}>Report Incident</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Snap a photo or detail last known campus zone, colorway, and personal marks. Pre-checked for duplicates instantly.
              </p>
            </div>

            <div className="terminal-card" style={{ padding: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                02
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem' }}>Multi-Vector Match</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                AI constantly cross-references visual textures, timestamps, and nearby campus drop boxes for immediate pairing.
              </p>
            </div>

            <div className="terminal-card" style={{ padding: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                03
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem' }}>Secure Verification</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Answer hidden marks and unadvertised internal contents. Verification remains private until reviewed by administrators.
              </p>
            </div>

            <div className="terminal-card" style={{ padding: '1rem' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                04
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem' }}>Safe Return</h3>
              <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', lineHeight: 1.45 }}>
                Item is handed over via contactless Handshake QR scan at campus security or mediated platform relay.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Recent Campus Reports Feed */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-outline)', textTransform: 'uppercase' }}>Active Ledger</span>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-ivory)' }}>Recent Campus Intake</h2>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('browse')}>
              <span>View Full Ledger</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="items-grid">
            {recentItems.map(item => (
              <article
                key={item.id}
                className="item-card terminal-card-interactive"
                onClick={() => onNavigate('item-detail', item.id)}
              >
                {item.primary_image ? (
                  <img src={item.primary_image} alt={item.title} className="item-card-image" />
                ) : (
                  <div className="item-card-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-outline)', backgroundColor: 'var(--color-surface-container)' }}>
                    No Photo Attached
                  </div>
                )}
                <div className="item-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className={`badge ${item.type === 'lost' ? 'badge-lost' : 'badge-found'}`}>
                      {item.type}
                    </span>
                    <span className="badge badge-match">
                      {item.status}
                    </span>
                  </div>

                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.775rem', color: 'var(--color-muted)', marginBottom: '0.85rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.45 }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-outline)', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-mono)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={11} style={{ color: 'var(--color-amber)' }} />
                      <span>{item.location}</span>
                    </div>
                    <span>{item.date_lost_or_found}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
