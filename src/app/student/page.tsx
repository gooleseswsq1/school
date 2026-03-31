import type { Metadata } from "next";
import StudentMainDashboard from "@/components/student/StudentMainDashboard";
import PageErrorBoundary from "@/components/shared/PageErrorBoundary";

export const metadata: Metadata = {
  title: "Trang chính học sinh",
  description: "Quản lý bài học và bài tập",
};

export default function StudentPage() {
  return (
    <PageErrorBoundary pageName="Dashboard học sinh">
      <StudentMainDashboard />
    </PageErrorBoundary>
  );
}
