import { printDocument } from "../export.js";
import React, { useEffect, useRef } from "react";
import { X, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import { Transaction, BusinessProfile, PrintSettings } from "../types.js";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  profile: BusinessProfile | null;
  printSettings: PrintSettings;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  transaction,
  profile,
  printSettings,
}) => {
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const barcodeSvgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isOpen && transaction && profile) {
      // Generate Barcode on SVG
      if (barcodeSvgRef.current) {
        try {
          JsBarcode(barcodeSvgRef.current, transaction.invoiceNumber, {
            format: "CODE128",
            width: 1.5,
            height: 40,
            displayValue: true,
            fontSize: 12,
          });
        } catch (e) {
          console.error("Error rendering barcode:", e);
        }
      }
    }
  }, [isOpen, transaction, profile, printSettings]);

  if (!isOpen || !transaction || !profile) return null;

  const handlePrint = () => {
    printDocument().catch((e) => alert(e.message));
  };

  const title = {
    sale: "Tax Invoice",
    purchase: "Purchase Bill",
    quotation: "Quotation",
    sale_return: "Credit Note",
    purchase_return: "Debit Note",
    payment_in: "Payment Receipt",
    payment_out: "Payment Voucher",
  }[transaction.type];
  // UPI payment links are INR-only and must never request payment for PKR invoices.
  const showQr = false;
  const isThermal = printSettings.paperSize.startsWith("thermal");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header no-print">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3>Invoice Print Preview</h3>
            <span className="sidebar-badge">
              {printSettings.paperSize.replace(/_/g, " ")}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          className="modal-body print-area"
          style={{ background: "#f8fafc", padding: 20 }}
        >
          {isThermal ? (
            /* Thermal 80mm Receipt Layout */
            <div
              className="thermal-receipt"
              style={{
                background: "#fff",
                width:
                  printSettings.paperSize === "thermal_58mm" ? "58mm" : "80mm",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "bold" }}>
                  {profile.tradeName || profile.name}
                </h3>
                <div>
                  {profile.address}, {profile.city}
                </div>
                <div>Tax ID: {profile.gstin}</div>
                <div>Phone: {profile.phone}</div>
              </div>

              <div className="thermal-divider" />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                }}
              >
                <span>Bill No: {transaction.invoiceNumber}</span>
                <span>Date: {transaction.date}</span>
              </div>
              <div style={{ fontSize: "11px" }}>
                Customer: {transaction.partyName}
              </div>

              <div className="thermal-divider" />

              <table
                style={{
                  width: "100%",
                  fontSize: "11px",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px dashed #000" }}>
                    <th style={{ textAlign: "left" }}>Item</th>
                    <th style={{ textAlign: "center" }}>Qty</th>
                    <th style={{ textAlign: "right" }}>Rate</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "left" }}>{item.itemName}</td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>{item.price}</td>
                      <td style={{ textAlign: "right" }}>{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="thermal-divider" />

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal:</span>
                <span>PKR {transaction.subtotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              </div>
              {transaction.discountTotal > 0 && (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Discount:</span>
                  <span>-PKR {transaction.discountTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>GST Tax:</span>
                <span>PKR {transaction.taxTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="thermal-divider" />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                <span>NET TOTAL:</span>
                <span>PKR {transaction.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                }}
              >
                <span>Paid ({transaction.paymentMode}):</span>
                <span>PKR {transaction.paidAmount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "11px",
                  fontWeight: "bold",
                }}
              >
                <span>Balance Due:</span>
                <span>PKR {transaction.balanceDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
              </div>

              {showQr && (
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: "10px", marginBottom: 4 }}>
                    Scan & Pay via any UPI App
                  </div>
                  <canvas
                    ref={qrCanvasRef}
                    style={{ display: "inline-block" }}
                  />
                  <div style={{ fontSize: "9px" }}>{profile.upiId}</div>
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 8 }}>
                <svg ref={barcodeSvgRef} style={{ display: "inline-block" }} />
              </div>

              <div
                style={{ textAlign: "center", fontSize: "10px", marginTop: 8 }}
              >
                *** Thank You! Visit Again ***
              </div>
            </div>
          ) : (
            /* Laser A4 GST Tax Invoice Layout */
            <div className="laser-invoice" style={{ background: "#fff" }}>
              {printSettings.companyLogo && profile.logoUrl && (
                <img
                  src={profile.logoUrl}
                  alt="Company logo"
                  style={{ maxHeight: 64, maxWidth: 160 }}
                />
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: `2px solid ${printSettings.themeColor}`,
                  paddingBottom: 16,
                }}
              >
                <div>
                  <h2
                    style={{
                      color: printSettings.themeColor,
                      fontSize: "24px",
                      fontWeight: 800,
                    }}
                  >
                    {profile.tradeName || profile.name}
                  </h2>
                  <div
                    style={{ color: "#4b5563", fontSize: "13px", marginTop: 4 }}
                  >
                    {profile.address}, {profile.city}, {profile.state} -{" "}
                    {profile.pincode}
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    Tax ID: <strong>{profile.gstin}</strong> | Phone:{" "}
                    {profile.phone}
                  </div>
                  <div style={{ fontSize: "13px" }}>Email: {profile.email}</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "#111",
                    }}
                  >
                    {title}
                  </div>
                  <div style={{ fontSize: "13px", marginTop: 4 }}>
                    Invoice No: <strong>{transaction.invoiceNumber}</strong>
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    Date: <strong>{transaction.date}</strong>
                  </div>
                  {transaction.dueDate && (
                    <div style={{ fontSize: "13px" }}>
                      Due Date: {transaction.dueDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Billed To */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                  padding: "16px 0",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    Billed To:
                  </div>
                  <div
                    style={{ fontSize: "15px", fontWeight: 700, marginTop: 4 }}
                  >
                    {transaction.partyName}
                  </div>
                  <div
                    style={{ fontSize: "13px", color: "#4b5563", marginTop: 2 }}
                  >
                    Payment Mode: {transaction.paymentMode.toUpperCase()}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    Bank Transfer Details:
                  </div>
                  <div style={{ fontSize: "13px", marginTop: 4 }}>
                    Bank: {profile.bankName}
                  </div>
                  <div style={{ fontSize: "13px" }}>
                    A/c No: <strong>{profile.accountNumber}</strong>
                  </div>
                  <div style={{ fontSize: "13px" }}>Bank / branch code: {profile.ifsc}</div>
                  <div style={{ fontSize: "13px" }}>
                    Currency: PKR
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table
                style={{
                  width: "100%",
                  marginTop: 16,
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#f3f4f6",
                      borderBottom: "2px solid #e5e7eb",
                    }}
                  >
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>
                      #
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "left" }}>
                      Item Description
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>
                      HSN
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>
                      Qty
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>
                      Rate (PKR)
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>
                      Tax Rate
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>
                      Tax Amt
                    </th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>
                      Amount (PKR)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px" }}>{idx + 1}</td>
                      <td style={{ padding: "10px", fontWeight: 600 }}>
                        {item.itemName}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        {item.hsnCode || "-"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "center" }}>
                        {item.quantity} {item.unit}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        PKR {item.price.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        {item.taxRate}%
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        PKR {item.taxAmount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          padding: "10px",
                          textAlign: "right",
                          fontWeight: 700,
                        }}
                      >
                        PKR {item.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Laser Totals & UPI QR */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr",
                  gap: 20,
                  marginTop: 20,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  {showQr && (
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        padding: 8,
                        borderRadius: 6,
                        textAlign: "center",
                      }}
                    >
                      <canvas ref={qrCanvasRef} />
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          marginTop: 4,
                        }}
                      >
                        Scan to Pay via UPI
                      </div>
                    </div>
                  )}

                  {printSettings.notesAndTerms && (
                    <div style={{ fontSize: "12px", color: "#4b5563" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        Terms & Conditions:
                      </div>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          margin: 0,
                        }}
                      >
                        {profile.termsAndConditions}
                      </pre>
                      {transaction.notes && <p>{transaction.notes}</p>}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: "#f9fafb",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                      fontSize: "13px",
                    }}
                  >
                    <span>Sub Total:</span>
                    <span>PKR {transaction.subtotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                  </div>
                  {transaction.discountTotal > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                        fontSize: "13px",
                        color: "#16a34a",
                      }}
                    >
                      <span>Discount Total:</span>
                      <span>
                        -PKR {transaction.discountTotal.toLocaleString('en-PK', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {printSettings.taxBreakup && (
                    <>
                      {transaction.igst > 0 ? (
                        <div>IGST: PKR {transaction.igst.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
                      ) : (
                        <>
                          <div>CGST: PKR {transaction.cgst.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
                          <div>SGST: PKR {transaction.sgst.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</div>
                        </>
                      )}
                    </>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: "2px solid #e5e7eb",
                      fontSize: "16px",
                      fontWeight: 800,
                      color: printSettings.themeColor,
                    }}
                  >
                    <span>Grand Total:</span>
                    <span>PKR {transaction.total.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                    }}
                  >
                    <span>Amount Paid:</span>
                    <span>PKR {transaction.paidAmount.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    <span>Balance Due:</span>
                    <span>PKR {transaction.balanceDue.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Authorised Signatory */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginTop: 40,
                  paddingTop: 20,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <svg ref={barcodeSvgRef} />
                {printSettings.signature && (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: 35,
                      }}
                    >
                      For {profile.tradeName || profile.name}
                    </div>
                    <div
                      style={{
                        borderTop: "1px solid #000",
                        width: 180,
                        paddingTop: 4,
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Authorised Signatory
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
