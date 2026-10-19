// The demo dataset name is stored once (language-neutral data); the label is translated when shown.
export const DEMO_DATASET_NAME = "Demo Contact Center — 4 queues, 15-min, 2 sites";

export const datasetLabel = (name: string, tx: (es: string, en: string) => string): string =>
  name === DEMO_DATASET_NAME ? tx("Demo Contact Center — 4 colas, 15 min, 2 sitios", DEMO_DATASET_NAME) : name;
