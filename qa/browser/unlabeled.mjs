import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
for (const route of ["/app/diagnostics", "/app/dashboard", "/app/import", "/app/settings", "/app/reports"]) {
  await p.goto("http://127.0.0.1:3100" + route, { waitUntil: "networkidle" });
  await p.evaluate(() => localStorage.setItem("wfm-locale", "en"));
  await p.reload({ waitUntil: "networkidle" });
  const list = await p.$$eval("button", (bs) => bs.map((el) => {
    const label = (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || "").trim();
    return { label, html: el.outerHTML.slice(0, 160), visible: el.offsetParent !== null };
  }).filter((x) => x.visible && !x.label));
  console.log(route, "unlabeled:", list.length);
  for (const x of list) console.log("   ", x.html);
}
await b.close();
