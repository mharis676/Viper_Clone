import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { Item, Party, Transaction, TransactionItem, PaymentMode } from '../types.js';

interface CartItem extends TransactionItem {}

interface CartTab {
  id: string;
  tabName: string;
  partyId: string;
  partyName: string;
  items: CartItem[];
  paymentMode: PaymentMode;
  paidAmount: number;
}

interface PosViewProps {
  items: Item[];
  parties: Party[];
  onCompleteCheckout: (txnData: Omit<Transaction, 'id' | 'createdAt'>, thenPrint?: boolean) => Promise<void>;
}

export const PosView: React.FC<PosViewProps> = ({
  items,
  parties,
  onCompleteCheckout,
}) => {
  const [tabs, setTabs] = useState<CartTab[]>([
    {
      id: 'tab-1',
      tabName: 'Bill 1',
      partyId: parties[0]?.id || '',
      partyName: parties[0]?.name || 'Walk-in Retail Customer',
      items: [],
      paymentMode: 'cash',
      paidAmount: 0,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Focus barcode input on mount and whenever tab changes
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [activeTabId]);

  const addNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: CartTab = {
      id: newId,
      tabName: `Bill ${tabs.length + 1}`,
      partyId: parties[0]?.id || '',
      partyName: parties[0]?.name || 'Walk-in Customer',
      items: [],
      paymentMode: 'cash',
      paidAmount: 0,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
  };

  const addItemToActiveCart = (item: Item) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const existingIdx = tab.items.findIndex((i) => i.itemId === item.id);
        if (existingIdx !== -1) {
          const updatedItems = [...tab.items];
          const curr = updatedItems[existingIdx];
          const newQty = curr.quantity + 1;
          const discountAmt = (curr.price * newQty * curr.discountPercent) / 100;
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
            hsnCode: item.hsnCode || '',
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
      })
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim();
    const found = items.find((i) => i.barcode === query || i.code === query || i.name.toLowerCase() === query.toLowerCase());

    if (found) {
      addItemToActiveCart(found);
      setBarcodeInput('');
    } else {
      alert(`No product found matching barcode or code: "${query}"`);
    }
  };

  const updateItemQty = (index: number, delta: number) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;

        const updated = [...tab.items];
        const curr = updated[index];
        const newQty = curr.quantity + delta;

        if (newQty <= 0) {
          updated.splice(index, 1);
        } else {
          const discountAmt = (curr.price * newQty * curr.discountPercent) / 100;
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
      })
    );
  };

  const removeItem = (index: number) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const updated = tab.items.filter((_, i) => i !== index);
        return { ...tab, items: updated };
      })
    );
  };

  const updateActiveTabField = (field: keyof CartTab, val: any) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return { ...tab, [field]: val };
      })
    );
  };

  // Calculations for active tab
  const subtotal = activeTab.items.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
  const discountTotal = activeTab.items.reduce((acc, curr) => acc + curr.discountAmount, 0);
  const taxTotal = activeTab.items.reduce((acc, curr) => acc + curr.taxAmount, 0);
  const grandTotal = Math.round(subtotal - discountTotal + taxTotal);
  const paidAmount = activeTab.paidAmount || grandTotal; // defaults to exact cash/tender
  const changeDue = Math.max(0, paidAmount - grandTotal);
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const handleCheckout = async (thenPrint = true) => {
    if (activeTab.items.length === 0) {
      alert('Cart is empty! Add products using barcode scanner or product grid.');
      return;
    }

    setIsProcessing(true);
    try {
      const invNumber = `POS-${Date.now().toString().slice(-6)}`;
      const txnPayload: Omit<Transaction, 'id' | 'createdAt'> = {
        invoiceNumber: invNumber,
        type: 'sale',
        partyId: activeTab.partyId || parties[0]?.id || 'walk-in',
        partyName: activeTab.partyName || 'Walk-in Retail Customer',
        date: new Date().toISOString().split('T')[0],
        items: activeTab.items,
        subtotal,
        discountTotal,
        taxTotal,
        cgst: taxTotal / 2,
        sgst: taxTotal / 2,
        igst: 0,
        total: grandTotal,
        paidAmount: Math.min(paidAmount, grandTotal),
        balanceDue,
        paymentMode: activeTab.paymentMode,
        status: balanceDue === 0 ? 'paid' : balanceDue === grandTotal ? 'unpaid' : 'partial',
        notes: `POS Quick Sale Checkout (${activeTab.paymentMode.toUpperCase()})`,
      };

      await onCompleteCheckout(txnPayload, thenPrint);

      // Reset or clear current tab
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId
            ? { ...t, items: [], paidAmount: 0 }
            : t
        )
      );
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCatalog = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
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
              className={`pos-tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.tabName}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                ({tab.items.length})
              </span>
              {tabs.length > 1 && (
                <X size={14} onClick={(e) => closeTab(tab.id, e)} />
              )}
            </div>
          ))}

          <button className="btn btn-secondary btn-sm" onClick={addNewTab} title="Hold & Open New Bill">
            <Plus size={14} />
            <span>Hold / New Bill</span>
          </button>
        </div>

        {/* Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="pos-search-bar">
          <div style={{ position: 'relative', flex: 1 }}>
            <Barcode size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--primary)' }} />
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
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          <button
            className={`btn btn-sm ${selectedCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Products
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`btn btn-sm ${selectedCategory === c ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="pos-product-grid">
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              className="pos-product-card"
              onClick={() => addItemToActiveCart(item)}
            >
              <div className="pos-product-title">{item.name}</div>
              <div className="pos-product-price">₹{item.salesPrice.toLocaleString()}</div>
              <div className="pos-product-stock">
                Stock: {item.currentStock} {item.unit}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Active Cart, Party Selector, Split Payment, Grand Total, Checkout */}
      <div className="pos-right">
        <div className="pos-cart-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} color="var(--primary)" />
            <select
              className="form-select"
              style={{ width: 220 }}
              value={activeTab.partyId}
              onChange={(e) => {
                const p = parties.find((party) => party.id === e.target.value);
                updateActiveTabField('partyId', e.target.value);
                if (p) updateActiveTabField('partyName', p.name);
              }}
            >
              <option value="">Walk-in Cash Customer</option>
              {parties.map((p) => (
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
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Barcode size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>Cart is currently empty.</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Scan product barcode or click items on the left to add.
              </div>
            </div>
          ) : (
            activeTab.items.map((item, idx) => (
              <div key={idx} className="pos-cart-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.itemName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ₹{item.price} x {item.quantity} {item.unit} (+{item.taxRate}% GST)
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="btn-icon"
                    style={{ padding: 4 }}
                    onClick={() => updateItemQty(idx, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    className="btn-icon"
                    style={{ padding: 4 }}
                    onClick={() => updateItemQty(idx, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div style={{ fontWeight: 700, minWidth: 70, textAlign: 'right' }}>
                  ₹{Math.round(item.total).toLocaleString()}
                </div>

                <button
                  className="btn-icon"
                  style={{ color: 'var(--danger)', padding: 4 }}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal:</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>GST Tax:</span>
            <span>₹{taxTotal.toLocaleString()}</span>
          </div>

          <div className="pos-total-row">
            <span>Payable:</span>
            <span style={{ color: 'var(--primary)' }}>₹{grandTotal.toLocaleString()}</span>
          </div>

          {/* Payment Mode Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {(['cash', 'upi', 'bank', 'cheque'] as PaymentMode[]).map((mode) => (
              <button
                key={mode}
                className={`btn btn-sm ${activeTab.paymentMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateActiveTabField('paymentMode', mode)}
                style={{ textTransform: 'uppercase' }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Tender Amount / Change Calculation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tender Cash (₹):</span>
            <input
              type="number"
              min="0"
              className="form-input"
              style={{ width: 120, textAlign: 'right', fontWeight: 700 }}
              value={paidAmount}
              onChange={(e) => updateActiveTabField('paidAmount', parseFloat(e.target.value) || 0)}
            />
          </div>

          {changeDue > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700 }}>
              <span>Return Change:</span>
              <span>₹{changeDue.toLocaleString()}</span>
            </div>
          )}

          {/* Checkout Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10 }}>
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
