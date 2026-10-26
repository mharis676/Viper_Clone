import React, { useState, useEffect } from "react";
import { Dialog } from "./Dialog.js";
import { Party, Transaction, PaymentMode } from "../types.js";
import { localDate, money } from "../../server/calculations.js";
import { Check, CheckSquare, Square } from "lucide-react";

export function PaymentModal({
  type,
  parties,
  transactions,
  initialInvoice,
  onSave,
  onClose,
}: {
  type: "payment_in" | "payment_out";
  parties: Party[];
  transactions: Transaction[];
  initialInvoice?: Transaction | null;
  onSave: (
    t: Omit<Transaction, "id" | "createdAt">,
    print?: boolean,
  ) => Promise<void>;
  onClose: () => void;
}) {
  const options = parties.filter(
    (p) => p.type === (type === "payment_in" ? "customer" : "supplier"),
  );

  const defaultPartyId = initialInvoice
    ? initialInvoice.partyId
    : options[0]?.id || "";

  const [partyId, setParty] = useState(defaultPartyId);
  const [amount, setAmount] = useState(initialInvoice ? initialInvoice.balanceDue : 0);
  const [date, setDate] = useState(localDate());
  const [mode, setMode] = useState<PaymentMode>("cash");
  const [notes, setNotes] = useState("");
  const [allocationMode, setAllocationMode] = useState<"auto" | "manual">(
    initialInvoice ? "manual" : "auto",
  );
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Outstanding invoices for currently selected party
  const outstandingInvoices = transactions
    .filter(
      (t) =>
        t.partyId === partyId &&
        t.type === (type === "payment_in" ? "sale" : "purchase") &&
        t.balanceDue > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  // Initialize allocation if initialInvoice passed
  useEffect(() => {
    if (initialInvoice && initialInvoice.balanceDue > 0) {
      setAllocations({ [initialInvoice.id]: initialInvoice.balanceDue });
      setAmount(initialInvoice.balanceDue);
    }
  }, [initialInvoice]);

  const handleToggleInvoice = (inv: Transaction) => {
    setAllocations((prev) => {
      const next = { ...prev };
      if (next[inv.id] !== undefined) {
        delete next[inv.id];
      } else {
        // Allocate up to remaining unallocated amount or balance due
        const currentAllocated = Object.values(next).reduce((s, v) => s + v, 0);
        const remaining = Math.max(0, amount - currentAllocated);
        next[inv.id] = remaining > 0 ? Math.min(remaining, inv.balanceDue) : inv.balanceDue;
      }
      return next;
    });
  };

  const handleAllocationAmountChange = (invoiceId: string, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: Math.max(0, val),
    }));
  };

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
  const unallocatedBalance = money(Math.max(0, amount - totalAllocated));

  const handleAutoDistribute = () => {
    let rem = amount;
    const newAlloc: Record<string, number> = {};
    for (const inv of outstandingInvoices) {
      if (rem <= 0) break;
      const take = money(Math.min(rem, inv.balanceDue));
      if (take > 0) {
        newAlloc[inv.id] = take;
        rem = money(rem - take);
      }
    }
    setAllocations(newAlloc);
    setAllocationMode("manual");
  };

  const title = type === "payment_in" ? "Receive Client Payment" : "Pay Supplier";

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
          if (amount <= 0) {
            setError("Payment amount must be greater than zero");
            return;
          }
          setSaving(true);
          setError("");

          // Build allocations array if manual allocation chosen
          const allocationList =
            allocationMode === "manual"
              ? Object.entries(allocations)
                  .filter(([_, amt]) => amt > 0)
                  .map(([invId, amt]) => {
                    const inv = outstandingInvoices.find((t) => t.id === invId);
                    return {
                      invoiceId: invId,
                      invoiceNumber: inv?.invoiceNumber,
                      amount: money(amt),
                    };
                  })
              : [];

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
              notes,
              allocations: allocationList.length > 0 ? allocationList : undefined,
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

        <div className="modal-body invoice-form" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label className="form-group">
              Party
              <select
                className="form-select"
                required
                value={partyId}
                onChange={(e) => {
                  setParty(e.target.value);
                  setAllocations({});
                }}
              >
                <option value="">Select party</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Balance: PKR {Math.abs(p.currentBalance).toLocaleString("en-PK")} {p.currentBalance > 0 ? "Dr" : p.currentBalance < 0 ? "Cr" : "Settled"})
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              Payment Amount (PKR)
              <input
                type="number"
                className="form-input"
                required
                min="0.01"
                step="0.01"
                value={amount || ""}
                placeholder="0.00"
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>

            <label className="form-group">
              Payment Date
              <input
                type="date"
                className="form-input"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <label className="form-group">
              Payment Mode
              <select
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
              >
                <option value="cash">Cash in hand</option>
                <option value="bank">Bank Transfer</option>
                <option value="upi">Mobile Wallet (EasyPaisa/JazzCash)</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>
          </div>

          {/* Payment Allocation Section */}
          <div
            style={{
              marginTop: 6,
              padding: "14px",
              background: "var(--bg-main)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>Invoice Payment Allocation</span>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Select which invoice(s) this payment settles
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${allocationMode === "auto" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setAllocationMode("auto");
                    setAllocations({});
                  }}
                  style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                >
                  Auto-allocate (FIFO)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${allocationMode === "manual" ? "btn-primary" : "btn-secondary"}`}
                  onClick={handleAutoDistribute}
                  style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                >
                  Select Specific Invoices
                </button>
              </div>
            </div>

            {outstandingInvoices.length === 0 ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
                No outstanding invoices found for this party. The full amount will be credited to party account as an advance balance.
              </div>
            ) : allocationMode === "auto" ? (
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", background: "var(--bg-card)", padding: "10px 14px", borderRadius: "var(--radius-sm)" }}>
                Payment will automatically settle the oldest outstanding invoices first in sequence ({outstandingInvoices.length} unpaid invoices available).
              </div>
            ) : (
              <div className="data-table-wrapper" style={{ maxHeight: 220, overflowY: "auto" }}>
                <table className="data-table" style={{ fontSize: "0.82rem" }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>Settle</th>
                      <th>Invoice #</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Balance Due</th>
                      <th style={{ textAlign: "right", width: 130 }}>Allocated (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstandingInvoices.map((inv) => {
                      const isSelected = allocations[inv.id] !== undefined;
                      const allocAmount = allocations[inv.id] || 0;
                      return (
                        <tr
                          key={inv.id}
                          style={{
                            background: isSelected ? "rgba(46, 125, 50, 0.05)" : "inherit",
                          }}
                        >
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ padding: 2, height: "auto" }}
                              onClick={() => handleToggleInvoice(inv)}
                              aria-label={`Toggle invoice ${inv.invoiceNumber}`}
                            >
                              {isSelected ? (
                                <CheckSquare size={16} color="var(--success)" />
                              ) : (
                                <Square size={16} color="var(--text-muted)" />
                              )}
                            </button>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                            {inv.invoiceNumber}
                          </td>
                          <td>{inv.date}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--danger)" }}>
                            PKR {inv.balanceDue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{
                                width: 110,
                                padding: "4px 8px",
                                textAlign: "right",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                              }}
                              min="0"
                              max={inv.balanceDue}
                              step="0.01"
                              value={allocAmount || ""}
                              placeholder="0.00"
                              disabled={!isSelected}
                              onChange={(e) =>
                                handleAllocationAmountChange(inv.id, Number(e.target.value))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {allocationMode === "manual" && outstandingInvoices.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  padding: "8px 12px",
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 600,
                }}
              >
                <span>Allocated to Invoices: PKR {totalAllocated.toLocaleString("en-PK", { maximumFractionDigits: 2 })}</span>
                <span style={{ color: unallocatedBalance > 0 ? "var(--primary)" : "var(--success)" }}>
                  {unallocatedBalance > 0
                    ? `Advance on Client Account: PKR ${unallocatedBalance.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
                    : "Fully Allocated"}
                </span>
              </div>
            )}
          </div>

          <label className="form-group">
            Payment Notes / Reference
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Bank slip reference, online transfer ID"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Payment"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
