import React, { useState, useEffect } from "react";
import { History, X, Search, Filter, RefreshCw, Clock, ArrowRight } from "lucide-react";
import { ChangeHistoryEntry } from "../types.js";
import { api } from "../api.js";

interface ChangeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntityType?: "invoice" | "payment" | "opening_balance" | "party";
  initialEntityId?: string;
}

export const ChangeHistoryModal: React.FC<ChangeHistoryModalProps> = ({
  isOpen,
  onClose,
  initialEntityType,
  initialEntityId,
}) => {
  const [entries, setEntries] = useState<ChangeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>(initialEntityType || "all");
  const [search, setSearch] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getChangeHistory({
        entityType: filterType !== "all" ? filterType : undefined,
        entityId: initialEntityId,
        limit: 100,
      });
      setEntries(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, filterType, initialEntityId]);

  if (!isOpen) return null;

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      e.summary.toLowerCase().includes(term) ||
      (e.entityNumber && e.entityNumber.toLowerCase().includes(term)) ||
      e.entityType.toLowerCase().includes(term)
    );
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case "created":
        return <span className="badge badge-paid">Created</span>;
      case "updated":
        return <span className="badge badge-partial">Updated</span>;
      case "deleted":
        return <span className="badge badge-unpaid">Deleted</span>;
      default:
        return <span className="badge">{action}</span>;
    }
  };

  const getEntityBadge = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      invoice: { bg: "#E3F2FD", color: "#1565C0" },
      payment: { bg: "#E8F5E9", color: "#2E7D32" },
      opening_balance: { bg: "#FFF3E0", color: "#E65100" },
      party: { bg: "#F3E5F5", color: "#7B1FA2" },
    };
    const c = colors[type] || { bg: "var(--bg-main)", color: "var(--text-primary)" };
    const label = type.replace("_", " ").toUpperCase();
    return (
      <span
        style={{
          background: c.bg,
          color: c.color,
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 4,
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 780 }}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <History size={22} color="var(--primary)" />
            <div>
              <h3 style={{ margin: 0 }}>Audit Trail & Change History</h3>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Track changes to invoices, client payments, and party opening balances
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                { id: "all", label: "All Activity" },
                { id: "invoice", label: "Invoices" },
                { id: "payment", label: "Payments" },
                { id: "opening_balance", label: "Opening Balances" },
                { id: "party", label: "Parties" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn btn-sm ${filterType === tab.id ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setFilterType(tab.id)}
                  style={{ fontSize: "0.8rem", padding: "4px 10px", borderRadius: 20 }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", width: 200 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: 30, paddingRight: 8, height: 34, fontSize: "0.82rem" }}
                  placeholder="Search records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                title="Refresh log"
                disabled={loading}
                onClick={loadHistory}
                style={{ padding: "6px 10px" }}
              >
                <RefreshCw size={14} className={loading ? "spin" : ""} />
              </button>
            </div>
          </div>

          {/* Timeline of Changes */}
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              Loading audit log...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              No recorded changes found for this filter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto" }}>
              {filtered.map((item) => {
                const date = new Date(item.timestamp);
                const timeStr = isNaN(date.getTime())
                  ? item.timestamp
                  : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px 16px",
                      background: "var(--bg-main)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {getEntityBadge(item.entityType)}
                        {getActionBadge(item.action)}
                        {item.entityNumber && (
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.88rem" }}>
                            {item.entityNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        <Clock size={12} />
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
                      {item.summary}
                    </div>

                    {/* Detailed field diffs if any */}
                    {item.changes && item.changes.length > 0 && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: "8px 12px",
                          background: "var(--bg-card)",
                          borderRadius: "var(--radius-sm)",
                          borderLeft: "3px solid var(--primary)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {item.changes.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{c.field}:</span>
                            <span style={{ textDecoration: "line-through", color: "var(--danger)" }}>
                              {String(c.oldValue ?? "none")}
                            </span>
                            <ArrowRight size={12} color="var(--text-muted)" />
                            <span style={{ fontWeight: 700, color: "var(--success)" }}>
                              {String(c.newValue ?? "none")}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
