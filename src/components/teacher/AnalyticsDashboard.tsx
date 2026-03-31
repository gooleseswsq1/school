'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, Users, Clock, TrendingUp, Eye, BookOpen,
  FileText, Video, HelpCircle, Award, Target, Activity,
  ChevronDown, Calendar, Download, Filter, RefreshCw,
  ArrowUp, ArrowDown, Minus, Sparkles, Zap, Brain
} from 'lucide-react';

interface EngagementData {
  pageId: string;
  pageTitle: string;
  totalViews: number;
  uniqueStudents: number;
  avgTimeSpent: number; // seconds
  completionRate: number; // percentage
  blockEngagement: {
    blockId: string;
    blockType: string;
    views: number;
    avgTime: number;
    interactions: number;
  }[];
  dailyStats: {
    date: string;
    views: number;
    students: number;
  }[];
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  pagesViewed: number;
  totalTimeSpent: number;
  quizzesCompleted: number;
  avgQuizScore: number;
  lastActive: string;
  streak: number;
}

interface AnalyticsDashboardProps {
  teacherId: string;
  className?: string;
}

const BLOCK_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  VIDEO: { label: 'Video', icon: <Video size={14} />, color: 'bg-red-100 text-red-700' },
  DOCUMENT: { label: 'Tài liệu', icon: <FileText size={14} />, color: 'bg-blue-100 text-blue-700' },
  QUIZ: { label: 'Quiz', icon: <HelpCircle size={14} />, color: 'bg-green-100 text-green-700' },
  TEXT: { label: 'Văn bản', icon: <BookOpen size={14} />, color: 'bg-gray-100 text-gray-700' },
  CANVA: { label: 'Thiết kế', icon: <Sparkles size={14} />, color: 'bg-purple-100 text-purple-700' },
  RICH_TEXT: { label: 'Rich Text', icon: <FileText size={14} />, color: 'bg-indigo-100 text-indigo-700' },
  FLASHCARD: { label: 'Flashcard', icon: <Brain size={14} />, color: 'bg-pink-100 text-pink-700' },
};

