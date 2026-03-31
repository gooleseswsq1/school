"use client";

import { useState } from "react";
import MagicQuizBuilder from "./MagicQuizBuilder";
import QuizViewer from "./QuizViewer";
import { Lightbulb, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface QuizBlockComponentProps {
  block: any;
  onUpdate: () => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export default function QuizBlockComponent({
  block,
  onUpdate,
  onDelete,
  readOnly = false,
}: QuizBlockComponentProps) {
  const [showBuilder, setShowBuilder] = useState(!block.quizzes || block.quizzes.length === 0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBlock = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa bộ câu hỏi này?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/blocks/${block.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete block");

      toast.success("Xóa bộ câu hỏi thành công");
      onDelete();
    } catch (error) {
      console.error("Error deleting block:", error);
      toast.error("Lỗi khi xóa bộ câu hỏi");
    } finally {
      setIsDeleting(false);
    }
  };

  if (showBuilder) {
    return (
      <MagicQuizBuilder
        blockId={block.id}
        onQuizCreated={() => {
          setShowBuilder(false);
          onUpdate();
        }}
        onClose={() => {
          setShowBuilder(false);
          // Only delete the block if no quiz was created
          if (!block.quizzes || block.quizzes.length === 0) {
            onDelete();
          }
        }}
        initialQuiz={block.quizzes && block.quizzes.length > 0 ? block.quizzes[0] : undefined}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold">Bộ Câu Hỏi</h3>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowBuilder(true)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
              title="Chỉnh sửa"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleDeleteBlock}
              disabled={isDeleting}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
              title="Xóa"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {block.quizzes && block.quizzes.length > 0 && <QuizViewer quiz={block.quizzes[0]} readOnly={readOnly} />}
    </div>
  );
}
