import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfJs } from "./setup-pdfjs";

export async function renderPdfPage(
  doc: PDFDocumentProxy,
  pageNum: number,
  scale: number,
  wrapperClassName: string,
): Promise<HTMLElement> {
  const pdfjs = await loadPdfJs();
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });

  const wrapper = document.createElement("div");
  wrapper.className = wrapperClassName;
  wrapper.dataset.page = String(pageNum);

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  wrapper.appendChild(canvas);

  await page.render({
    canvasContext: canvas.getContext("2d")!,
    viewport,
    canvas,
  }).promise;

  try {
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement("div");
    textLayerDiv.className = "pdf-text-layer";
    wrapper.appendChild(textLayerDiv);

    const textLayer = new pdfjs.TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    });
    await textLayer.render();
  } catch {
    // Scanned PDFs may have no extractable text.
  }

  return wrapper;
}
