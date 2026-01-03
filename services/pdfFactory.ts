
import { jsPDF } from "jspdf";

export const createPDF = (title: string, content: string): ArrayBuffer => {
  // A4 paper, portrait, mm units
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });
  
  // Use Helvetica which has good standard support for Western European languages (accents)
  doc.setFont("helvetica", "normal");

  // Metadata
  doc.setProperties({
    title: title,
    creator: 'Static PDF Manager'
  });

  // --- Title Section ---
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  
  // Split title to fit width (A4 width is 210mm, margins 20mm -> 170mm usable)
  const splitTitle = doc.splitTextToSize(title, 170);
  doc.text(splitTitle, 20, 25);

  // Calculate height used by title to position content correctly
  // Approx height per line for size 24 is ~10mm
  const titleHeight = (splitTitle.length * 10) + 15;

  // --- Content Section ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  
  // Split content
  const splitContent = doc.splitTextToSize(content, 170);
  
  // Start content below title
  doc.text(splitContent, 20, 25 + titleHeight);

  // Return as ArrayBuffer
  return doc.output('arraybuffer');
};
