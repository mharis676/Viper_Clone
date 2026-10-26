import React, { useState } from "react";
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle,
  FileText,
  Trash2,
  Clock,
  AlertTriangle,
  History,
  MessageCircle,
  Calendar,
} from "lucide-react";
import { Transaction, TransactionType } from "../types.js";
import { DocumentActions } from "../components/DocumentActions.js";
import { InvoicePaymentHistoryModal } from "../components/InvoicePaymentHistoryModal.js";

interface SalesViewProps {
  transactions: Transaction[];
  onOpenSaleModal: (type: TransactionType) => void;
  onViewTransaction: (txn: Transaction) => void;
  onDownloadPdfTransaction?: (txn: Transaction, share?: boolean) => Promise<void>;
  onPrintTransaction?: (txn: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  onConvertQuotation?: (quote: Transaction) => void;
  onOpenWhatsAppReminder?: (txn: Transaction) => void;
  onOpenRecordPayment?: (txn: Transaction) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  transactions,
  onOpenSaleModal,
  onViewTransaction,
  onDownloadPdfTransaction,
  onPrintTransaction,
  onDeleteTransaction,
  onConvertQuotation,
  onOpenWhatsAppReminder,
  onOpenRecordPayment,
}) => {
  const [subTab, setSubTab] = useState<
    "sale" | "overdue" | "quotation" | "payment_in" | "sale_return"
  >("sale");
  const [search, setSearch] = useState("");
  const [selectedInvoiceForHistory, setSelectedInvoiceForHistory] =
    useState<Transaction | null>(null);

  // Overdue calculations
  const now = new Date();
  const getOverdueDays = (txn: Transaction) => {
    const due = new Date(txn.dueDate || txn.date);
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const overdueInvoices = transactions
    .filter((t) => t.type === "sale" && t.balanceDue > 0 && getOverdueDays(t) > 0)
    .map((t) => ({ ...t, daysOverdue: getOverdueDays(t) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // Grouping into aging buckets
  const buckets = [
    {
      id: "1-15",
      title: "1 – 15 Days Overdue",
      color: "#F57C00",
      bg: "rgba(245, 124, 0, 0.08)",
      invoices: overdueInvoices.filter((i) => i.daysOverdue >= 1 && i.daysOverdue <= 15),
    },
    {
      id: "16-30",
      title: "16 – 30 Days Overdue",
      color: "#E65100",
      bg: "rgba(230, 81, 0, 0.08)",
      invoices: overdueInvoices.filter((i) => i.daysOverdue >= 16 && i.daysOverdue <= 30),
    },
    {
      id: "31-60",
      title: "31 – 60 Days Overdue",
      color: "#D32F2F",
      bg: "rgba(211, 47, 47, 0.08)",
      invoices: overdueInvoices.filter((i) => i.daysOverdue >= 31 && i.daysOverdue <= 60),
    },
    {
      id: "60+",
      title: "60+ Days Overdue (Critical)",
      color: "#B71C1C",
      bg: "rgba(183, 28, 28, 0.12)",
      invoices: overdueInvoices.filter((i) => i.daysOverdue > 60),
    },
  ];

  const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

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
            <span>Online Sales & Customer Invoicing</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Create customer invoices, track overdue payments, and monitor complete payment histories
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenSaleModal("quotation")}
          >
            <FileText size={16} />
            <span>+ New Quotation</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onOpenSaleModal("sale")}
          >
            <Plus size={16} />
            <span>+ New Sale Invoice</span>
          </button>
        </div>
      </div>

      <div className="action-row">
        <button
          className="btn btn-secondary"
          onClick={() => onOpenSaleModal("payment_in")}
        >
          + Receive Payment
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onOpenSaleModal("sale_return")}
        >
          + Sales Return
        </button>
      </div>

      {/* Tabs and Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className={`btn btn-sm ${subTab === "sale" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("sale")}
          >
            Sale Invoices
          </button>
          <button
            className={`btn btn-sm ${subTab === "overdue" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("overdue")}
            style={{
              position: "relative",
              borderColor: overdueInvoices.length > 0 ? "var(--danger)" : "inherit",
            }}
          >
            <span>Overdue Tracking</span>
            {overdueInvoices.length > 0 && (
              <span
                style={{
                  background: "var(--danger)",
                  color: "#fff",
                  padding: "1px 6px",
                  borderRadius: 10,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  marginLeft: 6,
                }}
              >
                {overdueInvoices.length}
              </span>
            )}
          </button>
          <button
            className={`btn btn-sm ${subTab === "quotation" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("quotation")}
          >
            Estimates / Quotations
          </button>
          <button
            className={`btn btn-sm ${subTab === "payment_in" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("payment_in")}
          >
            Payment In
          </button>
          <button
            className={`btn btn-sm ${subTab === "sale_return" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("sale_return")}
          >
            Sales Return
          </button>
        </div>

        <div style={{ position: "relative", width: 280 }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 12,
              top: 11,
              color: "var(--text-muted)",
            }}
          />
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

      {/* 1. OVERDUE TRACKING VIEW */}
      {subTab === "overdue" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary KPIs */}
          <div className="kpi-grid">
            <div
              className="kpi-card"
              style={{ "--card-accent": "#C62828" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Total Overdue Receivables</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#FFEBEE", color: "#C62828" }}
                >
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#C62828" }}>
                PKR {totalOverdueAmount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Across {overdueInvoices.length} unpaid customer invoices
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ "--card-accent": "#E65100" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Critical Overdue (&gt; 30 Days)</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#FFF3E0", color: "#E65100" }}
                >
                  <Clock size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#E65100" }}>
                {overdueInvoices.filter((i) => i.daysOverdue > 30).length} Invoices
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                PKR{" "}
                {overdueInvoices
                  .filter((i) => i.daysOverdue > 30)
                  .reduce((sum, i) => sum + i.balanceDue, 0)
                  .toLocaleString("en-PK", { maximumFractionDigits: 2 })}{" "}
                outstanding
              </div>
            </div>
          </div>

          {/* Aging Buckets */}
          {overdueInvoices.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <CheckCircle size={36} color="var(--success)" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ margin: 0 }}>All Invoices Are Up to Date!</h3>
              <p style={{ color: "var(--text-secondary)", marginTop: 6 }}>
                There are no overdue unpaid invoices at this time.
              </p>
            </div>
          ) : (
            buckets.map((bucket) => {
              if (bucket.invoices.length === 0) return null;
              const bucketTotal = bucket.invoices.reduce((s, i) => s + i.balanceDue, 0);

              return (
                <div key={bucket.id} className="card" style={{ overflow: "hidden" }}>
                  <div
                    className="card-header"
                    style={{
                      background: bucket.bg,
                      borderBottom: `2px solid ${bucket.color}`,
                      padding: "12px 18px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: bucket.color,
                        }}
                      />
                      <strong style={{ color: bucket.color, fontSize: "1rem" }}>
                        {bucket.title}
                      </strong>
                      <span className="badge" style={{ background: "#fff" }}>
                        {bucket.invoices.length} invoice(s)
                      </span>
                    </div>

                    <div style={{ fontWeight: 800, color: bucket.color, fontSize: "1rem" }}>
                      PKR {bucketTotal.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Customer</th>
                          <th>Invoice Date</th>
                          <th>Due Date</th>
                          <th>Days Overdue</th>
                          <th style={{ textAlign: "right" }}>Original Total</th>
                          <th style={{ textAlign: "right" }}>Balance Due</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bucket.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                              {inv.invoiceNumber}
                            </td>
                            <td style={{ fontWeight: 600 }}>{inv.partyName}</td>
                            <td>{inv.date}</td>
                            <td>{inv.dueDate || "Not set"}</td>
                            <td>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  background: bucket.bg,
                                  color: bucket.color,
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                }}
                              >
                                {inv.daysOverdue} days
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                              PKR {inv.total.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: 800,
                                color: "var(--danger)",
                              }}
                            >
                              PKR {inv.balanceDue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: 6,
                                }}
                              >
                                {onOpenWhatsAppReminder && (
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    title="Send WhatsApp Payment Reminder"
                                    style={{ color: "#25D366" }}
                                    onClick={() => onOpenWhatsAppReminder(inv)}
                                  >
                                    <MessageCircle size={16} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn-icon"
                                  title="View Payment History"
                                  onClick={() => setSelectedInvoiceForHistory(inv)}
                                >
                                  <History size={16} />
                                </button>
                                <DocumentActions
                                  variant="row"
                                  size="sm"
                                  documentTitle={inv.invoiceNumber}
                                  onView={() => onViewTransaction(inv)}
                                  onDownloadPdf={
                                    onDownloadPdfTransaction
                                      ? () => onDownloadPdfTransaction(inv, false)
                                      : () => onViewTransaction(inv)
                                  }
                                  onShare={
                                    onDownloadPdfTransaction
                                      ? () => onDownloadPdfTransaction(inv, true)
                                      : undefined
                                  }
                                  onPrint={
                                    onPrintTransaction
                                      ? () => onPrintTransaction(inv)
                                      : () => onViewTransaction(inv)
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* 2. REGULAR TRANSACTIONS TABLE (Sale, Quotation, Payment, Returns) */
        <div className="card">
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice / Ref #</th>
                  <th>Customer Name</th>
                  <th>Payment Mode</th>
                  <th style={{ textAlign: "right" }}>Total (PKR)</th>
                  <th style={{ textAlign: "right" }}>Received (PKR)</th>
                  <th style={{ textAlign: "right" }}>Balance Due (PKR)</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: 30,
                        color: "var(--text-muted)",
                      }}
                    >
                      No {subTab.replace("_", " ")} transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((txn) => (
                    <tr key={txn.id}>
                      <td>{txn.date}</td>
                      <td
                        style={{
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {txn.invoiceNumber}
                      </td>
                      <td style={{ fontWeight: 600 }}>{txn.partyName}</td>
                      <td
                        style={{
                          textTransform: "uppercase",
                          fontSize: "0.8rem",
                        }}
                      >
                        {txn.paymentMode}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        PKR {txn.total.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          color: "var(--success)",
                          fontWeight: 600,
                        }}
                      >
                        PKR {txn.paidAmount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            txn.balanceDue > 0
                              ? "var(--danger)"
                              : "var(--text-secondary)",
                        }}
                      >
                        PKR {txn.balanceDue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`badge badge-${txn.status}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 6,
                          }}
                        >
                          {txn.type === "quotation" && onConvertQuotation && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              title="Convert to Sale Invoice"
                              onClick={() => onConvertQuotation(txn)}
                            >
                              <CheckCircle size={14} color="var(--success)" />
                              <span>Convert</span>
                            </button>
                          )}

                          {/* Invoice Payment History Button */}
                          {(txn.type === "sale" || txn.type === "purchase") && (
                            <button
                              type="button"
                              className="btn-icon"
                              title="View Invoice Payment History"
                              onClick={() => setSelectedInvoiceForHistory(txn)}
                            >
                              <History size={16} />
                            </button>
                          )}

                          {/* Consistent Document Actions: View, Download PDF, Share, Print */}
                          <DocumentActions
                            variant="row"
                            size="sm"
                            documentTitle={txn.invoiceNumber}
                            onView={() => onViewTransaction(txn)}
                            onDownloadPdf={
                              onDownloadPdfTransaction
                                ? () => onDownloadPdfTransaction(txn, false)
                                : () => onViewTransaction(txn)
                            }
                            onShare={
                              onDownloadPdfTransaction
                                ? () => onDownloadPdfTransaction(txn, true)
                                : undefined
                            }
                            onPrint={
                              onPrintTransaction
                                ? () => onPrintTransaction(txn)
                                : () => onViewTransaction(txn)
                            }
                          />

                          <button
                            type="button"
                            className="btn-icon"
                            title="Delete Transaction"
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete ${txn.invoiceNumber}? Stock will be adjusted accordingly.`,
                                )
                              ) {
                                onDeleteTransaction(txn.id);
                              }
                            }}
                            style={{ color: "var(--danger)" }}
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
      )}

      {/* Invoice Payment History Modal */}
      {selectedInvoiceForHistory && (
        <InvoicePaymentHistoryModal
          isOpen={!!selectedInvoiceForHistory}
          invoice={selectedInvoiceForHistory}
          allTransactions={transactions}
          onClose={() => setSelectedInvoiceForHistory(null)}
          onViewDocument={onViewTransaction}
          onDownloadPdf={
            onDownloadPdfTransaction
              ? (inv) => onDownloadPdfTransaction(inv, false)
              : undefined
          }
          onShare={
            onDownloadPdfTransaction
              ? (inv) => onDownloadPdfTransaction(inv, true)
              : undefined
          }
          onPrint={onPrintTransaction}
          onOpenRecordPayment={onOpenRecordPayment}
        />
      )}
    </div>
  );
};
