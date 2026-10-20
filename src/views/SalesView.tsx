import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  Trash2,
  CheckCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types.js';

interface SalesViewProps {
  transactions: Transaction[];
  onOpenSaleModal: (type: TransactionType) => void;
  onViewTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onConvertQuotation?: (quote: Transaction) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  transactions,
  onOpenSaleModal,
  onViewTransaction,
  onDeleteTransaction,
  onConvertQuotation,
}) => {
  const [subTab, setSubTab] = useState<'sale' | 'quotation' | 'payment_in' | 'sale_return'>('sale');
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
            <ShoppingCart size={24} color="var(--primary)" />
            <span>Sales & Outbound Transactions</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            GST Tax invoices, quotations, customer payment receipts, and credit notes
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onOpenSaleModal('quotation')}>
            <FileText size={16} />
            <span>+ New Quotation</span>
          </button>
          <button className="btn btn-primary" onClick={() => onOpenSaleModal('sale')}>
            <Plus size={16} />
            <span>+ New Sale Invoice</span>
          </button>
        </div>
      </div>

      <div className="action-row"><button className="btn btn-secondary" onClick={() => onOpenSaleModal('payment_in')}>+ Receive Payment</button><button className="btn btn-secondary" onClick={() => onOpenSaleModal('sale_return')}>+ Sales Return</button></div>
      {/* Tabs and Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${subTab === 'sale' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('sale')}
          >
            Sale Invoices
          </button>
          <button
            className={`btn btn-sm ${subTab === 'quotation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('quotation')}
          >
            Estimates / Quotations
          </button>
          <button
            className={`btn btn-sm ${subTab === 'payment_in' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('payment_in')}
          >
            Payment In
          </button>
          <button
            className={`btn btn-sm ${subTab === 'sale_return' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab('sale_return')}
          >
            Sales Return
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search invoice # or customer..."
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
                <th>Invoice / Ref #</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Total (PKR)</th>
                <th style={{ textAlign: 'right' }}>Received (PKR)</th>
                <th style={{ textAlign: 'right' }}>Balance Due (PKR)</th>
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
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>PKR {txn.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 600 }}>
                      PKR {txn.paidAmount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 700,
                        color: txn.balanceDue > 0 ? 'var(--danger)' : 'var(--text-secondary)',
                      }}
                    >
                      PKR {txn.balanceDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge badge-${txn.status}`}>{txn.status}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        {txn.type === 'quotation' && onConvertQuotation && (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Convert to Sale Invoice"
                            onClick={() => onConvertQuotation(txn)}
                          >
                            <CheckCircle size={14} color="var(--success)" />
                            <span>Convert</span>
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          title="View / Print Tax Invoice"
                          onClick={() => onViewTransaction(txn)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete Transaction"
                          onClick={() => {
                            if (confirm(`Delete ${txn.invoiceNumber}? Stock will be adjusted accordingly.`)) {
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
