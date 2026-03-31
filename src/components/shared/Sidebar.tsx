"use client";

// Sidebar component for navigation
export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-100 min-h-screen p-4">
      <nav>
        <ul className="space-y-2">
          <li><a href="/dashboard" className="text-blue-600 hover:text-blue-800">Dashboard</a></li>
          <li><a href="/teacher/upload" className="text-blue-600 hover:text-blue-800">Tải tài liệu</a></li>
          <li><a href="/student/library" className="text-blue-600 hover:text-blue-800">Thư viện</a></li>
        </ul>
      </nav>
    </aside>
  );
}
