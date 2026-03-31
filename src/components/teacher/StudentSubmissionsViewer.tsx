'use client';

import { useState, useEffect } from 'react';
import { Download, Trash2, FileText, Eye, EyeOff, Search, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Submission {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  createdAt: string;
  studentId: string;
  studentName?: string;
  status: string;
  score?: number;
  isAchieved?: boolean;
  gradedAt?: string;
}

interface StudentSubmission {
  studentId: string;
  studentName: string;
  submissions: Submission[];
}

export default function StudentSubmissionsViewer() {
  const [groupedSubmissions, setGroupedSubmissions] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [previewSubmission, setPreviewSubmission] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState<number | ''>('');
  const [gradingAchieved, setGradingAchieved] = useState(false);
  const [isGradingSaving, setIsGradingSaving] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/teacher/submissions');
      if (!response.ok) throw new Error('Failed to fetch submissions');

      const data = await response.json();
      
      // Group submissions by student
      const grouped = data.reduce((acc: Record<string, any>, submission: any) => {
        const studentId = submission.authorId;
        if (!acc[studentId]) {
          acc[studentId] = {
            studentId,
            studentName: submission.author?.name || `Student ${studentId}`,
            submissions: []
          };
        }
        acc[studentId].submissions.push({
          ...submission,
          studentId,
          fileName: submission.fileUrl?.split('/').pop() || 'file',
        });
        return acc;
      }, {});

      setGroupedSubmissions(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Lỗi khi tải bài nộp');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudentExpanded = (studentId: string) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    try {
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName)}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Lỗi khi tải file');
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài nộp này?')) return;

    try {
      const response = await fetch(`/api/documents/${submissionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete submission');

      toast.success('Bài nộp đã được xóa');
      fetchSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Lỗi khi xóa bài nộp');
    }
  };

  const handleOpenGrading = (submission: Submission) => {
    setGradingSubmission(submission);
    setGradingScore(submission.score || '');
    setGradingAchieved(submission.isAchieved || false);
  };

  const handleOpenPreview = (submission: Submission) => {
    setPreviewSubmission(submission);
  };

  const getFilePreviewUrl = (fileUrl: string) => {
    // If it's already a full URL, return it
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Otherwise, prepend the base URL
    return `${fileUrl}`;
  };

  const isPreviewableFile = (fileType: string) => {
    const previewableTypes = ['PDF', 'IMAGE'];
    return previewableTypes.includes(fileType.toUpperCase());
  };

  const handleSaveGrading = async () => {
    if (!gradingSubmission) return;

    try {
      setIsGradingSaving(true);
      
      const response = await fetch(`/api/submissions/${gradingSubmission.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: gradingScore === '' ? null : gradingScore,
          isAchieved: gradingAchieved,
          gradedBy: 'teacher' // Would be replaced with actual teacher ID
        })
      });

      if (!response.ok) throw new Error('Failed to save grading');

      toast.success('Đã lưu điểm số');
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error saving grading:', error);
      toast.error('Lỗi khi lưu điểm số');
    } finally {
      setIsGradingSaving(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredSubmissions = groupedSubmissions
    .map(group => ({
      ...group,
      submissions: group.submissions.filter(sub => {
        const matchesSearch = 
          group.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
        return matchesSearch && matchesStatus;
      })
    }))
    .filter(group => group.submissions.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Đang tải bài nộp...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Bài nộp của học sinh
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Quản lý và xem bài nộp từ các học sinh
          </p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm học sinh hoặc bài nộp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Trạng thái:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="submitted">Đã nộp</option>
                <option value="graded">Đã chấm</option>
                <option value="achieved">Đạt</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {groupedSubmissions.length === 0 ? 'Chưa có bài nộp nào' : 'Không tìm thấy kết quả phù hợp'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map((group) => (
              <div
                key={group.studentId}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden"
              >
                {/* Student Header */}
                <button
                  onClick={() => toggleStudentExpanded(group.studentId)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {group.studentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {group.studentName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.submissions.length} bài nộp
                      </p>
                    </div>
                  </div>
                  {expandedStudents.has(group.studentId) ? (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Submissions List */}
                {expandedStudents.has(group.studentId) && (
                  <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                    {group.submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {submission.title}
                            </h4>
                            {submission.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {submission.description}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            submission.status === 'achieved'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                              : submission.status === 'graded'
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          }`}>
                            {submission.status === 'achieved' ? 'Đạt' : submission.status === 'graded' ? 'Đã chấm' : 'Đã nộp'}
                          </span>
                        </div>

                        {/* Score and Achieved Display */}
                        {submission.score !== undefined && submission.score !== null && (
                          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              <strong>Điểm:</strong> {submission.score}/100
                              {submission.isAchieved !== undefined && (
                                <span className="ml-3">
                                  {submission.isAchieved ? '✓ Đạt' : '✗ Chưa đạt'}
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                          <span>
                            {formatDate(submission.createdAt)} • {formatFileSize(submission.fileSize)}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenPreview(submission)}
                              className="p-1.5 hover:bg-green-50 dark:hover:bg-slate-600 rounded transition text-green-600 dark:text-green-400"
                              title="Xem trực tiếp"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(submission.fileUrl, submission.fileName)}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-600 rounded transition text-blue-600 dark:text-blue-400"
                              title="Tải xuống"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenGrading(submission)}
                              className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                              title="Chấm điểm"
                            >
                              Chấm
                            </button>
                            <button
                              onClick={() => handleDeleteSubmission(submission.id)}
                              className="p-1.5 hover:bg-red-50 dark:hover:bg-slate-600 rounded transition text-red-600 dark:text-red-400"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Xem: {previewSubmission.fileName}
              </h3>
              <button
                onClick={() => setPreviewSubmission(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {isPreviewableFile(previewSubmission.fileType) ? (
                previewSubmission.fileType.toUpperCase() === 'IMAGE' ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={getFilePreviewUrl(previewSubmission.fileUrl)}
                      alt={previewSubmission.fileName}
                      className="max-w-full max-h-[60vh] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3EKhông thể tải ảnh%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-100 dark:bg-slate-700 rounded p-4 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Định dạng {previewSubmission.fileType} không hỗ trợ xem trực tiếp
                    </p>
                    <button
                      onClick={() => handleDownload(previewSubmission.fileUrl, previewSubmission.fileName)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                    >
                      <Download className="w-4 h-4" />
                      Tải xuống để xem
                    </button>
                  </div>
                )
              ) : (
                <div className="bg-gray-100 dark:bg-slate-700 rounded p-4 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Loại file này không hỗ trợ xem trực tiếp
                  </p>
                  <button
                    onClick={() => handleDownload(previewSubmission.fileUrl, previewSubmission.fileName)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                  >
                    <Download className="w-4 h-4" />
                    Tải xuống để xem
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Chấm điểm
              </h3>
              <button
                onClick={() => setGradingSubmission(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bài nộp: <strong>{gradingSubmission.title}</strong>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Học sinh: {gradingSubmission.studentName}
                </p>
              </div>

              {/* Score Input */}
              <div>
                <label htmlFor="grading-score" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Điểm số (0-100)
                </label>
                <input
                  id="grading-score"
                  type="number"
                  min="0"
                  max="100"
                  value={gradingScore}
                  onChange={(e) => setGradingScore(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Nhập điểm số"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Achieved Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="achieved"
                  checked={gradingAchieved}
                  onChange={(e) => setGradingAchieved(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="achieved" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  ✓ Học sinh đạt yêu cầu
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setGradingSubmission(null)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveGrading}
                  disabled={isGradingSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
                >
                  {isGradingSaving ? 'Đang lưu...' : 'Lưu điểm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
