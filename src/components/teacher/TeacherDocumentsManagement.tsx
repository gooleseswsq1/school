'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { LogOut, Upload, Trash2, Filter } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuthUser } from '@/lib/auth-storage';
import { IDocument } from '@/types';
import DocumentList from '@/components/cards/DocumentList';

export default function TeacherDocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/auth/login');
      return;
    }

    const parsedUser = JSON.parse(userData);

    // Check if user is teacher or admin
    if (parsedUser.role !== 'TEACHER' && parsedUser.role !== 'ADMIN') {
      router.push('/student/library');
      return;
    }

    setUser(parsedUser);
    fetchDocuments(parsedUser.id);
  }, []);

  const fetchDocuments = async (authorId: string) => {
    try {
      setIsLoading(true);
      let url = `/api/documents?authorId=${authorId}`;
      if (selectedType) {
        url += `&fileType=${selectedType}`;
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

  useEffect(() => {
    if (user) {
      fetchDocuments(user.id);
    }
  }, [selectedType]);

  const handleLogout = () => {
    clearAuthUser();
    router.push('/auth/login');
  };

  const handleDocumentDelete = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const documentTypes = ['VIDEO', 'POWERPOINT', 'WORD', 'PDF', 'OTHER'];

  if (!user) {
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
            <div className="flex items-center gap-3">
              <Link
                href="/teacher/documents"
                className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600"
              >
                Penta School
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.role === 'TEACHER' ? 'Giáo viên' : 'Quản trị viên'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tài liệu của tôi</h1>
            <p className="text-gray-600 dark:text-gray-400">Quản lý các tài liệu đã tải lên của bạn</p>
          </div>

          {/* Action Bar */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Link
              href="/teacher/upload"
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-shadow font-medium"
            >
              <Upload className="w-5 h-5" />
              Tải tài liệu mới
            </Link>

            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Loại:
              </span>
              <button
                onClick={() => setSelectedType(null)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedType === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                Tất cả
              </button>
              {documentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Documents Grid */}
          <DocumentList
            documents={documents}
            isLoading={isLoading}
            showActions={true}
            onDocumentDelete={handleDocumentDelete}
            emptyMessage="Bạn chưa tải lên tài liệu nào. Hãy tải lên tài liệu đầu tiên của bạn!"
          />
        </div>
      </div>
    </div>
  );
}
