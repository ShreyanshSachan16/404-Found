import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, Check, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function ItemQRCodeModal({ item, onClose }) {
  const { showToast } = useToast();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${item.id}/qrcode`)
      .then(res => res.json())
      .then(data => {
        setQrData(data);
      })
      .catch(err => {
        console.error('Failed to load QR code:', err);
      })
      .finally(() => setLoading(false));
  }, [item.id]);

  const copyUrl = () => {
    if (qrData?.recoveryUrl) {
      navigator.clipboard.writeText(qrData.recoveryUrl);
      setCopied(true);
      showToast('Handshake link copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', backgroundColor: 'var(--color-amber-glow)', padding: '0.65rem', borderRadius: '50%', color: 'var(--color-amber)', marginBottom: '0.65rem' }}>
          <QrCode size={26} />
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-ivory)', marginBottom: '0.2rem' }}>
          Secure Handshake QR Code
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
          Print or scan this tag for identity verification and contactless intake at campus safety desks.
        </p>

        {loading ? (
          <div style={{ padding: '2rem', color: 'var(--color-muted)', fontSize: '0.85rem' }}>Generating secure vector tag...</div>
        ) : qrData?.qrDataUrl ? (
          <div style={{ backgroundColor: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-lg)', display: 'inline-block', boxShadow: 'var(--shadow-md)', marginBottom: '1.25rem' }}>
            <img
              src={qrData.qrDataUrl}
              alt="Item QR Code"
              style={{ width: '200px', height: '200px', margin: '0 auto' }}
            />
            <div style={{ marginTop: '0.4rem', color: '#0A0B0E', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              NODE ASSET #{item.id}
            </div>
            <div style={{ color: '#5E626E', fontSize: '0.725rem' }}>
              {item.title} &bull; {item.location}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--color-error)', padding: '1.5rem', fontSize: '0.85rem' }}>
            Unable to render QR Code
          </div>
        )}

        {/* Copy link bar */}
        <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            readOnly
            value={qrData?.recoveryUrl || `${window.location.origin}/#recovery/${item.id}`}
            className="form-input"
            style={{ fontSize: '0.75rem', padding: '0.45rem 0.65rem', fontFamily: 'var(--font-mono)' }}
          />
          <button className="btn btn-secondary btn-sm" onClick={copyUrl} title="Copy recovery link">
            {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            <span>Print Tag</span>
          </button>
          {qrData?.qrDataUrl && (
            <a
              href={qrData.qrDataUrl}
              download={`404found-item-${item.id}-qr.png`}
              className="btn btn-beacon btn-sm"
            >
              <Download size={14} />
              <span>Download PNG</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
