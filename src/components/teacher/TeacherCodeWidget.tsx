// components/teacher/TeacherCodeWidget.tsx
// Widget nhỏ hiển thị mã GV trong dashboard — giáo viên copy gửi cho học sinh
'use client';

import { useState } from 'react';
import { Copy, Check, Users, RefreshCw } from 'lucide-react';

interface Props {
  teacherCode: string;
  studentCount?: number;
}

export default function TeacherCodeWidget({ teacherCode, studentCount = 0 }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(teacherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(24,95,165,.15)',
      border: '1px solid rgba(96,200,255,.3)',
      borderRadius: 14, padding: '16px 18px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#60C8FF' }}>Mã của bạn</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'rgba(255,255,255,.08)', padding: '2px 8px', borderRadius: 20 }}>
            Gửi cho học sinh để kết nối
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          <Users style={{ width: 13, height: 13 }} />
          {studentCount} học sinh
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1, padding: '10px 16px', borderRadius: 10,
          background: 'rgba(0,0,0,.3)',
          border: '1px solid rgba(96,200,255,.2)',
          fontFamily: 'monospace', fontSize: 20, fontWeight: 800,
          letterSpacing: '0.18em', color: '#E2EAF4',
        }}>
          {teacherCode}
        </div>
        <button onClick={copy}
          style={{
            padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: copied ? 'rgba(59,109,17,.4)' : '#185FA5',
            color: copied ? '#7EFFB2' : 'white',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, transition: 'all .2s',
          }}>
          {copied
            ? <><Check style={{ width: 14, height: 14 }} /> Đã copy</>
            : <><Copy style={{ width: 14, height: 14 }} /> Copy</>
          }
        </button>
      </div>

      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 8, marginBottom: 0 }}>
        Học sinh nhập mã này khi đăng ký → tự động kết nối và thấy tài liệu của bạn.
      </p>
    </div>
  );
}