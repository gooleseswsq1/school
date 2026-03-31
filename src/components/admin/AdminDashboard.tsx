'use client';

import { useState, useEffect } from 'react';
import {
  LogOut, Users, BookOpen, ClipboardCheck, Library,
  GraduationCap, BarChart3, Settings, ChevronRight, Eye,
  TrendingUp, Bell, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface StatCard { label: string; value: string | number; delta?: string; color: string; icon: React.ReactNode }
interface User { id: string; name: string; email: string; role: string; isActive: boolean; createdAt: string; className?: string; schoolName?: string }

const S = {
  bg: '#070F1D',
  card: '#0D1829',
  border: 'rgba(255,255,255,.08)',
  text: '#E2EAF4',
  muted: 'rgba(255,255,255,.35)',
  blue: '#60C8FF',
  green: '#4ADEAA',
  amber: '#FBB040',
  red: '#FF6B6B',
};

/* ─── Mini stat card ─────────────────────────────────────── */
function StatBlock({ label, value, delta, color, icon }: StatCard) {
  return (
    <div style={{
      background: S.card, border: `1px solid ${S.border}`, borderRadius: 16,
      padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: S.muted, marginBottom: 2, fontWeight: 600, letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: S.text, lineHeight: 1.1 }}>{value}</div>
        {delta && <div style={{ fontSize: 11, color: S.green, marginTop: 2 }}>{delta}</div>}
      </div>
    </div>
  );
}

/* ─── Role badge ─────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ADMIN:   { bg: '#2A1854', color: '#B794F4', label: 'Admin' },
    TEACHER: { bg: '#0C3B6E', color: '#60C8FF', label: 'Giáo viên' },
    STUDENT: { bg: '#0A3D2E', color: '#4ADEAA', label: 'Học sinh' },
  };
  const s = map[role] || map.STUDENT;
  return (
    <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ─── Active badge ───────────────────────────────────────── */
function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: active ? '#0A3D2E' : 'rgba(255,255,255,.06)',
      color: active ? '#4ADEAA' : 'rgba(255,255,255,.3)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#4ADEAA' : 'rgba(255,255,255,.2)', display: 'inline-block' }} />
      {active ? 'Hoạt động' : 'Chưa kích hoạt'}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [users, setUsers]         = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [tab, setTab]             = useState<'overview' | 'users' | 'teachers' | 'students'>('overview');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Boot ── */
  useEffect(() => {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) { router.push('/auth/login'); return; }
    const u = JSON.parse(raw);
    if (u.role !== 'ADMIN') { router.push('/auth/login'); return; }
    setAdmin(u);
    setIsLoading(false);
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      // Try general users endpoint first
      const r1 = await fetch('/api/admin/users');
      if (r1.ok) {
        const data = await r1.json();
        const arr = Array.isArray(data) ? data : data.users || [];
        if (arr.length > 0) { setUsers(arr); setLoadingUsers(false); return; }
      }
    } catch { /* ignore */ }
    try {
      // Fallback: fetch teachers + students separately and merge
      const [r2, r3] = await Promise.allSettled([
        fetch('/api/admin/codes/users'),
        fetch('/api/admin/users?role=STUDENT'),
      ]);
      const merged: User[] = [];
      if (r2.status === 'fulfilled' && r2.value.ok) {
        const d = await r2.value.json();
        merged.push(...(Array.isArray(d) ? d : d.users || []));
      }
      if (r3.status === 'fulfilled' && r3.value.ok) {
        const d = await r3.value.json();
        const students = Array.isArray(d) ? d : d.users || [];
        // De-dup by id
        const existingIds = new Set(merged.map((u: User) => u.id));
        students.forEach((u: User) => { if (!existingIds.has(u.id)) merged.push(u); });
      }
      setUsers(merged);
    } catch { /* ignore */ }
    setLoadingUsers(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    router.push('/auth/login');
  };

  /* ── Derived counts ── */
  const teachers  = users.filter(u => u.role === 'TEACHER');
  const students  = users.filter(u => u.role === 'STUDENT');
  const admins    = users.filter(u => u.role === 'ADMIN');
  const activeS   = students.filter(u => u.isActive).length;

  const filteredUsers = users
    .filter(u => roleFilter === 'ALL' || u.role === roleFilter)
    .filter(u => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.className?.toLowerCase().includes(q) || u.schoolName?.toLowerCase().includes(q);
    });

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: S.bg }}>
      <div style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,.1)', borderTopColor: S.blue, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ background: '#060E1C', borderBottom: `1px solid ${S.border}`, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck style={{ width: 18, height: 18, color: S.amber }} />
            <span style={{ fontWeight: 800, fontSize: 16, color: S.text }}>Penta School</span>
            <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700, background: '#2A1854', color: '#B794F4', letterSpacing: '0.08em' }}>ADMIN</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{admin?.name}</div>
              <div style={{ fontSize: 11, color: S.muted }}>Quản trị viên</div>
            </div>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', color: S.muted }}>
              <LogOut style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px', animation: 'fadeUp .3s ease both' }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, marginBottom: 6 }}>Dashboard Quản trị</h1>
          <p style={{ fontSize: 13, color: S.muted, margin: 0 }}>Tổng quan hệ thống · Penta School</p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
          <StatBlock label="GIÁO VIÊN" value={teachers.length} color={S.blue}
            icon={<BookOpen style={{ width: 20, height: 20 }} />} />
          <StatBlock label="HỌC SINH" value={students.length}
            delta={`${activeS} đã kích hoạt`} color={S.green}
            icon={<GraduationCap style={{ width: 20, height: 20 }} />} />
          <StatBlock label="TỔNG TÀI KHOẢN" value={users.length} color={S.amber}
            icon={<Users style={{ width: 20, height: 20 }} />} />
          <StatBlock label="QUẢN TRỊ VIÊN" value={admins.length} color="#B794F4"
            icon={<ShieldCheck style={{ width: 20, height: 20 }} />} />
        </div>

        {/* ── Quick access portals ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
          {/* Teacher portal */}
          <div style={{ background: '#0C2845', border: `1px solid ${S.blue}33`, borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: S.blue + '0D', borderRadius: '50%' }} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: S.blue + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <BookOpen style={{ width: 22, height: 22, color: S.blue }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Dashboard Giáo viên</div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.5 }}>
                Tạo bài giảng, đề thi, quản lý lớp học, ngân hàng câu hỏi và thống kê kết quả học sinh.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/teacher"
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: S.blue, color: '#000', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Eye style={{ width: 14, height: 14 }} /> Vào dashboard
              </a>
              <a href="/teacher/question-bank"
                style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,.08)', color: S.text, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Library style={{ width: 14, height: 14 }} /> Ngân hàng đề
              </a>
            </div>
          </div>

          {/* Student portal */}
          <div style={{ background: '#0A3020', border: `1px solid ${S.green}33`, borderRadius: 16, padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: S.green + '0D', borderRadius: '50%' }} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: S.green + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <GraduationCap style={{ width: 22, height: 22, color: S.green }} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Dashboard Học sinh</div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.5 }}>
                Xem bài giảng, làm bài kiểm tra, nộp bài tập, tra cứu điểm và thư viện tài liệu.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/student"
                style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: S.green, color: '#000', fontSize: 12, fontWeight: 700, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Eye style={{ width: 14, height: 14 }} /> Vào dashboard
              </a>
              <a href="/student/exams"
                style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,.08)', color: S.text, fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClipboardCheck style={{ width: 14, height: 14 }} /> Bài kiểm tra
              </a>
            </div>
          </div>
        </div>

        {/* ── User management ── */}
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 18, overflow: 'hidden' }}>
          {/* Tab header */}
          <div style={{ borderBottom: `1px solid ${S.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 16, height: 16, color: S.amber }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Quản lý tài khoản</span>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 8, color: S.muted }}>{filteredUsers.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Tìm tên, email, lớp..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${S.border}`, background: 'rgba(255,255,255,.06)', color: S.text, fontSize: 12, outline: 'none', width: 180 }}
              />
              {/* Role filter */}
              {['ALL', 'TEACHER', 'STUDENT', 'ADMIN'].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: roleFilter === r ? S.blue : 'rgba(255,255,255,.06)',
                    color: roleFilter === r ? '#000' : S.muted,
                    border: 'none', transition: 'all .15s',
                  }}>
                  {r === 'ALL' ? 'Tất cả' : r === 'TEACHER' ? 'Giáo viên' : r === 'STUDENT' ? 'Học sinh' : 'Admin'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loadingUsers ? (
            <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Đang tải...</div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: S.muted }}>Không có tài khoản nào</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${S.border}` }}>
                    {['Tên', 'Email', 'Vai trò', 'Trạng thái', 'Lớp / Trường', ''].map(h => (
                      <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: S.muted, letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 50).map(u => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${S.border}` }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: 12, color: S.muted }}>{u.email}</span>
                      </td>
                      <td style={{ padding: '12px 20px' }}><RoleBadge role={u.role} /></td>
                      <td style={{ padding: '12px 20px' }}><ActiveBadge active={u.isActive} /></td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ fontSize: 12, color: S.muted }}>
                          {u.className || u.schoolName || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px' }}>
                        <a href={u.role === 'TEACHER' ? `/teacher` : `/student`}
                          style={{ fontSize: 11, color: S.blue, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          Xem <ChevronRight style={{ width: 12, height: 12 }} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Quick links ── */}
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
          {[
            { label: 'Tạo mã kích hoạt', href: '/teacher/codes', color: '#FBB04022', textColor: S.amber },
            { label: 'Ngân hàng đề', href: '/teacher/question-bank', color: '#60C8FF22', textColor: S.blue },
            { label: 'Tải tài liệu lên', href: '/teacher/upload', color: '#4ADEAA22', textColor: S.green },
            { label: 'Quản lý tài liệu', href: '/teacher/documents', color: '#B794F422', textColor: '#B794F4' },
            { label: 'Cài đặt hệ thống', href: '/admin/settings', color: 'rgba(255,255,255,.06)', textColor: S.muted },
          ].map(l => (
            <a key={l.href} href={l.href}
              style={{ padding: '14px 18px', borderRadius: 12, background: l.color, border: `1px solid ${l.textColor}22`, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'opacity .15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}>
              <span style={{ fontSize: 12, fontWeight: 600, color: l.textColor }}>{l.label}</span>
              <ChevronRight style={{ width: 14, height: 14, color: l.textColor }} />
            </a>
          ))}
        </div>

      </div>
    </div>
  );
}