import React, { useState } from 'react';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function ClaimModal({ item, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [proofDescription, setProofDescription] = useState('');
  const [hiddenMarksAnswers, setHiddenMarksAnswers] = useState('');
  const [secretContents, setSecretContents] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofDescription.trim()) {
      setError('Please provide a general explanation of why this item belongs to you.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('item_id', item.id);
      formData.append('proof_description', proofDescription);
      formData.append('hidden_marks_answers', hiddenMarksAnswers);
      formData.append('secret_contents', secretContents);
      if (receiptFile) {
        formData.append('receipt_image', receiptFile);
      }

      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit claim');

      showToast('Ownership verification submitted to campus dispatch!', 'success');
      onSuccess(data.claim);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.15rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-amber-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
              Verify Ownership
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Item: <strong>{item.title}</strong>
            </p>
          </div>
        </div>

        {/* Cryptographic Privacy Assurance */}
        <div style={{ backgroundColor: 'var(--color-surface-lowest)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.95rem', marginBottom: '1.15rem', fontSize: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <Lock size={15} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ color: 'var(--color-muted)', lineHeight: 1.45 }}>
            <strong style={{ color: 'var(--color-ivory)' }}>Encrypted Chain of Custody:</strong> Verification responses are private and cross-referenced by campus administration before custody release.
          </div>
        </div>

        {error && (
          <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.85rem', marginBottom: '1rem', color: 'var(--color-error)', fontSize: '0.8rem', display: 'flex', gap: '0.45rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Question 1 */}
          <div className="form-group">
            <label className="form-label">
              1. General Ownership Statement <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <textarea
              className="form-textarea"
              placeholder="e.g. When did you lose this, how long have you owned it, and where were you walking on campus?"
              value={proofDescription}
              onChange={(e) => setProofDescription(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Question 2 */}
          <div className="form-group">
            <label className="form-label">
              2. Hidden Marks, Serial Numbers, or Inscriptions
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Scratched initials 'MW' on back, blue sticker on left corner, engraved serial"
              value={hiddenMarksAnswers}
              onChange={(e) => setHiddenMarksAnswers(e.target.value)}
            />
          </div>

          {/* Question 3 */}
          <div className="form-group">
            <label className="form-label">
              3. Secret Internal Contents / Pocket Inventory
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Middle pouch holds calculus notes, green water bottle, campus badge inside"
              value={secretContents}
              onChange={(e) => setSecretContents(e.target.value)}
            />
          </div>

          {/* Evidence Upload */}
          <div className="form-group">
            <label className="form-label">
              4. Evidence / Purchase Receipt (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              onChange={(e) => setReceiptFile(e.target.files[0])}
            />
            <div style={{ fontSize: '0.725rem', color: 'var(--color-outline)', marginTop: '0.25rem' }}>
              Upload purchase invoice, warranty barcode, or past photo showing you with the item.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-beacon btn-sm" disabled={submitting}>
              {submitting ? 'Encrypting & Submitting...' : 'Submit Verification Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
