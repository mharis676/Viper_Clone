import React, { useState, useEffect } from 'react';
import { Search, X, Users, Package, FileText } from 'lucide-react';
import { Party, Item, Transaction } from '../types.js';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: Party[];
  items: Item[];
  transactions: Transaction[];
  onSelectParty: (party: Party) => void;
  onSelectItem: (item: Item) => void;
  onSelectTransaction: (txn: Transaction) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  parties,
  items,
  transactions,
  onSelectParty,
  onSelectItem,
  onSelectTransaction,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const filteredParties = q
    ? parties.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q))
    : [];

  const filteredItems = q
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          i.barcode.includes(q)
      )
    : [];

  const filteredTxns = q
    ? transactions.filter(
        (t) =>
          t.invoiceNumber.toLowerCase().includes(q) ||
          t.partyName.toLowerCase().includes(q)
      )
    : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Search size={20} color="var(--primary)" />
          <input
            autoFocus
            type="text"
            className="form-input"
            style={{ border: 'none', boxShadow: 'none', fontSize: '1.05rem', padding: 0 }}
            placeholder="Type party name, item barcode, invoice number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!q && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Start typing to search across all Parties, Stock Items, and Invoices.
            </div>
          )}

          {q && filteredParties.length === 0 && filteredItems.length === 0 && filteredTxns.length === 0 && (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              No results found for "{query}".
            </div>
          )}

          {filteredParties.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Parties ({filteredParties.length})
              </div>
              {filteredParties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectParty(p);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={16} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.phone} • {p.type}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: p.currentBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    ₹{Math.abs(p.currentBalance).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredItems.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Items ({filteredItems.length})
              </div>
              {filteredItems.map((i) => (
                <div
                  key={i.id}
                  onClick={() => {
                    onSelectItem(i);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={16} color="var(--secondary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{i.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Barcode: {i.barcode} • Stock: {i.currentStock} {i.unit}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>₹{i.salesPrice.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}

          {filteredTxns.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Invoices ({filteredTxns.length})
              </div>
              {filteredTxns.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    onSelectTransaction(t);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'var(--bg-main)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText size={16} color="var(--primary)" />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.invoiceNumber}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.partyName} • {t.date}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>₹{t.total.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
