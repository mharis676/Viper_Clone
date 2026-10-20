import {
  localDate,
  money,
  calculateTotals,
} from "../../server/calculations.js";
import React, { useState, useRef, useEffect } from "react";
import {
  CreditCard,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Check,
  User,
  X,
} from "lucide-react";
import {
  Item,
  Party,
  Transaction,
  TransactionItem,
  PaymentMode,
} from "../types.js";

interface CartItem extends TransactionItem {}

interface CartTab {
  id: string;
  tabName: string;
  partyId: string;
  partyName: string;
  items: CartItem[];
  paymentMode: PaymentMode;
  paidAmount: number | null;
  splitAmount?: number;
  splitMode?: PaymentMode;
}

interface PosViewProps {
  items: Item[];
  parties: Party[];
  onCompleteCheckout: (
    txnData: Omit<Transaction, "id" | "createdAt">,
    thenPrint?: boolean,
  ) => Promise<void>;
}

export const PosView: React.FC<PosViewProps> = ({
  items,
  parties,
  onCompleteCheckout,
}) => {
  const [tabs, setTabs] = useState<CartTab[]>(() => {
    try {
      const stored = JSON.parse(
        sessionStorage.getItem("viper.posDrafts") || "null",
      );
      if (
        Array.isArray(stored) &&
        stored.length &&
        stored.every(
          (t) =>
            typeof t.id === "string" &&
            Array.isArray(t.items) &&
            t.items.every(
              (i: any) =>
                typeof i.itemId === "string" &&
                Number.isFinite(i.quantity) &&
                Number.isFinite(i.price) &&
                Number.isFinite(i.total),
            ),
        )
      )
        return stored;
    } catch {
      /* Start a clean draft if the session copy is invalid. */
    }
    return [
      {
        id: "tab-1",
        tabName: "Bill 1",
        partyId: "walk-in",
        partyName: "Walk-in Cash Customer",
        items: [],
        paymentMode: "cash",
        paidAmount: null,
      },
    ];
  });
  useEffect(() => {
    try {
      sessionStorage.setItem("viper.posDrafts", JSON.stringify(tabs));
    } catch (e) {
      console.error("Draft storage unavailable", e);
    }
  }, [tabs]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Focus barcode input on mount and whenever tab changes
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [activeTabId]);

  const addNewTab = () => {
    if (isProcessing) return;
    const newId = `tab-${crypto.randomUUID()}`;
    const newTab: CartTab = {
      id: newId,
      tabName: `Bill ${tabs.length + 1}`,
      partyId: "walk-in",
      partyName: "Walk-in Cash Customer",
      items: [],
      paymentMode: "cash",
      paidAmount: null,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isProcessing) return;
    if (tabs.length === 1) return;
    if (
      tabs.find((t) => t.id === id)?.items.length &&
      !confirm("Discard this unfinished bill?")
    )
      return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  };

  const addItemToActiveCart = (item: Item) => {
    if (isProcessing) return;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const existingIdx = tab.items.findIndex((i) => i.itemId === item.id);
        if (existingIdx !== -1) {
          const updatedItems = [...tab.items];
          const curr = updatedItems[existingIdx];
          const newQty = curr.quantity + 1;
          const discountAmt =
            (curr.price * newQty * curr.discountPercent) / 100;
          const taxable = curr.price * newQty - discountAmt;
          const taxAmt = (taxable * curr.taxRate) / 100;

          updatedItems[existingIdx] = {
            ...curr,
            quantity: newQty,
            discountAmount: discountAmt,
            taxAmount: taxAmt,
            total: taxable + taxAmt,
          };
          return { ...tab, items: updatedItems };
        } else {
          const price = item.salesPrice;
          const taxAmt = (price * item.taxRate) / 100;
          const newItem: CartItem = {
            itemId: item.id,
            itemName: item.name,
            itemCode: item.code,
            hsnCode: item.hsnCode || "",
            quantity: 1,
            unit: item.unit,
            price,
            discountPercent: 0,
            discountAmount: 0,
            taxRate: item.taxRate,
            taxAmount: taxAmt,
            total: price + taxAmt,
          };
          return { ...tab, items: [...tab.items, newItem] };
        }
      }),
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim();
    const found = items.find(
      (i) =>
        i.barcode === query ||
        i.code === query ||
        i.name.toLowerCase() === query.toLowerCase(),
    );

    if (found) {
      addItemToActiveCart(found);
      setBarcodeInput("");
    } else {
      alert(`No product found matching barcode or code: "${query}"`);
    }
  };

  const updateItemQty = (index: number, delta: number) => {
    if (isProcessing) return;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const updated = [...tab.items];
        const curr = updated[index];
        const newQty = curr.quantity + delta;

        if (newQty <= 0) {
          updated.splice(index, 1);
        } else {
          const discountAmt =
            (curr.price * newQty * curr.discountPercent) / 100;
          const taxable = curr.price * newQty - discountAmt;
          const taxAmt = (taxable * curr.taxRate) / 100;
          updated[index] = {
            ...curr,
            quantity: newQty,
            discountAmount: discountAmt,
            taxAmount: taxAmt,
            total: taxable + taxAmt,
          };
        }
        return { ...tab, items: updated };
      }),
    );
  };

  const removeItem = (index: number) => {
    if (isProcessing) return;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const updated = tab.items.filter((_, i) => i !== index);
        return { ...tab, items: updated };
      }),
    );
  };

  const updateActiveTabField = (field: keyof CartTab, val: any) => {
    if (isProcessing) return;
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return { ...tab, [field]: val };
      }),
    );
  };

  // Calculations for active tab
  const {
    subtotal,
    discountTotal,
    taxTotal,
    total: grandTotal,
    cgst,
    sgst,
    igst,
  } = calculateTotals(activeTab.items);
  const paidAmount = activeTab.paidAmount ?? grandTotal; // defaults to exact cash/tender
  const changeDue = money(Math.max(0, paidAmount - grandTotal));
  const balanceDue = money(Math.max(0, grandTotal - paidAmount));

  const handleCheckout = async (thenPrint = true) => {
    if (activeTab.items.length === 0) {
      alert(
        "Cart is empty! Add products using barcode scanner or product grid.",
      );
      return;
    }

    if (isProcessing) return;
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      alert("Enter a valid tender amount");
      return;
    }
    if (
      (activeTab.partyId === "walk-in" || !activeTab.partyId) &&
      balanceDue > 0
    ) {
      alert("Select a customer for a credit sale");
      return;
    }
    if (
      (activeTab.splitAmount || 0) < 0 ||
      (activeTab.splitAmount || 0) > Math.min(paidAmount, grandTotal)
    ) {
      alert("Split amount must be between zero and the amount paid");
      return;
    }
    setIsProcessing(true);
    try {
      const invNumber = `POS-${crypto.randomUUID().slice(0, 12)}`;
      const txnPayload: Omit<Transaction, "id" | "createdAt"> = {
        invoiceNumber: invNumber,
        type: "sale",
        payments:
          (activeTab.splitAmount || 0) > 0
            ? [
                {
                  mode: activeTab.paymentMode,
                  amount: money(
                    Math.min(paidAmount, grandTotal) - activeTab.splitAmount!,
                  ),
                },
                {
                  mode: activeTab.splitMode || "bank",
                  amount: activeTab.splitAmount!,
                },
              ]
            : undefined,
        partyId: activeTab.partyId || "walk-in",
        partyName:
          activeTab.partyId === "walk-in"
            ? "Walk-in Cash Customer"
            : activeTab.partyName,
        date: localDate(),
        items: activeTab.items,
        subtotal,
        discountTotal,
        taxTotal,
        cgst,
        sgst,
        igst,
        total: grandTotal,
        paidAmount: Math.min(paidAmount, grandTotal),
        balanceDue,
        paymentMode: activeTab.paymentMode,
        status:
          balanceDue === 0
            ? "paid"
            : balanceDue === grandTotal
              ? "unpaid"
              : "partial",
        notes: `POS Quick Sale Checkout (${activeTab.paymentMode.toUpperCase()})`,
      };

      await onCompleteCheckout(txnPayload, thenPrint);

      // Reset or clear current tab
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, items: [], paidAmount: null, splitAmount: 0 }
            : t,
        ),
      );
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCatalog = items.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pos-container">
      {/* Left Column: Multi-tab Header, Barcode Input, Category Filter, Product Grid */}
      <div className="pos-left">
        {/* Multi-Tab Billing Strip */}
        <div className="pos-tabs-header">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`pos-tab ${activeTabId === tab.id ? "active" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.tabName}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                ({tab.items.length})
              </span>
              {tabs.length > 1 && (
                <X size={14} onClick={(e) => closeTab(tab.id, e)} />
              )}
            </div>
          ))}

          <button
            className="btn btn-secondary btn-sm"
            onClick={addNewTab}
            title="Hold & Open New Bill"
          >
            <Plus size={14} />
            <span>Hold / New Bill</span>
          </button>
        </div>

        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="pos-search-bar">
          <div style={{ position: "relative", flex: 1 }}>
            <Barcode
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: 12,
                color: "var(--primary)",
              }}
            />
            <input
              ref={barcodeInputRef}
              type="text"
              className="form-input"
              style={{ paddingLeft: 40, fontWeight: 600 }}
              placeholder="Scan Barcode or type SKU and hit Enter..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            + Add
          </button>
        </form>

        {/* Category Filters */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <button
            className={`btn btn-sm ${selectedCategory === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setSelectedCategory("all")}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${selectedCategory === c ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="pos-product-grid">
          {filteredCatalog.map((item) => (
            <button
              type="button"
              key={item.id}
              className="pos-product-card"
              onClick={() => addItemToActiveCart(item)}
            >
              <div className="pos-product-title">{item.name}</div>
              <div className="pos-product-price">
                PKR {item.salesPrice.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
              </div>
              <div className="pos-product-stock">
                Stock: {item.currentStock} {item.unit}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: Active Cart, Party Selector, Split Payment, Grand Total, Checkout */}
      <div className="pos-right">
        <div className="pos-cart-header">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} color="var(--primary)" />
            <select
              className="form-select"
              style={{ width: 220 }}
              value={activeTab.partyId}
              onChange={(e) => {
                const p = parties.find((party) => party.id === e.target.value);
                updateActiveTabField("partyId", e.target.value);
                updateActiveTabField(
                  "partyName",
                  p?.name || "Walk-in Cash Customer",
                );
              }}
            >
              <option value="walk-in">Walk-in Cash Customer</option>
              {parties
                .filter((p) => p.type === "customer")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <span className="sidebar-badge">{activeTab.tabName}</span>
        </div>

        {/* Cart Line Items */}
        <div className="pos-cart-items">
          {activeTab.items.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Barcode
                size={36}
                style={{ margin: "0 auto 12px", opacity: 0.5 }}
              />
              <div>Cart is currently empty.</div>
              <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                Scan product barcode or click items on the left to add.
              </div>
            </div>
          ) : (
            activeTab.items.map((item, idx) => (
              <div key={idx} className="pos-cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {item.itemName}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    PKR {item.price} x {item.quantity} {item.unit} (+{item.taxRate}
                    % GST)
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    className="btn-icon"
                    aria-label="Change quantity"
                    style={{ padding: 4 }}
                    onClick={() => updateItemQty(idx, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span
                    style={{
                      fontWeight: 700,
                      minWidth: 20,
                      textAlign: "center",
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    className="btn-icon"
                    aria-label="Change quantity"
                    style={{ padding: 4 }}
                    onClick={() => updateItemQty(idx, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div
                  style={{ fontWeight: 700, minWidth: 70, textAlign: "right" }}
                >
                  PKR {item.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                </div>

                <button
                  className="btn-icon"
                  aria-label="Remove item"
                  style={{ color: "var(--danger)", padding: 4 }}
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="pos-cart-summary">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>Subtotal:</span>
            <span>PKR {subtotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.85rem",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>GST Tax:</span>
            <span>PKR {taxTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
          </div>

          <div className="pos-total-row">
            <span>Payable:</span>
            <span style={{ color: "var(--primary)" }}>
              PKR {grandTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Payment Mode Selector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
            }}
          >
            {(["cash", "upi", "bank", "cheque"] as PaymentMode[]).map(
              (mode) => (
                <button
                  key={mode === "upi" ? "Mobile wallet" : mode}
                  className={`btn btn-sm ${activeTab.paymentMode === mode ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => updateActiveTabField("paymentMode", mode)}
                  style={{ textTransform: "uppercase" }}
                >
                  {mode === "upi" ? "Mobile wallet" : mode}
                </button>
              ),
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              updateActiveTabField("paidAmount", 0);
              updateActiveTabField("splitAmount", 0);
            }}
          >
            Credit sale (pay later)
          </button>
          {/* Tender Amount / Change Calculation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              Tender Cash (PKR):
            </span>
            <input
              type="number"
              min="0"
              className="form-input"
              style={{ width: 120, textAlign: "right", fontWeight: 700 }}
              value={paidAmount}
              onChange={(e) =>
                updateActiveTabField("paidAmount", Number(e.target.value))
              }
            />
          </div>

          <div className="split-payment form-grid">
            <label className="form-group">
              Second tender amount (optional)
              <input
                className="form-input"
                aria-label="Second tender amount"
                type="number"
                min="0"
                max={Math.min(paidAmount, grandTotal)}
                step="0.01"
                value={activeTab.splitAmount || 0}
                onChange={(e) =>
                  updateActiveTabField("splitAmount", Number(e.target.value))
                }
              />
            </label>
            <label className="form-group">
              Second tender mode
              <select
                className="form-select"
                value={activeTab.splitMode || "bank"}
                onChange={(e) =>
                  updateActiveTabField("splitMode", e.target.value)
                }
              >
                {["bank", "upi", "cash", "cheque"].map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "upi" ? "MOBILE WALLET" : mode.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {changeDue > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
                color: "var(--success)",
                fontWeight: 700,
              }}
            >
              <span>Return Change:</span>
              <span>PKR {changeDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
            </div>
          )}

          {/* Checkout Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr",
              gap: 10,
            }}
          >
            <button
              className="btn btn-secondary"
              disabled={isProcessing || activeTab.items.length === 0}
              onClick={() => handleCheckout(false)}
            >
              <Check size={16} />
              <span>Charge</span>
            </button>
            <button
              className="btn btn-pos"
              disabled={isProcessing || activeTab.items.length === 0}
              onClick={() => handleCheckout(true)}
            >
              <Printer size={16} />
              <span>Print Bill (Thermal)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
