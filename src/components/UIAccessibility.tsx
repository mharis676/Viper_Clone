import { useEffect } from "react";

// Give the existing forms explicit labels and the older inline modals the same
// keyboard behavior as Dialog while those views retain their local form state.
export function UIAccessibility() {
  useEffect(() => {
    let sequence = 0,
      active: HTMLElement | null = null,
      previous: HTMLElement | null = null;
    const enhance = () => {
      document.querySelectorAll<HTMLElement>(".form-group").forEach((group) => {
        const label = group.querySelector("label"),
          control = group.querySelector("input,select,textarea");
        if (label && control && !label.contains(control) && !label.htmlFor) {
          control.id ||= `form-field-${++sequence}`;
          label.htmlFor = control.id;
        }
      });
      document
        .querySelectorAll<HTMLButtonElement>(".modal-header .btn-icon")
        .forEach((b) => {
          if (!b.getAttribute("aria-label") && !b.title)
            b.setAttribute("aria-label", "Close dialog");
        });
      document
        .querySelectorAll<HTMLElement>(".data-table input,.data-table select")
        .forEach((control) => {
          if (control.getAttribute("aria-label")) return;
          const td = control.closest("td"),
            tr = td?.parentElement;
          if (td && tr) {
            const idx = [...tr.children].indexOf(td);
            const heading = control
              .closest("table")
              ?.querySelectorAll("thead th")[idx]?.textContent;
            if (heading) control.setAttribute("aria-label", heading.trim());
          }
        });
      const dialogs = document.querySelectorAll<HTMLElement>(".modal-card");
      const top = dialogs[dialogs.length - 1] || null;
      if (active !== top) {
        if (active && !top) previous?.focus();
        if (top) {
          previous = document.activeElement as HTMLElement;
          if (!top.hasAttribute("role")) {
            top.setAttribute("role", "dialog");
            top.setAttribute("aria-modal", "true");
            top.setAttribute(
              "aria-label",
              top.querySelector("h3")?.textContent || "Dialog",
            );
            top.tabIndex = -1;
            (
              top.querySelector<HTMLElement>("input,select,textarea,button") ||
              top
            ).focus();
          }
        }
        active = top;
      }
    };
    const key = (e: KeyboardEvent) => {
      if (!active || active.dataset.managedDialog) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        active
          .querySelector<HTMLButtonElement>(".modal-header .btn-icon")
          ?.click();
      }
      if (e.key === "Tab") {
        const list = [
          ...active.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea",
          ),
        ].filter((e) => e.getClientRects().length);
        const first = list[0],
          last = list[list.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !active.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !active.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
    document.addEventListener("keydown", key, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", key, true);
    };
  }, []);
  return null;
}
