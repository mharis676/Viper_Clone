import { api } from "../api.js";
import React, { useState, useEffect, useRef } from "react";
import {
  Settings,
  Building,
  Printer,
  Database,
  Download,
  Upload,
  Check,
  QrCode,
  CheckCircle,
  AlertCircle,
  Clock,
  History,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { BusinessProfile, PrintSettings, BackupMetadata } from "../types.js";
import { ChangeHistoryModal } from "../components/ChangeHistoryModal.js";

interface SettingsViewProps {
  profile: BusinessProfile | null;
  printSettings: PrintSettings;
  onUpdateProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  onUpdatePrintSettings: (settings: Partial<PrintSettings>) => Promise<void>;
  onRestoreBackup: (backupData: any) => Promise<void>;
  initialTab?: "profile" | "print" | "backup" | "history";
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  printSettings,
  onUpdateProfile,
  onUpdatePrintSettings,
  onRestoreBackup,
  initialTab = "profile",
}) => {
  const [activeTab, setActiveTab] = useState<
    "profile" | "print" | "backup" | "history"
  >(initialTab);

  const backupFileInput = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupSuccess, setBackupSuccess] = useState("");
  const [lastBackup, setLastBackup] = useState<BackupMetadata | null>(null);

  // Restore preview modal state
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Load last backup info
  useEffect(() => {
    const loadBackupMeta = async () => {
      try {
        const meta = await api.getLastBackupMetadata();
        if (meta && meta.lastBackupAt) {
          setLastBackup(meta);
        } else {
          const local = localStorage.getItem("viper_last_backup_meta");
          if (local) setLastBackup(JSON.parse(local));
        }
      } catch {
        const local = localStorage.getItem("viper_last_backup_meta");
        if (local) setLastBackup(JSON.parse(local));
      }
    };
    loadBackupMeta();
  }, []);

  const exportBackup = async () => {
    setExporting(true);
    setBackupError("");
    setBackupSuccess("");
    try {
      await api.downloadBackup();
      const meta: BackupMetadata = {
        lastBackupAt: new Date().toISOString(),
        lastBackupName: `viper-backup-${new Date().toISOString().slice(0, 10)}.json`,
      };
      await api.setLastBackupMetadata(meta).catch(() => {});
      localStorage.setItem("viper_last_backup_meta", JSON.stringify(meta));
      setLastBackup(meta);
      setBackupSuccess("Backup generated and saved successfully!");
    } catch (error: any) {
      setBackupError(
        error.message || "Could not export backup. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBackupFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBackupError("");
    setBackupSuccess("");

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Validate backup has essential keys
      if (!json || typeof json !== "object" || !json.profile) {
        throw new Error("Invalid Viper backup structure: missing profile object");
      }
      if (!Array.isArray(json.parties) || !Array.isArray(json.transactions)) {
        throw new Error("Invalid Viper backup structure: missing core records");
      }

      setPendingRestoreData(json);
      setShowRestoreModal(true);
    } catch (error: any) {
      setBackupError(`Could not read backup file: ${error.message}`);
    } finally {
      input.value = "";
    }
  };

  const executeRestore = async () => {
    if (!pendingRestoreData) return;
    setRestoring(true);
    setBackupError("");
    try {
      await onRestoreBackup(pendingRestoreData);
      const meta: BackupMetadata = {
        lastBackupAt: new Date().toISOString(),
        lastBackupName: "Restored from user backup",
      };
      setLastBackup(meta);
      localStorage.setItem("viper_last_backup_meta", JSON.stringify(meta));
      setBackupSuccess("Business records restored successfully!");
      setShowRestoreModal(false);
      setPendingRestoreData(null);
    } catch (error: any) {
      setBackupError(`Restore failed: ${error.message}`);
    } finally {
      setRestoring(false);
    }
  };

  // Profile form state
  const [name, setName] = useState(profile?.name || "");
  const [tradeName, setTradeName] = useState(profile?.tradeName || "");
  const [gstin, setGstin] = useState(profile?.gstin || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [pincode, setPincode] = useState(profile?.pincode || "");
  const [upiId, setUpiId] = useState(profile?.upiId || "");
  const [bankName, setBankName] = useState(profile?.bankName || "");
  const [accountNumber, setAccountNumber] = useState(
    profile?.accountNumber || "",
  );
  const [ifsc, setIfsc] = useState(profile?.ifsc || "");
  const [terms, setTerms] = useState(profile?.termsAndConditions || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name || "");
    setTradeName(profile.tradeName || "");
    setGstin(profile.gstin || "");
    setPhone(profile.phone || "");
    setEmail(profile.email || "");
    setAddress(profile.address || "");
    setCity(profile.city || "");
    setState(profile.state || "");
    setPincode(profile.pincode || "");
    setUpiId(profile.upiId || "");
    setBankName(profile.bankName || "");
    setAccountNumber(profile.accountNumber || "");
    setIfsc(profile.ifsc || "");
    setTerms(profile.termsAndConditions || "");
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
      alert("Business profile updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Settings size={24} color="var(--primary)" />
            <span>
              {activeTab === "backup"
                ? "Data Backup & Recovery"
                : activeTab === "history"
                  ? "Audit Trail & Change History"
                  : "Settings & Business Configuration"}
            </span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            {activeTab === "backup"
              ? "Safeguard your accounts, view backup history, and restore with 1-click verification"
              : activeTab === "history"
                ? "Full log of all changes made to invoices, payments, and opening balances"
                : "Business details, thermal & laser print templates, bank details, and data backups"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${activeTab === "profile" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("profile")}
        >
          <Building size={14} />
          <span>Business Profile</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === "print" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("print")}
        >
          <Printer size={14} />
          <span>Print Templates</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === "backup" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("backup")}
        >
          <Database size={14} />
          <span>Backup & Restore</span>
        </button>
        <button
          className={`btn btn-sm ${activeTab === "history" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("history")}
        >
          <History size={14} />
          <span>Audit Log</span>
        </button>
      </div>

      {/* 1. Profile Form */}
      {activeTab === "profile" && (
        <div className="card" style={{ maxWidth: 800 }}>
          <form onSubmit={handleProfileSubmit}>
            <div className="card-header">
              <div className="card-title">Company Identity & Tax Details</div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Legal Business Name *</label>
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
                <div className="form-group">
                  <label className="form-label">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Business Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
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
                  <label className="form-label">State / Province</label>
                  <input
                    type="text"
                    className="form-input"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 14 }}>
                <h4 style={{ marginBottom: 12 }}>Bank Account & Payment Details</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
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
                    <label className="form-label">Mobile Wallet / EasyPaisa / JazzCash</label>
                    <input
                      type="text"
                      className="form-input"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Default Terms & Conditions</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
      {activeTab === "print" && (
        <div className="card" style={{ maxWidth: 700 }}>
          <div className="card-header">
            <div className="card-title">Invoice Print Themes & Layouts</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Default Paper Print Format</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  {
                    id: "laser_a4",
                    name: "Laser A4 Tax Invoice",
                    desc: "Full-page formal GST layout with HSN table",
                  },
                  {
                    id: "thermal_80mm",
                    name: "Thermal 80mm Roll",
                    desc: "High-speed retail counter receipt",
                  },
                ].map((paper) => (
                  <div
                    key={paper.id}
                    onClick={() =>
                      onUpdatePrintSettings({ paperSize: paper.id as any })
                    }
                    style={{
                      padding: 14,
                      borderRadius: "var(--radius-sm)",
                      border: `2px solid ${
                        printSettings.paperSize === paper.id
                          ? "var(--primary)"
                          : "var(--border-color)"
                      }`,
                      cursor: "pointer",
                      background:
                        printSettings.paperSize === paper.id
                          ? "var(--primary-light)"
                          : "var(--bg-main)",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{paper.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {paper.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
              <h4 style={{ marginBottom: 12 }}>Invoice Elements Display</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={printSettings.signature}
                    onChange={(e) =>
                      onUpdatePrintSettings({ signature: e.target.checked })
                    }
                  />
                  <span>Show Authorised Signatory Box</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={printSettings.notesAndTerms}
                    onChange={(e) =>
                      onUpdatePrintSettings({ notesAndTerms: e.target.checked })
                    }
                  />
                  <span>Show Terms & Conditions Footer</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Backup & Restore (Requirement 8) */}
      {activeTab === "backup" && (
        <div className="card" style={{ maxWidth: 740 }}>
          <div className="card-header">
            <div className="card-title">Keep Your Business Data Safe</div>
          </div>

          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {backupError && <div role="alert" className="error-banner">{backupError}</div>}
            {backupSuccess && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(46, 125, 50, 0.1)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle size={16} />
                <span>{backupSuccess}</span>
              </div>
            )}

            {/* Last Backup Status Card (Requirement 8) */}
            <div
              style={{
                padding: "16px",
                borderRadius: "var(--radius-md)",
                background: lastBackup?.lastBackupAt ? "rgba(46, 125, 50, 0.06)" : "rgba(245, 124, 0, 0.06)",
                border: `1px solid ${lastBackup?.lastBackupAt ? "var(--success)" : "#F57C00"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {lastBackup?.lastBackupAt ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(46, 125, 50, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--success)",
                    }}
                  >
                    <CheckCircle size={22} />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(245, 124, 0, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#F57C00",
                    }}
                  >
                    <AlertTriangle size={22} />
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {lastBackup?.lastBackupAt ? "Last Successful Backup" : "No Backup Recorded Yet"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    {lastBackup?.lastBackupAt
                      ? new Date(lastBackup.lastBackupAt).toLocaleString()
                      : "We recommend creating regular backups to safeguard your business records."}
                  </div>
                  {lastBackup?.lastBackupName && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      File: {lastBackup.lastBackupName}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                disabled={exporting || restoring}
                onClick={exportBackup}
              >
                <Download size={15} />
                <span>{exporting ? "Creating Backup..." : "Create Backup Now"}</span>
              </button>
            </div>

            {/* Easy Backup Export Details */}
            <div
              style={{
                padding: 16,
                background: "var(--bg-main)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
              }}
            >
              <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Download size={18} color="var(--primary)" />
                <span>Export Full Business Backup</span>
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                Downloads a complete encrypted JSON backup containing your business profile, customer & supplier ledgers, inventory catalog, invoices, payments, expenses, and settings.
              </p>
              <button
                onClick={exportBackup}
                disabled={exporting || restoring}
                className="btn btn-secondary"
              >
                <Download size={14} />
                <span>{exporting ? "Preparing backup..." : "Download JSON Backup"}</span>
              </button>
            </div>

            {/* Easy Backup Restore with Preview (Requirement 8) */}
            <div
              style={{
                padding: 16,
                background: "var(--bg-main)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
              }}
            >
              <h4 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Upload size={18} color="var(--secondary)" />
                <span>Restore Saved Backup</span>
              </h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 12 }}>
                Select a previously exported Viper JSON backup file. You will see a preview of the contents before confirming restoration.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                disabled={exporting || restoring}
                onClick={() => backupFileInput.current?.click()}
              >
                <Upload size={14} />
                <span>{restoring ? "Restoring Records..." : "Choose Backup File to Restore"}</span>
              </button>

              <input
                ref={backupFileInput}
                type="file"
                disabled={exporting || restoring}
                aria-label="Choose backup JSON file"
                accept=".json,application/json"
                style={{ display: "none" }}
                onChange={handleBackupFileSelect}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Audit Log / Change History Tab (Requirement 7) */}
      {activeTab === "history" && (
        <div style={{ maxWidth: 840 }}>
          <ChangeHistoryModal
            isOpen={true}
            onClose={() => setActiveTab("profile")}
          />
        </div>
      )}

      {/* Restore Confirmation Preview Modal (Requirement 8) */}
      {showRestoreModal && pendingRestoreData && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileCheck size={20} color="var(--primary)" />
                <h3 style={{ margin: 0 }}>Verify Backup Contents</h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowRestoreModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(245, 124, 0, 0.08)",
                  border: "1px solid #FF9800",
                  borderRadius: "var(--radius-sm)",
                  color: "#E65100",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertTriangle size={18} />
                <span>Restoring will replace all current business records with this backup.</span>
              </div>

              <div style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                Backup file verified successfully:
              </div>

              <div
                style={{
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontSize: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Business Profile:</span>
                  <strong>{pendingRestoreData.profile?.name || "Unnamed"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Customer / Supplier Parties:</span>
                  <strong>{pendingRestoreData.parties?.length || 0} parties</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Inventory Products:</span>
                  <strong>{pendingRestoreData.items?.length || 0} items</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Invoices & Transactions:</span>
                  <strong>{pendingRestoreData.transactions?.length || 0} records</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Operating Expenses:</span>
                  <strong>{pendingRestoreData.expenses?.length || 0} expenses</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={restoring}
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={restoring}
                onClick={executeRestore}
              >
                {restoring ? "Restoring Records..." : "Confirm & Restore Records"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
