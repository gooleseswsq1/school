export type DocxParseTarget = 'exams' | 'exam-banks';

export interface DocxParseJobPayload {
  backgroundJobId: string;
  fileUrl: string;
  fileName: string;
  target: DocxParseTarget;
  authorId?: string;
  notifyEmail?: string;
}

export interface DocxParseResult {
  ok: boolean;
  endpoint: string;
  statusCode: number;
  body: unknown;
}
