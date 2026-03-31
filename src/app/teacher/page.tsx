import type { Metadata } from "next";
import TeacherMainDashboard from "@/components/teacher/TeacherMainDashboard";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";

export const metadata: Metadata = {
  title: "Trang chính giáo viên",
  description: "Quản lý tài liệu và mã kích hoạt",
};

export default function TeacherPage() {
  return (
    <PageErrorBoundary pageName="Dashboard giáo viên">
      <TeacherMainDashboard />
    </PageErrorBoundary>
  );
}
