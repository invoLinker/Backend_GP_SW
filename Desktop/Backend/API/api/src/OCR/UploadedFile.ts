export interface UploadedFiles {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer; // محتوى الملف
  size: number;
}
