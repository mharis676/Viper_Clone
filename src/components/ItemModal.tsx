import React, { useState, useEffect } from 'react';
import { X, Check, Barcode } from 'lucide-react';
import { Item } from '../types.js';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Item, 'id' | 'createdAt'>) => Promise<void>;
  initialItem?: Item | null;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('General');
  const [unit, setUnit] = useState('Pcs');
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [salesPrice, setSalesPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [hsnCode, setHsnCode] = useState('');
  const [minStockAlert, setMinStockAlert] = useState<number>(5);
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setName(initialItem.name);
        setCode(initialItem.code);
        setBarcode(initialItem.barcode);
        setCategory(initialItem.category);
        setUnit(initialItem.unit);
        setPurchasePrice(initialItem.purchasePrice);
        setSalesPrice(initialItem.salesPrice);
        setMrp(initialItem.mrp);
        setTaxRate(initialItem.taxRate);
        setHsnCode(initialItem.hsnCode || '');
        setMinStockAlert(initialItem.minStockAlert);
        setCurrentStock(initialItem.currentStock);
      } else {
        const rnd = Math.floor(100000 + Math.random() * 900000);
        setName('');
        setCode(`ITM-${rnd.toString().slice(-4)}`);
        setBarcode(`890103${rnd}`);
        setCategory('General');
        setUnit('Pcs');
        setPurchasePrice(0);
        setSalesPrice(0);
        setMrp(0);
        setTaxRate(18);
        setHsnCode('');
        setMinStockAlert(5);
        setCurrentStock(0);
      }
    }
  }, [isOpen, initialItem]);

  if (!isOpen) return null;

  const generateBarcode = () => {
    const rnd = Math.floor(100000 + Math.random() * 900000);
    setBarcode(`890103${rnd}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter Item Name');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        code,
        barcode,
        category,
        unit,
        purchasePrice,
        salesPrice,
        mrp: mrp || salesPrice,
        taxRate,
        hsnCode,
        minStockAlert,
        currentStock,
        godownId: 'godown-1',
      });
      onClose();
    } catch (err: any) {
      alert(`Error saving item: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3>{initialItem ? 'Edit Product Item' : 'Add New Item / Product'}</h3>
            <button type="button" className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Item / Product Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Wireless Mouse"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Item Code / SKU</label>
                <input
                  type="text"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Barcode Number</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={generateBarcode} title="Generate EAN Barcode">
                    <Barcode size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Computer Peripherals"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select className="form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="Pcs">Pcs (Pieces)</option>
                  <option value="Box">Box</option>
                  <option value="Kg">Kg (Kilograms)</option>
                  <option value="Ltr">Ltr (Liters)</option>
                  <option value="Mtr">Mtr (Meters)</option>
                  <option value="Pack">Pack</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Purchase Price (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={salesPrice}
                  onChange={(e) => setSalesPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">MRP (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  value={mrp}
                  onChange={(e) => setMrp(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">GST Tax Rate</label>
                <select
                  className="form-select"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                >
                  <option value="0">Exempt (0%)</option>
                  <option value="5">GST 5%</option>
                  <option value="12">GST 12%</option>
                  <option value="18">GST 18%</option>
                  <option value="28">GST 28%</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">HSN / SAC Code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 847160"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Min Stock Alert</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={minStockAlert}
                  onChange={(e) => setMinStockAlert(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Opening / Current Stock Quantity</label>
              <input
                type="number"
                min="0"
                className="form-input"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              <Check size={16} />
              <span>Save Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
