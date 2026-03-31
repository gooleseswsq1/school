'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Book, PlayCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PublishedPage {
  id: string;
  title: string;
  slug: string;
  description?: string;
  author?: {
    id: string;
    name: string;
  };
  children: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
  blocks: Array<{
    id: string;
    type: string;
    videoUrl?: string;
  }>;
}

export default function PublishedPagesGrid() {
  const [pages, setPages] = useState<PublishedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPublishedPages = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/pages/public');
        if (!response.ok) throw new Error('Failed to fetch pages');
        
        const data = await response.json();
        setPages(data);
      } catch (error) {
        console.error('Error fetching published pages:', error);
        toast.error('Lỗi khi tải các trang');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublishedPages();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Đang tải các trang...</div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <div className="text-gray-500 text-center">
          <p className="font-semibold mb-2">Chưa có trang nào được xuất bản</p>
          <p className="text-sm">Giáo viên sẽ sớm thêm nội dung mới</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {pages.map((page) => {
        const firstBlock = page.blocks?.[0];
        const hasVideo = firstBlock?.type === 'VIDEO';
        const hasEmbed = firstBlock?.type === 'EMBED';
        const hasChildren = page.children.length > 0;

        return (
          <Link
            key={page.id}
            href={`/${page.slug}`}
            className="group"
          >
            <div className="h-full bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-300 flex flex-col">
              {/* Preview Image/Icon */}
              <div className="h-40 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center relative overflow-hidden group-hover:from-blue-100 group-hover:to-cyan-100 transition-colors">
                {hasVideo ? (
                  <PlayCircle className="w-12 h-12 text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                ) : hasEmbed ? (
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-lg font-bold">+</span>
                  </div>
                ) : (
                  <Book className="w-12 h-12 text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                )}
                
                {/* Badge */}
                {hasChildren && (
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {page.children.length} bài
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-sm md:text-base text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {page.title}
                </h3>

                {page.description && (
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {page.description.replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, '')}
                  </p>
                )}

                {page.author && (
                  <p className="text-xs text-gray-500 mb-auto">
                    Giảng viên: <span className="font-semibold text-gray-700">{page.author.name}</span>
                  </p>
                )}

                {/* Sub-chapters preview */}
                {hasChildren && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Các bài học:</p>
                    <div className="space-y-1">
                      {page.children.slice(0, 2).map((child) => (
                        <div key={child.id} className="text-xs text-gray-500 flex items-center">
                          <span className="text-blue-600 mr-1">•</span>
                          <span className="truncate">{child.title}</span>
                        </div>
                      ))}
                      {page.children.length > 2 && (
                        <div className="text-xs text-blue-600 font-semibold">
                          +{page.children.length - 2} thêm
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 group-hover:bg-blue-50 transition-colors">
                <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                  Xem chi tiết →
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
