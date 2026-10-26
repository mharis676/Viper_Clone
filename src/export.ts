import { Capacitor, registerPlugin } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
const NativePrint = registerPlugin<{ print(): Promise<void> }>("ViperPrint");
export async function printDocument() {
  if (Capacitor.isNativePlatform()) await NativePrint.print();
  else window.print();
}
export async function exportFile(
  name: string,
  contents: string,
  type = "text/csv",
) {
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({
      path: name,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: name, files: [result.uri] });
  } else {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
export const csvCell = (value: unknown) =>
  `"${String(value ?? "")
    .replace(typeof value === "number" ? /$^/ : /^[=+@-]/, "'$&")
    .replace(/"/g, '""')}"`;

// Capture an isolated copy so scrolling and other open dialogs never enter the PDF.
export async function exportPdf(element: HTMLElement, name: string, share = false) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"), import("jspdf"),
  ]);
  await document.fonts.ready;
  const stage = document.createElement("div");
  Object.assign(stage.style, { position: "fixed", left: "-20000px", top: "0", width: "1000px", background: "white", color: "#111827" });
  const copy = element.cloneNode(true) as HTMLElement;
  Object.assign(copy.style, { width: "1000px", maxHeight: "none", height: "auto", overflow: "visible", background: "white", color: "#111827", boxSizing: "border-box" });
  copy.querySelectorAll<HTMLElement>(".no-print").forEach(node => node.remove());
  copy.querySelectorAll<HTMLElement>(".data-table-wrapper").forEach(node => { node.style.overflow = "visible"; });
  stage.append(copy);
  document.body.append(stage);
  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(copy, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 1100 });
  } finally { stage.remove(); }
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const width = 190;
  const pagePixels = Math.floor(277 * canvas.width / width);
  for (let top = 0; top < canvas.height; top += pagePixels) {
    if (top) pdf.addPage();
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.min(pagePixels, canvas.height - top);
    slice.getContext("2d")!.drawImage(canvas, 0, top, canvas.width, slice.height, 0, 0, slice.width, slice.height);
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 10, 10, width, slice.height * width / slice.width);
  }
  const filename = `${name.replace(/[^a-z0-9_-]/gi, "_")}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const result = await Filesystem.writeFile({ path: filename, data: pdf.output("datauristring").split(",")[1], directory: share ? Directory.Cache : Directory.Documents });
    if (share) await Share.share({ title: filename, files: [result.uri] });
    else alert(`PDF saved to Documents: ${filename}`);
  } else {
    const file = new File([pdf.output("blob")], filename, { type: "application/pdf" });
    if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: filename });
    else { pdf.save(filename); if (share) alert("PDF downloaded. Attach it to your client message or email."); }
  }
}
