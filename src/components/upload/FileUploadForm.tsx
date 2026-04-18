'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef } from 'react';
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react';
import { IDocument } from '@/types';

interface FileUploadFormProps {
  onUploadSuccess?: (document: IDocument) => void;
}

export default function FileUploadForm({ onUploadSuccess }: FileUploadFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState<'VIDEO' | 'POWERPOINT' | 'WORD' | 'PDF' | 'OTHER'>('PDF');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverRef = useRef(false);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_EXTENSIONS = [
    // Documents
    'pdf', 'doc', 'docx', 'txt',
    // Spreadsheets
    'xls', 'xlsx',
    // Presentations
    'ppt', 'pptx',
    // Images
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp',
    // Archives
    'zip', 'rar', '7z',
    // Videos
    'mp4', 'avi', 'mov', 'mkv', 'wmv'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = true;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = false;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragOverRef.current = false;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError('');
    
    // Check file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File vượt quá kích thước tối đa (50MB)`);
      return;
    }

    // Check file extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Định dạng file không được hỗ trợ. Chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề tài liệu');
      return;
    }

    if (!file) {
      setError('Vui lòng chọn file để tải lên');
      return;
    }

    // Get logged-in user
    const userData = localStorage.getItem('user');
    if (!userData) {
      setError('Vui lòng đăng nhập để tải lên file');
      return;
    }

    const user = JSON.parse(userData);

    setIsLoading(true);

    try {
      // Actually upload the file first
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Lỗi khi tải file lên server');
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.url;

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          fileUrl: fileUrl,
          fileType,
          fileSize: file.size,
          authorId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tạo bản ghi tài liệu');
      }

      const document = await response.json();
      setSuccess('Tài liệu đã được tải lên thành công!');
      setTitle('');
      setDescription('');
      setFile(null);
      setFileType('PDF');

      // Reset file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadSuccess) {
        onUploadSuccess(document);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi tải lên file';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title Input */}
        <div>
          <label htmlFor="doc-title" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Tiêu đề tài liệu *
          </label>
          <input
            id="doc-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Bài giảng C cơ bản"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Description Input */}
        <div>
          <label htmlFor="doc-description" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Mô tả (không bắt buộc)
          </label>
          <textarea
            id="doc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về nội dung tài liệu..."
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* File Type Select */}
        <div>
          <label htmlFor="doc-type" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Loại tài liệu *
          </label>
          <select
            id="doc-type"
            value={fileType}
            onChange={(e) => setFileType(e.target.value as any)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="VIDEO">Video</option>
            <option value="POWERPOINT">PowerPoint</option>
            <option value="WORD">Word</option>
            <option value="PDF">PDF</option>
            <option value="OTHER">Khác</option>
          </select>
        </div>

        {/* File Drop Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Tệp tài liệu *
          </label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOverRef.current
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileIcon className="w-8 h-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="ml-auto p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-900 dark:text-white font-medium">Kéo thả file hoặc click để chọn</p>
                <p className="text-sm text-gray-500 mt-1">Hỗ trợ: {ALLOWED_EXTENSIONS.join(', ')}</p>
                <p className="text-xs text-gray-400 mt-1">Kích thước tối đa: 50 MB</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 rounded-lg">
            <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !file}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isLoading || !file
              ? 'bg-gray-300 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Đang tải lên...
            </div>
          ) : (
            'Tải lên tài liệu'
          )}
        </button>
      </form>
    </div>
  );
}
