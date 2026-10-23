import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, User, Shield, X, ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export function AuthModal({ isOpen, onClose }) {
  const { login, register, isDemoEnabled, switchDemoUser } = useAuth();
  const { showToast } = useToast();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  if (!isOpen) return null;

  const handleToggleMode = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    setConfirmError('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConfirmError('');

    if (isRegister) {
      if (!password || password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!confirmPassword) {
        setConfirmError('Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setConfirmError('Passwords do not match. Please ensure both passwords match exactly.');
        return;
      }
    }

    setLoading(true);

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
            <label className="form-label" htmlFor="auth-password">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="form-input"
                style={{ paddingRight: '2.5rem' }}
                placeholder="At least 8 characters"
                aria-describedby={isRegister ? 'password-requirements' : undefined}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (confirmPassword) {
                    if (e.target.value !== confirmPassword) {
                      setConfirmError('Passwords do not match.');
                    } else {
                      setConfirmError('');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {isRegister && (
              <p id="password-requirements" style={{ fontSize: '0.72rem', color: password.length >= 8 ? 'var(--color-success)' : 'var(--color-muted)', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {password.length >= 8 && <CheckCircle2 size={12} />}
                Password requirement: Minimum 8 characters.
              </p>
            )}
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-confirm-password">Confirm Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="auth-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  style={{
                    paddingRight: '2.5rem',
                    borderColor: (confirmError || (confirmPassword && password !== confirmPassword))
                      ? 'var(--color-error)'
                      : (confirmPassword && password === confirmPassword ? 'var(--color-success)' : undefined)
                  }}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    const val = e.target.value;
                    setConfirmPassword(val);
                    if (val && password && val !== password) {
                      setConfirmError('Passwords do not match.');
                    } else {
                      setConfirmError('');
                    }
                  }}
                  aria-invalid={!!confirmError || (!!confirmPassword && password !== confirmPassword)}
                  aria-describedby={confirmError ? 'confirm-password-error' : (confirmPassword && password === confirmPassword ? 'confirm-password-success' : undefined)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: '0.65rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px'
                  }}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmError && (
                <p id="confirm-password-error" role="alert" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  {confirmError}
                </p>
              )}
              {!confirmError && confirmPassword && password === confirmPassword && (
                <p id="confirm-password-success" style={{ color: 'var(--color-success)', fontSize: '0.72rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Passwords match
                </p>
              )}
            </div>
          )}

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
                onClick={() => handleToggleMode(false)}
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
                onClick={() => handleToggleMode(true)}
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
