import { printDocument, exportPdf } from "../export.js";
import React, { useState, useRef } from "react";
import {
  Users,
  Plus,
  Search,
  MessageCircle,
  FileText,
  Edit2,
  Trash2,
  Phone,
} from "lucide-react";
import { Party, PartyType, LedgerEntry, PartyStatementResult } from "../types.js";
import { DateRangeFilter, DateRange } from "../components/DateRangeFilter.js";
import { DocumentActions } from "../components/DocumentActions.js";
import { api } from "../api.js";

interface PartiesViewProps {
  parties: Party[];
  onOpenAddParty: (type?: PartyType) => void;
  onEditParty: (party: Party) => void;
  onDeleteParty: (id: string) => void;
  onOpenWhatsApp: (party: Party) => void;
  onViewDocument: (id: string) => void;
  onViewLedger?: (party: Party) => Promise<LedgerEntry[]>;
}

export const PartiesView: React.FC<PartiesViewProps> = ({
  parties,
  onOpenAddParty,
  onEditParty,
  onDeleteParty,
  onOpenWhatsApp,
  onViewLedger,
  onViewDocument,
}) => {
  const statementRef = useRef<HTMLDivElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "customer" | "supplier">("all");
  const [search, setSearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [statementData, setStatementData] = useState<PartyStatementResult | null>(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    preset: "all",
  });

  const handlePdf = async (share = false) => {
    if (!statementRef.current || !selectedParty) return;
    setExporting(true);
    try {
      const fileName = `${selectedParty.name.replace(/\s+/g, "_")}_Statement${
        dateRange.startDate ? `_${dateRange.startDate}_to_${dateRange.endDate || "now"}` : ""
      }`;
      await exportPdf(statementRef.current, fileName, share);
    } catch (e) {
      if ((e as Error).name !== "AbortError") alert((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printDocument();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredParties = parties.filter((p) => {
    const matchesType = filterType === "all" || p.type === filterType;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.gstin && p.gstin.toLowerCase().includes(search.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const loadStatement = async (party: Party, range: DateRange) => {
    setLoadingLedger(true);
    try {
      const res = await api.getPartyStatement(
        party.id,
        range.startDate || undefined,
        range.endDate || undefined,
      );
      setStatementData(res);
    } catch (e) {
      console.error("Failed to load party statement:", e);
      if (onViewLedger) {
        const legacy = await onViewLedger(party);
        let run = party.openingBalance;
        const entries = legacy.map((l) => {
          run = l.runningBalance;
          const balanceType: "Dr" | "Cr" | "Settled" = run > 0 ? "Dr" : run < 0 ? "Cr" : "Settled";
          const balanceLabel: "To Receive" | "To Pay" | "Settled" = run > 0 ? "To Receive" : run < 0 ? "To Pay" : "Settled";
          return { ...l, balanceType, balanceLabel };
        });
        const openType: "Dr" | "Cr" | "Settled" = party.openingBalance > 0 ? "Dr" : party.openingBalance < 0 ? "Cr" : "Settled";
        const openLabel: "To Receive" | "To Pay" | "Settled" = party.openingBalance > 0 ? "To Receive" : party.openingBalance < 0 ? "To Pay" : "Settled";
        const closeType: "Dr" | "Cr" | "Settled" = party.currentBalance > 0 ? "Dr" : party.currentBalance < 0 ? "Cr" : "Settled";
        const closeLabel: "To Receive" | "To Pay" | "Settled" = party.currentBalance > 0 ? "To Receive" : party.currentBalance < 0 ? "To Pay" : "Settled";
        setStatementData({
          party,
          startDate: range.startDate,
          endDate: range.endDate,
          openingBalance: party.openingBalance,
          openingBalanceType: openType,
          openingBalanceLabel: openLabel,
          entries,
          totalDebits: entries.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0),
          totalCredits: entries.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0),
          closingBalance: party.currentBalance,
          closingBalanceType: closeType,
          closingBalanceLabel: closeLabel,
        });
      }
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenPartyLedger = async (party: Party) => {
    setSelectedParty(party);
    setReviewing(false);
    const defaultRange: DateRange = { startDate: "", endDate: "", preset: "all" };
    setDateRange(defaultRange);
    await loadStatement(party, defaultRange);
  };

  const handleDateRangeChange = async (newRange: DateRange) => {
    setDateRange(newRange);
    if (selectedParty) {
      await loadStatement(selectedParty, newRange);
    }
  };

  const renderBalanceBadge = (type: "Dr" | "Cr" | "Settled", label: "To Receive" | "To Pay" | "Settled") => {
    if (type === "Settled") {
      return (
        <span
          style={{
            display: "inline-block",
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            background: "var(--border-color)",
            color: "var(--text-secondary)",
            marginLeft: 6,
          }}
        >
          Settled
        </span>
      );
    }
    const isDr = type === "Dr";
    return (
      <span
        style={{
          display: "inline-block",
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 4,
          background: isDr ? "rgba(46, 125, 50, 0.12)" : "rgba(198, 40, 40, 0.12)",
          color: isDr ? "var(--success)" : "var(--danger)",
          marginLeft: 6,
          whiteSpace: "nowrap",
        }}
      >
        {type} ({label})
      </span>
    );
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Users size={24} color="var(--primary)" />
            <span>Parties (Customers & Suppliers)</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Manage client ledgers, credit limits, GST numbers, and payment collection reminders
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onOpenAddParty("supplier")}>
            <Plus size={16} />
            <span>+ Add Supplier</span>
          </button>
          <button className="btn btn-primary" onClick={() => onOpenAddParty("customer")}>
            <Plus size={16} />
            <span>+ Add Customer</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn btn-sm ${filterType === "all" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("all")}
          >
            All Parties ({parties.length})
          </button>
          <button
            className={`btn btn-sm ${filterType === "customer" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("customer")}
          >
            Customers ({parties.filter((p) => p.type === "customer").length})
          </button>
          <button
            className={`btn btn-sm ${filterType === "supplier" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setFilterType("supplier")}
          >
            Suppliers ({parties.filter((p) => p.type === "supplier").length})
          </button>
        </div>

        <div style={{ position: "relative", width: 280 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search name, phone, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Parties Data Table */}
      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>GSTIN</th>
                <th>Credit Limit</th>
                <th style={{ textAlign: "right" }}>Running Balance</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParties.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No parties found matching "{search}".
                  </td>
                </tr>
              ) : (
                filteredParties.map((party) => {
                  const bal = party.currentBalance;
                  const balType = bal > 0 ? "Dr" : bal < 0 ? "Cr" : "Settled";
                  const balLabel = bal > 0 ? "To Receive" : bal < 0 ? "To Pay" : "Settled";

                  return (
                    <tr key={party.id}>
                      <td style={{ fontWeight: 600 }}>{party.name}</td>
                      <td>
                        <span className={`badge ${party.type === "customer" ? "badge-paid" : "badge-unpaid"}`}>
                          {party.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Phone size={14} color="var(--text-muted)" />
                          <span>{party.phone}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                        {party.gstin || "-"}
                      </td>
                      <td>PKR {(party.creditLimit || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", fontWeight: 700 }}>
                          <span>PKR {Math.abs(party.currentBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}</span>
                          {renderBalanceBadge(balType, balLabel)}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          <button
                            className="btn-icon"
                            title="Send WhatsApp Payment Reminder"
                            onClick={() => onOpenWhatsApp(party)}
                            style={{ color: "#25D366" }}
                          >
                            <MessageCircle size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            title="View Ledger Statement"
                            onClick={() => handleOpenPartyLedger(party)}
                          >
                            <FileText size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Edit Party Details"
                            onClick={() => onEditParty(party)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Delete Party"
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${party.name}?`)) {
                                onDeleteParty(party.id);
                              }
                            }}
                            style={{ color: "var(--danger)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statement of Accounts / Ledger Modal */}
      {selectedParty && (
        <div className="modal-overlay" onClick={() => setSelectedParty(null)}>
          <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedParty.name} — Statement of Accounts</h3>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
                  Phone: {selectedParty.phone} | Address: {selectedParty.billingAddress || "N/A"} | Tax ID: {selectedParty.gstin || "Unregistered"}
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedParty(null)} aria-label="Close statement">
                ✕
              </button>
            </div>

            {/* Date Range Selector Bar */}
            <div style={{ padding: "12px 20px 0 20px" }} className="no-print">
              <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} compact={true} />
            </div>

            <div className="modal-body print-area" ref={statementRef} data-pdf-active style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header summary for Print / PDF */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid var(--border-color)",
                  paddingBottom: 12,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.4rem", color: "var(--primary)" }}>{selectedParty.name}</h2>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
                    {selectedParty.billingAddress} | Phone: {selectedParty.phone}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Tax ID / GSTIN: {selectedParty.gstin || "Unregistered"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>STATEMENT OF ACCOUNT</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 2 }}>
                    Period: {dateRange.startDate || "Beginning"} to {dateRange.endDate || "Current Date"}
                  </div>
                  {statementData && (
                    <div style={{ marginTop: 6, fontWeight: 700, fontSize: "0.95rem" }}>
                      Closing Balance: PKR {Math.abs(statementData.closingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      {renderBalanceBadge(statementData.closingBalanceType, statementData.closingBalanceLabel)}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary KPI Strip */}
              {statementData && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 10,
                  }}
                  className="no-print"
                >
                  <div style={{ padding: 10, background: "var(--bg-main)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Opening Balance</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                      PKR {Math.abs(statementData.openingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      {renderBalanceBadge(statementData.openingBalanceType, statementData.openingBalanceLabel)}
                    </div>
                  </div>

                  <div style={{ padding: 10, background: "rgba(198, 40, 40, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(198, 40, 40, 0.2)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--danger)" }}>Period Debits (+)</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--danger)" }}>
                      PKR {statementData.totalDebits.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ padding: 10, background: "rgba(46, 125, 50, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(46, 125, 50, 0.2)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--success)" }}>Period Credits (-)</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--success)" }}>
                      PKR {statementData.totalCredits.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ padding: 10, background: "var(--bg-main)", borderRadius: "var(--radius-sm)", border: "2px solid var(--primary)" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--primary)", fontWeight: 700 }}>Closing Balance</div>
                    <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                      PKR {Math.abs(statementData.closingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      {renderBalanceBadge(statementData.closingBalanceType, statementData.closingBalanceLabel)}
                    </div>
                  </div>
                </div>
              )}

              {/* Statement Ledger Table */}
              {loadingLedger ? (
                <div style={{ padding: 40, textAlign: "center" }}>Loading ledger statement...</div>
              ) : !statementData ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)" }}>
                  Failed to load statement. Please try again.
                </div>
              ) : (
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Voucher / Ref #</th>
                        <th>Description</th>
                        <th style={{ textAlign: "right" }}>Debit (PKR)</th>
                        <th style={{ textAlign: "right" }}>Credit (PKR)</th>
                        <th style={{ textAlign: "right" }}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* 1. Explicit Opening Balance Row */}
                      <tr style={{ background: "var(--bg-main)", fontWeight: 600 }}>
                        <td>{statementData.startDate || selectedParty.createdAt.slice(0, 10)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>OPENING</td>
                        <td>Opening Balance {statementData.startDate ? `(as of ${statementData.startDate})` : ""}</td>
                        <td style={{ textAlign: "right" }}>
                          {statementData.openingBalance > 0
                            ? `PKR ${statementData.openingBalance.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {statementData.openingBalance < 0
                            ? `PKR ${Math.abs(statementData.openingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          PKR {Math.abs(statementData.openingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                          {renderBalanceBadge(statementData.openingBalanceType, statementData.openingBalanceLabel)}
                        </td>
                      </tr>

                      {/* 2. Transaction Rows */}
                      {statementData.entries.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>
                            No transaction entries in this date range.
                          </td>
                        </tr>
                      ) : (
                        statementData.entries.map((entry) => (
                          <tr key={entry.id}>
                            <td>{entry.date}</td>
                            <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span>{entry.invoiceNumber || "-"}</span>
                                {!reviewing && entry.transactionId && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm no-print"
                                    style={{ padding: "2px 6px", fontSize: "0.72rem" }}
                                    onClick={() => onViewDocument(entry.transactionId)}
                                  >
                                    View
                                  </button>
                                )}
                              </div>
                            </td>
                            <td>{entry.description}</td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: entry.type === "debit" ? "var(--danger)" : "inherit" }}>
                              {entry.type === "debit"
                                ? `PKR ${entry.amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
                                : "-"}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600, color: entry.type === "credit" ? "var(--success)" : "inherit" }}>
                              {entry.type === "credit"
                                ? `PKR ${entry.amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}`
                                : "-"}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              PKR {Math.abs(entry.runningBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                              {renderBalanceBadge(entry.balanceType, entry.balanceLabel)}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* 3. Explicit Closing Balance Footer Row */}
                      <tr style={{ background: "rgba(46, 125, 50, 0.08)", fontWeight: 800, borderTop: "2px solid var(--border-color)" }}>
                        <td colSpan={3} style={{ textTransform: "uppercase" }}>
                          Closing Balance {statementData.endDate ? `(as of ${statementData.endDate})` : ""}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--danger)" }}>
                          PKR {statementData.totalDebits.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", color: "var(--success)" }}>
                          PKR {statementData.totalCredits.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.95rem" }}>
                          PKR {Math.abs(statementData.closingBalance).toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                          {renderBalanceBadge(statementData.closingBalanceType, statementData.closingBalanceLabel)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Consistent Modal Actions Footer */}
            <div className="modal-footer no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <DocumentActions
                variant="modal-footer"
                size="sm"
                showLabels={true}
                documentTitle={`${selectedParty.name} Statement`}
                onDownloadPdf={() => handlePdf(false)}
                onShare={() => handlePdf(true)}
                onPrint={handlePrint}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={loadingLedger}
                  onClick={() => setReviewing(!reviewing)}
                >
                  {reviewing ? "Full Statement" : "Compact Review"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedParty(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
