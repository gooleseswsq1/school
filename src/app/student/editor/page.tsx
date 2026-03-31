import type { Metadata } from "next";
import StudentDocumentLibrary from "@/components/student/StudentDocumentLibrary";

export const metadata: Metadata = {
  title: "Tài liệu",
  description: "Xem tài liệu của giáo viên",
};

export default function StudentEditorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-100 dark:bg-cyan-900/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tài liệu học tập</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Xem tất cả tài liệu được chia sẻ bởi giáo viên của bạn
        </p>
        <StudentDocumentLibrary />
      </div>
    </div>
  );
}
