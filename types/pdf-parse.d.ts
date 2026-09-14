// The deep import path avoids pdf-parse's debug harness (which reads a test
// file at module load). @types/pdf-parse only types the package root, so
// declare the internal module here.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
  }
  const pdfParse: (dataBuffer: Buffer) => Promise<PdfParseResult>;
  export default pdfParse;
}
