import React, { useState, useEffect, useRef } from 'react';
import { Send, Shield, Lock, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function AnonymousChatModal({ item, onClose }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/messages/item/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [item.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          message_text: text.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');

      setText('');
      fetchMessages();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', height: '580px', padding: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-amber-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-amber)' }}>
              <Shield size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ivory)' }}>Encrypted Platform Relay</h4>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                Target: {item.title}
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Relay Privacy Notice */}
        <div style={{ backgroundColor: 'var(--color-surface-lowest)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem', margin: '0.75rem 0', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-success)' }}>
          <Lock size={13} />
          <span>Identity protected. Phone numbers &amp; emails are masked across the campus relay.</span>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '2rem', fontSize: '0.8rem' }}>Connecting to relay stream...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '3rem 1rem', fontSize: '0.825rem' }}>
              <MessageSquare size={28} style={{ opacity: 0.35, margin: '0 auto 0.5rem auto' }} />
              <div>No messages recorded yet. Send a secure inquiry below.</div>
            </div>
          ) : (
            messages.map(msg => {
              const isMine = msg.is_mine;
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ fontSize: '10px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', marginBottom: '0.15rem', padding: '0 0.25rem' }}>
                    {msg.sender_label}
                  </div>
                  <div
                    style={{
                      padding: '0.65rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isMine ? 'var(--color-amber)' : 'var(--color-surface-lowest)',
                      color: isMine ? 'var(--color-obsidian)' : 'var(--color-ivory)',
                      border: isMine ? 'none' : '1px solid var(--color-border)',
                      fontSize: '0.825rem',
                      lineHeight: 1.4,
                      fontWeight: isMine ? 500 : 400,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {msg.message_text}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--color-outline)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem', padding: '0 0.25rem' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.45rem', paddingTop: '0.65rem', borderTop: '1px solid var(--color-border)' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Type your message securely..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn btn-beacon btn-sm" disabled={sending || !text.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
