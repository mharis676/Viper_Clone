import React from "react";
import { Calendar, X } from "lucide-react";

export type DateRangePreset =
  | "all"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DateRangePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
  compact?: boolean;
}

export const getPresetDates = (preset: DateRangePreset): { startDate: string; endDate: string } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  const d = now.getDate();

  const toIso = (date: Date) => date.toISOString().slice(0, 10);

  switch (preset) {
    case "this_month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { startDate: toIso(start), endDate: toIso(end) };
    }
    case "last_month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { startDate: toIso(start), endDate: toIso(end) };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor(m / 3) * 3;
      const start = new Date(y, qStartMonth, 1);
      const end = new Date(y, qStartMonth + 3, 0);
      return { startDate: toIso(start), endDate: toIso(end) };
    }
    case "this_year": {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return { startDate: toIso(start), endDate: toIso(end) };
    }
    case "all":
    default:
      return { startDate: "", endDate: "" };
  }
};

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  className = "",
  compact = false,
}) => {
  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === "all") {
      onChange({ startDate: "", endDate: "", preset: "all" });
      return;
    }
    if (preset === "custom") {
      onChange({ ...value, preset: "custom" });
      return;
    }
    const { startDate, endDate } = getPresetDates(preset);
    onChange({ startDate, endDate, preset });
  };

  const handleStartDateChange = (startDate: string) => {
    onChange({ ...value, startDate, preset: "custom" });
  };

  const handleEndDateChange = (endDate: string) => {
    onChange({ ...value, endDate, preset: "custom" });
  };

  const handleClear = () => {
    onChange({ startDate: "", endDate: "", preset: "all" });
  };

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: "all", label: "All Time" },
    { id: "this_month", label: "This Month" },
    { id: "last_month", label: "Last Month" },
    { id: "this_quarter", label: "This Quarter" },
    { id: "this_year", label: "This Year" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div
      className={`date-range-filter-card ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        background: "var(--bg-main)",
        padding: compact ? "10px 12px" : "12px 16px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
          <Calendar size={15} color="var(--primary)" />
          <span>Date Range Filter:</span>
        </div>

        {/* Preset chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {presets.map((p) => {
            const active = value.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.78rem",
                  borderRadius: "20px",
                  lineHeight: 1.2,
                }}
                onClick={() => handlePresetSelect(p.id)}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Pickers */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          paddingTop: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>From:</span>
          <input
            type="date"
            className="form-input"
            style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            value={value.startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>To:</span>
          <input
            type="date"
            className="form-input"
            style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            value={value.endDate}
            onChange={(e) => handleEndDateChange(e.target.value)}
          />
        </div>

        {(value.startDate || value.endDate || value.preset !== "all") && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            title="Reset to All Dates"
            onClick={handleClear}
            style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
};
