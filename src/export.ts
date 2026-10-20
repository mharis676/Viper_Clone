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
