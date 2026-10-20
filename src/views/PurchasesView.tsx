import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Eye,
  Trash2,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types.js';

interface PurchasesViewProps {
  transactions: Transaction[];
  onOpenPurchaseModal: (type: TransactionType) => void;
  onViewTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  transactions,
  onOpenPurchaseModal,
  onViewTransaction,
  onDeleteTransaction,
}) => {
  const [subTab, setSubTab] = useState<'purchase' | 'payment_out' | 'purchase_return'>('purchase');
  const [search, setSearch] = useState('');

  const filteredTxns = transactions.filter((t) => {
    const matchesTab = t.type === subTab;
    const matchesSearch =
      t.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.partyName.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <ShoppingBag size={24} color="var(--primary)" />
            <span>Purchases & Vendor Inbound</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Vendor purchase bills, input tax credit (ITC) records, debit notes, and supplier payments
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => onOpenPurchaseModal('purchase')}>
          <Plus size={16} />
          <span>+ Add Purchase Bill</span>
        </button>
      </div>

      {/* Tabs and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${subTab === 'purchase' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('purchase')}
          >
            Purchase Bills
          </button>
          <button
            className={`btn btn-sm ${subTab === 'payment_out' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('payment_out')}
          >
            Payment Out
          </button>
          <button
            className={`btn btn-sm ${subTab === 'purchase_return' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('purchase_return')}
          >
            Purchase Return (Debit Note)
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search bill # or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill #</th>
                <th>Supplier / Vendor</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Total (₹)</th>
                <th style={{ textAlign: 'right' }}>Paid (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No {subTab.replace('_', ' ')} transactions found.
                  </td>
                </tr>
              ) : (
                filteredTxns.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.date}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {txn.invoiceNumber}
                    </td>
                    <td style={{ fontWeight: 600 }}>{txn.partyName}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{txn.paymentMode}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{txn.total.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                      ₹{txn.paidAmount.toLocaleString()}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: txn.balanceDue > 0 ? 'var(--danger)' : 'var(--text-secondary)',
                      }}
                    >
                      ₹{txn.balanceDue.toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${txn.status}`}>{txn.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn-icon"
                          title="View Purchase Bill"
                          onClick={() => onViewTransaction(txn)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete Bill"
                          onClick={() => {
                            if (confirm(`Delete ${txn.invoiceNumber}? Stock will be deducted accordingly.`)) {
                              onDeleteTransaction(txn.id);
                            }
                          }}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
