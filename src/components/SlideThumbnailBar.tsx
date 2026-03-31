'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { fabric as FabricType } from 'fabric';
import { useSlideStore } from '@/stores/slideStore';
import { Plus, Trash2, Lightbulb } from 'lucide-react';

let fabric: typeof FabricType | null = null;
if (typeof window !== 'undefined') {
  import('fabric').then((mod) => {
    fabric = mod.fabric;
  });
}

// Kích thước chuẩn từ CanvasEditorPro
const BASE_WIDTH = 960;
const BASE_HEIGHT = 540;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;
const SCALE_RATIO = THUMB_WIDTH / BASE_WIDTH; // ~0.16667

// ─── Safe renderAll ─────────────────────────────────────────────────────────
// Fabric.js does NOT set `canvas.disposed = true` reliably across versions.
// The only truly safe guard is checking whether the underlying 2D context still
// exists (the browser nulls it when the canvas element is removed from DOM).
function safeRenderAll(canvas: any) {
  try {
    // Fabric stores the context as `canvas.contextContainer` (StaticCanvas)
    // or `canvas.getContext()`. If either is null the canvas is gone.
    const ctx: CanvasRenderingContext2D | null =
      canvas?.contextContainer ?? canvas?.getContext?.() ?? null;
    if (!ctx) return;
    canvas.renderAll();
  } catch {
    // swallow — component is already unmounting
  }
}

// Tách riêng Component Thumbnail để quản lý render độc lập, chống giật lag
const ThumbnailItem = ({ 
  slide, 
  index, 
  isActive, 
  onClick, 
  onDelete, 
  showDelete 
}: any) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  // isMountedRef stays true for the COMPONENT lifetime
  const isMountedRef = useRef(true);

  useEffect(() => {
    // ── Per-effect cancellation token ────────────────────────────────────
    // isMountedRef alone is not enough: when deps change the old effect
    // cleanup fires (dispose) but the old loadFromJSON callback is still
    // in-flight. We use a local `cancelled` flag per effect-run to stop it.
    let cancelled = false;

    if (!canvasRef.current || !fabric) return;
    if (!canvasRef.current.parentElement) return;

    // Small delay so the DOM is fully painted before Fabric touches the canvas
    const timeoutId = setTimeout(() => {
      if (cancelled || !isMountedRef.current) return;

      try {
        // Create the StaticCanvas once per component mount
        if (!fabricCanvasRef.current && canvasRef.current && fabric) {
          fabricCanvasRef.current = new fabric.StaticCanvas(canvasRef.current, {
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            renderOnAddRemove: false,
            backgroundColor: slide.backgroundColor || '#ffffff',
          });
        }

        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        if (slide.canvasData) {
          const reviver = (object: any) => {
            if (object.type === 'image' && object.src && !object.src.startsWith('data:')) {
              object.crossOrigin = 'anonymous';
            }
            return object;
          };

          canvas.loadFromJSON(slide.canvasData, () => {
            // Guard: this callback fires asynchronously — by the time it runs
            // the effect may have been cancelled (deps changed) OR the component
            // may have unmounted. Either way we must NOT call renderAll.
            if (cancelled || !isMountedRef.current || !fabricCanvasRef.current) return;

            canvas.setZoom(SCALE_RATIO);
            canvas.backgroundColor = slide.backgroundColor || '#ffffff';
            safeRenderAll(canvas);
          }, reviver);
        } else {
          if (cancelled || !isMountedRef.current) return;
          canvas.clear();
          canvas.backgroundColor = slide.backgroundColor || '#ffffff';
          safeRenderAll(canvas);
        }
      } catch (error) {
        console.error('Error initializing thumbnail canvas:', error);
      }
    }, 0);

    return () => {
      // Mark THIS effect run as cancelled so any in-flight loadFromJSON
      // callback will bail out before touching the (about-to-be-disposed) canvas
      cancelled = true;
      clearTimeout(timeoutId);

      // Only dispose when the component is truly unmounting (not just re-rendering)
      // We detect unmount via isMountedRef which is set false in the separate
      // cleanup effect below.
      if (!isMountedRef.current && fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        } catch {
          // ignore dispose errors
        }
      }
    };
  }, [slide.canvasData, slide.backgroundColor]);

  // Separate effect: runs ONLY on unmount — disposes the canvas and marks dead
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, []); // empty deps = runs cleanup only on unmount

  return (
    <div
      className={`relative flex-shrink-0 cursor-pointer rounded-lg border-2 transition ${
        isActive
          ? 'border-blue-500 shadow-lg'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onClick={onClick}
    >
      {/* Wrapper để ẩn đi phần thừa nếu zoom vượt khung */}
      <div className="w-40 h-[90px] rounded overflow-hidden bg-white">
        <canvas 
          ref={canvasRef}
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      <div className="absolute top-1 left-1 bg-black text-white text-xs font-bold px-2 py-1 rounded shadow">
        {index + 1}
      </div>

      {/* Quiz badge */}
      {slide.quiz && (
        <div className="absolute bottom-1 right-1 bg-violet-600 text-white rounded-full p-0.5 shadow" title="Slide có quiz">
          <Lightbulb size={9} />
        </div>
      )}

      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slide.id);
          }}
          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded opacity-0 hover:opacity-100 transition shadow"
          title="Xóa slide"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

export const SlideThumbnailBar: React.FC = () => {
  const { slides, currentSlideIndex, setCurrentSlide, addSlide, deleteSlide } = useSlideStore();
  const [fabricReady, setFabricReady] = useState(false);

  useEffect(() => {
    const checkFabric = setInterval(() => {
      if (fabric !== null) {
        setFabricReady(true);
        clearInterval(checkFabric);
      }
    }, 50);
    return () => clearInterval(checkFabric);
  }, []);

  if (!fabricReady) return <div className="bg-gray-800 p-3 h-[114px] rounded-lg">Loading...</div>;

  return (
    <div className="bg-gray-800 p-3 rounded-lg h-full flex items-center">
      <div className="flex items-center gap-3 overflow-x-auto w-full pb-2 custom-scrollbar">
        {slides.map((slide, index) => (
          <ThumbnailItem
            key={slide.id}
            slide={slide}
            index={index}
            isActive={index === currentSlideIndex}
            onClick={() => setCurrentSlide(index)}
            onDelete={deleteSlide}
            showDelete={slides.length > 1}
          />
        ))}

        <button
          onClick={addSlide}
          className="flex-shrink-0 w-40 h-[90px] bg-gray-700 hover:bg-gray-600 rounded-lg border-2 border-dashed border-gray-500 flex items-center justify-center transition"
          title="Thêm slide mới"
        >
          <Plus size={24} className="text-gray-400" />
        </button>
      </div>
    </div>
  );
};