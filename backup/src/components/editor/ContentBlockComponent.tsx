"use client";

import { useState, useRef } from "react";
import { X, Upload, Link as LinkIcon, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

interface ContentItem {
  id: string;
  title: string;
  image?: string;
  shortcutUrl?: string;
  shortcutCode?: string;
}

interface ContentBlockComponentProps {
  id: string;
  items: ContentItem[];
  onUpdate: (data: { items: ContentItem[] }) => void;
  onDelete: () => void;
}

export default function ContentBlockComponent({
  id,
  items = [],
  onUpdate,
  onDelete,
}: ContentBlockComponentProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newImage, setNewImage] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination - 9 items per page (3x3 grid)
  const itemsPerPage = 9;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedItems = items.slice(startIdx, startIdx + itemsPerPage);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateShortcutCode = (itemId: string): string => {
    return `${id}-${itemId}`.substring(0, 8).toUpperCase();
  };

  const handleAddItem = () => {
    if (!newTitle.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }

    if (!newImage) {
      toast.error("Vui lòng chọn ảnh");
      return;
    }

    const newItem: ContentItem = {
      id: `item-${Date.now()}`,
      title: newTitle.trim(),
      image: newImage,
      shortcutCode: generateShortcutCode(`item-${Date.now()}`),
    };

    const updatedItems = [...items, newItem];
    onUpdate({ items: updatedItems });

    // Reset form
    setNewTitle("");
    setNewImage("");
    setIsAddingItem(false);
    
    // Reset to last page if added new item
    if (currentPage !== Math.ceil(updatedItems.length / itemsPerPage)) {
      setCurrentPage(Math.ceil(updatedItems.length / itemsPerPage));
    }

    toast.success("Nội dung đã được thêm");
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = items.filter((item) => item.id !== itemId);
    onUpdate({ items: updatedItems });

    // Adjust page if necessary
    if (currentPage > Math.ceil(updatedItems.length / itemsPerPage) && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }

    toast.success("Nội dung đã được xóa");
  };

  const handleAddShortcut = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const shortcutUrl = `${window.location.origin}/shortcut/${item.shortcutCode}`;
    setNewImage(""); // Reset for next item if needed
    toast.success("Liên kết tắt đã tạo");
  };

  const copyShortcutCode = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item?.shortcutCode) {
      navigator.clipboard.writeText(item.shortcutCode);
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Đã sao chép mã tắt");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Liên kết trang (Ảnh & Tiêu đề)</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
          >
            {isAddingItem ? "Hủy" : "+ Tạo liên kết"}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Add New Item Form */}
      {isAddingItem && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Tiêu đề</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nhập tiêu đề nội dung..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Hình ảnh</label>
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 rounded hover:bg-blue-50 transition"
              >
                <Upload size={16} className="text-blue-600" />
                <span className="text-sm">Chọn ảnh</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {newImage && (
                <img
                  src={newImage}
                  alt="Preview"
                  className="w-full h-48 object-contain bg-gray-100 rounded border"
                />
              )}
            </div>
          </div>

          <button
            onClick={handleAddItem}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
          >
            Tạo liên kết
          </button>
        </div>
      )}

      {/* Content Grid - 3x3 */}
      <div className="grid grid-cols-3 gap-4">
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition group"
          >
            {/* Image - Large Square */}
            <div className="relative bg-gray-100 aspect-square w-full overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Không có ảnh
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-3 space-y-2">
              <h4 className="font-semibold text-sm line-clamp-2">{item.title}</h4>

              {/* Shortcut Link */}
              {item.shortcutCode && (
                <div className="flex items-center gap-1 text-xs bg-purple-50 p-2 rounded">
                  <LinkIcon size={12} className="text-purple-600 flex-shrink-0" />
                  <code className="text-purple-600 font-mono flex-1 overflow-hidden text-ellipsis">
                    {item.shortcutCode}
                  </code>
                  <button
                    onClick={() => copyShortcutCode(item.id)}
                    className="text-purple-600 hover:text-purple-800 transition flex-shrink-0"
                  >
                    {copiedId === item.id ? (
                      <Check size={12} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => handleAddShortcut(item.id)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  <LinkIcon size={12} />
                  Tắt
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 pb-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
          >
            Trước
          </button>

          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded text-sm transition ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
          >
            Sau
          </button>

          <span className="text-sm text-gray-600 ml-2">
            {items.length} mục
          </span>
        </div>
      )}

      {items.length === 0 && !isAddingItem && (
        <div className="text-center py-8 text-gray-500">
          Chưa có liên kết trang. Bấm "Tạo liên kết" để tạo mới.
        </div>
      )}
    </div>
  );
}
