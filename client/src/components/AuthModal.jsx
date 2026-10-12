import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, Shield, X, ShieldCheck } from 'lucide-react';

export function AuthModal({ isOpen, onClose }) {
  const { login, register, isDemoEnabled, switchDemoUser } = useAuth();
  const { showToast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register({
          email,
          password,
          full_name: fullName,
          student_id: studentId,
          department,
          role: 'student'
        });
        showToast('Account registered! Welcome to 404 FOUND.', 'success');
      } else {
        await login(email, password);
        showToast('Authenticated successfully.', 'success');
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    try {
      await switchDemoUser(role);
      showToast(`Authenticated as demo ${role}`, 'success');
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div className="brand-icon-box" style={{ margin: '0 auto 0.65rem auto', width: '38px', height: '38px' }}>
            <span className="font-mono text-sm font-bold text-amber">404</span>
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-ivory)' }}>
            {isRegister ? 'Join 404 FOUND' : 'Access Campus Ledger'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            {isRegister
              ? 'Connect your university identity to report or recover items'
              : 'Sign in to monitor active matches and telemetry claims'}
          </p>
        </div>

        {/* Demo Fast Login Pills (Development / Demo Mode Only) */}
        {isDemoEnabled && (
          <div style={{ backgroundColor: 'var(--color-surface-lowest)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.65rem', marginBottom: '1.15rem' }}>
            <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-amber)', marginBottom: '0.4rem', textAlign: 'center', textTransform: 'uppercase' }}>
              ONE-CLICK VERIFIED DEMO NODES:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('admin')}
                style={{ fontSize: '11px', borderColor: 'rgba(242, 184, 75, 0.35)' }}
              >
                <ShieldCheck size={12} style={{ color: 'var(--color-amber)' }} />
                <span>Campus Admin</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleDemoLogin('alex')}
                style={{ fontSize: '11px', borderColor: 'rgba(125, 183, 255, 0.35)' }}
              >
                <User size={12} style={{ color: 'var(--color-info)' }} />
                <span>Alex (Student)</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-sm)', padding: '0.6rem 0.8rem', marginBottom: '0.85rem', color: 'var(--color-error)', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Jordan Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student / Staff ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. STU-49120"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department / Major</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">University Email</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="e.g. you@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-beacon" style={{ width: '100%', marginTop: '0.4rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : (isRegister ? 'Register Identity' : 'Authenticate')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.15rem', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
          {isRegister ? (
            <span>
              Already verified?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-amber)', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to the campus network?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: 'var(--color-amber)', fontWeight: 600, cursor: 'pointer' }}
              >
                Register
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
