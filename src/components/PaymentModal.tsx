import React, { useState } from "react";
import { Dialog } from "./Dialog.js";
import { Party, Transaction, PaymentMode } from "../types.js";
import { localDate } from "../../server/calculations.js";
export function PaymentModal({
  type,
  parties,
  transactions,
  onSave,
  onClose,
}: {
  type: "payment_in" | "payment_out";
  parties: Party[];
  transactions: Transaction[];
  onSave: (
    t: Omit<Transaction, "id" | "createdAt">,
    print?: boolean,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const options = parties.filter(
    (p) => p.type === (type === "payment_in" ? "customer" : "supplier"),
  );
  const [partyId, setParty] = useState(options[0]?.id || ""),
    [amount, setAmount] = useState(0),
    [date, setDate] = useState(localDate()),
    [mode, setMode] = useState<PaymentMode>("cash"),
    [invoiceId, setInvoice] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const title = type === "payment_in" ? "Receive Payment" : "Pay Supplier";
  return (
    <Dialog
      title={title}
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            await onSave({
              type,
              invoiceNumber: `PAY-${crypto.randomUUID().slice(0, 12)}`,
              date,
              partyId,
              partyName: options.find((p) => p.id === partyId)?.name || "",
              items: [],
              subtotal: 0,
              discountTotal: 0,
              taxTotal: 0,
              cgst: 0,
              sgst: 0,
              igst: 0,
              total: amount,
              paidAmount: amount,
              balanceDue: 0,
              paymentMode: mode,
              status: "paid",
              originalTransactionId: invoiceId || undefined,
            });
            onClose();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            aria-label="Close payment"
            className="btn-icon"
            disabled={saving}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-body invoice-form">
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <label className="form-group">
            Party
            <select
              className="form-select"
              required
              value={partyId}
              onChange={(e) => {
                setParty(e.target.value);
                setInvoice("");
              }}
            >
              <option value="">Select party</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group">
            Apply payment to
            <select
              className="form-select"
              value={invoiceId}
              onChange={(e) => setInvoice(e.target.value)}
            >
              <option value="">Oldest outstanding invoices first</option>
              {transactions
                .filter(
                  (t) =>
                    t.partyId === partyId &&
                    t.type === (type === "payment_in" ? "sale" : "purchase") &&
                    t.balanceDue > 0,
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.invoiceNumber} — due PKR {t.balanceDue}
                  </option>
                ))}
            </select>
          </label>
          <label className="form-group">
            Amount
            <input
              type="number"
              className="form-input"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label className="form-group">
            Date
            <input
              type="date"
              className="form-input"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="form-group">
            Payment mode
            <select
              className="form-select"
              value={mode === "upi" ? "Mobile wallet" : mode}
              onChange={(e) => setMode(e.target.value as PaymentMode)}
            >
              {["cash", "bank", "upi", "cheque"].map((m) => (
                <option key={m} value={m}>
                  {m === "upi" ? "MOBILE WALLET" : m.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Payment"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
