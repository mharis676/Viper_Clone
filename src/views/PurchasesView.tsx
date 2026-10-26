import React, { useState } from "react";
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  FileText,
  RotateCcw,
  History,
} from "lucide-react";
import { Transaction, TransactionType } from "../types.js";
import { DocumentActions } from "../components/DocumentActions.js";
import { InvoicePaymentHistoryModal } from "../components/InvoicePaymentHistoryModal.js";

interface PurchasesViewProps {
  transactions: Transaction[];
  onOpenPurchaseModal: (type: TransactionType) => void;
  onViewTransaction: (txn: Transaction) => void;
  onDownloadPdfTransaction?: (txn: Transaction, share?: boolean) => Promise<void>;
  onPrintTransaction?: (txn: Transaction) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  onOpenRecordPayment?: (txn: Transaction) => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  transactions,
  onOpenPurchaseModal,
  onViewTransaction,
  onDownloadPdfTransaction,
  onPrintTransaction,
  onDeleteTransaction,
  onOpenRecordPayment,
}) => {
  const [subTab, setSubTab] = useState<"purchase" | "payment_out" | "purchase_return">("purchase");
  const [search, setSearch] = useState("");
  const [selectedBillForHistory, setSelectedBillForHistory] = useState<Transaction | null>(null);

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
            <span>Purchases & Supplier Bills</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Record inventory stock inward, supplier invoices, debit notes, and payment vouchers
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary"
            onClick={() => onOpenPurchaseModal("purchase")}
          >
            <Plus size={16} />
            <span>+ New Purchase Bill</span>
          </button>
        </div>
      </div>

      <div className="action-row">
        <button
          className="btn btn-secondary"
          onClick={() => onOpenPurchaseModal("payment_out")}
        >
          + Record Supplier Payment
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => onOpenPurchaseModal("purchase_return")}
        >
          + Purchase Return (Debit Note)
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
            className={`btn btn-sm ${subTab === "purchase" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("purchase")}
          >
            Purchase Bills
          </button>
          <button
            className={`btn btn-sm ${subTab === "payment_out" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("payment_out")}
          >
            Payment Out
          </button>
          <button
            className={`btn btn-sm ${subTab === "purchase_return" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSubTab("purchase_return")}
          >
            Purchase Return (Debit Note)
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
                <th>Bill / Ref #</th>
                <th>Supplier Name</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: "right" }}>Total (PKR)</th>
                <th style={{ textAlign: "right" }}>Paid (PKR)</th>
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
                        {/* Bill Payment History */}
                        {txn.type === "purchase" && (
                          <button
                            type="button"
                            className="btn-icon"
                            title="View Payment History"
                            onClick={() => setSelectedBillForHistory(txn)}
                          >
                            <History size={16} />
                          </button>
                        )}

                        {/* Consistent Document Actions everywhere */}
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
                          title="Delete Bill"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete ${txn.invoiceNumber}? Stock will be deducted accordingly.`,
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

      {/* Bill Payment History Modal */}
      {selectedBillForHistory && (
        <InvoicePaymentHistoryModal
          isOpen={!!selectedBillForHistory}
          invoice={selectedBillForHistory}
          allTransactions={transactions}
          onClose={() => setSelectedBillForHistory(null)}
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
