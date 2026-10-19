// One chart palette for the whole product (screen and PDF).
// Each color has ONE meaning, so the same color means the same thing on every report.
// Chosen to read well on both the dark and the light theme and to print in color or grayscale.
export const CHART = {
  actual: "#14b8a6", // teal: real / present / answered / delivered (primary data)
  forecast: "#818cf8", // indigo: forecast / plan / scheduled / reported reference
  good: "#10b981", // emerald: within target
  warn: "#f59e0b", // amber: below target / attention
  bad: "#f43f5e", // rose: outside target / risk
  above: "#a855f7", // purple: actual above forecast
  target: "#f59e0b", // amber dashed line: target threshold
  neutral: "#94a3b8", // slate: no data / secondary
  // Categorical series (queues, channels, codes), in order
  series: ["#14b8a6", "#818cf8", "#f59e0b", "#f472b6", "#38bdf8", "#a3e635", "#a855f7", "#f43f5e"],
} as const;
