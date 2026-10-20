import { api } from '../api.js';
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Printer,
  Database,
  Download,
  Upload,
  Check,
  QrCode,
} from 'lucide-react';
import { BusinessProfile, PrintSettings } from '../types.js';

interface SettingsViewProps {
  profile: BusinessProfile | null;
  printSettings: PrintSettings;
  onUpdateProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  onUpdatePrintSettings: (settings: Partial<PrintSettings>) => Promise<void>;
  onRestoreBackup: (backupData: any) => Promise<void>;
  backupDownloadUrl: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  printSettings,
  onUpdateProfile,
  onUpdatePrintSettings,
  onRestoreBackup,
  backupDownloadUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'print' | 'backup'>('profile');

  // Profile form state
  const [name, setName] = useState(profile?.name || '');
  const [tradeName, setTradeName] = useState(profile?.tradeName || '');
  const [gstin, setGstin] = useState(profile?.gstin || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [city, setCity] = useState(profile?.city || '');
  const [state, setState] = useState(profile?.state || '');
  const [pincode, setPincode] = useState(profile?.pincode || '');
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [bankName, setBankName] = useState(profile?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(profile?.accountNumber || '');
  const [ifsc, setIfsc] = useState(profile?.ifsc || '');
  const [terms, setTerms] = useState(profile?.termsAndConditions || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => { if (!profile) return;
    setName(profile.name || '');
    setTradeName(profile.tradeName || '');
    setGstin(profile.gstin || '');
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setAddress(profile.address || '');
    setCity(profile.city || '');
    setState(profile.state || '');
    setPincode(profile.pincode || '');
    setUpiId(profile.upiId || '');
    setBankName(profile.bankName || '');
    setAccountNumber(profile.accountNumber || '');
    setIfsc(profile.ifsc || '');
    setTerms(profile.termsAndConditions || '');
  }, [profile]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        name,
        tradeName,
        gstin,
        phone,
        email,
        address,
        city,
        state,
        pincode,
        upiId,
        bankName,
        accountNumber,
        ifsc,
        termsAndConditions: terms,
      });
      alert('Business profile updated successfully!');
    } catch (err: any) {
      alert(`Error updating profile: ${err.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('Restoring this backup will replace current database records. Proceed?')) {
          await onRestoreBackup(json);
          alert('Database restored successfully! Reloading...');
          window.location.reload();
        }
      } catch (err: any) {
        alert(`Invalid backup JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Settings size={24} color="var(--primary)" />
            <span>Settings & Business Configuration</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Business details, thermal & laser print templates, bank details, and data backups
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profile')}
        >
          <Building size={14} />
          <span>Business Profile</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'print' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('print')}
        >
          <Printer size={14} />
          <span>Invoice & Print Designer</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('backup')}
        >
          <Database size={14} />
          <span>Backup & Restore</span>
        </button>
      </div>

      {/* 1. Business Profile Form */}
      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: 850 }}>
          <form onSubmit={handleProfileSubmit}>
            <div className="card-header">
              <div className="card-title">Company Identification & Legal Details</div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Registered Business Legal Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trade / Brand Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Tax Registration ID (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Phone Number *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Business Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Registered Address *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <h4 style={{ marginBottom: 12, fontSize: '1rem' }}>Bank Payment Details for Invoices</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Number / IBAN</label>
                    <input
                      type="text"
                      className="form-input"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bank / Branch Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Default Invoice Terms & Conditions</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                  <Check size={16} />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 2. Print Settings */}
      {activeTab === 'print' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <div className="card-title">Invoice Print Themes & Layouts</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Default Paper Print Format</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  { id: 'laser_a4', name: 'Laser A4 Tax Invoice', desc: 'Full-page formal GST layout with HSN table' },
                  { id: 'thermal_80mm', name: 'Thermal 80mm Roll', desc: 'High-speed retail counter receipt with QR' },
                ].map((paper) => (
                  <div
                    key={paper.id}
                    onClick={() => onUpdatePrintSettings({ paperSize: paper.id as any })}
                    style={{
                      padding: 14,
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${printSettings.paperSize === paper.id ? 'var(--primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      background: printSettings.paperSize === paper.id ? 'var(--primary-light)' : 'var(--bg-main)',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{paper.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{paper.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
              <h4 style={{ marginBottom: 12 }}>Invoice Elements Display</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={printSettings.signature}
                    onChange={(e) => onUpdatePrintSettings({ signature: e.target.checked })}
                  />
                  <span>Show Authorised Signatory Box</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={printSettings.notesAndTerms}
                    onChange={(e) => onUpdatePrintSettings({ notesAndTerms: e.target.checked })}
                  />
                  <span>Show Terms & Conditions Footer</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <div className="card-title">Database Backup, Export & Disaster Recovery</div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 16, background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Download size={18} color="var(--primary)" />
                <span>Export Complete Business Snapshot (JSON)</span>
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Downloads all customers, suppliers, inventory stock, invoices, expenses, and accounts as a portable JSON snapshot.
              </p>
              <button onClick={() => api.downloadBackup().catch(e => alert(e.message))} className="btn btn-primary btn-sm">
                <Download size={14} />
                <span>Download Backup Now</span>
              </button>
            </div>

            <div style={{ padding: 16, background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Upload size={18} color="var(--secondary)" />
                <span>Restore Database from Backup</span>
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Select a previously saved Viper JSON backup to restore all business data.
              </p>
              <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                <Upload size={14} />
                <span>Choose Backup File...</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleBackupFileSelect}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
