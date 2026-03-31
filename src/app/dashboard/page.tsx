import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bảng điều khiển",
  description: "Bảng điều khiển chính của hệ thống",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Bảng điều khiển</h1>
        <p className="text-gray-600">Chào mừng đến hệ thống lưu trữ tài liệu học tập</p>
        {/* Dashboard content will be added here */}
      </div>
    </div>
  );
}
