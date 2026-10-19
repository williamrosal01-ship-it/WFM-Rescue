// PDF = the report as it is on screen, printed with the print stylesheet (globals.css @media print).
// The browser's print dialog saves it as PDF. Charts, KPIs and tables are exactly the ones in the tab.

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

/** Opens the print dialog for the current page. The document title becomes the file name suggestion. */
export function printReport(name: string) {
  const previous = document.title;
  document.title = safe(name) || "WFM Rescue";
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  // Charts (Recharts) measure their container; a resize lets them redraw at print width.
  window.dispatchEvent(new Event("resize"));
  window.setTimeout(() => window.print(), 250);
}
