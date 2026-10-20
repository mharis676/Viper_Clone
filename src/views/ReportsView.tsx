import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  TrendingUp,
  Percent,
  CheckCircle,
  Package,
} from 'lucide-react';
import { ProfitAndLossReport, GstReport, Item, Transaction } from '../types.js';

interface ReportsViewProps {
  pnlReport: ProfitAndLossReport | null;
  gstReport: GstReport | null;
  items: Item[];
  transactions: Transaction[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  pnlReport,
  gstReport,
  items,
  transactions,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'gst' | 'stock'>('pnl');

  const exportStockSummaryCSV = () => {
    const headers = 'Item Name,Code,Barcode,Category,Stock Qty,Unit,Cost Price,Sales Price,Cost Valuation,Retail Valuation\n';
    const rows = items
      .map(
        (i) =>
          `"${i.name}","${i.code}","${i.barcode}","${i.category}",${i.currentStock},"${i.unit}",${i.purchasePrice},${i.salesPrice},${i.currentStock * i.purchasePrice},${i.currentStock * i.salesPrice}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vyapar_Stock_Summary_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPnlCSV = () => {
    if (!pnlReport) return;
    const content = `Metric,Amount (INR)\nTotal Sales Revenue,${pnlReport.salesRevenue}\nCost of Goods Sold (Purchases),${pnlReport.purchasesCost}\nGross Profit,${pnlReport.grossProfit}\nTotal Operating Expenses,${pnlReport.totalExpenses}\nNet Profit,${pnlReport.netProfit}\n`;
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vyapar_Profit_Loss_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalStockCostValuation = items.reduce((sum, i) => sum + i.currentStock * i.purchasePrice, 0);
  const totalStockRetailValuation = items.reduce((sum, i) => sum + i.currentStock * i.salesPrice, 0);

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <FileBarChart size={24} color="var(--primary)" />
            <span>Financial & Tax Reports</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Tax-compliant GST summary, real-time Profit & Loss statement, and stock valuation audits
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={activeReportTab === 'stock' ? exportStockSummaryCSV : exportPnlCSV}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`btn btn-sm ${activeReportTab === 'pnl' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('pnl')}
        >
          Profit & Loss Statement
        </button>
        <button
          className={`btn btn-sm ${activeReportTab === 'gst' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('gst')}
        >
          GST Tax Report (GSTR-1 / 2)
        </button>
        <button
          className={`btn btn-sm ${activeReportTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveReportTab('stock')}
        >
          Stock Valuation Summary
        </button>
      </div>

      {/* 1. Profit & Loss View */}
      {activeReportTab === 'pnl' && pnlReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--card-accent': '#2E7D32' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Gross Profit</span>
                <div className="kpi-icon-wrap" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#2E7D32' }}>
                ₹{pnlReport.grossProfit.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Sales Revenue (₹{pnlReport.salesRevenue.toLocaleString()}) - Purchases (₹{pnlReport.purchasesCost.toLocaleString()})
              </div>
            </div>

            <div className="kpi-card" style={{ '--card-accent': '#C62828' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Net Business Profit</span>
                <div className="kpi-icon-wrap">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div
                className="kpi-value"
                style={{ color: pnlReport.netProfit >= 0 ? '#2E7D32' : '#C62828' }}
              >
                ₹{pnlReport.netProfit.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Gross Profit - Operating Expenses (₹{pnlReport.totalExpenses.toLocaleString()})
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Comprehensive Income & Expenditure Breakdown</div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <tbody>
                  <tr style={{ background: 'var(--bg-main)', fontWeight: 700 }}>
                    <td colSpan={2}>1. REVENUE FROM SALES</td>
                    <td style={{ textAlign: 'right' }}>₹{pnlReport.salesRevenue.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: 30 }}>Gross Product Sales</td>
                    <td>Invoiced Revenue</td>
                    <td style={{ textAlign: 'right' }}>₹{pnlReport.salesRevenue.toLocaleString()}</td>
                  </tr>

                  <tr style={{ background: 'var(--bg-main)', fontWeight: 700 }}>
                    <td colSpan={2}>2. COST OF INVENTORY PURCHASES (COGS)</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                      -₹{pnlReport.purchasesCost.toLocaleString()}
                    </td>
                  </tr>

                  <tr style={{ fontWeight: 800, fontSize: '1rem', borderTop: '2px solid var(--border-color)' }}>
                    <td colSpan={2}>GROSS PROFIT (1 - 2)</td>
                    <td style={{ textAlign: 'right', color: 'var(--success)' }}>
                      ₹{pnlReport.grossProfit.toLocaleString()}
                    </td>
                  </tr>

                  <tr style={{ background: 'var(--bg-main)', fontWeight: 700 }}>
                    <td colSpan={2}>3. OPERATING EXPENDITURES</td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)' }}>
                      -₹{pnlReport.totalExpenses.toLocaleString()}
                    </td>
                  </tr>
                  {pnlReport.expenseBreakdown.map((exp) => (
                    <tr key={exp.id}>
                      <td style={{ paddingLeft: 30 }}>{exp.categoryName}</td>
                      <td>{exp.notes || exp.paidTo || 'Operational'}</td>
                      <td style={{ textAlign: 'right' }}>₹{exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}

                  <tr style={{ fontWeight: 900, fontSize: '1.2rem', borderTop: '2px solid var(--border-color)', background: 'rgba(46, 125, 50, 0.08)' }}>
                    <td colSpan={2}>FINAL NET PROFIT</td>
                    <td style={{ textAlign: 'right', color: pnlReport.netProfit >= 0 ? '#2E7D32' : '#C62828' }}>
                      ₹{pnlReport.netProfit.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. GST Tax Report */}
      {activeReportTab === 'gst' && gstReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--card-accent': '#1976D2' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Output GST Liability (Sales)</span>
                <div className="kpi-icon-wrap" style={{ background: '#E3F2FD', color: '#1976D2' }}>
                  <Percent size={18} />
                </div>
              </div>
              <div className="kpi-value">₹{gstReport.totalOutputGst.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Taxable Sales: ₹{gstReport.totalTaxableSale.toLocaleString()}
              </div>
            </div>

            <div className="kpi-card" style={{ '--card-accent': '#00897B' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Input Tax Credit (ITC - Purchases)</span>
                <div className="kpi-icon-wrap" style={{ background: '#E0F2F1', color: '#00897B' }}>
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#00897B' }}>
                ₹{gstReport.totalInputGst.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Taxable Purchases: ₹{gstReport.totalTaxablePurchase.toLocaleString()}
              </div>
            </div>

            <div className="kpi-card" style={{ '--card-accent': '#C62828' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Net GST Payable to Government</span>
                <div className="kpi-icon-wrap">
                  <Percent size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#C62828' }}>
                ₹{gstReport.netGstPayable.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Output GST - Eligible Input Tax Credit
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stock Summary View */}
      {activeReportTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="kpi-grid">
            <div className="kpi-card" style={{ '--card-accent': '#F57C00' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Total Cost Valuation</span>
                <div className="kpi-icon-wrap" style={{ background: '#FFF3E0', color: '#F57C00' }}>
                  <Package size={18} />
                </div>
              </div>
              <div className="kpi-value">₹{totalStockCostValuation.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>At purchase prices</div>
            </div>

            <div className="kpi-card" style={{ '--card-accent': '#2E7D32' } as React.CSSProperties}>
              <div className="kpi-header">
                <span>Total Retail Valuation</span>
                <div className="kpi-icon-wrap" style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: '#2E7D32' }}>
                ₹{totalStockRetailValuation.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>At sales selling prices</div>
            </div>
          </div>

          <div className="card">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Cost Price</th>
                    <th style={{ textAlign: 'right' }}>Selling Price</th>
                    <th style={{ textAlign: 'right' }}>Cost Valuation</th>
                    <th style={{ textAlign: 'right' }}>Retail Valuation</th>
                    <th style={{ textAlign: 'right' }}>Projected Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const costVal = i.currentStock * i.purchasePrice;
                    const retailVal = i.currentStock * i.salesPrice;
                    const margin = retailVal - costVal;

                    return (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i.code}</div>
                        </td>
                        <td>{i.category}</td>
                        <td style={{ fontWeight: 700 }}>
                          {i.currentStock} {i.unit}
                        </td>
                        <td style={{ textAlign: 'right' }}>₹{i.purchasePrice.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>₹{i.salesPrice.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{costVal.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{retailVal.toLocaleString()}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          +₹{margin.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
