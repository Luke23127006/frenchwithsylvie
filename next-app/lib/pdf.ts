import { PDFDocument } from 'pdf-lib';

/**
 * Converts multiple image files into a single PDF document.
 * Each image is placed on a new A4 sized page and scaled to fit within the page dimensions.
 */
export async function convertImagesToPDF(files: File[]): Promise<File> {
  const pdfDoc = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let image;

    try {
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(arrayBuffer);
      } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(arrayBuffer);
      } else {
        console.warn(`Unsupported file type: ${file.type}. Skipping ${file.name}.`);
        continue;
      }
    } catch (error) {
      console.error(`Failed to embed image ${file.name}:`, error);
      continue;
    }

    // Default A4 size [595.28, 841.89]
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();

    // Leave a small margin (e.g., 20 points)
    const margin = 20;
    const maxWidth = width - margin * 2;
    const maxHeight = height - margin * 2;

    const scaled = image.scaleToFit(maxWidth, maxHeight);

    page.drawImage(image, {
      x: width / 2 - scaled.width / 2,
      y: height / 2 - scaled.height / 2,
      width: scaled.width,
      height: scaled.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new File([pdfBytes as unknown as BlobPart], "combined_submission.pdf", { type: "application/pdf" });
}
