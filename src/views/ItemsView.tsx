import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Barcode,
  Edit2,
  Trash2,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { Item } from '../types.js';

interface ItemsViewProps {
  items: Item[];
  initiallyLowStock?: boolean;
  onOpenAddItem: () => void;
  onEditItem: (item: Item) => void;
  onDeleteItem: (id: string) => void;
  onAdjustStock: (id: string, delta: number) => Promise<void>;
}

export const ItemsView: React.FC<ItemsViewProps> = ({
  items,
  initiallyLowStock = false,
  onOpenAddItem,
  onEditItem,
  onDeleteItem,
  onAdjustStock,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(initiallyLowStock);
  const [adjustingItem, setAdjustingItem] = useState<Item | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustMode, setAdjustMode] = useState<'add' | 'reduce'>('add');

  const categories = Array.from(new Set(items.map((i) => i.category)));

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLowStock = !onlyLowStock || item.currentStock <= item.minStockAlert;
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search);
    return matchesCategory && matchesLowStock && matchesSearch;
  });

  const handleStockAdjustmentSubmit = async () => {
    if (!adjustingItem) return;
    const finalDelta = adjustMode === 'add' ? Math.abs(adjustDelta) : -Math.abs(adjustDelta);
    try {
      await onAdjustStock(adjustingItem.id, finalDelta);
      setAdjustingItem(null);
    } catch (e: any) {
      alert(`Failed to adjust stock: ${e.message}`);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Package size={24} color="var(--primary)" />
            <span>Items & Stock Inventory</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time stock valuation, barcode tracking, tax slabs, and automatic low-stock warnings
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenAddItem}>
          <Plus size={16} />
          <span>+ Add New Item</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="form-select"
            style={{ width: 180 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            className={`btn btn-sm ${onlyLowStock ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => setOnlyLowStock(!onlyLowStock)}
          >
            <AlertTriangle size={14} />
            <span>Low Stock Items Only</span>
          </button>
        </div>

        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item Name & Code</th>
                <th>Category</th>
                <th>Barcode</th>
                <th style={{ textAlign: 'right' }}>Cost Price (PKR)</th>
                <th style={{ textAlign: 'right' }}>Selling Price (PKR)</th>
                <th>Tax Rate</th>
                <th>Stock Quantity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isLow = item.currentStock <= item.minStockAlert;

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        SKU: {item.code} {item.hsnCode ? `• HSN: ${item.hsnCode}` : ''}
                      </div>
                    </td>
                    <td>{item.category}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Barcode size={16} color="var(--text-muted)" />
                        <span>{item.barcode}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>PKR {item.purchasePrice.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>PKR {item.salesPrice.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className="badge badge-paid">GST {item.taxRate}%</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {item.currentStock} {item.unit}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Alert: &lt;= {item.minStockAlert}
                      </div>
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-unpaid">
                          <AlertTriangle size={12} /> Low Stock
                        </span>
                      ) : (
                        <span className="badge badge-paid">In Stock</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn-icon"
                          title="Adjust Stock Quantity (+/-)"
                          onClick={() => {
                            setAdjustingItem(item);
                            setAdjustDelta(1);
                            setAdjustMode('add');
                          }}
                        >
                          <ArrowUpDown size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Edit Item Details"
                          onClick={() => onEditItem(item)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete Item"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                              onDeleteItem(item.id);
                            }
                          }}
                          style={{ color: 'var(--danger)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustingItem && (
        <div className="modal-overlay" onClick={() => setAdjustingItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3>Quick Stock Adjustment</h3>
              <button className="btn-icon" onClick={() => setAdjustingItem(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{adjustingItem.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Current Stock: <strong>{adjustingItem.currentStock} {adjustingItem.unit}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className={`btn ${adjustMode === 'add' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setAdjustMode('add')}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  className={`btn ${adjustMode === 'reduce' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setAdjustMode('reduce')}
                >
                  - Reduce / Waste
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Quantity to {adjustMode === 'add' ? 'Add' : 'Deduct'} ({adjustingItem.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.9rem',
                }}
              >
                New Stock will be:{' '}
                <strong>
                  {adjustMode === 'add'
                    ? adjustingItem.currentStock + adjustDelta
                    : Math.max(0, adjustingItem.currentStock - adjustDelta)}{' '}
                  {adjustingItem.unit}
                </strong>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAdjustingItem(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleStockAdjustmentSubmit}>
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