export default function AnalyticsDashboard({ teacherId, className }: AnalyticsDashboardProps) {
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'pages' | 'students' | 'blocks'>('overview');

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch engagement data
      const engagementRes = await fetch(
        `/api/teacher/analytics/engagement?teacherId=${teacherId}&range=${dateRange}`
      );
      if (engagementRes.ok) {
        const data = await engagementRes.json();
        setEngagementData(data);
      }

      // Fetch student progress
      const progressRes = await fetch(
        `/api/teacher/analytics/students?teacherId=${teacherId}&range=${dateRange}`
      );
      if (progressRes.ok) {
        const data = await progressRes.json();
        setStudentProgress(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate summary stats
  const totalViews = engagementData.reduce((sum, p) => sum + p.totalViews, 0);
  const totalStudents = new Set(engagementData.flatMap(p => 
    p.dailyStats.map(d => d.date)
  )).size;
  const avgCompletion = engagementData.length > 0
    ? Math.round(engagementData.reduce((sum, p) => sum + p.completionRate, 0) / engagementData.length)
    : 0;
  const avgTime = engagementData.length > 0
    ? Math.round(engagementData.reduce((sum, p) => sum + p.avgTimeSpent, 0) / engagementData.length)
    : 0;

  // Format time
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}ph`;
    return `${Math.round(seconds / 3600)}h`;
  };

  // Get trend indicator
  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp size={14} className="text-green-500" />;
    if (current < previous) return <ArrowDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-gray-400" />;
  };

  // Export data
  const handleExport = () => {
    const csvContent = [
      ['Trang', 'Lượt xem', 'Học sinh', 'Thời gian TB', 'Hoàn thành'].join(','),
      ...engagementData.map(p => [
        p.pageTitle,
        p.totalViews,
        p.uniqueStudents,
        formatTime(p.avgTimeSpent),
        `${p.completionRate}%`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Thống kê học tập</h2>
              <p className="text-sm text-gray-500">Theo dõi tiến độ và tương tác của học sinh</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="90d">90 ngày qua</option>
              <option value="all">Tất cả</option>
            </select>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <Download size={14} />
              Xuất CSV
            </button>
            <button
              onClick={fetchAnalytics}
              className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'overview', label: 'Tổng quan', icon: <Activity size={14} /> },
            { id: 'pages', label: 'Bài giảng', icon: <BookOpen size={14} /> },
            { id: 'students', label: 'Học sinh', icon: <Users size={14} /> },
            { id: 'blocks', label: 'Nội dung', icon: <Target size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Eye size={20} className="text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">+12%</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{totalViews}</p>
                <p className="text-sm text-blue-600">Tổng lượt xem</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users size={20} className="text-green-600" />
                  <span className="text-xs text-green-600 font-medium">+5%</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{studentProgress.length}</p>
                <p className="text-sm text-green-600">Học sinh hoạt động</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock size={20} className="text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">TB</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">{formatTime(avgTime)}</p>
                <p className="text-sm text-purple-600">Thời gian học TB</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award size={20} className="text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Mục tiêu</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">{avgCompletion}%</p>
                <p className="text-sm text-orange-600">Tỷ lệ hoàn thành</p>
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Bài giảng phổ biến nhất</h3>
              <div className="space-y-2">
                {engagementData
                  .sort((a, b) => b.totalViews - a.totalViews)
                  .slice(0, 5)
                  .map((page, index) => (
                    <div key={page.pageId} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{page.pageTitle}</p>
                        <p className="text-sm text-gray-500">{page.uniqueStudents} học sinh</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{page.totalViews}</p>
                        <p className="text-xs text-gray-500">lượt xem</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Active Students */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Học sinh tích cực nhất</h3>
              <div className="space-y-2">
                {studentProgress
                  .sort((a, b) => b.totalTimeSpent - a.totalTimeSpent)
                  .slice(0, 5)
                  .map((student, index) => (
                    <div key={student.studentId} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                        {student.studentName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800">{student.studentName}</p>
                        <p className="text-sm text-gray-500">
                          {student.pagesViewed} bài · {student.quizzesCompleted} quiz
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatTime(student.totalTimeSpent)}</p>
                        <p className="text-xs text-gray-500">
                          {student.streak > 0 && `🔥 ${student.streak} ngày`}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === 'pages' && (
          <div className="space-y-4">
            {engagementData.map((page) => (
              <div key={page.pageId} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">{page.pageTitle}</h3>
                  <button
                    onClick={() => setSelectedPage(selectedPage === page.pageId ? null : page.pageId)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {selectedPage === page.pageId ? 'Thu gọn' : 'Chi tiết'}
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{page.totalViews}</p>
                    <p className="text-xs text-blue-600">Lượt xem</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{page.uniqueStudents}</p>
                    <p className="text-xs text-green-600">Học sinh</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold text-purple-600">{formatTime(page.avgTimeSpent)}</p>
                    <p className="text-xs text-purple-600">Thời gian TB</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xl font-bold text-orange-600">{page.completionRate}%</p>
                    <p className="text-xs text-orange-600">Hoàn thành</p>
                  </div>
                </div>

                {selectedPage === page.pageId && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3">Tương tác theo nội dung</h4>
                    <div className="space-y-2">
                      {page.blockEngagement.map((block) => {
                        const typeInfo = BLOCK_TYPE_LABELS[block.blockType] || BLOCK_TYPE_LABELS.TEXT;
                        return (
                          <div key={block.blockId} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                              {typeInfo.icon}
                              <span className="ml-1">{typeInfo.label}</span>
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>{block.views} lượt xem</span>
                                <span>{formatTime(block.avgTime)} TB</span>
                                <span>{block.interactions} tương tác</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Học sinh</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Bài đã xem</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Thời gian học</th>
                  <th className="text-center py-3 px-3 px-4 text-sm font-medium text-gray-600">Quiz hoàn thành</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Điểm TB</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Streak</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">Hoạt động cuối</th>
                </tr>
              </thead>
              <tbody>
                {studentProgress.map((student) => (
                  <tr key={student.studentId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                          {student.studentName.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{student.studentName}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-gray-600">{student.pagesViewed}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{formatTime(student.totalTimeSpent)}</td>
                    <td className="text-center py-3 px-4 text-gray-600">{student.quizzesCompleted}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`font-semibold ${
                        student.avgQuizScore >= 80 ? 'text-green-600' :
                        student.avgQuizScore >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {student.avgQuizScore}%
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {student.streak > 0 ? (
                        <span className="flex items-center justify-center gap-1 text-orange-600">
                          🔥 {student.streak}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="text-center py-3 px-4 text-sm text-gray-500">
                      {new Date(student.lastActive).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Blocks Tab */}
        {activeTab === 'blocks' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800">Hiệu quả theo loại nội dung</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(BLOCK_TYPE_LABELS).map(([type, info]) => {
                const typeBlocks = engagementData.flatMap(p => 
                  p.blockEngagement.filter(b => b.blockType === type)
                );
                const totalViews = typeBlocks.reduce((sum, b) => sum + b.views, 0);
                const avgTime = typeBlocks.length > 0
                  ? Math.round(typeBlocks.reduce((sum, b) => sum + b.avgTime, 0) / typeBlocks.length)
                  : 0;
                const totalInteractions = typeBlocks.reduce((sum, b) => sum + b.interactions, 0);

                return (
                  <div key={type} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${info.color}`}>
                        {info.icon}
                        <span className="ml-1">{info.label}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{totalViews}</p>
                        <p className="text-xs text-gray-500">Lượt xem</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatTime(avgTime)}</p>
                        <p className="text-xs text-gray-500">Thời gian TB</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{totalInteractions}</p>
                        <p className="text-xs text-gray-500">Tương tác</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}