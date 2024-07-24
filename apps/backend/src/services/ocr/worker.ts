import { createWorker, type Worker } from "tesseract.js";
import { env } from "../../env.js";

let workerPromise: Promise<Worker> | null = null;

export async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(env.OCR_LANGS.split("+").map((l) => l.trim()).filter(Boolean));
  }
  return workerPromise;
}

export interface OcrResult {
  text: string;
  confidence: number;
}

export async function runOcr(imagePath: string): Promise<OcrResult> {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(imagePath);
  return { text: data.text, confidence: data.confidence };
}

export async function shutdownOcr() {
  if (!workerPromise) return;
  const w = await workerPromise;
  await w.terminate();
  workerPromise = null;
}
