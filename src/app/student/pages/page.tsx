import type { Metadata } from "next";
import StudentLecturesViewer from "@/components/student/StudentLecturesViewer";

export const metadata: Metadata = {
  title: "Bài giảng",
  description: "Xem các bài giảng do giáo viên tạo",
};

export default function StudentPagesPage() {
  return <StudentLecturesViewer />;
}

