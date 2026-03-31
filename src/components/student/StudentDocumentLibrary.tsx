'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, Download, FileText, Play, Presentation, File } from 'lucide-react';
import { IDocument } from '@/types';

interface StudentDocumentLibraryProps {
  teacherId?: string;
}

export default function StudentDocumentLibrary({ teacherId }: StudentDocumentLibraryProps) {
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeachers, setExpandedTeachers] = useState<string[]>([]);
  const [fileTypeFilter, setFileTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fileTypeFilter]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      let url = '/api/documents/public';
      
      if (fileTypeFilter) {
        url += `?fileType=${fileTypeFilter}`;
      }

      if (teacherId) {
        url += (fileTypeFilter ? '&' : '?') + `teacherId=${teacherId}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTeacher = (teacherId: string) => {
    setExpandedTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const getIconByType = (fileType: string) => {
    switch (fileType) {
      case 'VIDEO':
        return <Play className="w-4 h-4 text-red-500" />;
      case 'POWERPOINT':
        return <Presentation className="w-4 h-4 text-orange-500" />;
      case 'WORD':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'PDF':
        return <FileText className="w-4 h-4 text-red-600" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (fileType: string) => {
    const labels: Record<string, string> = {
      VIDEO: 'Video',
      POWERPOINT: 'PowerPoint',
      WORD: 'Word',
      PDF: 'PDF',
      OTHER: 'Khác'
    };
    return labels[fileType] || fileType;
  };

  const handleDownload = async (doc: IDocument) => {
    try {
      const fileName = doc.fileUrl?.split('/').pop() || 'download';
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(doc.fileUrl)}&fileName=${encodeURIComponent(fileName)}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Lỗi khi tải file');
    }
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const authorId = (doc.author as any)?.id || 'unknown';
    const authorName = (doc.author as any)?.name || 'Giáo viên';
    
    if (!acc[authorId]) {
      acc[authorId] = { name: authorName, docs: [] };
    }
    acc[authorId].docs.push(doc);
    return acc;
  }, {} as Record<string, { name: string; docs: IDocument[] }>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải tài liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter by Type */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFileTypeFilter(null)}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            fileTypeFilter === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
          }`}
        >
          Tất cả
        </button>
        {['VIDEO', 'POWERPOINT', 'WORD', 'PDF', 'OTHER'].map(type => (
          <button
            key={type}
            onClick={() => setFileTypeFilter(type)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              fileTypeFilter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
            }`}
          >
            {getTypeLabel(type)}
          </button>
        ))}
      </div>

      {/* Documents by Teacher */}
      <div className="space-y-2">
        {Object.entries(groupedDocuments).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Chưa có tài liệu nào</p>
          </div>
        ) : (
          Object.entries(groupedDocuments).map(([id, { name, docs }]) => (
            <div key={id} className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {/* Teacher Header */}
              <button
                onClick={() => toggleTeacher(id)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors flex items-center justify-between"
              >
                <span className="font-medium text-gray-900 dark:text-white text-sm">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{docs.length} tài liệu</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                      expandedTeachers.includes(id) ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Documents List */}
              {expandedTeachers.includes(id) && (
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {getIconByType(doc.fileType)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.title}
                          </h4>
                          {doc.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {getTypeLabel(doc.fileType)}
                            </span>
                            {doc.fileSize && (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="flex-shrink-0 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                          title="Tải xuống"
                        >
                          <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
