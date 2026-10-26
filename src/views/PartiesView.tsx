import { printDocument, exportPdf } from '../export.js';
import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  FileText,
  Edit2,
  Trash2,
  Phone,
  Building,
} from 'lucide-react';
import { Party, PartyType, LedgerEntry } from '../types.js';

interface PartiesViewProps {
  parties: Party[];
  onOpenAddParty: (type?: PartyType) => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (id: string) => void;
  onOpenWhatsApp: (party: Party) => void;
  onViewDocument: (id: string) => void;
  onViewLedger: (party: Party) => Promise<LedgerEntry[]>;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties,
  onOpenAddParty,
  onEditParty,
  onDeleteParty,
  onOpenWhatsApp,
  onViewLedger,
  onViewDocument,
}) => {
  const statementRef = useRef<HTMLDivElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const handlePdf = async (share = false) => {
    if (!statementRef.current || !selectedParty) return;
    setExporting(true);
    try { await exportPdf(statementRef.current, `${selectedParty.name}-statement`, share); }
    catch (e) { if ((e as Error).name !== 'AbortError') alert((e as Error).message); }
    finally { setExporting(false); }
  };
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [search, setSearch] = useState('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const filteredParties = parties.filter((p) => {
    const matchesType = filterType === 'all' || p.type === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleOpenPartyLedger = async (party: Party) => {
    setSelectedParty(party);
    setReviewing(false);
    setLedgerEntries([]);
    setLoadingLedger(true);
    try {
      const entries = await onViewLedger(party);
      setLedgerEntries(entries);
    } catch (e) {
      console.error('Failed to load party ledger:', e);
    } finally {
      setLoadingLedger(false);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Users size={24} color="var(--primary)" />
            <span>Parties (Customers & Suppliers)</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Manage client ledgers, credit limits, GST numbers, and payment collection reminders
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onOpenAddParty('supplier')}>
            <Plus size={16} />
            <span>+ Add Supplier</span>
          </button>
          <button className="btn btn-primary" onClick={() => onOpenAddParty('customer')}>
            <Plus size={16} />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'customer', 'supplier'] as const).map((tab) => (
            <button
              key={tab}
              className={`btn btn-sm ${filterType === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType(tab)}
              style={{ textTransform: 'capitalize' }}
            >
              {tab === 'all' ? 'All Parties' : `${tab}s`}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search party by name, phone, tax ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Parties Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Tax ID</th>
                <th>Credit Limit</th>
                <th>Balance (PKR)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.map((party) => {
                const isReceivable = party.currentBalance > 0;
                const isPayable = party.currentBalance < 0;

                return (
                  <tr key={party.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{party.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {party.billingAddress || 'No address specified'}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${party.type === 'customer' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {party.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span>{party.phone}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      {party.gstin || '-'}
                    </td>
                    <td>PKR {(party.creditLimit || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</td>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          color: isReceivable ? 'var(--success)' : isPayable ? 'var(--danger)' : 'var(--text-primary)',
                        }}
                      >
                        PKR {Math.abs(party.currentBalance).toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.75rem', marginLeft: 4, fontWeight: 500 }}>
                          {isReceivable ? '(To Receive)' : isPayable ? '(To Pay)' : '(Settled)'}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn-icon"
                          title="Send WhatsApp Payment Reminder"
                          onClick={() => onOpenWhatsApp(party)}
                          style={{ color: '#25D366' }}
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="View Ledger Statement"
                          onClick={() => handleOpenPartyLedger(party)}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit Party Details"
                          onClick={() => onEditParty(party)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete Party"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${party.name}?`)) {
                              onDeleteParty(party.id);
                            }
                          }}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Party Statement / Ledger Drawer Modal */}
      {selectedParty && (
        <div className="modal-overlay" onClick={() => setSelectedParty(null)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedParty.name} — Statement of Accounts</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Phone: {selectedParty.phone} | Tax ID: {selectedParty.gstin || 'Unregistered'}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedParty(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body print-area" ref={statementRef} data-pdf-active>
              <h3>{selectedParty.name} � Statement of Accounts</h3>
              <p>{selectedParty.billingAddress} | Phone: {selectedParty.phone}</p>
              <p>Current balance: PKR {selectedParty.currentBalance.toLocaleString('en-PK')}</p>
              {loadingLedger ? (
                <div style={{ padding: 30, textAlign: 'center' }}>Loading ledger statement...</div>
              ) : ledgerEntries.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No transaction ledger entries found for this party.
                </div>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voucher / Ref #</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Debit (PKR)</th>
                        <th style={{ textAlign: 'right' }}>Credit (PKR)</th>
                        <th style={{ textAlign: 'right' }}>Running Balance (PKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.date}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {entry.invoiceNumber || '-'}
                            {!reviewing && entry.transactionId && <button className="btn btn-secondary btn-sm no-print" onClick={() => onViewDocument(entry.transactionId)}>View Invoice / Bill</button>}
                          </td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: entry.type === 'debit' ? 'var(--danger)' : 'inherit' }}>
                            {entry.type === 'debit' ? `PKR ${entry.amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: entry.type === 'credit' ? 'var(--success)' : 'inherit' }}>
                            {entry.type === 'credit' ? `PKR ${entry.amount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            PKR {entry.runningBalance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer no-print" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" disabled={loadingLedger} onClick={() => setReviewing(!reviewing)}>{reviewing ? 'Back to Ledger' : 'Review Statement'}</button>
              <button className="btn btn-primary" disabled={loadingLedger || exporting} onClick={() => handlePdf()}>Download PDF</button>
              <button className="btn btn-secondary" disabled={loadingLedger || exporting} onClick={() => handlePdf(true)}>Share PDF</button>
              <button className="btn btn-secondary" onClick={() => setSelectedParty(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  printDocument().catch(e => alert(e.message));
                }}
              >
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
