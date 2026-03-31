'use client';

import { useState, useEffect, useRef } from 'react';
import { LogOut, BookOpen, Video, FileText, HelpCircle, Link as LinkIcon, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface Block {
  id: string;
  type: string;
  content?: string;
  title?: string;
  url?: string;
}

interface StudentPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  author: { name: string; id: string };
  createdAt: string;
  updatedAt: string;
  blocks?: Block[];
}

export default function StudentPagesViewer() {
  const { user, isLoading, logout } = useAuth({ requiredRole: 'STUDENT' });
  const [pages, setPages] = useState<StudentPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch pages when user is loaded
  useEffect(() => {
    if (user) {
      fetchPublishedPages();
      // Set up polling to check for updates every 5 seconds
      pollIntervalRef.current = setInterval(() => {
        fetchPublishedPages();
      }, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [user]);

  const fetchPublishedPages = async () => {
    try {
      const response = await fetch('/api/pages?published=true', {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      const data = await response.json();
      setPages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching pages:', err);
    } finally {
      setIsLoadingPages(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Đang tải bài giảng...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-8 h-8" />
              Bài giảng
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Danh sách các bài giảng do giáo viên chuẩn bị cho bạn
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {pages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Chưa có bài giảng
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Giáo viên chưa phát hành bài giảng nào. Vui lòng quay lại sau.
              </p>
              <Link href="/student" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                ← Quay lại trang chủ
              </Link>
            </div>
          ) : (
            <div>
              <Link href="/student" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium mb-6 inline-flex items-center gap-1">
                ← Quay lại trang chủ
              </Link>
              <div className="grid grid-cols-1 gap-6">
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden"
                  >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            {page.title}
                          </h3>
                          {page.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                              {page.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>GV: {page.author.name}</span>
                            <span>•</span>
                            <span>{new Date(page.updatedAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                        <Link
                          href={`/${page.slug || page.id}`}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Xem đầy đủ
                        </Link>
                      </div>
                    </div>

                    {/* Blocks Preview */}
                    {page.blocks && page.blocks.length > 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-slate-900/50">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
                          Nội dung bài giảng ({page.blocks.length} phần):
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {page.blocks.slice(0, 6).map((block, idx) => {
                            const getBlockIcon = (type: string) => {
                              switch (type) {
                                case 'video': return <Video size={14} className="text-red-500" />;
                                case 'document': return <FileText size={14} className="text-blue-500" />;
                                case 'quiz': return <HelpCircle size={14} className="text-purple-500" />;
                                case 'link': return <LinkIcon size={14} className="text-green-500" />;
                                case 'image': return <ImageIcon size={14} className="text-orange-500" />;
                                default: return <FileText size={14} className="text-gray-500" />;
                              }
                            };

                            const getBlockLabel = (type: string) => {
                              switch (type) {
                                case 'video': return 'Video';
                                case 'document': return 'Tài liệu';
                                case 'quiz': return 'Câu hỏi';
                                case 'link': return 'Liên kết';
                                case 'image': return 'Hình ảnh';
                                default: return 'Nội dung';
                              }
                            };

                            return (
                              <div
                                key={block.id || idx}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 text-xs"
                              >
                                {getBlockIcon(block.type)}
                                <span className="text-gray-700 dark:text-gray-300">
                                  {getBlockLabel(block.type)}
                                </span>
                              </div>
                            );
                          })}
                          {page.blocks.length > 6 && (
                            <div className="flex items-center px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                              +{page.blocks.length - 6} nữa
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
