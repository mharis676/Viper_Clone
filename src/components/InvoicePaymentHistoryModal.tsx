import React from "react";
import {
  FileText,
  DollarSign,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  ArrowDownLeft,
} from "lucide-react";
import { Transaction } from "../types.js";
import { DocumentActions } from "./DocumentActions.js";

interface InvoicePaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Transaction | null;
  allTransactions: Transaction[];
  onViewDocument?: (txn: Transaction) => void;
  onDownloadPdf?: (txn: Transaction) => Promise<void> | void;
  onShare?: (txn: Transaction) => Promise<void> | void;
  onPrint?: (txn: Transaction) => Promise<void> | void;
  onOpenRecordPayment?: (invoice: Transaction) => void;
}

export const InvoicePaymentHistoryModal: React.FC<InvoicePaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  invoice,
  allTransactions,
  onViewDocument,
  onDownloadPdf,
  onShare,
  onPrint,
  onOpenRecordPayment,
}) => {
  if (!isOpen || !invoice) return null;

  // Find linked returns (sale_return or purchase_return)
  const linkedReturns = allTransactions.filter(
    (t) =>
      t.originalTransactionId === invoice.id &&
      (t.type === "sale_return" || t.type === "purchase_return"),
  );

  // Find linked payments (payment_in or payment_out)
  const linkedPayments = allTransactions.filter(
    (t) =>
      (t.type === "payment_in" || t.type === "payment_out") &&
      (t.originalTransactionId === invoice.id ||
        t.allocations?.some((a) => a.invoiceId === invoice.id)),
  );

  const initialPaid = invoice.initialPaidAmount ?? 0;
  const returnCreditsTotal = linkedReturns.reduce((sum, r) => sum + r.total, 0);

  // Compute total payments allocated across checkout and subsequent vouchers
  const subsequentPaidTotal = linkedPayments.reduce((sum, p) => {
    const alloc = p.allocations?.find((a) => a.invoiceId === invoice.id);
    if (alloc) return sum + alloc.amount;
    if (p.originalTransactionId === invoice.id) return sum + p.paidAmount;
    return sum;
  }, 0);

  const totalPaid = initialPaid + subsequentPaidTotal;
  const originalAmount = invoice.total;
  const remainingDue = invoice.balanceDue;

  const paidPercent = originalAmount > 0 ? Math.min(100, Math.round((totalPaid / originalAmount) * 100)) : 100;
  const returnPercent = originalAmount > 0 ? Math.min(100 - paidPercent, Math.round((returnCreditsTotal / originalAmount) * 100)) : 0;
  const duePercent = Math.max(0, 100 - paidPercent - returnPercent);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760 }}
      >
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Invoice Payment History</h3>
              <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 4 }}>
              Invoice <strong>{invoice.invoiceNumber}</strong> • {invoice.partyName} • {invoice.date}
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Summary KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            <div className="kpi-card" style={{ padding: "14px", background: "var(--bg-main)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Original Invoiced
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                PKR {originalAmount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                Net after tax & discount
              </div>
            </div>

            <div className="kpi-card" style={{ padding: "14px", background: "rgba(46, 125, 50, 0.08)", border: "1px solid var(--success)" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600, marginBottom: 4 }}>
                Payments Received
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--success)" }}>
                PKR {totalPaid.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {paidPercent}% of invoice settled
              </div>
            </div>

            <div className="kpi-card" style={{ padding: "14px", background: "rgba(255, 152, 0, 0.08)", border: "1px solid #FF9800" }}>
              <div style={{ fontSize: "0.78rem", color: "#E65100", fontWeight: 600, marginBottom: 4 }}>
                Returns / Credits
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#E65100" }}>
                PKR {returnCreditsTotal.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {linkedReturns.length} return voucher(s)
              </div>
            </div>

            <div className="kpi-card" style={{ padding: "14px", background: remainingDue > 0 ? "rgba(198, 40, 40, 0.08)" : "var(--bg-main)", border: remainingDue > 0 ? "1px solid var(--danger)" : "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.78rem", color: remainingDue > 0 ? "var(--danger)" : "var(--text-muted)", fontWeight: 600, marginBottom: 4 }}>
                Remaining Balance
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: remainingDue > 0 ? "var(--danger)" : "var(--success)" }}>
                PKR {remainingDue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                {remainingDue > 0 ? `Due date: ${invoice.dueDate || "N/A"}` : "Fully settled"}
              </div>
            </div>
          </div>

          {/* Visual Settlement Meter */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Settlement Progress</span>
              <span style={{ color: "var(--text-secondary)" }}>
                {paidPercent + returnPercent}% accounted for
              </span>
            </div>
            <div
              style={{
                display: "flex",
                height: 10,
                borderRadius: 5,
                overflow: "hidden",
                background: "var(--border-color)",
              }}
            >
              <div style={{ width: `${paidPercent}%`, background: "var(--success)" }} title={`Paid: ${paidPercent}%`} />
              <div style={{ width: `${returnPercent}%`, background: "#FF9800" }} title={`Returned: ${returnPercent}%`} />
              <div style={{ width: `${duePercent}%`, background: "var(--danger)" }} title={`Due: ${duePercent}%`} />
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: "0.75rem", marginTop: 6, color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} /> Paid ({paidPercent}%)
              </span>
              {returnCreditsTotal > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF9800" }} /> Return Credit ({returnPercent}%)
                </span>
              )}
              {remainingDue > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--danger)" }} /> Outstanding ({duePercent}%)
                </span>
              )}
            </div>
          </div>

          {/* Payments Timeline / History */}
          <div className="card">
            <div className="card-header" style={{ padding: "12px 16px" }}>
              <div className="card-title" style={{ fontSize: "0.95rem" }}>
                Payments Breakdown
              </div>
              {remainingDue > 0 && onOpenRecordPayment && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    onClose();
                    onOpenRecordPayment(invoice);
                  }}
                >
                  <DollarSign size={14} />
                  <span>Receive Payment</span>
                </button>
              )}
            </div>

            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payment Ref #</th>
                    <th>Mode</th>
                    <th style={{ textAlign: "right" }}>Amount Settled</th>
                    <th>Notes / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Point of sale / initial payment */}
                  {initialPaid > 0 && (
                    <tr>
                      <td>{invoice.date}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {invoice.invoiceNumber} (At Checkout)
                      </td>
                      <td style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
                        {invoice.paymentMode}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                        PKR {initialPaid.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge badge-paid">Initial Paid</span>
                      </td>
                    </tr>
                  )}

                  {/* Subsequent payment vouchers */}
                  {linkedPayments.map((p) => {
                    const alloc = p.allocations?.find((a) => a.invoiceId === invoice.id);
                    const amount = alloc ? alloc.amount : p.paidAmount;
                    return (
                      <tr key={p.id}>
                        <td>{p.date}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {p.invoiceNumber}
                        </td>
                        <td style={{ textTransform: "uppercase", fontSize: "0.8rem" }}>
                          {p.paymentMode}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                          PKR {amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {p.notes || "Subsequent payment allocation"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {initialPaid === 0 && linkedPayments.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                        No payments received yet for this invoice.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked Returns Table if any */}
          {linkedReturns.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ padding: "12px 16px" }}>
                <div className="card-title" style={{ fontSize: "0.95rem" }}>
                  Returns & Credit Adjustments
                </div>
              </div>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Credit Note #</th>
                      <th>Items Returned</th>
                      <th style={{ textAlign: "right" }}>Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedReturns.map((r) => (
                      <tr key={r.id}>
                        <td>{r.date}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{r.invoiceNumber}</td>
                        <td>{r.items.map((i) => `${i.itemName} (x${i.quantity})`).join(", ")}</td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#E65100" }}>
                          PKR {r.total.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Consistent Document Actions */}
        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <DocumentActions
            variant="bar"
            size="sm"
            showLabels={true}
            documentTitle={invoice.invoiceNumber}
            onView={onViewDocument ? () => onViewDocument(invoice) : undefined}
            onDownloadPdf={onDownloadPdf ? () => onDownloadPdf(invoice) : undefined}
            onShare={onShare ? () => onShare(invoice) : undefined}
            onPrint={onPrint ? () => onPrint(invoice) : undefined}
          />
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
