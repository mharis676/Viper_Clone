import { csvCell, exportFile, printDocument, exportPdf } from "../export.js";
import React, { useState, useRef, useEffect } from "react";
import {
  FileBarChart,
  Download,
  Eye,
  X,
  Printer,
  TrendingUp,
  Percent,
  CheckCircle,
  Package,
  Calendar,
} from "lucide-react";
import { ProfitAndLossReport, GstReport, Item, Transaction } from "../types.js";
import { DateRangeFilter, DateRange } from "../components/DateRangeFilter.js";
import { DocumentActions } from "../components/DocumentActions.js";
import { api } from "../api.js";

interface ReportsViewProps {
  pnlReport: ProfitAndLossReport | null;
  gstReport: GstReport | null;
  items: Item[];
  transactions: Transaction[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  pnlReport: initialPnl,
  gstReport: initialGst,
  items,
  transactions,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<
    "pnl" | "gst" | "stock"
  >("pnl");

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    preset: "all",
  });

  const [pnlReport, setPnlReport] = useState<ProfitAndLossReport | null>(initialPnl);
  const [gstReport, setGstReport] = useState<GstReport | null>(initialGst);
  const [loadingReports, setLoadingReports] = useState(false);

  // Sync initial props
  useEffect(() => {
    if (dateRange.preset === "all" && !dateRange.startDate && !dateRange.endDate) {
      if (initialPnl) setPnlReport(initialPnl);
      if (initialGst) setGstReport(initialGst);
    }
  }, [initialPnl, initialGst]);

  const loadFilteredReports = async (range: DateRange) => {
    setLoadingReports(true);
    try {
      const [pnlRes, gstRes] = await Promise.all([
        api.getProfitAndLoss(range.startDate || undefined, range.endDate || undefined),
        api.getGstReport(range.startDate || undefined, range.endDate || undefined),
      ]);
      setPnlReport(pnlRes);
      setGstReport(gstRes);
    } catch (err) {
      console.error("Failed to load date-filtered reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    loadFilteredReports(newRange);
  };

  const dateSuffix = dateRange.startDate
    ? `_${dateRange.startDate}_to_${dateRange.endDate || "present"}`
    : "";

  const download = async (name: string, content: string) => {
    try {
      await exportFile(name, content);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const exportStockSummaryCSV = () => {
    const headers = [
      "Item Name",
      "Code",
      "Barcode",
      "Category",
      "Stock Qty",
      "Unit",
      "Cost Price (PKR)",
      "Sales Price (PKR)",
      "Cost Valuation (PKR)",
      "Retail Valuation (PKR)",
    ];
    const rows = items.map((i) => [
      i.name,
      i.code,
      i.barcode,
      i.category,
      i.currentStock,
      i.unit,
      i.purchasePrice,
      i.salesPrice,
      i.currentStock * i.purchasePrice,
      i.currentStock * i.salesPrice,
    ]);
    return download(
      `Viper_Stock_Summary${dateSuffix}.csv`,
      [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"),
    );
  };

  const exportPnlCSV = () => {
    if (!pnlReport) return;
    const periodLabel = dateRange.startDate
      ? `Date Range: ${dateRange.startDate} to ${dateRange.endDate || "Present"}\n\n`
      : "Date Range: All Time\n\n";

    return download(
      `Viper_Profit_Loss${dateSuffix}.csv`,
      periodLabel +
        "Metric,Amount (PKR)\n" +
        [
          ["Net Sales Revenue", pnlReport.salesRevenue],
          ["Cost of Goods Sold", pnlReport.purchasesCost],
          ["Gross Profit", pnlReport.grossProfit],
          ["Operating Expenses", pnlReport.totalExpenses],
          ["Net Profit", pnlReport.netProfit],
        ]
          .map((row) => row.map(csvCell).join(","))
          .join("\n"),
    );
  };

  const exportGstCSV = () => {
    if (!gstReport) return;
    const periodLabel = dateRange.startDate
      ? `GST Report Period: ${dateRange.startDate} to ${dateRange.endDate || "Present"}\n\n`
      : "GST Report Period: All Time\n\n";

    return download(
      `Viper_GST_Tax_Report${dateSuffix}.csv`,
      periodLabel +
        "Metric,Amount (PKR)\n" +
        [
          ["Total Taxable Sales (Output)", gstReport.totalTaxableSale],
          ["Total Output GST Liability", gstReport.totalOutputGst],
          ["Total Taxable Purchases (Input)", gstReport.totalTaxablePurchase],
          ["Total Input GST Credit", gstReport.totalInputGst],
          ["Net GST Payable to Govt", gstReport.netGstPayable],
        ]
          .map((row) => row.map(csvCell).join(","))
          .join("\n"),
    );
  };

  const totalStockCostValuation = items.reduce(
    (sum, i) => sum + i.currentStock * i.purchasePrice,
    0,
  );
  const totalStockRetailValuation = items.reduce(
    (sum, i) => sum + i.currentStock * i.salesPrice,
    0,
  );

  const reportTitle =
    activeReportTab === "gst"
      ? "GST Tax Report (GSTR-1 / 2)"
      : activeReportTab === "stock"
        ? "Stock Valuation Summary"
        : "Profit & Loss Statement";

  const reportReady =
    activeReportTab === "stock" ||
    (activeReportTab === "gst" ? !!gstReport : !!pnlReport);

  const downloadPdf = async (share = false) => {
    if (!reportRef.current || !reportReady || exporting) return;
    setExporting(true);
    try {
      await exportPdf(
        reportRef.current,
        `Viper_${reportTitle.replace(/[\s\(\)\/]/g, "_")}${dateSuffix}`,
        share,
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") alert((error as Error).message);
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

  const reportContent = (
    <>
      {/* 1. Profit & Loss View */}
      {activeReportTab === "pnl" && pnlReport && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="kpi-grid">
            <div
              className="kpi-card"
              style={{ "--card-accent": "#2E7D32" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Gross Profit</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#E8F5E9", color: "#2E7D32" }}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#2E7D32" }}>
                PKR {pnlReport.grossProfit.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Sales Revenue (PKR {pnlReport.salesRevenue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}) - Cost of goods (PKR {pnlReport.purchasesCost.toLocaleString("en-PK", { maximumFractionDigits: 2 })})
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ "--card-accent": "#C62828" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Net Business Profit</span>
                <div className="kpi-icon-wrap">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div
                className="kpi-value"
                style={{
                  color: pnlReport.netProfit >= 0 ? "#2E7D32" : "#C62828",
                }}
              >
                PKR {pnlReport.netProfit.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Gross Profit - Operating Expenses (PKR {pnlReport.totalExpenses.toLocaleString("en-PK", { maximumFractionDigits: 2 })})
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">
                Comprehensive Income & Expenditure Breakdown
              </div>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table">
                <tbody>
                  <tr style={{ background: "var(--bg-main)", fontWeight: 700 }}>
                    <td colSpan={2}>1. REVENUE FROM SALES</td>
                    <td style={{ textAlign: "right" }}>
                      PKR {pnlReport.salesRevenue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: 30 }}>Gross Product Sales</td>
                    <td>Invoiced Revenue</td>
                    <td style={{ textAlign: "right" }}>
                      PKR {pnlReport.salesRevenue.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ background: "var(--bg-main)", fontWeight: 700 }}>
                    <td colSpan={2}>2. COST OF GOODS SOLD</td>
                    <td style={{ textAlign: "right", color: "var(--danger)" }}>
                      -PKR {pnlReport.purchasesCost.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr
                    style={{
                      fontWeight: 800,
                      fontSize: "1rem",
                      borderTop: "2px solid var(--border-color)",
                    }}
                  >
                    <td colSpan={2}>GROSS PROFIT (1 - 2)</td>
                    <td style={{ textAlign: "right", color: "var(--success)" }}>
                      PKR {pnlReport.grossProfit.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ background: "var(--bg-main)", fontWeight: 700 }}>
                    <td colSpan={2}>3. OPERATING EXPENDITURES</td>
                    <td style={{ textAlign: "right", color: "var(--danger)" }}>
                      -PKR {pnlReport.totalExpenses.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {pnlReport.expenseBreakdown.map((exp) => (
                    <tr key={exp.id}>
                      <td style={{ paddingLeft: 30 }}>{exp.categoryName}</td>
                      <td>{exp.notes || exp.paidTo || "Operational"}</td>
                      <td style={{ textAlign: "right" }}>
                        PKR {exp.amount.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}

                  <tr
                    style={{
                      fontWeight: 900,
                      fontSize: "1.2rem",
                      borderTop: "2px solid var(--border-color)",
                      background: "rgba(46, 125, 50, 0.08)",
                    }}
                  >
                    <td colSpan={2}>FINAL NET PROFIT</td>
                    <td
                      style={{
                        textAlign: "right",
                        color: pnlReport.netProfit >= 0 ? "#2E7D32" : "#C62828",
                      }}
                    >
                      PKR {pnlReport.netProfit.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. GST Tax Report */}
      {activeReportTab === "gst" && gstReport && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="kpi-grid">
            <div
              className="kpi-card"
              style={{ "--card-accent": "#1976D2" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Output GST Liability (Sales)</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#E3F2FD", color: "#1976D2" }}
                >
                  <Percent size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#1976D2" }}>
                PKR {gstReport.totalOutputGst.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Tax on taxable sales of PKR {gstReport.totalTaxableSale.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ "--card-accent": "#2E7D32" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Input GST Credit (Purchases)</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#E8F5E9", color: "#2E7D32" }}
                >
                  <Percent size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#2E7D32" }}>
                PKR {gstReport.totalInputGst.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Tax paid on purchases of PKR {gstReport.totalTaxablePurchase.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ "--card-accent": "#C62828" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Net GST Payable to Government</span>
                <div className="kpi-icon-wrap">
                  <Percent size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#C62828" }}>
                PKR {gstReport.netGstPayable.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Output GST - Eligible Input Tax Credit
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Stock Summary View */}
      {activeReportTab === "stock" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="kpi-grid">
            <div
              className="kpi-card"
              style={{ "--card-accent": "#F57C00" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Total Cost Valuation</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#FFF3E0", color: "#F57C00" }}
                >
                  <Package size={18} />
                </div>
              </div>
              <div className="kpi-value">
                PKR {totalStockCostValuation.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                At purchase prices
              </div>
            </div>

            <div
              className="kpi-card"
              style={{ "--card-accent": "#2E7D32" } as React.CSSProperties}
            >
              <div className="kpi-header">
                <span>Total Retail Valuation</span>
                <div
                  className="kpi-icon-wrap"
                  style={{ background: "#E8F5E9", color: "#2E7D32" }}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="kpi-value" style={{ color: "#2E7D32" }}>
                PKR {totalStockRetailValuation.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                At sales selling prices
              </div>
            </div>
          </div>

          <div className="card">
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Current Stock</th>
                    <th style={{ textAlign: "right" }}>Cost Price</th>
                    <th style={{ textAlign: "right" }}>Selling Price</th>
                    <th style={{ textAlign: "right" }}>Cost Valuation</th>
                    <th style={{ textAlign: "right" }}>Retail Valuation</th>
                    <th style={{ textAlign: "right" }}>Projected Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const costVal = i.currentStock * i.purchasePrice;
                    const retailVal = i.currentStock * i.salesPrice;
                    const margin = retailVal - costVal;

                    return (
                      <tr key={i.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.name}</div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {i.code}
                          </div>
                        </td>
                        <td>{i.category}</td>
                        <td style={{ fontWeight: 700 }}>
                          {i.currentStock} {i.unit}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          PKR {i.purchasePrice.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          PKR {i.salesPrice.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          PKR {costVal.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          PKR {retailVal.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "var(--success)",
                          }}
                        >
                          +PKR {margin.toLocaleString("en-PK", { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <FileBarChart size={24} color="var(--primary)" />
            <span>Financial & Tax Reports</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            GST summary, real-time Profit & Loss statement, and stock valuation audits
          </p>
        </div>

        <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Consistent Document Actions everywhere */}
          <DocumentActions
            variant="bar"
            size="sm"
            showLabels={true}
            documentTitle={reportTitle}
            onView={() => setPreviewOpen(true)}
            onDownloadPdf={() => downloadPdf(false)}
            onShare={() => downloadPdf(true)}
            onPrint={handlePrint}
          />

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={
              activeReportTab === "stock"
                ? exportStockSummaryCSV
                : activeReportTab === "gst"
                  ? exportGstCSV
                  : exportPnlCSV
            }
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter for Statements, Reports, and GST */}
      {activeReportTab !== "stock" && (
        <div style={{ marginBottom: 16 }}>
          <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
        </div>
      )}

      {/* Report Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button
          className={`btn btn-sm ${activeReportTab === "pnl" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveReportTab("pnl")}
        >
          Profit & Loss Statement
        </button>
        <button
          className={`btn btn-sm ${activeReportTab === "gst" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveReportTab("gst")}
        >
          GST Tax Report (GSTR-1 / 2)
        </button>
        <button
          className={`btn btn-sm ${activeReportTab === "stock" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveReportTab("stock")}
        >
          Stock Valuation Summary
        </button>
      </div>

      <div ref={reportRef} className="print-area">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{reportTitle}</h3>
          {dateRange.startDate && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Period: {dateRange.startDate} to {dateRange.endDate || "Present"}
            </span>
          )}
        </div>
        {loadingReports ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Updating reports for selected date range...
          </div>
        ) : (
          reportContent
        )}
      </div>

      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div
            className="modal-card modal-lg"
            role="dialog"
            aria-modal="true"
            aria-label={`${reportTitle} preview`}
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 880 }}
          >
            <div className="modal-header no-print" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3>{reportTitle} - Preview</h3>
              <DocumentActions
                variant="bar"
                size="sm"
                showLabels={true}
                documentTitle={reportTitle}
                onDownloadPdf={() => downloadPdf(false)}
                onShare={() => downloadPdf(true)}
                onPrint={handlePrint}
              />
              <button
                className="btn-icon"
                aria-label="Close report preview"
                onClick={() => setPreviewOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ background: "white", color: "#111827" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>{reportTitle}</h3>
                {dateRange.startDate && (
                  <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 600 }}>
                    Period: {dateRange.startDate} to {dateRange.endDate || "Present"}
                  </span>
                )}
              </div>
              {reportContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
