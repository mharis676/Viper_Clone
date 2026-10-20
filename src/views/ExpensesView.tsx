import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Tag,
  Calendar,
} from 'lucide-react';
import { Expense, ExpenseCategory, BankAccount, PaymentMode } from '../types.js';

interface ExpensesViewProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  accounts: BankAccount[];
  onAddExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  categories,
  accounts,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paidTo, setPaidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    const cat = categories.find((c) => c.id === categoryId);
    try {
      await onAddExpense({
        categoryId,
        categoryName: cat?.name || 'General Expense',
        amount,
        date,
        paymentMode,
        paidTo,
        notes,
        accountId: accountId || accounts[0]?.id || 'acc-1',
      });
      setIsAddModalOpen(false);
      setAmount(0);
      setPaidTo('');
      setNotes('');
    } catch (err: any) {
      alert(`Failed to add expense: ${err.message}`);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <DollarSign size={24} color="var(--primary)" />
            <span>Operating Expenses</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track rent, utility bills, logistics, employee wages, and petty cash expenditures
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          <span>+ Record Expense</span>
        </button>
      </div>

      {/* Summary KPI Card */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--card-accent': '#D32F2F' } as React.CSSProperties}>
          <div className="kpi-header">
            <span>Total Expenses Recorded</span>
            <div className="kpi-icon-wrap" style={{ background: '#FFEBEE', color: '#D32F2F' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value" style={{ color: '#D32F2F' }}>
            ₹{totalExpenseAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Across {expenses.length} expense entries
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Paid To / Vendor</th>
                <th>Payment Mode</th>
                <th>Notes / Remarks</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                    No expenses recorded yet. Click "+ Record Expense" to add.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <Tag size={14} color="var(--primary)" />
                        <span>{exp.categoryName}</span>
                      </div>
                    </td>
                    <td>{exp.paidTo || '-'}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{exp.paymentMode}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{exp.notes || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>
                      ₹{exp.amount.toLocaleString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        title="Delete Expense"
                        onClick={() => {
                          if (confirm('Delete this expense? The amount will be refunded to the account.')) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        style={{ color: 'var(--danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-header">
                <h3>Record Operating Expense</h3>
                <button type="button" className="btn-icon" onClick={() => setIsAddModalOpen(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select
                    className="form-select"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    className="form-input"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paid From Account</label>
                    <select
                      className="form-select"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (₹{a.balance.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Paid To / Recipient</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Electric Board, Landlord, Petrol Pump"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
