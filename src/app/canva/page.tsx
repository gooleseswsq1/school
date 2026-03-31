'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { MiniCanvaApp } from '@/components/MiniCanvaApp';
import dynamic from 'next/dynamic';
import { useEffect, useState, Suspense } from 'react';

// Dynamic import để tránh lỗi server-side
const NonSSRMiniCanvaApp = dynamic(
  () => import('@/components/MiniCanvaApp').then(mod => ({ default: mod.MiniCanvaApp })),
  { ssr: false }
);

function CanvaPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const blockId = searchParams.get('blockId');
  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!blockId) {
      setLoading(false);
      return;
    }

    const fetchBlock = async () => {
      try {
        const response = await fetch(`/api/blocks/${blockId}`);
        if (response.ok) {
          const data = await response.json();
          setBlock(data);
        }
      } catch (error) {
        console.error('Error fetching block:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlock();
  }, [blockId]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <NonSSRMiniCanvaApp 
      isModal={false}
      blockId={blockId || undefined}
      initialSlidesData={block?.slidesData}
    />
  );
}

export default function CanvaPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CanvaPageContent />
    </Suspense>
  );
}

