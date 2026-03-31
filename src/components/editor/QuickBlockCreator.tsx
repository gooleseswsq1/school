'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  FileText,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  HelpCircle,
  PenTool,
  Plus,
  ChevronRight,
} from 'lucide-react';

interface QuickBlockCreatorProps {
  pageId: string;
  onClose?: () => void;
  onBlockCreated?: (blockType: string) => void;
}

const BLOCK_TYPES = [
  {
    id: 'text',
    label: 'Văn bản',
    description: 'Thêm nội dung văn bản, tiêu đề',
    icon: <FileText size={24} />,
    color: 'bg-blue-500',
    lightColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'video',
    label: 'Video',
    description: 'Nhúng video YouTube, Vimeo',
    icon: <Video size={24} />,
    color: 'bg-red-500',
    lightColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-600 dark:text-red-400',
  },
  {
    id: 'image',
    label: 'Hình ảnh',
    description: 'Upload hoặc nhúng hình ảnh',
    icon: <ImageIcon size={24} />,
    color: 'bg-green-500',
    lightColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
  },
  {
    id: 'link',
    label: 'Liên kết',
    description: 'Thêm liên kết đến trang web',
    icon: <LinkIcon size={24} />,
    color: 'bg-purple-500',
    lightColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'quiz',
    label: 'Câu hỏi',
    description: 'Tạo câu hỏi trắc nghiệm',
    icon: <HelpCircle size={24} />,
    color: 'bg-orange-500',
    lightColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    description: 'Thiết kế slide tự do',
    icon: <PenTool size={24} />,
    color: 'bg-pink-500',
    lightColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-600 dark:text-pink-400',
  },
];

export default function QuickBlockCreator({
  pageId,
  onClose,
  onBlockCreated,
}: QuickBlockCreatorProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleCreateBlock = (blockType: string) => {
    // Navigate to editor with block type parameter
    router.push(`/editor/${pageId}?newBlock=${blockType}`);
    
    // Call callbacks
    onBlockCreated?.(blockType);
    onClose?.();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tạo nội dung mới
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Chọn loại nội dung bạn muốn thêm
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Block Types Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BLOCK_TYPES.map((block) => (
            <button
              key={block.id}
              onClick={() => handleCreateBlock(block.id)}
              onMouseEnter={() => setSelectedType(block.id)}
              onMouseLeave={() => setSelectedType(null)}
              className={`relative group p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                selectedType === block.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.02]'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-sm'
              }`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 ${block.lightColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <div className={block.textColor}>
                  {block.icon}
                </div>
              </div>

              {/* Content */}
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {block.label}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                {block.description}
              </p>

              {/* Arrow indicator */}
              <div className={`absolute top-4 right-4 transition-all duration-200 ${
                selectedType === block.id
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-2'
              }`}>
                <ChevronRight size={16} className="text-blue-500" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click vào loại nội dung để mở editor và tạo mới
        </p>
      </div>
    </div>
  );
}

// Compact version for inline use (e.g., in a dropdown or popover)
export function QuickBlockCreatorCompact({
  pageId,
  onBlockCreated,
}: {
  pageId: string;
  onBlockCreated?: (blockType: string) => void;
}) {
  const router = useRouter();

  const handleCreate = (blockType: string) => {
    router.push(`/editor/${pageId}?newBlock=${blockType}`);
    onBlockCreated?.(blockType);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {BLOCK_TYPES.map((block) => (
        <button
          key={block.id}
          onClick={() => handleCreate(block.id)}
          className={`flex items-center gap-2 px-3 py-2 ${block.lightColor} rounded-lg hover:shadow-md transition-all group`}
          title={block.description}
        >
          <div className={`${block.textColor} group-hover:scale-110 transition-transform`}>
            {block.icon}
          </div>
          <span className={`text-sm font-medium ${block.textColor}`}>
            {block.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Floating Action Button version
export function QuickBlockCreatorFAB({
  pageId,
  onBlockCreated,
}: {
  pageId: string;
  onBlockCreated?: (blockType: string) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleCreate = (blockType: string) => {
    router.push(`/editor/${pageId}?newBlock=${blockType}`);
    onBlockCreated?.(blockType);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 mb-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-3 min-w-[200px]">
            <div className="space-y-1">
              {BLOCK_TYPES.map((block) => (
                <button
                  key={block.id}
                  onClick={() => handleCreate(block.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className={`w-8 h-8 ${block.lightColor} rounded-lg flex items-center justify-center`}>
                    <div className={`${block.textColor}`}>
                      {block.icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {block.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {block.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
        }`}
      >
        <Plus size={24} className="text-white" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}