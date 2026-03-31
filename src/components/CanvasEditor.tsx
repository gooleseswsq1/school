'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { fabric as FabricType } from 'fabric';
import { useSlideStore } from '@/stores/slideStore';
import { Plus, Type, Image as ImageIcon, Trash2, Download } from 'lucide-react';

let fabric: typeof FabricType | null = null;
if (typeof window !== 'undefined') {
  import('fabric').then((mod) => {
    fabric = mod.fabric;
  });
}

interface CanvasEditorProps {
  slideId: string;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ slideId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { updateSlide, getSlide } = useSlideStore();
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Wait for fabric to load
  useEffect(() => {
    const checkFabric = setInterval(() => {
      if (fabric !== null) {
        clearInterval(checkFabric);
        setIsReady(true);
      }
    }, 50);

    return () => clearInterval(checkFabric);
  }, []);

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current || !fabric || !isReady) return;

    // Ensure canvas element is properly in the DOM
    if (!canvasRef.current.parentElement) return;

    try {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 960,
        height: 540,
        backgroundColor: '#ffffff',
      });

      fabricCanvasRef.current = canvas;

      // Load existing slide data if available
      const slide = getSlide(slideId);
      if (slide?.canvasData) {
        canvas.loadFromJSON(slide.canvasData, () => {
          canvas.renderAll();
        }, (object: any) => {
          if (object.type === 'image') {
            object.crossOrigin = 'anonymous';
          }
          return object;
        });
      }

      // Handle object selection
      canvas.on('selection:created', (e: any) => {
        setSelectedObject(e.selected?.[0] || null);
      });

      canvas.on('selection:updated', (e: any) => {
        setSelectedObject(e.selected?.[0] || null);
      });

      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
      });

      // Save canvas state on object modification
      const handleModified = () => {
        const canvasData = canvas.toJSON();
        updateSlide(slideId, { canvasData });
      };

      canvas.on('object:modified', handleModified);
      canvas.on('object:added', handleModified);
      canvas.on('object:removed', handleModified);

      return () => {
        canvas.dispose();
      };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, [slideId, updateSlide, getSlide, isReady]);

  // Add Textbox
  const handleAddText = () => {
    if (!fabricCanvasRef.current || !fabric) return;

    const textbox = new fabric.Textbox('Thêm văn bản...', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 20,
      fill: '#000000',
      splitByGrapheme: true,
    });

    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
  };

  // Add Image
  const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvasRef.current || !fabric) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      if (!fabric) return;
      fabric.Image.fromURL(imgUrl, (img: any) => {
        img.scaleToWidth(200);
        fabricCanvasRef.current?.add(img);
        fabricCanvasRef.current?.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  // Delete selected object
  const handleDelete = () => {
    if (selectedObject && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(selectedObject);
      fabricCanvasRef.current.renderAll();
      setSelectedObject(null);
    }
  };

  // Download as image
  const handleDownload = () => {
    if (!fabricCanvasRef.current) return;
    const dataUrl = fabricCanvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `slide-${Date.now()}.png`;
    link.click();
  };

  // Change text color
  const handleChangeTextColor = (color: string) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set({ fill: color });
      fabricCanvasRef.current?.renderAll();
    }
  };

  // Change text size
  const handleChangeFontSize = (size: number) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set({ fontSize: size });
      fabricCanvasRef.current?.renderAll();
    }
  };

  if (!isReady) {
    return <div className="flex items-center justify-center w-full h-screen">Loading canvas editor...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-gray-50 rounded-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={handleAddText}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          title="Thêm văn bản"
        >
          <Type size={18} />
          <span>Văn bản</span>
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer">
          <ImageIcon size={18} />
          <span>Ảnh</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleAddImage}
            className="hidden"
          />
        </label>

        <button
          onClick={handleDelete}
          disabled={!selectedObject}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={18} />
          <span>Xóa</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Download size={18} />
          <span>Tải xuống</span>
        </button>
      </div>

      {/* Canvas */}
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-300 flex justify-center">
        <canvas ref={canvasRef} className="border border-gray-400" />
      </div>

      {/* Text editing toolbar (shown when text is selected) */}
      {selectedObject && selectedObject.type === 'textbox' && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Màu chữ:</label>
            <input
              type="color"
              defaultValue="#000000"
              onChange={(e) => handleChangeTextColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Kích thước:</label>
            <input
              type="range"
              min="8"
              max="72"
              defaultValue="20"
              onChange={(e) => handleChangeFontSize(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </div>
      )}

      {/* Audio upload */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <label className="text-sm font-medium">Âm thanh slide:</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              updateSlide(slideId, { audioUrl: url });
              if (audioRef.current) {
                audioRef.current.src = url;
              }
            }
          }}
          className="mt-2"
        />
      </div>

      <audio ref={audioRef} className="hidden" />
    </div>
  );
};
