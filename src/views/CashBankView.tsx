import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  Plus,
  ArrowRightLeft,
  Building,
} from 'lucide-react';
import { BankAccount } from '../types.js';

interface CashBankViewProps {
  accounts: BankAccount[];
  onAddAccount: (acc: Omit<BankAccount, 'id'>) => Promise<void>;
  onTransferFunds: (fromId: string, toId: string, amount: number, notes?: string) => Promise<void>;
}

export const CashBankView: React.FC<CashBankViewProps> = ({
  accounts,
  onAddAccount,
  onTransferFunds,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Add Account state
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'cash' | 'bank'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');

  const cashAccounts = accounts.filter((a) => a.type === 'cash');
  const bankAccounts = accounts.filter((a) => a.type === 'bank');
  const totalCash = cashAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalBank = bankAccounts.reduce((sum, a) => sum + a.balance, 0);

  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) {
      alert('Please enter account name');
      return;
    }

    try {
      await onAddAccount({
        name: accName,
        type: accType,
        bankName,
        accountNumber,
        ifsc,
        balance: openingBalance,
        isDefault: false,
      });
      setIsAddModalOpen(false);
      setAccName('');
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setOpeningBalance(0);
    } catch (err: any) {
      alert(`Error creating account: ${err.message}`);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fromAccountId === toAccountId) {
      alert('Source and destination accounts must be different');
      return;
    }
    if (transferAmount <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }

    try {
      await onTransferFunds(fromAccountId, toAccountId, transferAmount, transferNotes);
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferNotes('');
    } catch (err: any) {
      alert(`Transfer failed: ${err.message}`);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Landmark size={24} color="var(--primary)" />
            <span>Cash & Bank Management</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Multi-bank accounts, cash registers, cheque clearances, and inter-account Contra transfers
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setIsTransferModalOpen(true)}>
            <ArrowRightLeft size={16} />
            <span>Contra Transfer</span>
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            <span>+ Add Bank Account</span>
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-accent': '#00897B' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Total Cash in Hand</span>
            <div className="kpi-icon-wrap" style={{ background: '#E0F2F1', color: '#00897B' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {totalCash.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Physical cash register balance
          </div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#1976D2' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Total Bank Balance</span>
            <div className="kpi-icon-wrap" style={{ background: '#E3F2FD', color: '#1976D2' }}>
              <Landmark size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {totalBank.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {bankAccounts.length} verified bank accounts
          </div>
        </div>
      </div>

      {/* Accounts List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">All Accounts (Cash Registers & Banks)</div>
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Bank & A/C Number</th>
                <th>IFSC Code</th>
                <th>Default Status</th>
                <th style={{ textAlign: 'right' }}>Current Balance (PKR)</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="kpi-icon-wrap"
                        style={{
                          background: acc.type === 'cash' ? 'var(--secondary-light)' : 'var(--primary-light)',
                          color: acc.type === 'cash' ? 'var(--secondary)' : 'var(--primary)',
                        }}
                      >
                        {acc.type === 'cash' ? <Wallet size={16} /> : <Landmark size={16} />}
                      </div>
                      <div style={{ fontWeight: 600 }}>{acc.name}</div>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{acc.type}</td>
                  <td>
                    {acc.type === 'bank' ? (
                      <div>
                        <div style={{ fontWeight: 500 }}>{acc.bankName || 'Bank'}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {acc.accountNumber || '-'}
                        </div>
                      </div>
                    ) : (
                      'Cash Register'
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    {acc.ifsc || '-'}
                  </td>
                  <td>
                    {acc.isDefault ? (
                      <span className="badge badge-paid">Default</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Secondary</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    PKR {acc.balance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contra Transfer Modal */}
      {isTransferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <form onSubmit={handleTransferSubmit}>
              <div className="modal-header">
                <h3>Contra Funds Transfer</h3>
                <button type="button" className="btn-icon" onClick={() => setIsTransferModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Transfer From (Debit Source) *</label>
                  <select
                    className="form-select"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Balance: PKR {a.balance.toLocaleString('en-PK', { maximumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer To (Credit Destination) *</label>
                  <select
                    className="form-select"
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Balance: PKR {a.balance.toLocaleString('en-PK', { maximumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Amount (PKR) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    className="form-input"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Transfer Notes / Cheque Ref</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Daily cash till deposit"
                    value={transferNotes}
                    onChange={(e) => setTransferNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <form onSubmit={handleAddAccountSubmit}>
              <div className="modal-header">
                <h3>Add New Bank Account</h3>
                <button type="button" className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Account Display Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. HDFC Current Account"
                    value={accName}
                    onChange={(e) => setAccName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. HDFC Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="50200012345678"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="HDFC0001234"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opening Balance (PKR)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
