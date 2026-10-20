import React, { useState, useEffect } from "react";
import {
  calculateLine,
  calculateTotals,
  localDate,
  money,
} from "../../server/calculations.js";
import { Dialog } from "./Dialog.js";
import { X, Plus, Trash2, Printer, Check } from "lucide-react";
import {
  Party,
  Item,
  Transaction,
  TransactionItem,
  TransactionType,
  PaymentMode,
} from "../types.js";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    txnData: Omit<Transaction, "id" | "createdAt">,
    thenPrint?: boolean,
  ) => Promise<void>;
  type: TransactionType;
  parties: Party[];
  items: Item[];
  initialData?: Transaction | null;
  transactions: Transaction[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  type,
  parties,
  items,
  initialData,
  transactions,
}) => {
  const [partyId, setPartyId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(localDate());
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<TransactionItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [interstate, setInterstate] = useState(false);
  const [originalId, setOriginalId] = useState("");
  const [error, setError] = useState("");
  const isReturn = type === "sale_return" || type === "purchase_return";
  const supplier = type === "purchase" || type === "purchase_return";
  parties = parties.filter(
    (p) => p.type === (supplier ? "supplier" : "customer"),
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError("");
      setOriginalId("");
      setInterstate(initialData?.interstate || false);
      if (initialData) {
        setPartyId(initialData.partyId);
        setPartyName(initialData.partyName);
        setInvoiceNumber(initialData.invoiceNumber);
        setDate(initialData.date);
        setDueDate(initialData.dueDate || "");
        setLineItems(initialData.items);
        setPaymentMode(initialData.paymentMode);
        setPaidAmount(initialData.paidAmount);
        setNotes(initialData.notes || "");
      } else {
        const prefix =
          type === "sale"
            ? "INV"
            : type === "purchase"
              ? "BILL"
              : type === "quotation"
                ? "QTN"
                : "RET";
        setInvoiceNumber(`${prefix}-${crypto.randomUUID().slice(0, 12)}`);
        setDate(localDate());
        setDueDate(
          new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
        );
        setPartyId(parties[0]?.id || "");
        setPartyName(parties[0]?.name || "");
        setNotes(type === "sale" ? "Thank you for your business!" : "");
        setLineItems([
          calculateLine({
            itemId: items[0]?.id || "",
            itemName: items[0]?.name || "",
            itemCode: items[0]?.code || "",
            hsnCode: items[0]?.hsnCode || "",
            quantity: 1,
            unit: items[0]?.unit || "Pcs",
            price: supplier
              ? items[0]?.purchasePrice || 0
              : items[0]?.salesPrice || 0,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: items[0]?.taxRate ?? 0,
            taxAmount: 0,
            total: 0,
          }),
        ]);
        setPaidAmount(0);
        setPaymentMode("cash");
      }
    }
  }, [isOpen, initialData, type]);

  if (!isOpen) return null;

  const handlePartyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selId = e.target.value;
    setPartyId(selId);
    const p = parties.find((item) => item.id === selId);
    if (p) setPartyName(p.name);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setLineItems((prev) => {
      const updated = [...prev];
      const price = supplier ? item.purchasePrice : item.salesPrice;
      const qty = updated[index].quantity || 1;
      const discountAmount =
        (price * qty * updated[index].discountPercent) / 100;
      const taxable = price * qty - discountAmount;
      const taxAmount = (taxable * item.taxRate) / 100;

      updated[index] = {
        ...updated[index],
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        hsnCode: item.hsnCode || "",
        unit: item.unit,
        price,
        taxRate: item.taxRate,
        discountAmount,
        taxAmount,
        total: taxable + taxAmount,
      };
      return updated;
    });
  };

  const handleLineChange = (
    index: number,
    field: "quantity" | "price" | "discountPercent" | "taxRate",
    val: number,
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: val };
      const price = current.price;
      const qty = current.quantity;
      const discountAmount =
        (price * qty * (current.discountPercent || 0)) / 100;
      const taxable = price * qty - discountAmount;
      const taxAmount = (taxable * (current.taxRate || 0)) / 100;

      current.discountAmount = discountAmount;
      current.taxAmount = taxAmount;
      current.total = taxable + taxAmount;
      updated[index] = current;
      return updated;
    });
  };

  const addLineItem = () => {
    const defaultItem = items[0];
    setLineItems((prev) => [
      ...prev,
      calculateLine({
        itemId: defaultItem?.id || "",
        itemName: defaultItem?.name || "",
        itemCode: defaultItem?.code || "",
        hsnCode: defaultItem?.hsnCode || "",
        quantity: 1,
        unit: defaultItem?.unit || "Pcs",
        price:
          type === "purchase"
            ? defaultItem?.purchasePrice || 0
            : defaultItem?.salesPrice || 0,
        discountPercent: 0,
        discountAmount: 0,
        taxRate: defaultItem?.taxRate ?? 0,
        taxAmount: 0,
        total: 0,
      }),
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const { subtotal, discountTotal, taxTotal, total, cgst, sgst, igst } =
    calculateTotals(lineItems.map(calculateLine), interstate);
  const balanceDue = money(Math.max(0, total - paidAmount));

  const getStatus = (): "paid" | "unpaid" | "partial" => {
    if (paidAmount >= total) return "paid";
    if (paidAmount > 0) return "partial";
    return "unpaid";
  };

  const handleSubmit = async (thenPrint = false) => {
    if (!partyId) {
      alert("Please select or specify a party");
      return;
    }
    if (lineItems.length === 0 || !lineItems[0].itemId) {
      alert("Please add at least one valid item");
      return;
    }

    if (isSaving) return;
    if (isReturn && !originalId) {
      setError("Select the original invoice.");
      return;
    }
    if (
      !date ||
      (dueDate && dueDate < date) ||
      !invoiceNumber.trim() ||
      paidAmount < 0 ||
      paidAmount > total ||
      lineItems.some(
        (l) =>
          l.quantity <= 0 ||
          l.price < 0 ||
          l.discountPercent < 0 ||
          l.discountPercent > 100,
      )
    ) {
      setError("Check dates, quantities, discounts and paid amount.");
      return;
    }
    setError("");
    setIsSaving(true);
    try {
      const txnPayload: Omit<Transaction, "id" | "createdAt"> = {
        invoiceNumber,
        type,
        partyId,
        partyName,
        date,
        dueDate,
        items: lineItems.map(calculateLine),
        interstate,
        originalTransactionId: originalId || undefined,
        subtotal,
        discountTotal,
        taxTotal,
        cgst,
        sgst,
        igst,
        total,
        paidAmount,
        balanceDue,
        paymentMode,
        status: getStatus(),
        notes,
      };

      await onSave(txnPayload, thenPrint);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const titleText =
    type === "sale"
      ? "Sale Invoice"
      : type === "purchase"
        ? "Purchase Bill"
        : type === "quotation"
          ? "Estimate / Quotation"
          : type === "sale_return"
            ? "Sale Return / Credit Note"
            : "Purchase Return / Debit Note";

  return (
    <Dialog
      title={titleText}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      large
    >
      <div className="modal-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h3 style={{ fontSize: "1.25rem" }}>{titleText}</h3>
          <span
            className="sidebar-badge"
            style={{ textTransform: "uppercase" }}
          >
            {invoiceNumber}
          </span>
        </div>
        <button
          className="btn-icon"
          aria-label="Close invoice"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div
        className="modal-body"
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        {isReturn && (
          <label className="form-group">
            Original invoice
            <select
              className="form-select"
              value={originalId}
              onChange={(e) => {
                setOriginalId(e.target.value);
                const original = transactions.find(
                  (t) => t.id === e.target.value,
                );
                if (original) {
                  setPartyId(original.partyId);
                  setPartyName(original.partyName);
                  setLineItems(original.items.map(calculateLine));
                  setInterstate(!!original.interstate);
                  setPaidAmount(0);
                }
              }}
            >
              <option value="">Select original invoice</option>
              {transactions
                .filter((t) => t.type === (supplier ? "purchase" : "sale"))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.invoiceNumber} — {t.partyName}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={interstate}
            disabled={isReturn}
            onChange={(e) => setInterstate(e.target.checked)}
          />{" "}
          Interstate supply (IGST)
        </label>
        {/* Top Controls */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <div className="form-group">
            <label className="form-label">Party / Customer</label>
            <select
              className="form-select"
              value={partyId}
              onChange={handlePartyChange}
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Invoice No.</label>
            <input
              type="text"
              className="form-input"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div
          className="card"
          style={{ border: "1px solid var(--border-color)" }}
        >
          <div className="data-table-wrapper">
            <table className="data-table invoice-items-table">
              <thead>
                <tr>
                  <th style={{ width: "30%" }}>Item Description</th>
                  <th style={{ width: "12%" }}>Quantity</th>
                  <th style={{ width: "15%" }}>Price (PKR)</th>
                  <th style={{ width: "12%" }}>Disc %</th>
                  <th style={{ width: "12%" }}>Tax Rate</th>
                  <th style={{ width: "15%", textAlign: "right" }}>
                    Total (PKR)
                  </th>
                  <th style={{ width: "4%" }}></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select"
                        value={item.itemId}
                        onChange={(e) => handleItemSelect(idx, e.target.value)}
                      >
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} (Stock: {i.currentStock})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        className="form-input"
                        value={item.quantity}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "quantity",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        value={item.price}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        value={item.discountPercent}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "discountPercent",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="form-select"
                        value={item.taxRate}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            "taxRate",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      >
                        <option value="0">GST 0%</option>
                        <option value="5">GST 5%</option>
                        <option value="12">GST 12%</option>
                        <option value="18">GST 18%</option>
                        <option value="28">GST 28%</option>
                      </select>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      PKR {item.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <button
                        className="btn-icon"
                        aria-label={`Remove line ${idx + 1}`}
                        onClick={() => removeLineItem(idx)}
                        disabled={lineItems.length === 1}
                        style={{ color: "var(--danger)", padding: 4 }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "10px 16px", background: "var(--bg-main)" }}>
            <button className="btn btn-secondary btn-sm" onClick={addLineItem}>
              <Plus size={14} />
              <span>+ Add Item Line</span>
            </button>
          </div>
        </div>

        {/* Bottom Summary & Notes */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <div style={{ display: "flex", gap: 10 }}>
                {(["cash", "bank", "upi", "cheque"] as PaymentMode[]).map(
                  (mode) => (
                    <button
                      key={mode === "upi" ? "Mobile wallet" : mode}
                      type="button"
                      className={`btn btn-sm ${paymentMode === mode ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setPaymentMode(mode)}
                      style={{ textTransform: "uppercase" }}
                    >
                      {mode === "upi" ? "Mobile wallet" : mode}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Notes / Terms</label>
              <textarea
                rows={2}
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Terms of delivery, payment bank details, warranty, etc."
              />
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-main)",
              padding: 16,
              borderRadius: "var(--radius-md)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
              <span style={{ fontWeight: 600 }}>
                PKR {subtotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                Discount Total:
              </span>
              <span style={{ fontWeight: 600, color: "var(--success)" }}>
                -PKR {discountTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>
                GST Tax Total:
              </span>
              <span style={{ fontWeight: 600 }}>
                +PKR {taxTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.2rem",
                fontWeight: 800,
                fontFamily: "var(--font-heading)",
                borderTop: "1px solid var(--border-color)",
                paddingTop: 8,
              }}
            >
              <span>Grand Total:</span>
              <span style={{ color: "var(--primary)" }}>
                PKR {total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
              }}
            >
              <label htmlFor="invoice-paid-amount" className="form-label" style={{ margin: 0 }}>
                {isReturn ? "Amount Refunded (PKR):" : "Amount Received / Paid (PKR):"}
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: 140,
                }}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  style={{ textAlign: "right", fontWeight: 700 }}
                  id="invoice-paid-amount"
                  value={paidAmount}
                  disabled={type === "quotation"}
                  onChange={(e) =>
                    setPaidAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: balanceDue > 0 ? "var(--danger)" : "var(--success)",
              }}
            >
              <span>Balance Due:</span>
              <span>PKR {balanceDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button
          className="btn btn-secondary"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => handleSubmit(true)}
          disabled={isSaving}
        >
          <Printer size={16} />
          <span>Save & Print</span>
        </button>
        <button
          className="btn btn-primary"
          onClick={() => handleSubmit(false)}
          disabled={isSaving}
        >
          <Check size={16} />
          <span>Save Invoice</span>
        </button>
      </div>
    </Dialog>
  );
};
