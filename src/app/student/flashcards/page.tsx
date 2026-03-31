import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flashcard - Ôn tập",
  description: "Ôn tập với thẻ ghi nhớ Flashcard",
};

export default function StudentFlashcardsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 text-center shadow-sm">
        <div className="text-4xl mb-3">🚧</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chế độ AI</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Tính năng này đang phát triển và sẽ sớm được cập nhật.</p>
      </div>
    </div>
  );
}
