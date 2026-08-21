import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';
// @ts-ignore
import mammoth from 'mammoth';
import { extractTextFromResume } from '../App';

// We need to set the worker source for pdfjs. 
// Using Vite's ?url natively bundles the worker without external network requests!
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromLocalFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const allowedExtensions = new Set(['.pdf', '.docx', '.txt', '.rtf', '.png', '.jpg', '.jpeg']);
  if (!allowedExtensions.has(extension)) {
    throw new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, RTF, PNG, or JPEG file.');
  }
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
    throw new Error('File must be non-empty and no larger than 10MB.');
  }
  const expectedMimeTypes: Record<string, string[]> = {
    '.pdf': ['application/pdf'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    '.txt': ['text/plain'],
    '.rtf': ['application/rtf', 'text/rtf'],
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
  };
  if (file.type && !expectedMimeTypes[extension].includes(file.type)) {
    throw new Error('The file extension and MIME type do not match. Please choose the original file.');
  }

  try {
    if (name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      if (pdf.numPages === 0) throw new Error("PDF file appears to be empty or corrupted.");
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      if (!text.trim()) {
        console.warn('PDF parsed but contains no readable text (might be scanned). Falling back to AI OCR.');
        // Fallthrough
      } else {
        return text;
      }
    }
    
    else if (name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      if (!result.value.trim()) {
        throw new Error("No readable text could be extracted from this DOCX file.");
      }
      return result.value;
    }
    
    else if (name.endsWith('.txt')) {
      const text = await file.text();
      if (!text.trim()) throw new Error("The text file is empty.");
      return text;
    }
  } catch (err: any) {
    console.error("Local parsing error:", err);
    // If it's a known structural/parsing error, throw to the user immediately to avoid silent AI fallback failure
    if (err.name === 'InvalidPDFException' || err.message?.includes('Invalid PDF') || err.message?.includes('corrupted') || name.endsWith('.docx') || name.endsWith('.txt')) {
      throw new Error(`Failed to parse file. It may be corrupted or unsupported. Details: ${err.message}`);
    }
    console.log("Local parsing failed, falling back to AI...", err);
  }

  // Fallback to OpenAI for images, RTF, or scanned PDFs
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let mimeType = 'text/plain';
  if (name.endsWith('.pdf')) mimeType = 'application/pdf'; // if fallback happened
  else if (name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (name.endsWith('.rtf')) mimeType = 'application/rtf';
  else if (name.endsWith('.jpeg') || name.endsWith('.jpg')) mimeType = 'image/jpeg';
  else if (name.endsWith('.png')) mimeType = 'image/png';

  return await extractTextFromResume({ mimeType, data: base64 });
}
