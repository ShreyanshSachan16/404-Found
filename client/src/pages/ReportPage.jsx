import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DuplicateWarningModal } from '../components/DuplicateWarningModal';
import { 
  Upload, 
  MapPin, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  Layers
} from 'lucide-react';

export function ReportPage({ mode = 'lost', onReportSuccess, onViewItem, onRequireAuth }) {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [type, setType] = useState(mode);
  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [identifyingMarks, setIdentifyingMarks] = useState('');
  const [location, setLocation] = useState('');
  const [dateLostOrFound, setDateLostOrFound] = useState(new Date().toISOString().split('T')[0]);
  const [timeLostOrFound, setTimeLostOrFound] = useState('');
  const [currentStorageLocation, setCurrentStorageLocation] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Duplicate check modal state
  const [duplicateCandidates, setDuplicateCandidates] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [meta, setMeta] = useState({ categories: [], locations: [] });

  useEffect(() => {
    setType(mode);
  }, [mode]);

  useEffect(() => {
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => setMeta(data))
      .catch(err => console.error(err));
  }, []);

  const handleImageDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (e, bypassDuplicate = false) => {
    if (e) e.preventDefault();

    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }

    if (!title || !category || !description || !location || !dateLostOrFound) {
      setError('Please ensure title, category, description, location, and date are filled.');
      return;
    }

    setSubmitting(true);
    setError('');

    // Pre-check duplicates if not bypassed
    if (!bypassDuplicate) {
      try {
        const dupRes = await fetch('/api/items/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            category,
            title,
            description,
            brand,
            color,
            location
          })
        });
        const dupData = await dupRes.json();
        if (dupData.hasDuplicates && dupData.candidates?.length > 0) {
          setDuplicateCandidates(dupData.candidates);
          setShowDuplicateModal(true);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error('Duplicate pre-check failed, continuing:', err);
      }
    }

    // Submit report to server
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('type', type);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('brand', brand);
      formData.append('color', color);
      formData.append('identifying_marks', identifyingMarks);
      formData.append('location', location);
      formData.append('date_lost_or_found', dateLostOrFound);
      formData.append('time_lost_or_found', timeLostOrFound);
      if (type === 'found' && currentStorageLocation) {
        formData.append('current_storage_location', currentStorageLocation);
      }
      if (bypassDuplicate) {
        formData.append('bypass_duplicate_warning', 'true');
      }
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.potentialDuplicates) {
          setDuplicateCandidates(data.potentialDuplicates);
          setShowDuplicateModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to submit report');
      }

      showToast(`Report registered in ledger! AI matching correlation initiated.`, 'success');
      onReportSuccess(data.item);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = [
    'ITEM IDENTITY',
    'DESCRIPTIVE VECTORS',
    'GEOGRAPHIC TELEMETRY',
    'IMAGING & EVIDENCE',
    'FINAL VERIFICATION'
  ];

  return (
    <div style={{ paddingTop: '1.25rem' }}>
      <div className="content-wrapper" style={{ maxWidth: '720px' }}>
        
        {/* Duplicate Warning Modal */}
        {showDuplicateModal && (
          <DuplicateWarningModal
            candidates={duplicateCandidates}
            onViewReport={(itemId) => {
              setShowDuplicateModal(false);
              onViewItem(itemId);
            }}
            onContinueAnyway={() => {
              setShowDuplicateModal(false);
              handleFormSubmit(null, true);
            }}
            onCancel={() => setShowDuplicateModal(false)}
          />
        )}

        {/* Stepper Progress Indicator Bar (From Stitch) */}
        <section className="terminal-card" style={{ padding: '0.85rem 1.15rem', marginBottom: '1.5rem', backgroundColor: 'var(--color-surface-lowest)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span className="font-mono text-xs font-semibold text-amber">Step 0{currentStep}</span>
              <span className="font-mono text-xs text-outline">/ 05</span>
            </div>
            <span className="font-mono text-xs font-semibold text-ivory tracking-wider">
              {stepTitles[currentStep - 1]}
            </span>
          </div>

          {/* Stepper Track */}
          <div className="stepper-pipeline">
            {[1, 2, 3, 4, 5].map(step => (
              <div 
                key={step} 
                className={`stepper-pip ${currentStep === step ? 'active' : (currentStep > step ? 'completed' : '')}`}
              />
            ))}
          </div>

          {/* Breadcrumb Nodes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
            <span style={{ color: currentStep >= 1 ? 'var(--color-ivory)' : 'var(--color-outline)' }}>01 ITEM</span>
            <span style={{ color: currentStep >= 2 ? 'var(--color-ivory)' : 'var(--color-outline)' }}>02 DETAILS</span>
            <span style={{ color: currentStep >= 3 ? 'var(--color-ivory)' : 'var(--color-outline)' }}>03 LOCATION</span>
            <span style={{ color: currentStep >= 4 ? 'var(--color-ivory)' : 'var(--color-outline)' }}>04 IMAGE</span>
            <span style={{ color: currentStep >= 5 ? 'var(--color-ivory)' : 'var(--color-outline)' }}>05 REVIEW</span>
          </div>
        </section>

        {/* Toggle Lost vs Found */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.25rem', backgroundColor: 'var(--color-surface-lowest)', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className={`btn btn-sm ${type === 'lost' ? 'btn-beacon' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 1.15rem', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => setType('lost')}
            >
              Report Lost Belonging
            </button>
            <button
              type="button"
              className={`btn btn-sm ${type === 'found' ? 'btn-beacon' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.35rem 1.15rem', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
              onClick={() => setType('found')}
            >
              Report Found Belonging
            </button>
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem', color: 'var(--color-error)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="terminal-card" style={{ padding: '1.5rem', marginBottom: '4rem' }}>
          <form onSubmit={(e) => handleFormSubmit(e, false)}>
            
            {/* Step 1: Item Identity */}
            {currentStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Step 01 &bull; Identification</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>What is the item?</h2>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Item Title / Name <span style={{ color: 'var(--color-amber)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder={type === 'lost' ? 'e.g. Black Nike Utility Backpack' : 'e.g. Matte Black Nike Rucksack'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Category <span style={{ color: 'var(--color-amber)' }}>*</span>
                  </label>
                  <select
                    required
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select Category...</option>
                    {meta.categories?.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-beacon btn-sm"
                    disabled={!title || !category}
                    onClick={() => setCurrentStep(2)}
                  >
                    <span>Next: Details</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Descriptive Vectors */}
            {currentStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Step 02 &bull; Characteristics</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Describe attributes and markings</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Brand / Manufacturer</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Nike, Apple, Casio"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Color Silhouette</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Matte Black, Space Gray"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Detailed Narrative <span style={{ color: 'var(--color-amber)' }}>*</span>
                  </label>
                  <textarea
                    required
                    className="form-textarea"
                    placeholder="Provide details for semantic NLP matching (size, model, condition, noticeable features)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unique Identifying Marks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Carabiner on strap, scratched initials 'MW' on bottom cover"
                    value={identifyingMarks}
                    onChange={(e) => setIdentifyingMarks(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentStep(1)}>
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-beacon btn-sm"
                    disabled={!description}
                    onClick={() => setCurrentStep(3)}
                  >
                    <span>Next: Location</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Geographic Telemetry */}
            {currentStep === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Step 03 &bull; Telemetry</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Where and when was it lost or found?</h2>
                </div>

                {/* Campus Location Selection Chips */}
                <div className="form-group">
                  <label className="form-label">
                    Campus Sector / Building <span style={{ color: 'var(--color-amber)' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.45rem', marginBottom: '0.65rem' }}>
                    {meta.locations?.slice(0, 6).map(loc => (
                      <button
                        key={loc}
                        type="button"
                        style={{
                          backgroundColor: location === loc ? 'var(--color-amber-glow)' : 'var(--color-surface-lowest)',
                          color: location === loc ? 'var(--color-amber)' : 'var(--color-ivory)',
                          border: '1px solid',
                          borderColor: location === loc ? 'var(--color-amber)' : 'var(--color-border)',
                          padding: '0.55rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono)',
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                        onClick={() => setLocation(loc)}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>

                  <select
                    required
                    className="form-select"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option value="">Or select from full list...</option>
                    {meta.locations?.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Incident Date <span style={{ color: 'var(--color-amber)' }}>*</span></label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={dateLostOrFound}
                      onChange={(e) => setDateLostOrFound(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Incident Window / Time</label>
                    <input
                      type="time"
                      className="form-input"
                      value={timeLostOrFound}
                      onChange={(e) => setTimeLostOrFound(e.target.value)}
                    />
                  </div>
                </div>

                {type === 'found' && (
                  <div className="form-group">
                    <label className="form-label">Current Physical Storage / Custody</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Turned into Library Desk Bin #4, Campus Security Station"
                      value={currentStorageLocation}
                      onChange={(e) => setCurrentStorageLocation(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentStep(2)}>
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-beacon btn-sm"
                    disabled={!location || !dateLostOrFound}
                    onClick={() => setCurrentStep(4)}
                  >
                    <span>Next: Imaging</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Imaging & Visual Recognition */}
            {currentStep === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Step 04 &bull; Visual Recognition</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Upload asset photograph</h2>
                </div>

                {/* Drag and Drop Zone (From Stitch) */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleImageDrop}
                  style={{
                    border: '2px dashed',
                    borderColor: isDragging ? 'var(--color-amber)' : 'var(--color-border)',
                    backgroundColor: isDragging ? 'var(--color-amber-glow)' : 'var(--color-surface-lowest)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => document.getElementById('report-photo-input').click()}
                >
                  <input
                    type="file"
                    id="report-photo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageFileChange}
                  />

                  {imagePreview ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} 
                      />
                      <span style={{ fontSize: '11px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>✓ Visual Feature Vector Ready</span>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--color-surface-container)', border: '1px solid var(--color-border)', margin: '0 auto 0.75rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)' }}>
                        <Upload size={20} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-ivory)', marginBottom: '0.2rem' }}>
                        Drop an image here or browse
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        Supports JPG, PNG, WEBP. AI extracts color distributions and visual silhouettes.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentStep(3)}>
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-beacon btn-sm"
                    onClick={() => setCurrentStep(5)}
                  >
                    <span>Next: Review &amp; Register</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Review & Register */}
            {currentStep === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', textTransform: 'uppercase' }}>Step 05 &bull; Telemetry Review</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Confirm ledger entry</h2>
                </div>

                {/* Summary Matrix */}
                <div style={{ backgroundColor: 'var(--color-surface-lowest)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                    <span className={`badge ${type === 'lost' ? 'badge-lost' : 'badge-found'}`}>{type}</span>
                    <span className="font-mono text-xs text-outline">{dateLostOrFound}</span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.35rem' }}>{title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>{description}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '11px', fontFamily: 'var(--font-mono)', borderTop: '1px solid var(--color-border)', paddingTop: '0.65rem' }}>
                    <div><span style={{ color: 'var(--color-outline)' }}>ZONE:</span> {location}</div>
                    <div><span style={{ color: 'var(--color-outline)' }}>CATEGORY:</span> {category}</div>
                    <div><span style={{ color: 'var(--color-outline)' }}>COLOR:</span> {color || 'N/A'}</div>
                    <div><span style={{ color: 'var(--color-outline)' }}>BRAND:</span> {brand || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCurrentStep(4)}>
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-beacon btn-lg" 
                    disabled={submitting}
                    style={{ minWidth: '180px' }}
                  >
                    <span>{submitting ? 'Executing Neural Engine...' : 'Commit to Campus Ledger'}</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

      </div>
    </div>
  );
}
