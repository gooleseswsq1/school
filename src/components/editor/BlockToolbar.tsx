"use client";

import { useState } from "react";
import { Plus, Video, Palette, Code, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

interface BlockToolbarProps {
  pageId: string;
  onBlockAdded: () => void;
}

export default function BlockToolbar({
  pageId,
  onBlockAdded,
}: BlockToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const addBlock = async (blockType: "VIDEO" | "DOCUMENT" | "QUIZ" | "CANVA" | "EMBED") => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          type: blockType,
        }),
      });

      if (!response.ok) throw new Error("Failed to add block");

      const messages: Record<string, string> = {
        VIDEO: "Thêm block video thành công",
        DOCUMENT: "Thêm bài giảng tương tác thành công",
        QUIZ: "Thêm bộ câu hỏi thành công",
        CANVA: "Thêm khung thiết kế thành công",
        EMBED: "Thêm block nhúng thành công",
      };
      
      toast.success(messages[blockType] || "Block được thêm thành công");
      onBlockAdded();
    } catch (error) {
      console.error("Error adding block:", error);
      toast.error("Lỗi khi thêm block");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-2 p-3 bg-white border-t sticky bottom-0 flex-wrap">
      {/* Main blocks */}
      <button
        onClick={() => addBlock("VIDEO")}
        disabled={isLoading}
        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
      >
        <Video size={16} />
        <span>Video</span>
      </button>

      <button
        onClick={() => addBlock("CANVA")}
        disabled={isLoading}
        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-sm font-medium"
      >
        <Palette size={16} />
        <span>CanvaMini</span>
      </button>

      {/* Embed block */}
      <button
        onClick={() => addBlock("EMBED")}
        disabled={isLoading}
        className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium"
      >
        <Code size={16} />
        <span>Nhúng</span>
      </button>
    </div>
  );
}
