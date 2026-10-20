import React, { useState, useEffect } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Party, BusinessProfile } from '../types.js';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party | null;
  profile: BusinessProfile | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  party,
  profile,
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen && party && profile) {
      const balance = Math.abs(party.currentBalance);
      const isReceivable = party.currentBalance > 0;
      const text = isReceivable
        ? `Dear ${party.name},\n\nThis is a gentle reminder from *${profile.tradeName || profile.name}* regarding your outstanding balance of *PKR ${balance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}*.\n\nYou can pay by bank transfer:\nBank: ${profile.bankName}\nA/C: ${profile.accountNumber}\nBank / branch code: ${profile.ifsc}\n\nThank you for your prompt payment!\nBest Regards,\n${profile.tradeName || profile.name}`
        : `Dear ${party.name},\n\nGreetings from *${profile.tradeName || profile.name}*. Your current account balance is *PKR ${balance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}*.\n\nThank you for being our valued partner!`;

      setMessage(text);
    }
  }, [isOpen, party, profile]);

  if (!isOpen || !party) return null;

  const handleSend = () => {
    const cleanPhone = party.phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.startsWith('0092') ? cleanPhone.slice(2) : /^03\d{9}$/.test(cleanPhone) ? `92${cleanPhone.slice(1)}` : /^3\d{9}$/.test(cleanPhone) ? `92${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 550 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageCircle size={20} color="#25D366" />
            <h3>WhatsApp Payment Reminder</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
            <div>
              <div style={{ fontWeight: 700 }}>{party.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone: {party.phone}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending Balance</div>
              <div style={{ fontWeight: 800, color: party.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                PKR {Math.abs(party.currentBalance).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Message Preview (Editable)</label>
            <textarea
              rows={8}
              className="form-textarea"
              style={{ fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.4 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" style={{ background: '#25D366', color: '#fff' }} onClick={handleSend}>
            <Send size={16} />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
