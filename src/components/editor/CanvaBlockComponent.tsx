"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Trash2, Palette, Edit3, ExternalLink } from "lucide-react";
import { CanvasEditorPro } from "../CanvasEditorPro";
import CanvaSlideViewer from "./CanvaSlideViewer";
import toast from "react-hot-toast";

// Dynamic import MiniCanvaApp để tránh lỗi server-side
const MiniCanvaApp = dynamic(
  () => import("../MiniCanvaApp").then((mod) => ({ default: mod.MiniCanvaApp })),
  { ssr: false }
);

interface CanvaBlockProps {
  block: any;
  onDelete: () => void;
  readOnly?: boolean;
  onBlockUpdate?: (blockId: string, data: any) => void;
}

export default function CanvaBlockComponent({
  block,
  onDelete,
  readOnly = false,
  onBlockUpdate,
}: CanvaBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [slidesData, setSlidesData] = useState(block.slidesData); // Track saved slides
  const BASE_WIDTH = 960; // Chiều rộng gốc của Canva

  const hasSlidesData = (() => {
    if (!slidesData) return false;
    try {
      const raw = typeof slidesData === 'string' ? JSON.parse(slidesData) : slidesData;
      const parsedSlides = Array.isArray(raw) ? raw : (Array.isArray(raw?.slides) ? raw.slides : []);
      return parsedSlides.length > 0;
    } catch {
      return false;
    }
  })();

  // Tự động tính toán độ zoom để khung Canvas vừa khít với bề ngang
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const containerWidth = entry.contentRect.width;
        // Tính tỷ lệ zoom: Bề ngang khung chứa / Bề ngang gốc
        const newZoom = containerWidth / BASE_WIDTH;
        setZoom(newZoom);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Update local slides data when block changes
  useEffect(() => {
    setSlidesData(block.slidesData);
  }, [block.id, block.slidesData]);

  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa bản thiết kế này?")) return;
    try {
      const response = await fetch(`/api/blocks/${block.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete block");
      toast.success("Xóa thiết kế thành công");
      onDelete();
    } catch (error) {
      toast.error("Lỗi khi xóa thiết kế");
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleOpenEditor = () => {
    router.push(`/canva?blockId=${block.id}`);
  };

  const handleCloseModal = async (slidesData?: any) => {
    if (slidesData && onBlockUpdate) {
      try {
        setIsSaving(true);
        // Lưu dữ liệu slides vào block
        await onBlockUpdate(block.id, { slidesData });
        toast.success("Lưu thiết kế thành công");
        // Update local state to show slides immediately
        setSlidesData(slidesData);
      } catch (error) {
        toast.error("Lỗi khi lưu thiết kế");
        console.error(error);
      } finally {
        setIsSaving(false);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Palette className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-bold">Khung Thiết Kế</h3>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                title="Xóa block"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Edit Mode (khi readOnly=false) - Hiển thị slides sau khi lưu, hoặc nút mở editor nếu chưa có */}
        {!readOnly ? (
          // Check if there are saved slides to display
          hasSlidesData ? (
            <>
              {/* Display saved slides with Edit button */}
              <div className="space-y-4">
                <CanvaSlideViewer
                  slidesData={slidesData}
                  blockId={block.id}
                />
                
                {/* Edit controls */}
                <div className="flex gap-2 justify-center pt-4 border-t">
                  <button
                    onClick={handleOpenEditor}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
                  >
                    <Edit3 size={16} />
                    Chỉnh sửa Slides
                  </button>
                  <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium">
                    Xuất ZIP đang phát triển
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Show edit button if no slides yet */
            <div 
              className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-purple-400 hover:from-purple-50 hover:to-purple-100 transition group"
              onClick={handleOpenEditor}
            >
              <div className="text-center">
                <Edit3 className="w-12 h-12 text-gray-400 group-hover:text-purple-600 mx-auto mb-2 transition" />
                <h4 className="text-lg font-semibold text-gray-700 group-hover:text-purple-600 transition">
                  Mở Giao Diện Canvas
                </h4>
                <p className="text-sm text-gray-500 mt-2 group-hover:text-gray-600">
                  Click để thiết kế slides, thêm ảnh, chữ và hiệu ứng
                </p>
              </div>
              <button
                onClick={handleOpenEditor}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium shadow-md flex items-center gap-2"
              >
                <ExternalLink size={16} />
                Chỉnh sửa ngay
              </button>
            </div>
          )
        ) : (
          /* ReadOnly Mode (khi readOnly=true) - Hiển thị slideshow cho học sinh */
          <CanvaSlideViewer
            slidesData={slidesData}
            blockId={block.id}
          />
        )}
      </div>

      {/* Modal - Mini Canva Editor (Alternative - không sử dụng nữa) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="w-full h-full bg-white flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between border-b">
              <h2 className="text-xl font-bold">Giao Diện Mini Canva</h2>
              <button
                onClick={() => handleCloseModal()}
                className="text-white hover:bg-white/20 p-2 rounded transition"
                title="Đóng"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - MiniCanvaApp */}
            <div className="flex-1 overflow-hidden">
              {typeof window !== "undefined" && (
                <MiniCanvaApp 
                  key={block.id}
                  isModal={true}
                  blockId={block.id}
                  initialSlidesData={slidesData}
                  onClose={handleCloseModal}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 p-4 border-t flex items-center justify-end gap-3">
              <button
                onClick={() => handleCloseModal()}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Hủy
              </button>
              {/* Note: Nút "Hoàn tát" sẽ được nhúng trong MiniCanvaApp */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
