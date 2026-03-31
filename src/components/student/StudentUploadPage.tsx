'use client';

import { useState, useEffect, useRef } from 'react';
import { LogOut, Upload, FileText } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface StudentSubmission {
  id: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export default function StudentUploadPage() {
  const { user, isLoading, logout } = useAuth({ requiredRole: 'STUDENT' });
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch submissions when user is loaded
  useEffect(() => {
    if (user) {
      fetchSubmissions();
    }
  }, [user]);

  const fetchSubmissions = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/submissions?studentId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setUploadMessage('Lỗi: Không tìm thấy thông tin người dùng');
      return;
    }

    if (!file) {
      setUploadMessage('Vui lòng chọn file');
      return;
    }

    if (!submissionTitle.trim()) {
      setUploadMessage('Vui lòng nhập tiêu đề bài nộp');
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', submissionTitle);
      formData.append('description', submissionDescription);
      formData.append('studentId', user.id);
      formData.append('studentName', user.name);

      const response = await fetch('/api/student-submissions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to upload file');
      }

      setUploadMessage('✓ Nộp bài thành công');
      setFile(null);
      setSubmissionTitle('');
      setSubmissionDescription('');
      
      // Reset file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reload submissions
      fetchSubmissions();
      
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      setUploadMessage('✗ Lỗi khi nộp: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-100 dark:bg-cyan-900/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Navigation Bar */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/student" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              Penta School
            </Link>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Học sinh</p>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link href="/student" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium mb-4 inline-flex items-center gap-1">
              ← Quay lại
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Upload className="w-8 h-8" />
              Nộp bài
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tải lên file bài tập, bài làm hoặc tài nguyên cho giáo viên
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Form */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
                <form onSubmit={handleUpload} className="space-y-6">
                  {/* File Upload Area */}
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative rounded-lg border-2 border-dashed transition-all duration-200 p-8 text-center cursor-pointer ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.gif,.bmp,.webp,.rar,.7z,.mp4,.avi,.mov,.mkv,.wmv"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          Kéo thả file hoặc bấm để chọn
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Hỗ trợ: PDF, Word, PPT, Excel, TXT, PNG, JPG, ZIP, Video...
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected File */}
                  {file && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                          <p className="font-medium text-green-900 dark:text-green-200">{file.name}</p>
                          <p className="text-sm text-green-700 dark:text-green-300">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-yellow-600 hover:text-red-600 dark:text-yellow-400 dark:hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Message */}
                  {uploadMessage && (
                    <div className={`p-4 rounded-lg ${
                      uploadMessage.startsWith('✓')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {uploadMessage}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label htmlFor="submission-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tiêu đề bài nộp *
                    </label>
                    <input
                      id="submission-title"
                      type="text"
                      value={submissionTitle}
                      onChange={(e) => setSubmissionTitle(e.target.value)}
                      placeholder="VD: Bài 1 - Hello World"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="submission-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mô tả
                    </label>
                    <textarea
                      id="submission-description"
                      value={submissionDescription}
                      onChange={(e) => setSubmissionDescription(e.target.value)}
                      placeholder="Mô tả về bài nộp của bạn..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isUploading || !file}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Đang nộp...' : 'Nộp bài'}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar - Help */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-4">💡 Gợi ý</h3>
                <ul className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Đặt tên tiêu đề rõ ràng để giáo viên dễ phân loại</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Mô tả chi tiết bài làm của bạn</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>File tối đa 50MB</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Bạn có thể nộp bài nhiều lần</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Lịch sử nộp bài</h2>
            
            {submissions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Bạn chưa nộp bài nào</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{submission.title}</h3>
                        {submission.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{submission.description}</p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                        Nộp: {formatDate(submission.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-3">
                      <FileText className="w-4 h-4" />
                      <span>{submission.fileName}</span>
                      <span className="text-xs">({formatFileSize(submission.fileSize)})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
