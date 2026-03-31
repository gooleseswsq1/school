import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Bảng điều khiển quản trị",
  description: "Quản lý mã kích hoạt và tài khoản học sinh",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
