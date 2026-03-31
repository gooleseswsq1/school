'use client';

import { IDocument } from '@/types';
import { FileText, Trash2, Download, Calendar, User } from 'lucide-react';
import { useState } from 'react';

interface DocumentCardProps {
  document: IDocument;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export default function DocumentCard({
  document,
  onDelete,
  showActions = false,
}: DocumentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Bạn chắc chắn muốn xóa tài liệu này?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Lỗi khi xóa tài liệu');
      }

      if (onDelete) {
        onDelete(document.id);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Lỗi khi xóa tài liệu');
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return 'from-red-500 to-red-600';
      case 'POWERPOINT':
        return 'from-orange-500 to-orange-600';
      case 'WORD':
        return 'from-blue-500 to-blue-600';
      case 'PDF':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getFileTypeIcon = (type: string) => {
    const iconClass = 'w-6 h-6';
    switch (type) {
      case 'VIDEO':
        return '▶';
      case 'POWERPOINT':
        return '📊';
      case 'WORD':
        return '📄';
      case 'PDF':
        return '📕';
      default:
        return '📎';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header with Icon and Type */}
      <div
        className={`bg-gradient-to-r ${getFileTypeColor(
          document.fileType
        )} p-4`}
      >
        <div className="flex items-center justify-between">
          <div className="text-white text-3xl">{getFileTypeIcon(document.fileType)}</div>
          <span className="text-white text-xs font-medium bg-black/20 px-3 py-1 rounded-full">
            {document.fileType}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
          {document.title}
        </h3>

        {document.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {document.description}
          </p>
        )}

        {/* Meta Information */}
        <div className="space-y-2 text-xs">
          {document.fileSize && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span>📦 {(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>{document.author.name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{new Date(document.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="border-t border-gray-200 dark:border-slate-700 p-4 flex gap-2">
          <button
            onClick={() => window.open(document.fileUrl, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Xóa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
