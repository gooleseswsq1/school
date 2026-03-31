import type { Metadata } from "next";
import TeacherCodesPage from "@/components/teacher/TeacherCodesPage";

export const metadata: Metadata = {
  title: "Tạo mã kích hoạt",
  description: "Tạo và quản lý mã kích hoạt cho học sinh",
};

export default function CodesPage() {
  return <TeacherCodesPage />;
}
