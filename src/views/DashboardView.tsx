import React from 'react';
import {
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  ShoppingBag,
  Package,
  AlertTriangle,
  Plus,
  FileText,
  Eye,
} from 'lucide-react';
import { DashboardStats, Transaction } from '../types.js';

interface DashboardViewProps {
  stats: DashboardStats | null;
  onOpenSale: () => void;
  onOpenPurchase: () => void;
  onOpenInvoices: () => void;
  onOpenItemModal: () => void;
  onViewTransaction: (txn: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onOpenSale,
  onOpenPurchase,
  onOpenInvoices,
  onOpenItemModal,
  onViewTransaction,
}) => {
  if (!stats) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard metrics...</div>;
  }

  return (
    <div className="page-body dashboard-page">
      <div className="page-header dashboard-heading">
        <div>
          <span className="workspace-eyebrow">YOUR WORKSPACE <span>PKR</span></span>
          <h2 className="page-title">Business Overview</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            A clear view of your money, stock and recent activity.
          </p>
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-secondary" onClick={onOpenInvoices}>
            <FileText size={16} />
            <span>Invoices</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenSale}>
            <Plus size={16} />
            <span>New Invoice</span>
          </button>
          <button className="btn btn-secondary" onClick={onOpenPurchase}>
            <Plus size={16} />
            <span>Purchase</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert Banner if items exist */}
      {stats.lowStockItemsCount > 0 && (
        <div
          style={{
            background: 'var(--warning-light)',
            border: '1px solid var(--warning)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'var(--warning)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
            <AlertTriangle size={20} />
            <span>
              Low Stock Alert: <strong>{stats.lowStockItemsCount}</strong> items are at or below their
              minimum reorder threshold.
            </span>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={onOpenItemModal}>
            Reorder Stock
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-accent': '#2E7D32' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>To collect</span>
            <div className="kpi-icon-wrap" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#2E7D32' }}>
            PKR {stats.toCollect.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From customers</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#D32F2F' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>To pay</span>
            <div className="kpi-icon-wrap" style={{ background: '#FFEBEE', color: '#D32F2F' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#D32F2F' }}>
            PKR {stats.toPay.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To vendors / suppliers</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#00897B' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Cash in Hand</span>
            <div className="kpi-icon-wrap" style={{ background: '#E0F2F1', color: '#00897B' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {stats.cashInHand.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cash payments received</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#1976D2' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Bank Accounts</span>
            <div className="kpi-icon-wrap" style={{ background: '#E3F2FD', color: '#1976D2' }}>
              <Landmark size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {stats.bankBalance.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total bank funds</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#C62828' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Total Sales (Gross)</span>
            <div className="kpi-icon-wrap">
              <ShoppingCart size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {stats.totalSales.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Online sales invoices</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#7B1FA2' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Total Purchases</span>
            <div className="kpi-icon-wrap" style={{ background: '#F3E5F5', color: '#7B1FA2' }}>
              <ShoppingBag size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {stats.totalPurchases.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Inbound inventory purchases</div>
        </div>

        <div className="kpi-card" style={{ '--card-accent': '#F57C00' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Stock Inventory Value</span>
            <div className="kpi-icon-wrap" style={{ background: '#FFF3E0', color: '#F57C00' }}>
              <Package size={18} />
            </div>
          </div>
          <div className="kpi-value">PKR {stats.stockValue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>At cost price valuation</div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent activity</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {stats.recentTransactions.length ? `Latest ${stats.recentTransactions.length} records` : "No transactions yet"}
          </div>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div className="dashboard-empty">
            <span className="empty-symbol"><ShoppingCart size={28} /></span>
            <h3>Your first sale starts here</h3>
            <p>Create an invoice to see your recent activity. Your totals will update automatically.</p>
            <button className="btn btn-primary" onClick={onOpenSale}><Plus size={16} /> Create an invoice</button>
          </div>
        ) : <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Invoice #</th>
                <th>Party Name</th>
                <th>Type</th>
                <th>Payment Mode</th>
                <th>Amount (PKR)</th>
                <th>Balance Due (PKR)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentTransactions.map((txn) => (
                <tr key={txn.id}>
                  <td>{txn.date}</td>
                  <td style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {txn.invoiceNumber}
                  </td>
                  <td>{txn.partyName}</td>
                  <td style={{ textTransform: 'capitalize' }}>{txn.type.replace('_', ' ')}</td>
                  <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    {txn.paymentMode}
                  </td>
                  <td style={{ fontWeight: 700 }}>PKR {txn.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</td>
                  <td style={{ color: txn.balanceDue > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                    PKR {txn.balanceDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`badge badge-${txn.status}`}>{txn.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-icon"
                      onClick={() => onViewTransaction(txn)}
                      title="View / Print Invoice"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  );
};
