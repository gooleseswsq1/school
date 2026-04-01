'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Bell, TrendingUp, BookOpen, Clock, CheckCircle, AlertCircle, Target, Award, BarChart3, Plus, X, Trash2, Loader2 } from 'lucide-react';

interface ScheduleItem {
  id: string;
  title: string;
  subject: string;
  type: 'lecture' | 'exam' | 'assignment';
  date: string;
  time: string;
  duration: number;
  teacher: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'reminder';
  timestamp: string;
  isRead: boolean;
}

interface ProgressData {
  subject: string;
  completed: number;
  total: number;
  percentage: number;
  color: string;
}

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  color: string;
}

interface StudentAdditionalFeaturesProps {
  studentId?: string;
  notifications?: Notification[];
  onMarkAllRead?: () => void;
}

export default function StudentAdditionalFeatures({ studentId, notifications: propNotifications, onMarkAllRead }: StudentAdditionalFeaturesProps = {}) {
  const [activeTab, setActiveTab] = useState<'schedule' | 'notifications' | 'progress' | 'goals'>('schedule');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(propNotifications ?? []);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', target: '', unit: 'bài', deadline: '', color: '#3B82F6' });

  // Sync notifications from props whenever they change
  useEffect(() => {
    if (propNotifications) setNotifications(propNotifications);
  }, [propNotifications]);

  // Fetch schedule from API
  const fetchSchedule = useCallback(async () => {
    if (!studentId) return;
    setLoadingSchedule(true);
    try {
      const res = await fetch(`/api/student/schedule?studentId=${studentId}`);
      if (res.ok) setSchedule(await res.json());
    } catch { /* ignore */ }
    setLoadingSchedule(false);
  }, [studentId]);

  // Fetch progress from API
  const fetchProgress = useCallback(async () => {
    if (!studentId) return;
    setLoadingProgress(true);
    try {
      const res = await fetch(`/api/student/progress?studentId=${studentId}`);
      if (res.ok) setProgressData(await res.json());
    } catch { /* ignore */ }
    setLoadingProgress(false);
  }, [studentId]);

  // Fetch goals from API
  const fetchGoals = useCallback(async () => {
    if (!studentId) return;
    setLoadingGoals(true);
    try {
      const res = await fetch(`/api/student/goals?studentId=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        setGoals(data.map((g: Record<string, unknown>) => ({
          id: g.id as string,
          title: g.title as string,
          target: g.target as number,
          current: g.current as number,
          unit: (g.unit as string) || 'bài',
          deadline: g.deadline ? new Date(g.deadline as string).toISOString().split('T')[0] : '',
          color: (g.color as string) || '#3B82F6',
        })));
      }
    } catch { /* ignore */ }
    setLoadingGoals(false);
  }, [studentId]);

  useEffect(() => {
    fetchSchedule();
    fetchProgress();
    fetchGoals();
  }, [fetchSchedule, fetchProgress, fetchGoals]);

  // Goal CRUD handlers
  const handleAddGoal = async () => {
    if (!studentId || !goalForm.title || !goalForm.target) return;
    try {
      const res = await fetch('/api/student/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          title: goalForm.title,
          target: parseFloat(goalForm.target),
          unit: goalForm.unit,
          deadline: goalForm.deadline || null,
          color: goalForm.color,
        }),
      });
      if (res.ok) {
        setGoalForm({ title: '', target: '', unit: 'bài', deadline: '', color: '#3B82F6' });
        setShowGoalForm(false);
        fetchGoals();
      }
    } catch { /* ignore */ }
  };

  const handleUpdateGoalProgress = async (goalId: string, newCurrent: number) => {
    try {
      const res = await fetch('/api/student/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, current: newCurrent }),
      });
      if (res.ok) fetchGoals();
    } catch { /* ignore */ }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const res = await fetch('/api/student/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId }),
      });
      if (res.ok) fetchGoals();
    } catch { /* ignore */ }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lecture': return <BookOpen size={16} className="text-blue-500" />;
      case 'exam': return <AlertCircle size={16} className="text-red-500" />;
      case 'assignment': return <Clock size={16} className="text-yellow-500" />;
      default: return <Calendar size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'lecture': return 'Bài giảng';
      case 'exam': return 'Kiểm tra';
      case 'assignment': return 'Bài tập';
      default: return 'Khác';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return <Bell size={16} className="text-blue-500" />;
      case 'warning': return <AlertCircle size={16} className="text-yellow-500" />;
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'reminder': return <Clock size={16} className="text-purple-500" />;
      default: return <Bell size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'schedule', label: 'Lịch học', icon: <Calendar size={16} /> },
          { id: 'notifications', label: 'Thông báo', icon: <Bell size={16} />, count: unreadCount },
          { id: 'progress', label: 'Tiến độ', icon: <TrendingUp size={16} /> },
          { id: 'goals', label: 'Mục tiêu', icon: <Target size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count && tab.count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Lịch học sắp tới
            </h3>
            {loadingSchedule ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Loader2 size={32} className="mx-auto mb-4 animate-spin opacity-50" />
                <p>Đang tải lịch học...</p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar size={48} className="mx-auto mb-4 opacity-50" />
                <p>Không có lịch học nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedule.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.type === 'lecture' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          item.type === 'exam' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>{item.subject} · GV: {item.teacher}</p>
                        <p>
                          {formatDate(item.date)} · {item.time}
                          {item.duration > 0 && ` · ${item.duration} phút`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Thông báo
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    onMarkAllRead?.();
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Bell size={48} className="mx-auto mb-4 opacity-50" />
                <p>Không có thông báo nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.isRead
                        ? 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {notification.message}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Tiến độ học tập
            </h3>
            {loadingProgress ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Loader2 size={32} className="mx-auto mb-4 animate-spin opacity-50" />
                <p>Đang tải tiến độ...</p>
              </div>
            ) : progressData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                <p>Chưa có dữ liệu tiến độ</p>
                <p className="text-sm mt-1">Hoàn thành bài kiểm tra để xem tiến độ</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progressData.map((subject, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {subject.subject}
                    </h4>
                    <span className="text-sm font-semibold" style={{ color: subject.color }}>
                      {subject.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${subject.percentage}%`,
                        backgroundColor: subject.color
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {subject.completed}/{subject.total} bài học hoàn thành
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
                <div className="text-2xl font-bold">
                  {Math.round(progressData.reduce((sum, item) => sum + item.percentage, 0) / progressData.length)}%
                </div>
                <div className="text-sm opacity-90">Tiến độ trung bình</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white">
                <div className="text-2xl font-bold">
                  {progressData.reduce((sum, item) => sum + item.completed, 0)}
                </div>
                <div className="text-sm opacity-90">Bài học hoàn thành</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                <div className="text-2xl font-bold">
                  {progressData.filter(item => item.percentage === 100).length}
                </div>
                <div className="text-sm opacity-90">Môn học hoàn thành</div>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mục tiêu học tập
              </h3>
              <button
                onClick={() => setShowGoalForm(f => !f)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                {showGoalForm ? <X size={14} /> : <Plus size={14} />}
                {showGoalForm ? 'Đóng' : 'Thêm mục tiêu'}
              </button>
            </div>

            {/* Goal creation form */}
            {showGoalForm && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                <input
                  id="goal-title"
                  name="goalTitle"
                  type="text"
                  placeholder="Tên mục tiêu (VD: Hoàn thành bài tập Toán)"
                  value={goalForm.title}
                  onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input
                    id="goal-target"
                    name="goalTarget"
                    type="number"
                    placeholder="Mục tiêu"
                    value={goalForm.target}
                    onChange={e => setGoalForm(f => ({ ...f, target: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    id="goal-unit"
                    name="goalUnit"
                    type="text"
                    placeholder="Đơn vị"
                    value={goalForm.unit}
                    onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    id="goal-deadline"
                    name="goalDeadline"
                    type="date"
                    value={goalForm.deadline}
                    onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    id="goal-color"
                    name="goalColor"
                    type="color"
                    value={goalForm.color}
                    onChange={e => setGoalForm(f => ({ ...f, color: e.target.value }))}
                    className="w-full h-[38px] rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleAddGoal}
                  disabled={!goalForm.title || !goalForm.target}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tạo mục tiêu
                </button>
              </div>
            )}

            {loadingGoals ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Loader2 size={32} className="mx-auto mb-4 animate-spin opacity-50" />
                <p>Đang tải mục tiêu...</p>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Target size={48} className="mx-auto mb-4 opacity-50" />
                <p>Chưa có mục tiêu nào</p>
                <p className="text-sm">Hãy đặt mục tiêu để theo dõi tiến độ</p>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map(goal => {
                  const progress = (goal.current / goal.target) * 100;
                  const isCompleted = goal.current >= goal.target;
                  
                  return (
                    <div key={goal.id} className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isCompleted ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}>
                            {isCompleted ? (
                              <Award size={20} className="text-green-600 dark:text-green-400" />
                            ) : (
                              <Target size={20} className="text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {goal.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {goal.deadline ? `Hạn: ${formatDate(goal.deadline)}` : 'Không có thời hạn'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className="text-lg font-bold" style={{ color: goal.color }}>
                              {goal.current}/{goal.target} {goal.unit}
                            </div>
                            <div className="text-xs text-gray-400">
                              {Math.round(progress)}% hoàn thành
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            {!isCompleted && (
                              <button
                                onClick={() => handleUpdateGoalProgress(goal.id, Math.min(goal.current + 1, goal.target))}
                                className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                title="+1"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: isCompleted ? '#10B981' : goal.color
                          }}
                        />
                      </div>
                      
                      {isCompleted && (
                        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                          <CheckCircle size={16} />
                          <span>Chúc mừng! Bạn đã hoàn thành mục tiêu</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 text-white">
              <h4 className="font-semibold mb-2">💡 Mẹo đặt mục tiêu</h4>
              <ul className="text-sm space-y-1 opacity-90">
                <li>• Đặt mục tiêu cụ thể và có thể đo lường được</li>
                <li>• Chia mục tiêu lớn thành các bước nhỏ</li>
                <li>• Đặt deadline thực tế và có thể đạt được</li>
                <li>• Theo dõi tiến độ thường xuyên</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}