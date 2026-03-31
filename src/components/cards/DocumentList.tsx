'use client';

import { IDocument } from '@/types';
import DocumentCard from './DocumentCard';
import { FileText } from 'lucide-react';

interface DocumentListProps {
  documents: IDocument[];
  isLoading?: boolean;
  showActions?: boolean;
  onDocumentDelete?: (id: string) => void;
  emptyMessage?: string;
}

export default function DocumentList({
  documents,
  isLoading = false,
  showActions = false,
  onDocumentDelete,
  emptyMessage = 'Không có tài liệu nào',
}: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          showActions={showActions}
          onDelete={onDocumentDelete}
        />
      ))}
    </div>
  );
}
