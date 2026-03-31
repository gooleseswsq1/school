'use client';

import { useState, useEffect } from 'react';
import { LogOut, BookOpen, ArrowLeft, Search, X, Layers, ChevronDown, Play } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import StudentPageRenderer from '@/components/editor/StudentPageRenderer';
import MiniLecturePlayer from '@/components/student/MiniLecturePlayer';

interface StudentPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  author: { name: string; id: string };
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
  children?: StudentPage[];
}

interface Author {
  id: string;
  name: string;
}

export default function StudentLecturesViewer() {
  const { user, isLoading, logout } = useAuth({ requiredRole: 'STUDENT' });
  const [pages, setPages] = useState<StudentPage[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'view'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<StudentPage | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  // Fetch pages and authors when user is loaded
  useEffect(() => {
    if (user) {
      fetchPublishedPages();
    }
  }, [user]);

  const fetchPublishedPages = async () => {
    try {
      setIsLoadingPages(true);
      // Fetch only pages from linked teachers
      const response = await fetch(`/api/pages/student-linked?studentId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pages');
      }
      const data = await response.json();
      setPages(data); // Already hierarchical with children

      // Extract unique authors from root courses
      const uniqueAuthors = Array.from(
        new Map(
          data
            .filter((p: StudentPage) => p.author)
            .map((page: StudentPage) => [page.author.id, page.author])
        ).values()
      ) as Author[];
      setAuthors(uniqueAuthors);

      // Select first author by default
      if (uniqueAuthors.length > 0) {
        setSelectedAuthorId(uniqueAuthors[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching pages:', err);
    } finally {
      setIsLoadingPages(false);
    }
  };

  if (isLoading || isLoadingPages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      </div>
    );
  }

  // View mode - display page in read-only full-width
  if (viewMode === 'view' && selectedAuthorId && selectedPageId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="bg-white border-b p-4 flex items-center justify-between">
          <button
            onClick={() => {
              setViewMode('list');
              setSelectedPageId(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium"
          >
            <ArrowLeft size={18} />
            Quay lại
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chế độ xem bài giảng</h1>
          <button
            onClick={logout}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <StudentPageRenderer 
          pageId={selectedPageId} 
          authorId={selectedAuthorId}
          studentId={user?.id}
          studentName={user?.name}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-100 dark:bg-cyan-900/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10">
        {/* Navigation Bar - Tên và thống kê ngang hàng */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/student" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              Penta School
            </Link>
            <div className="flex items-center gap-6">
              {/* Tên học sinh */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Học sinh</p>
              </div>
              {/* Thống kê nhỏ gọn ngang hàng tên */}
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{pages.length}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Khóa học</div>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-sm font-bold text-green-600 dark:text-green-400">
                    {pages.reduce((acc, p) => acc + (p.children?.length || 0), 0)}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Bài học</div>
                </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Bài giảng</h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Xem các bài giảng do giáo viên tạo
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {pages.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Chưa có bài giảng nào được xuất bản</p>
            </div>
          ) : (
            <>
              {/* Search + Authors Tabs */}
              <div className="mb-6 space-y-4">
                {/* Search bar */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm bài giảng..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Authors Tabs — ẩn khi đang search */}
                {!searchQuery && authors.length > 0 && (
                  <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                    <button
                      onClick={() => setSelectedAuthorId(null)}
                      className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                        selectedAuthorId === null
                          ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Tất cả
                    </button>
                    {authors.map((author) => (
                      <button
                        key={author.id}
                        onClick={() => setSelectedAuthorId(author.id)}
                        className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                          selectedAuthorId === author.id
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                      >
                        {author.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Courses List */}
              {(() => {
                const filtered = pages.filter(page => {
                  const matchAuthor = searchQuery ? true : (selectedAuthorId === null || page.author?.id === selectedAuthorId);
                  const matchSearch = !searchQuery || page.title.toLowerCase().includes(searchQuery.toLowerCase()) || page.description?.toLowerCase().includes(searchQuery.toLowerCase()) || page.author?.name.toLowerCase().includes(searchQuery.toLowerCase());
                  return matchAuthor && matchSearch;
                });
                if (filtered.length === 0) return (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">Không tìm thấy khóa học nào cho "<strong>{searchQuery}</strong>"</p>
                    <button onClick={() => setSearchQuery('')} className="mt-3 text-blue-600 text-sm hover:underline">Xóa tìm kiếm</button>
                  </div>
                );
                return (
                  <div className="flex flex-col gap-4">
                    {filtered.map((course) => {
                      const isExpanded = expandedCourseId === course.id;
                      const lessonCount = course.children?.length || 0;
                      return (
                        <div
                          key={course.id}
                          className="rounded-2xl bg-white dark:bg-slate-800 shadow-lg overflow-hidden"
                        >
                          {/* Course Header */}
                          <div
                            onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                            className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                                <Layers className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{course.title}</h3>
                                  {lessonCount > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                      {lessonCount} bài học
                                    </span>
                                  )}
                                </div>
                                {course.description && (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{course.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}</p>
                                )}
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Giáo viên: {course.author?.name} · Cập nhật: {new Date(course.updatedAt).toLocaleDateString('vi-VN')}
                                </div>
                              </div>
                              <ChevronDown 
                                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                              />
                            </div>
                          </div>

                          {/* Expanded: Lessons */}
                          {isExpanded && (
                            <div className="border-t border-gray-100 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-800/50">
                              <div className="flex flex-col gap-2">
                                <div
                                  onClick={() => {
                                    setActiveCourse(course);
                                    setActiveLessonId(course.id);
                                    setShowMiniPlayer(true);
                                  }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-800/40 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300 flex-shrink-0">
                                    Gốc
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{course.title}</div>
                                    <div className="text-xs text-gray-400">Nội dung chính của bài giảng</div>
                                  </div>
                                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex-shrink-0 flex items-center gap-1">
                                    <Play className="w-3 h-3" />
                                    Học ngay
                                  </span>
                                </div>

                                {course.children && course.children.length > 0 ? (
                                  course.children.map((lesson, idx) => (
                                    <div
                                      key={lesson.id}
                                      onClick={() => {
                                        setActiveCourse(course);
                                        setActiveLessonId(lesson.id);
                                        setShowMiniPlayer(true);
                                      }}
                                      className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all cursor-pointer group"
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lesson.title}</div>
                                      </div>
                                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex-shrink-0 flex items-center gap-1">
                                        <Play className="w-3 h-3" />
                                        Học ngay
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-center py-2 text-sm text-gray-400">Khóa học chưa có bài học con</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Mini Lecture Player */}
      {showMiniPlayer && activeCourse && (
        <MiniLecturePlayer
          course={activeCourse}
          initialLessonId={activeLessonId || undefined}
          studentId={user?.id}
          studentName={user?.name}
          onClose={() => {
            setShowMiniPlayer(false);
            setActiveCourse(null);
            setActiveLessonId(null);
          }}
        />
      )}
    </div>
  );
}
