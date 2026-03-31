// User types
export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Document types
export type DocumentType = "VIDEO" | "POWERPOINT" | "WORD" | "PDF" | "OTHER";

export interface IDocument {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentType;
  fileSize?: number;
  author: IUser;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user: IUser;
  redirectTo?: string;
}
