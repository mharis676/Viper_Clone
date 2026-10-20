import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Party, PartyType } from '../types.js';

interface PartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (party: Omit<Party, 'id' | 'createdAt' | 'currentBalance'>) => Promise<void>;
  initialParty?: Party | null;
  defaultType?: PartyType;
}

export const PartyModal: React.FC<PartyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialParty,
  defaultType = 'customer',
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PartyType>(defaultType);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialParty) {
        setName(initialParty.name);
        setType(initialParty.type);
        setPhone(initialParty.phone);
        setEmail(initialParty.email || '');
        setGstin(initialParty.gstin || '');
        setBillingAddress(initialParty.billingAddress);
        setOpeningBalance(initialParty.openingBalance);
        setCreditLimit(initialParty.creditLimit || 50000);
      } else {
        setName('');
        setType(defaultType);
        setPhone('');
        setEmail('');
        setGstin('');
        setBillingAddress('');
        setOpeningBalance(0);
        setCreditLimit(50000);
      }
    }
  }, [isOpen, initialParty, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please fill in Party Name and Phone Number');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        type,
        phone,
        email,
        gstin,
        billingAddress,
        openingBalance,
        creditLimit,
      });
      onClose();
    } catch (err: any) {
      alert(`Error saving party: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>{initialParty ? 'Edit Party' : 'Add New Party'}</h3>
            <button type="button" className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className={`btn ${type === 'customer' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('customer')}
              >
                Customer (Debtor)
              </button>
              <button
                type="button"
                className={`btn ${type === 'supplier' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setType('supplier')}
              >
                Supplier / Vendor (Creditor)
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Party Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Apex Traders"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  required
                  className="form-input"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email ID</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="party@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">GSTIN / Tax ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="29ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Billing Address</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Street address, City, Pincode"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Opening Balance (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Positive = Receivable, Negative = Payable"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Positive amount indicates you have to receive from party; negative indicates you have to pay.
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Check size={16} />
              <span>Save Party</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
