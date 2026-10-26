import multer from "multer";
import type { RequestHandler } from "express";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_KINDS = ["idCopy", "policeReport", "businessRegistration"] as const;
export type DocumentUpload = {
  kind: typeof DOCUMENT_KINDS[number];
  mimeType: string;
  sizeBytes: number;
  contents: Buffer;
};

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES, files: 3, fields: 1, fieldSize: 16 * 1024, parts: 4 },
}).fields(DOCUMENT_KINDS.map(name => ({ name, maxCount: 1 })));

export const applicationUpload: RequestHandler = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    res.status(400).json({ message: "Submit the application with an ID copy." });
    return;
  }
  parser(req, res, error => {
    if (error) {
      const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
      res.status(tooLarge ? 413 : 400).json({
        message: tooLarge ? "Each document must be 10MB or smaller." : "Upload one PDF, JPG or PNG per document field.",
      });
      return;
    }
    next();
  });
};

/** Check the actual signature as well as the client-supplied MIME and extension. */
export function validateDocuments(files: Express.Multer.File[]): DocumentUpload[] {
  return files.map(file => {
    const bytes = file.buffer;
    if (!bytes.length || bytes.length > MAX_DOCUMENT_BYTES) throw new Error("Each document must be between 1 byte and 10MB.");
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const pdf = bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    const valid = (png && file.mimetype === "image/png" && /\.png$/i.test(file.originalname))
      || (jpg && file.mimetype === "image/jpeg" && /\.jpe?g$/i.test(file.originalname))
      || (pdf && file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname));
    if (!valid || !DOCUMENT_KINDS.includes(file.fieldname as typeof DOCUMENT_KINDS[number])) {
      throw new Error("Documents must be valid PDF, JPG or PNG files.");
    }
    return { kind: file.fieldname as DocumentUpload["kind"], mimeType: file.mimetype, sizeBytes: bytes.length, contents: bytes };
  });
}
