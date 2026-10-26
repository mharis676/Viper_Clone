import React, { useState } from "react";
import { Eye, Download, Share2, Printer, Loader2 } from "lucide-react";

export interface DocumentActionsProps {
  onView?: () => void;
  onDownloadPdf?: () => void | Promise<void>;
  onShare?: () => void | Promise<void>;
  onPrint?: () => void | Promise<void>;
  variant?: "row" | "bar" | "modal-footer";
  size?: "sm" | "md";
  showLabels?: boolean;
  documentTitle?: string;
  className?: string;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  onView,
  onDownloadPdf,
  onShare,
  onPrint,
  variant = "row",
  size = "sm",
  showLabels = false,
  documentTitle = "Document",
  className = "",
}) => {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDownloadPdf || downloading) return;
    setDownloading(true);
    try {
      await onDownloadPdf();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onShare || sharing) return;
    setSharing(true);
    try {
      await onShare();
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPrint || printing) return;
    setPrinting(true);
    try {
      await onPrint();
    } finally {
      setPrinting(false);
    }
  };

  const isBar = variant === "bar" || variant === "modal-footer";
  const btnClass = isBar
    ? size === "sm"
      ? "btn btn-sm"
      : "btn"
    : "btn-icon";

  return (
    <div
      className={`document-actions document-actions-${variant} ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isBar ? "8px" : "6px",
        flexWrap: isBar ? "wrap" : "nowrap",
      }}
      role="group"
      aria-label={`Actions for ${documentTitle}`}
    >
      {onView && (
        <button
          type="button"
          className={`${btnClass} ${isBar ? "btn-secondary" : ""}`}
          title={`View ${documentTitle}`}
          aria-label={`View ${documentTitle}`}
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye size={size === "sm" ? 15 : 17} />
          {showLabels && <span>View</span>}
        </button>
      )}

      {onDownloadPdf && (
        <button
          type="button"
          className={`${btnClass} ${isBar ? "btn-primary" : ""}`}
          title={`Download ${documentTitle} PDF`}
          aria-label={`Download ${documentTitle} PDF`}
          disabled={downloading}
          onClick={handleDownload}
        >
          {downloading ? (
            <Loader2 size={size === "sm" ? 15 : 17} className="spin" />
          ) : (
            <Download size={size === "sm" ? 15 : 17} />
          )}
          {showLabels && <span>{downloading ? "Saving..." : "Download PDF"}</span>}
        </button>
      )}

      {onShare && (
        <button
          type="button"
          className={`${btnClass} ${isBar ? "btn-secondary" : ""}`}
          title={`Share ${documentTitle}`}
          aria-label={`Share ${documentTitle}`}
          disabled={sharing}
          onClick={handleShare}
        >
          {sharing ? (
            <Loader2 size={size === "sm" ? 15 : 17} className="spin" />
          ) : (
            <Share2 size={size === "sm" ? 15 : 17} />
          )}
          {showLabels && <span>{sharing ? "Sharing..." : "Share"}</span>}
        </button>
      )}

      {onPrint && (
        <button
          type="button"
          className={`${btnClass} ${isBar ? "btn-secondary" : ""}`}
          title={`Print ${documentTitle}`}
          aria-label={`Print ${documentTitle}`}
          disabled={printing}
          onClick={handlePrint}
        >
          {printing ? (
            <Loader2 size={size === "sm" ? 15 : 17} className="spin" />
          ) : (
            <Printer size={size === "sm" ? 15 : 17} />
          )}
          {showLabels && <span>Print</span>}
        </button>
      )}
    </div>
  );
};
