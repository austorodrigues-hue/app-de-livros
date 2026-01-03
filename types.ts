
export interface PDFDocument {
  id: string;
  name: string;
  description?: string;
  size: number;
  type: string;
  data: ArrayBuffer;
  coverImage?: string; // Base64 string for the cover
  addedAt: number;
}
