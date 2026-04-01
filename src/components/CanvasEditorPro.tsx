'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import LaTeXRenderer from '@/components/latex/LaTeXRenderer';
import { useSlideStore } from '@/stores/slideStore';
import { resolveAnimationTargetOpacity, shouldAnimateLatexOverlay } from '@/utils/latex-animation';
import { createPasteHandler } from '@/lib/canvas-paste-handler';
import {
  Type,
  Image as ImageIcon,
  Trash2,
  Download,
  Palette,
  Copy,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Music,
  Play,
  Pause,
  Link2,
  X,
  Shapes,
  Volume2,
  VolumeX,
  Clock,
  Lightbulb,
} from 'lucide-react';

let fabric: any = null;
if (typeof window !== 'undefined') {
  import('fabric').then((mod) => {
    fabric = (mod as any).fabric || mod;
  });
}

// Font families for text editing
const FONT_FAMILIES = [
  'Arial',
  'Times New Roman',
  'Inter',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Dancing Script',
  'Pacifico',
];

// Utility function to sanitize canvas data before saving
const sanitizeCanvasData = (canvasData: any): any => {
  if (!canvasData) return canvasData;
  
  const sanitized = { ...canvasData };
  
  // Fix text object properties
  if (sanitized.objects) {
    sanitized.objects = sanitized.objects.map((obj: any) => {
      const cleanObj = { ...obj };
      
      // Fix invalid textBaseline values
      if (cleanObj.type && (cleanObj.type === 'textbox' || cleanObj.type === 'text' || cleanObj.type === 'i-text')) {
        const validBaselines = ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'];
        if (cleanObj.textBaseline && !validBaselines.includes(cleanObj.textBaseline)) {
          console.warn(`Sanitizing invalid textBaseline '${cleanObj.textBaseline}' to 'alphabetic'`);
          cleanObj.textBaseline = 'alphabetic';
        }
        // Remove invalid or empty text properties
        if (cleanObj.text === undefined || cleanObj.text === null) {
          cleanObj.text = '';
        }
      }
      
      return cleanObj;
    });
  }
  
  return sanitized;
};

interface CanvasEditorProProps {
  slideId: string;
  onRightPanelToggle?: () => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  readOnly?: boolean;
  slideData?: any;
  isPresentationMode?: boolean;
  onSelectionChange?: (animationType: string | null) => void;
  /** Called once after canvas is fully loaded & rendered (use this to trigger animations) */
  onReady?: () => void;
  /** Called whenever an image is uploaded/pasted */
  onImageUploaded?: (url: string, options?: { source?: 'upload' | 'background' | 'paste' }) => void;
  /** Called when user clicks the Quiz (💡) button in the toolbar */
  onAddQuiz?: () => void;
}

export interface CanvasEditorProHandle {
  addTextTemplate: (type: 'heading' | 'description' | 'note', animation?: { type: string; order?: number } | null) => void;
  addImageFromUrl: (url: string) => void;
  setBackgroundImage: (url: string) => void;
  runAnimations: () => void;
  setAnimationForSelected: (animation: { type: string; order?: number } | null) => void;
  resetAnimationState: () => void;
  resetCanvasToOriginalState: () => void;
  resetAllObjects: () => void;
}

export const CanvasEditorPro = forwardRef<
  CanvasEditorProHandle,
  CanvasEditorProProps
>(
  (
    {
      slideId,
      onRightPanelToggle,
      zoom: externalZoom = 1,
      onZoomChange,
      readOnly = false,
      slideData,
      isPresentationMode = false,
      onSelectionChange,
      onReady,
      onImageUploaded,
      onAddQuiz,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { updateSlide } = useSlideStore();
    // Use slideData if provided (readOnly mode), otherwise use Store
    const storeSlide = useSlideStore((state) =>
      state.slides.find((s) => s.id === slideId)
    );
    const slide = slideData || storeSlide;
    const [selectedObject, setSelectedObject] = useState<any>(null);
    const [backgroundColor, setBackgroundColor] = useState('#ffffff');
    const [textColor, setTextColor] = useState('#000000');
    const [fontSize, setFontSize] = useState(20);
    const [fontFamily, setFontFamily] = useState('Arial');
    const [history, setHistory] = useState<string[]>([]);
    const [isReady, setIsReady] = useState(false);
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string>(slide?.audioUrl || '');
    const [isPlaying, setIsPlaying] = useState(false);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const panStart = useRef({ x: 0, y: 0 });

    // Hyperlink state
    const [showHyperlinkInput, setShowHyperlinkInput] = useState(false);
    const [hyperlinkDraft, setHyperlinkDraft] = useState('');
    const hyperlinkInputRef = useRef<HTMLInputElement>(null);

    // Shape panel state
    const [showShapePanel, setShowShapePanel] = useState(false);
    const [shapeWithText, setShapeWithText] = useState(false);
    const [shapeColor, setShapeColor] = useState('#4a90e2');
    const [shapeBorderColor, setShapeBorderColor] = useState('');
    const [shapeBorderWidth, setShapeBorderWidth] = useState(0);

    // Per-object audio & timing state
    const [objectSoundUrl, setObjectSoundUrl] = useState<string>('');
    const [objectSoundName, setObjectSoundName] = useState<string>('');
    const [objectDelay, setObjectDelay] = useState<number>(0);
    const [showSoundPanel, setShowSoundPanel] = useState(false);
    const objectSoundInputRef = useRef<HTMLInputElement>(null);

  // ── LaTeX overlay system ─────────────────────────────────────────
  // Fabric.js draws to <canvas> (bitmap) — KaTeX cannot render inside it.
  // Strategy (works in BOTH edit AND readOnly modes):
  //   1. Scan all textbox objects for LaTeX delimiters ($...$ $$...$$ etc.)
  //   2. Hide matching Fabric objects (opacity → 0) — no double rendering
  //   3. Render absolutely-positioned HTML overlays with <LaTeXRenderer>
  //   4. Edit mode: clicking an overlay selects the Fabric object, which
  //      temporarily shows the raw source for editing. On deselect → re-hide
  //      Fabric text and refresh the overlay.
  interface LatexOverlay {
    id: string;          // unique key
    fabricIndex: number; // index in canvas._objects
    left: number;        // canvas units 0..BASE_WIDTH
    top:  number;
    width:  number;      // already includes scaleX
    height: number;      // already includes scaleY
    fontSize:   number;  // effective pt at zoom=1
    text:       string;
    fill:       string;
    fontWeight: string;
    fontStyle:  string;
    fontFamily: string;
    textAlign:  string;
    angle:      number;
  }
  const [latexOverlays, setLatexOverlays] = useState<LatexOverlay[]>([]);
  // Id of the overlay whose Fabric object is currently being edited (raw text shown)
  const [editingLatexId, setEditingLatexId] = useState<string | null>(null);
  // Stable ref so canvas event handlers can call rebuild without stale closure
  const rebuildLatexOverlaysRef = useRef<(() => void) | null>(null);

  // Base canvas dimensions (16:9 aspect ratio like Canva)
  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 540;

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

  // Calculate responsive zoom based on container size
  const calculateResponsiveZoom = useCallback(() => {
    if (!containerRef.current) return 1;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    // Calculate scale with padding consideration
    const scaleX = (containerWidth - 40) / BASE_WIDTH;
    const scaleY = (containerHeight - 40) / BASE_HEIGHT;
    
    // Use the smaller scale to fit both dimensions
    const scale = Math.min(scaleX, scaleY, 1.5);
    
    return Math.max(0.5, scale);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addTextTemplate: (type, animation = null) => {
      if (!fabricCanvasRef.current || !fabric) return;
      let text = '';
      let fontSize = 20;
      let fontWeight = 'normal';
      let top = 100;
      let left = 100;
      let textAlign: any = 'left';

      switch (type) {
        case 'heading':
          text = 'Tiêu đề';
          fontSize = 40;
          fontWeight = 'bold';
          top = 50;
          left = BASE_WIDTH / 2 - 100;
          textAlign = 'center';
          break;
        case 'description':
          text = 'Mô tả nội dung...';
          fontSize = 24;
          top = BASE_HEIGHT / 2 - 30;
          left = BASE_WIDTH / 2 - 150;
          textAlign = 'center';
          break;
        case 'note':
          text = 'Ghi chú';
          fontSize = 16;
          fontWeight = 'italic';
          top = BASE_HEIGHT - 80;
          left = 50;
          textAlign = 'left';
          break;
      }

      const textbox = new fabric.Textbox(text, {
        left,
        top,
        width: type === 'heading' ? 400 : type === 'description' ? 600 : 300,
        fontSize,
        fill: '#000000',
        fontWeight,
        fontFamily: 'Arial',
        textAlign,
        splitByGrapheme: true,
      });

      // Attach optional animation metadata so presentation can read it
      if (animation && animation.type) {
        (textbox as any).animation = animation.type;
        (textbox as any).animationOrder = animation.order ?? Date.now();
      }

      fabricCanvasRef.current.add(textbox);
      fabricCanvasRef.current.setActiveObject(textbox);
      fabricCanvasRef.current.renderAll();
    },
    addImageFromUrl: (url) => {
      if (!fabricCanvasRef.current || !fabric) return;
      
      // Validate canvas before attempting to add image
      if (fabricCanvasRef.current.disposed) {
        console.error('[addImageFromUrl] Canvas already disposed');
        return;
      }
      
      const ctx = fabricCanvasRef.current.getContext();
      if (!ctx) {
        console.error('[addImageFromUrl] Canvas context unavailable');
        return;
      }

      // GIỮ LẠI crossOrigin cho URL bên ngoài
      fabric.Image.fromURL(
        url,
        (img: any) => {
          if (!img || !fabricCanvasRef.current) return;

          // Canvas validation before processing image
          if (fabricCanvasRef.current.disposed) {
            console.warn('[addImageFromUrl] Canvas disposed before image processing');
            return;
          }

          const ctx = fabricCanvasRef.current.getContext();
          if (!ctx) {
            console.error('[addImageFromUrl] Canvas context lost during image processing');
            return;
          }

          try {
            // Kích thước tối đa (nhất quán với handleAddImage)
            const maxWidth = 400;
            const maxHeight = 300;

            // Tính tỉ lệ scale
            let scaleRatio = 1;
            if (img.width > maxWidth || img.height > maxHeight) {
              const scaleX = maxWidth / img.width;
              const scaleY = maxHeight / img.height;
              scaleRatio = Math.min(scaleX, scaleY);
            }

            // Lấy tâm viewport (nếu có zoom/pan, ảnh sẽ chèn vào giữa màn hình hiện tại)
            const viewportCenter = fabricCanvasRef.current.getVpCenter();
            const imgWidth = img.width * scaleRatio;
            const imgHeight = img.height * scaleRatio;

            const left = viewportCenter.x - imgWidth / 2;
            const top = viewportCenter.y - imgHeight / 2;

            // Dùng scaleX, scaleY cho tương thích tốt nhất
            img.set({ 
              left, 
              top, 
              scaleX: scaleRatio,
              scaleY: scaleRatio,
              crossOrigin: 'anonymous' // GỮA LẠI CHO URL BÊN NGOÀI
            });

            fabricCanvasRef.current.add(img);
            fabricCanvasRef.current.renderAll();

            // Save after image is added - with context check
            setTimeout(() => {
              if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed && fabricCanvasRef.current.getContext()) {
                const canvasData = fabricCanvasRef.current?.toJSON();
                if (canvasData) {
                  updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
                }
              }
            }, 100);
          } catch (err) {
            console.error('Error adding image from URL:', err);
          }
        },
        { crossOrigin: 'anonymous' }, // GIỮ LẠI cho URL bên ngoài
        (err: any) => {
          console.error('Error loading image from URL:', err);
        }
      );
    },
    // Set background image (frame) - inserts image at bottom of stack covering full canvas
    setBackgroundImage: (url: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !fabric) return;

      if (canvas.disposed) return;

      const loader = url.startsWith('data:') ? {} : { crossOrigin: 'anonymous' };

      fabric.Image.fromURL(
        url,
        (img: any) => {
          if (!img || !canvas || canvas.disposed) return;
          try {
            // Scale to COVER the full canvas
            const scaleX = BASE_WIDTH / (img.width || 1);
            const scaleY = BASE_HEIGHT / (img.height || 1);
            const scale = Math.max(scaleX, scaleY);

            img.set({
              left: 0,
              top: 0,
              scaleX: scale,
              scaleY: scale,
              originX: 'left',
              originY: 'top',
              selectable: true,
              evented: true,
              crossOrigin: url.startsWith('data:') ? undefined : 'anonymous',
              // Tag so we know it's a background frame
              isBackgroundFrame: true,
            });

            // Insert at bottom of stack (index 0)
            canvas.insertAt(img, 0);
            canvas.renderAll();

            // Remove plain background color when image is set
            canvas.backgroundColor = 'transparent';

            // Save state
            setTimeout(() => {
              if (canvas && !canvas.disposed && canvas.getContext()) {
                const canvasData = canvas.toJSON(['animation', 'animationOrder', 'crossOrigin', 'isBackgroundFrame', 'soundUrl', 'soundName', 'animationDelay']);
                if (canvasData) {
                  updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
                }
              }
            }, 100);
          } catch (err) {
            console.error('Error setting background image:', err);
          }
        },
        loader
      );
    },
    // Run animations sequentially for objects that have `animation` metadata
    runAnimations: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || canvas.disposed) return;

      const animatedObjects = canvas.getObjects().filter((o: any) => o.animation).slice();
      animatedObjects.sort((a: any, b: any) => (a.animationOrder || 0) - (b.animationOrder || 0));

      if (animatedObjects.length === 0) return;

      // NOTE: Objects are already at opacity=0 from loadFromJSON (which sets them
      // hidden before the first render). We do NOT set opacity=0 here again — that
      // was the old STEP 1 that caused the flicker (visible → hidden → animate-in).

      const originalOpacities = new Map();
      animatedObjects.forEach((obj: any) => {
        originalOpacities.set(obj, resolveAnimationTargetOpacity(obj));
      });

      // Safe render wrapper — never throws even if canvas is disposed mid-animation
      const safeRender = () => {
        try {
          if (canvas && !canvas.disposed && canvas.getContext()) {
            canvas.requestRenderAll();
          }
        } catch (e) { /* ignore — canvas disposed mid-animation */ }
      };

      const animateLatexOverlay = (obj: any, type: string, onComplete: () => void) => {
        try {
          const overlayEl = containerRef.current?.querySelector(`[data-latex-id="${obj.__latexId}"]`) as HTMLElement | null;
          if (!overlayEl) {
            onComplete();
            return;
          }

          const fadeIn: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
          const slideUp: Keyframe[] = [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0px)' }];
          const zoomIn: Keyframe[] = [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'scale(1)' }];
          const revealLeft: Keyframe[] = [{ opacity: 0, transform: 'translateX(-100px)' }, { opacity: 1, transform: 'translateX(0px)' }];
          const rotateIn: Keyframe[] = [{ opacity: 0, transform: 'rotate(-20deg)' }, { opacity: 1, transform: 'rotate(0deg)' }];
          const bounceIn: Keyframe[] = [
            { opacity: 0, transform: 'scale(0.01)' },
            { opacity: 1, transform: 'scale(1.25)', offset: 0.65 },
            { opacity: 1, transform: 'scale(1)' },
          ];

          let keyframes: Keyframe[] = fadeIn;
          let duration = 600;
          if (type === 'slide-up') { keyframes = slideUp; duration = 700; }
          else if (type === 'zoom-in') { keyframes = zoomIn; duration = 700; }
          else if (type === 'reveal-left') { keyframes = revealLeft; duration = 650; }
          else if (type === 'rotate-in') { keyframes = rotateIn; duration = 650; }
          else if (type === 'bounce-in') { keyframes = bounceIn; duration = 620; }
          else if (type === 'typewriter' || type === 'handwrite') { keyframes = fadeIn; duration = 900; }

          overlayEl.style.opacity = '0';
          overlayEl.style.willChange = 'transform, opacity';
          const animation = overlayEl.animate(keyframes, {
            duration,
            easing: type === 'bounce-in' ? 'cubic-bezier(.34,1.56,.64,1)' : 'ease-out',
            fill: 'forwards',
          });
          animation.onfinish = () => {
            overlayEl.style.opacity = '1';
            overlayEl.style.transform = '';
            overlayEl.style.willChange = '';
            onComplete();
          };
          animation.oncancel = onComplete;
        } catch {
          onComplete();
        }
      };

      // SAFETY: If anything goes wrong, force-restore visibility after 5s
      const safetyTimeoutId = setTimeout(() => {
        animatedObjects.forEach((obj: any) => {
          try { obj.set('opacity', originalOpacities.get(obj) ?? 1); } catch (e) {}
        });
        safeRender();
      }, 5000);

      // Animate sequentially
      let idx = 0;
      const runNext = () => {
        if (idx >= animatedObjects.length) {
          clearTimeout(safetyTimeoutId);
          animatedObjects.forEach((obj: any) => {
            try { obj.set('opacity', originalOpacities.get(obj) ?? 1); } catch (e) {}
          });
          safeRender();
          return;
        }

        const obj = animatedObjects[idx];
        const type = obj.animation;

        if (shouldAnimateLatexOverlay(obj)) {
          animateLatexOverlay(obj, type, () => {
            idx++;
            setTimeout(runNext, 150);
          });
          return;
        }

        // Play per-object sound
        if (obj.soundUrl) {
          try {
            const snd = new Audio(obj.soundUrl);
            snd.volume = 0.8;
            snd.play().catch(() => {});
          } catch {}
        }

        // Apply per-object delay before animation
        const delay = obj.animationDelay || 0;
        if (delay > 0) {
          setTimeout(() => animateObj(obj, type), delay);
          return;
        }
        animateObj(obj, type);
      };

      const animateObj = (obj: any, type: string) => {
        if (type === 'fade') {
          obj.animate('opacity', originalOpacities.get(obj) || 1, {
            duration: 600,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        } else if (type === 'slide-up') {
          const originalTop = obj.top;
          const originalOpacity = originalOpacities.get(obj) || 1;
          obj.set({ top: (obj.top || 0) + 30, opacity: 0 });
          obj.animate('top', originalTop, {
            duration: 700,
            onChange: safeRender,
          });
          obj.animate('opacity', originalOpacity, {
            duration: 500,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        } else if (type === 'zoom-in') {
          const originalScaleX = obj.scaleX || 1;
          const originalScaleY = obj.scaleY || 1;
          const originalOpacity = originalOpacities.get(obj) || 1;
          obj.set({ scaleX: originalScaleX * 0.6, scaleY: originalScaleY * 0.6, opacity: 0 });
          obj.animate('scaleX', originalScaleX, { duration: 700, onChange: safeRender });
          obj.animate('scaleY', originalScaleY, { duration: 700, onChange: safeRender });
          obj.animate('opacity', originalOpacity, {
            duration: 500,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        } else if (type === 'typewriter') {
          const originalOpacity = originalOpacities.get(obj) || 1;
          if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
            const fullText = (obj.text as string) || '';
            obj.set({ text: '', opacity: originalOpacity });
            safeRender();
            let charIdx = 0;
            const delay = Math.max(25, Math.min(80, 1200 / (fullText.length || 1)));
            const typeNext = () => {
              if (!canvas || canvas.disposed) return;
              if (charIdx < fullText.length) {
                obj.set({ text: fullText.substring(0, charIdx + 1) });
                charIdx++;
                safeRender();
                if (charIdx < fullText.length) {
                  setTimeout(typeNext, delay);
                } else {
                  idx++;
                  setTimeout(runNext, 200);
                }
              }
            };
            setTimeout(typeNext, delay);
          } else {
            obj.animate('opacity', originalOpacity, {
              duration: 600,
              onChange: safeRender,
              onComplete: () => { idx++; setTimeout(runNext, 150); },
            });
          }
        } else if (type === 'handwrite') {
          // Handwriting effect: char by char with variable speed + cursor line
          const originalOpacity = originalOpacities.get(obj) || 1;
          if (obj.type === 'textbox' || obj.type === 'text' || obj.type === 'i-text') {
            const fullText = (obj.text as string) || '';
            obj.set({ text: '', opacity: originalOpacity });
            safeRender();

            // Draw a small moving "pen cursor" line on canvas overlay
            let cursorLine: any = null;
            const removeCursor = () => {
              if (cursorLine && !canvas.disposed) {
                canvas.remove(cursorLine);
                cursorLine = null;
                safeRender();
              }
            };

            const addCursor = () => {
              removeCursor();
              if (canvas.disposed) return;
              try {
                const bounds = obj.getBoundingRect();
                // Estimate cursor position at end of current text
                const lines = (obj.text as string).split('\n');
                const lastLine = lines[lines.length - 1];
                const charWidth = (obj.fontSize || 20) * 0.55;
                const lineHeight = (obj.fontSize || 20) * 1.3;
                const cx = bounds.left + lastLine.length * charWidth + 2;
                const cy = bounds.top + (lines.length - 1) * lineHeight;
                cursorLine = new fabric.Line(
                  [cx, cy, cx, cy + (obj.fontSize || 20)],
                  { stroke: obj.fill || '#000', strokeWidth: 2, selectable: false, evented: false, opacity: 0.8 }
                );
                canvas.add(cursorLine);
              } catch {}
            };

            let charIdx = 0;
            // Simulate handwriting speed: punctuation slower, spaces faster
            const charDelay = (ch: string) => {
              if (' \t'.includes(ch)) return 30;
              if ('.,!?;:'.includes(ch)) return 180;
              if ('\n'.includes(ch)) return 250;
              return Math.random() * 60 + 55; // 55–115ms per char
            };

            const writeNext = () => {
              if (!canvas || canvas.disposed) { removeCursor(); return; }
              if (charIdx < fullText.length) {
                const ch = fullText[charIdx];
                obj.set({ text: fullText.substring(0, charIdx + 1) });
                charIdx++;
                addCursor();
                safeRender();
                if (charIdx < fullText.length) {
                  setTimeout(writeNext, charDelay(ch));
                } else {
                  removeCursor();
                  safeRender();
                  idx++;
                  setTimeout(runNext, 300);
                }
              }
            };
            setTimeout(writeNext, 100);
          } else {
            obj.animate('opacity', originalOpacity, {
              duration: 600,
              onChange: safeRender,
              onComplete: () => { idx++; setTimeout(runNext, 150); },
            });
          }
        } else if (type === 'reveal-left') {
          const originalLeft = obj.left || 0;
          const originalOpacity = originalOpacities.get(obj) || 1;
          obj.set({ left: (originalLeft || 0) - 100, opacity: 0 });
          obj.animate('left', originalLeft, { duration: 650, onChange: safeRender });
          obj.animate('opacity', originalOpacity, {
            duration: 450,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        } else if (type === 'bounce-in') {
          const origScaleX = obj.scaleX || 1;
          const origScaleY = obj.scaleY || 1;
          const originalOpacity = originalOpacities.get(obj) || 1;
          obj.set({ scaleX: 0.01, scaleY: 0.01, opacity: 0 });
          obj.animate('opacity', originalOpacity, { duration: 250, onChange: safeRender });
          obj.animate('scaleX', origScaleX * 1.25, {
            duration: 380,
            onChange: safeRender,
            onComplete: () => {
              if (!canvas || canvas.disposed) return;
              obj.animate('scaleX', origScaleX, { duration: 220, onChange: safeRender });
            },
          });
          obj.animate('scaleY', origScaleY * 1.25, {
            duration: 380,
            onChange: safeRender,
            onComplete: () => {
              if (!canvas || canvas.disposed) return;
              obj.animate('scaleY', origScaleY, {
                duration: 220,
                onChange: safeRender,
                onComplete: () => { idx++; setTimeout(runNext, 150); },
              });
            },
          });
        } else if (type === 'rotate-in') {
          const originalAngle = obj.angle || 0;
          const originalOpacity = originalOpacities.get(obj) || 1;
          obj.set({ angle: originalAngle - 20, opacity: 0 });
          obj.animate('angle', originalAngle, { duration: 650, onChange: safeRender });
          obj.animate('opacity', originalOpacity, {
            duration: 550,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        } else {
          // Default: fade
          obj.animate('opacity', 1, {
            duration: 600,
            onChange: safeRender,
            onComplete: () => { idx++; setTimeout(runNext, 150); },
          });
        }
      }; // end animateObj

      setTimeout(runNext, 50);
    },
    setAnimationForSelected: (animation) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;
      
      if (animation && animation.type) {
        active.set('animation', animation.type);
        active.set('animationOrder', animation.order ?? Date.now());
        // CRITICAL: In edit mode always keep the object fully visible after assigning an effect
        // The object will only be hidden at the START of presentation mode's runAnimations
        if (!isPresentationMode) {
          active.set('opacity', 1);
        }
      } else {
        // Remove animation
        delete (active as any).animation;
        delete (active as any).animationOrder;
        // CRITICAL: Always restore full visibility when removing an animation
        active.set('opacity', 1);
        active.set('visible', true);
      }
      
      canvas.requestRenderAll();
      
      // CRITICAL: Save animation data immediately to store so presentation mode can access it
      const canvasData = canvas.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
      updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
    },
    resetAnimationState: () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Reset opacity to 1 for all objects (to show them after animations)
      canvas.forEachObject((obj: any) => {
        obj.set('opacity', obj.__latexId ? 0 : 1);
      });
      canvas.requestRenderAll();
      
      // CRITICAL: Save the reset state back to store so presentation exit shows correct canvas
      const canvasData = canvas.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
      updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
    },
    resetCanvasToOriginalState: () => {
      // Reload canvas from original slide data to remove any animation artifacts
      const canvas = fabricCanvasRef.current;
      if (!canvas || !slide?.canvasData) return;
      
      // Clear canvas completely
      canvas.clear();
      
      // Reload from original canvasData
      const reviver = (object: any) => {
        if (object.type === 'image' && object.src && !object.src.startsWith('data:')) {
          object.crossOrigin = 'anonymous';
        }
        // FIX: Correct invalid textBaseline values for text objects
        if (object.type && (object.type === 'textbox' || object.type === 'text' || object.type === 'i-text')) {
          const validBaselines = ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'];
          if (object.textBaseline && !validBaselines.includes(object.textBaseline)) {
            console.warn(`Invalid textBaseline '${object.textBaseline}' corrected to 'alphabetic'`);
            object.textBaseline = 'alphabetic';
          }
        }
        return object;
      };
      
      canvas.loadFromJSON(slide.canvasData, () => {
        // Apply background color
        if (slide?.backgroundColor && canvas && !canvas.disposed) {
          canvas.backgroundColor = slide.backgroundColor;
        }
        if (canvas && !canvas.disposed && canvas.getElement()) {
          try {
            canvas.renderAll();
          } catch (error) {
            console.warn('Failed to render canvas:', error);
          }
        }
      }, reviver);
    },
    resetAllObjects: () => {
      // Bring all objects back to visible state (opacity = 1)
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.getObjects().forEach((obj: any) => {
        obj.set({
          opacity: obj.__latexId ? 0 : 1,
          visible: true,
        });
      });
      canvas.renderAll();
    },
  }));


  // Initialize Fabric Canvas with responsive scaling
  useEffect(() => {
    if (!canvasRef.current || !fabric || !isReady) return;

    // Ensure canvas element is properly in the DOM
    if (!canvasRef.current.parentElement) return;

    try {
      // Safely initialize canvas ref with better retry logic
      let retries = 0;
      const maxRetries = 3;
      const initCanvas = (): boolean => {
        if (!canvasRef.current) return false;
        
        try {
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) {
            console.warn(`Canvas context is null (attempt ${retries + 1}/${maxRetries})`);
            return false;
          }
          return true;
        } catch (error) {
          console.warn('Error getting canvas context:', error);
          return false;
        }
      };

      // Try to get context, retry if needed
      if (!initCanvas()) {
        const retryTimer = setInterval(() => {
          retries++;
          if (initCanvas() || retries >= maxRetries) {
            clearInterval(retryTimer);
            if (retries >= maxRetries) {
              console.error('Failed to initialize canvas context after retries');
            }
          }
        }, 100);
      }

      const canvas = new fabric.Canvas(canvasRef.current, {
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
        backgroundColor: slide?.backgroundColor || '#ffffff',
        selection: !readOnly,
        preserveObjectStacking: true,
        enablePointerEvents: !readOnly,
        renderOnAddRemove: false, // Disable auto-render during loading
      });

      // Add error handling for canvas context loss - CRITICAL FIX
      // Wrap both renderAll and clear methods to prevent null context errors
      const originalRenderAll = canvas.renderAll.bind(canvas);
      canvas.renderAll = function() {
        try {
          const ctx = canvas.getContext();
          if (!ctx) {
            console.warn('Canvas context lost, attempting recovery');
            return;
          }
          return originalRenderAll();
        } catch (error) {
          console.warn('Canvas render error:', error);
        }
      };

      // CRITICAL FIX: Override clear() method to handle null context
      const originalClear = canvas.clear.bind(canvas);
      canvas.clear = function() {
        try {
          const ctx = canvas.getContext();
          if (!ctx) {
            console.warn('Canvas context lost during clear, skipping');
            // Reset internal objects array without rendering
            canvas._objects.length = 0;
            canvas._activeObject = null;
            return;
          }
          return originalClear();
        } catch (error) {
          console.warn('Canvas clear error:', error);
          // Gracefully degrade - clear objects without context
          canvas._objects.length = 0;
          canvas._activeObject = null;
        }
      };

      fabricCanvasRef.current = canvas;

      // Initialize Smart Guides
      if (!readOnly) {
        initCenteringGuidelines(canvas);
      }

      // Load existing slide data
      if (slide?.canvasData) {
        // Create a reviver function to properly handle image restoration
        // NOTE: In Fabric.js v4-v5 the reviver signature is (serializedObj, fabricObj)
        // but the code previously treated it as (serializedObj) => serializedObj.
        // We now handle both call signatures and explicitly copy animation properties.
        const reviver = (jsonObjOrFabricObj: any, maybeFabricObj?: any) => {
          // Determine which arg is the JSON source and which is the Fabric instance
          const jsonObj = maybeFabricObj ? jsonObjOrFabricObj : jsonObjOrFabricObj;
          const fabricObj = maybeFabricObj || jsonObjOrFabricObj;

          // FIX: Only set crossOrigin for external URLs, NOT for Base64
          if (fabricObj.type === 'image' && fabricObj.src && !fabricObj.src.startsWith('data:')) {
            fabricObj.crossOrigin = 'anonymous';
          }
          // Also handle JSON source
          if (jsonObj && jsonObj.type === 'image' && jsonObj.src && !jsonObj.src.startsWith('data:')) {
            jsonObj.crossOrigin = 'anonymous';
          }

          // FIX: Correct invalid textBaseline values for text objects
          const textTypes = ['textbox', 'text', 'i-text'];
          const validBaselines = ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'];
          [jsonObj, fabricObj].forEach((o: any) => {
            if (!o) return;
            if (textTypes.includes(o.type)) {
              if (o.textBaseline && !validBaselines.includes(o.textBaseline)) {
                o.textBaseline = 'alphabetic';
              }
            }
          });

          // CRITICAL: Explicitly copy animation custom properties onto the fabric object
          // Fabric's enlivenObjects may not copy unknown properties automatically
          if (fabricObj && jsonObj && jsonObj !== fabricObj) {
            if (jsonObj.animation !== undefined) fabricObj.animation = jsonObj.animation;
            if (jsonObj.animationOrder !== undefined) fabricObj.animationOrder = jsonObj.animationOrder;
            if (jsonObj.isBackgroundFrame !== undefined) fabricObj.isBackgroundFrame = jsonObj.isBackgroundFrame;
          }

          return jsonObj;
        };

        try {
          canvas.loadFromJSON(slide.canvasData, () => {
            // Safety check: ensure canvas still exists (not disposed)
            if (!canvas || canvas.disposed) return;

            // ── FIX: Animation flicker ──
            // In presentation mode we hide animated objects IMMEDIATELY (before the first
            // render) so the user never sees them in their final state before the animation
            // starts.  Previously runAnimations() was responsible for hiding them after a
            // 400ms timeout, which caused: visible → hidden → animate-in (the flicker).
            canvas.forEachObject((obj: any) => {
              if (isPresentationMode && obj.animation) {
                obj.opacity = 0; // will be animated back to 1 by runAnimations()
              } else {
                obj.set('opacity', 1);
              }
              obj.set('visible', true);
            });
            
            // After loading, ensure background color is applied
            if (slide?.backgroundColor) {
              canvas.backgroundColor = slide.backgroundColor;
              setBackgroundColor(slide.backgroundColor);
            }
            
            // Ensure all images are fully loaded before rendering
            let imageCount = 0;
            
            canvas.forEachObject((obj: any) => {
              if (obj.type === 'image') {
                imageCount++;
              }
            });
            
            // safeRender: render canvas then fire optional callback
            const safeRender = (delayMs: number, afterRender?: () => void) => {
              const timeoutId = setTimeout(() => {
                if (canvas && !canvas.disposed && canvas.getElement()) {
                  try {
                    const ctx = canvas.getContext();
                    if (ctx) {
                      canvas.renderAll();
                      afterRender?.();
                    } else {
                      console.warn('Canvas context lost, cannot render');
                    }
                  } catch (error) {
                    // Canvas context may have been lost, silently fail
                    console.warn('Failed to render canvas:', error);
                  }
                }
              }, delayMs);
              return timeoutId;
            };

            // After render notify parent (used by presentation mode to start animations)
            const afterRenderCallback = isPresentationMode ? () => onReady?.() : undefined;

            if (imageCount === 0) {
              safeRender(50, afterRenderCallback);
            } else {
              const originalOnLoad = canvas._objects.filter((obj: any) => obj.type === 'image');
              if (originalOnLoad.length > 0) {
                safeRender(300, afterRenderCallback);
              } else {
                safeRender(100, afterRenderCallback);
              }
            }
          }, reviver);
        } catch (error) {
          console.error('Error loading canvas data from JSON:', error);
          // If loading fails, continue without data
        }
    } else if (slide?.backgroundColor) {
      // If no canvas data but has background color, apply it
      canvas.backgroundColor = slide.backgroundColor;
      setBackgroundColor(slide.backgroundColor);
      canvas.requestRenderAll();
    }

    if (!readOnly) {
      // Event handlers only when NOT in readOnly mode
      // Helper: reveal a LaTeX textbox in Fabric for editing (show raw source)
      const revealLatexObj = (obj: any) => {
        if (!obj || !obj.__latexId) return;
        obj.set({ opacity: 1 });
        canvas.requestRenderAll();
        setEditingLatexId(obj.__latexId);
      };

      // Helper: re-hide a LaTeX textbox and refresh overlay
      const hideLatexObj = (obj: any) => {
        if (!obj || !obj.__latexId) return;
        // Update overlay text in case user edited it
        obj.set({ opacity: 0 });
        canvas.requestRenderAll();
        setEditingLatexId(null);
        // Rebuild all overlays to pick up any text changes
        setTimeout(() => rebuildLatexOverlaysRef.current?.(), 50);
      };

      canvas.on('selection:created', (e: any) => {
        const obj = e.selected?.[0] || null;
        setSelectedObject(obj);
        onSelectionChange?.(obj?.animation ?? null);
        if (obj) {
          const shapeTypes = ['rect', 'circle', 'triangle', 'polygon', 'ellipse', 'path'];
          if (shapeTypes.includes(obj.type)) {
            setShapeColor(obj.fill || '#4a90e2');
            setShapeBorderColor(obj.stroke || '');
            setShapeBorderWidth(obj.strokeWidth || 0);
          }
          if (obj.type === 'textbox') {
            setTextColor(obj.fill || '#000000');
            setFontSize(obj.fontSize || 20);
            setFontFamily(obj.fontFamily || 'Arial');
            // Reveal LaTeX textbox so raw source is editable
            if (obj.__latexId) revealLatexObj(obj);
          }
          setObjectSoundUrl(obj.soundUrl || '');
          setObjectSoundName(obj.soundName || '');
          setObjectDelay(obj.animationDelay || 0);
        }
      });

      canvas.on('selection:updated', (e: any) => {
        const prev = e.deselected?.[0];
        const obj  = e.selected?.[0] || null;
        // Re-hide previously edited LaTeX textbox
        if (prev?.__latexId) hideLatexObj(prev);
        setSelectedObject(obj);
        onSelectionChange?.(obj?.animation ?? null);
        if (obj) {
          const shapeTypes = ['rect', 'circle', 'triangle', 'polygon', 'ellipse', 'path'];
          if (shapeTypes.includes(obj.type)) {
            setShapeColor(obj.fill || '#4a90e2');
            setShapeBorderColor(obj.stroke || '');
            setShapeBorderWidth(obj.strokeWidth || 0);
          }
          if (obj.type === 'textbox') {
            setTextColor(obj.fill || '#000000');
            setFontSize(obj.fontSize || 20);
            setFontFamily(obj.fontFamily || 'Arial');
            if (obj.__latexId) revealLatexObj(obj);
          }
          setObjectSoundUrl(obj.soundUrl || '');
          setObjectSoundName(obj.soundName || '');
          setObjectDelay(obj.animationDelay || 0);
        }
      });

      canvas.on('selection:cleared', (e: any) => {
        const prev = e.deselected?.[0];
        if (prev?.__latexId) hideLatexObj(prev);
        setSelectedObject(null);
        onSelectionChange?.(null);
      });

      // Auto-save
      const handleModified = () => {
        // IMPORTANT: Do NOT save if in presentation mode to prevent animation state from being persisted
        if (isPresentationMode) return;

        // Specify custom properties to persist: animation, animationOrder, crossOrigin
        const canvasData = canvas.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
        updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });

        // Store history for undo
        setHistory((prev) => [...prev.slice(-9), JSON.stringify(sanitizeCanvasData(canvasData))]);
      };

      canvas.on('object:modified', handleModified);
      canvas.on('object:added', handleModified);
      canvas.on('object:removed', handleModified);

      // Ensure setCoords is updated during interactions to avoid visual clipping
      canvas.on('object:moving', (e: any) => {
        try {
          e.target?.setCoords();
        } catch (err) {
          // ignore
        }
      });

      canvas.on('object:scaling', (e: any) => {
        try {
          e.target?.setCoords();
        } catch (err) {}
      });

      canvas.on('object:rotating', (e: any) => {
        try {
          e.target?.setCoords();
        } catch (err) {}
      });

      // Zoom with mouse wheel
      canvas.on('mouse:wheel', function (opt: any) {
        if (canvas.disposed) return;
        const delta = (opt.e as WheelEvent).deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.5) zoom = 0.5;
        
        // Update canvas dimensions to prevent clipping when dragging objects near edges
        canvas.setDimensions({ width: BASE_WIDTH * zoom, height: BASE_HEIGHT * zoom });
        canvas.setZoom(zoom);
        
        (opt.e as WheelEvent).preventDefault();
        setCanvasZoom(zoom);
        try {
          canvas.renderAll();
        } catch (error) {
          console.warn('Failed to render canvas on zoom:', error);
        }
      });
    } else {
      // Read-only mode: disable all interactions except hyperlinks
      canvas.selection = false;
      canvas.forEachObject((obj: any) => {
        obj.selectable = false;
        // Keep evented=true for objects that have hyperlinks
        obj.evented = !!obj.hyperlink;
      });

      // Handle hyperlink clicks in readOnly mode
      canvas.on('mouse:up', (e: any) => {
        const target = e.target;
        if (target?.hyperlink) {
          let url = target.hyperlink as string;
          if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      });

      // Change cursor to pointer for hyperlinked objects
      canvas.on('mouse:over', (e: any) => {
        if (e.target?.hyperlink) {
          canvas.defaultCursor = 'pointer';
          canvas.hoverCursor = 'pointer';
        }
      });
      canvas.on('mouse:out', (e: any) => {
        if (e.target?.hyperlink) {
          canvas.defaultCursor = 'default';
        }
      });
    }

    // ── Universal LaTeX overlay builder ────────────────────────────────
    // Runs in BOTH edit AND readOnly modes.
    // Scans textbox objects for LaTeX syntax, hides them in Fabric (opacity=0),
    // and stores geometry for HTML overlay rendering via <LaTeXRenderer>.
    const HAS_LATEX = /\$[^$\n]|\$\$|\\\(|\\\[|arc\(|vec\(|ovl\(|seg\(|--chem\{|°/;
    const buildLatexOverlays = () => {
      const c = fabricCanvasRef.current;
      if (!c || c.disposed) return;

      const overlays: LatexOverlay[] = [];
      let idx = 0;
      c.forEachObject((obj: any) => {
        const i = idx++;
        if (!['textbox', 'text', 'i-text'].includes(obj.type)) return;
        const rawText: string = obj.text || '';
        if (!HAS_LATEX.test(rawText)) return;

        // Assign a stable id if missing
        if (!obj.__latexId) obj.__latexId = `latex-${Date.now()}-${i}`;

        // Hide in Fabric — HTML overlay will render the content
        obj.set({ opacity: 0 });

        overlays.push({
          id:         obj.__latexId,
          fabricIndex: i,
          left:       obj.left       || 0,
          top:        obj.top        || 0,
          width:      (obj.width     || 200) * (obj.scaleX || 1),
          height:     (obj.height    || 40)  * (obj.scaleY || 1),
          fontSize:   (obj.fontSize  || 20)  * (obj.scaleY || 1),
          text:       rawText,
          fill:       obj.fill       || '#000000',
          fontWeight: obj.fontWeight || 'normal',
          fontStyle:  obj.fontStyle  || 'normal',
          fontFamily: obj.fontFamily || 'Arial',
          textAlign:  obj.textAlign  || 'left',
          angle:      obj.angle      || 0,
        });
      });

      setLatexOverlays(overlays);
      if (overlays.length > 0) c.requestRenderAll();
    };

    // Store ref so selection event handlers can call it without stale closure
    rebuildLatexOverlaysRef.current = buildLatexOverlays;

    // Run after canvas finishes loading
    setTimeout(buildLatexOverlays, 350);

    // In edit mode: re-build overlays whenever objects are modified/added/removed
    if (!readOnly) {
      const scheduleRebuild = (() => {
        let t: ReturnType<typeof setTimeout> | null = null;
        return () => {
          if (t) clearTimeout(t);
          t = setTimeout(() => { rebuildLatexOverlaysRef.current?.(); }, 200);
        };
      })();

      canvas.on('object:modified', scheduleRebuild);
      canvas.on('object:added',    scheduleRebuild);
      canvas.on('object:removed',  scheduleRebuild);
    }

    // Apply zoom: use external zoom if provided, otherwise calculate responsive zoom
    const initialZoom = externalZoom && externalZoom !== 1 ? externalZoom : calculateResponsiveZoom();
    // IMPORTANT: Must update dimensions along with zoom to prevent clipping
    canvas.setDimensions({ width: BASE_WIDTH * initialZoom, height: BASE_HEIGHT * initialZoom });
    canvas.setZoom(initialZoom);
    setCanvasZoom(initialZoom);

    // Handle resize
    const handleResize = () => {
      if (!canvas || canvas.disposed) return;
      const newZoom = calculateResponsiveZoom();
      // IMPORTANT: Update dimensions along with zoom to maintain viewport
      canvas.setDimensions({ width: BASE_WIDTH * newZoom, height: BASE_HEIGHT * newZoom });
      canvas.setZoom(newZoom);
      setCanvasZoom(newZoom);
      try {
        canvas.requestRenderAll();
      } catch (error) {
        console.warn('Failed to render canvas on resize:', error);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      setLatexOverlays([]); // clear overlays when canvas resets
      // Only dispose if canvas still exists and is valid
      if (canvas && !canvas.disposed) {
        try {
          canvas.dispose();
        } catch (error) {
          console.warn('Error disposing canvas:', error);
        }
      }
    };
    } catch (error) {
      console.error('Error initializing canvas:', error);
    }
  }, [slideId, isReady, readOnly]); // CRITICAL: Removed 'slide' and 'externalZoom' dependencies to prevent unnecessary canvas recreation

  // Handle external zoom prop changes
  useEffect(() => {
    if (!fabricCanvasRef.current || !externalZoom) return;
    
    // Only update if the external zoom is different from current zoom
    if (Math.abs(fabricCanvasRef.current.getZoom() - externalZoom) > 0.01) {
      // IMPORTANT: Update dimensions along with zoom
      fabricCanvasRef.current.setDimensions({ width: BASE_WIDTH * externalZoom, height: BASE_HEIGHT * externalZoom });
      fabricCanvasRef.current.setZoom(externalZoom);
      setCanvasZoom(externalZoom);
      fabricCanvasRef.current.requestRenderAll();
    }
  }, [externalZoom]);

  // Listen for background color changes (reactive)
  useEffect(() => {
    if (!fabricCanvasRef.current || !slide?.backgroundColor) return;
    fabricCanvasRef.current.backgroundColor = slide.backgroundColor;
    fabricCanvasRef.current.requestRenderAll();
  }, [slide?.backgroundColor]);

  // Update text properties when selected object changes
  useEffect(() => {
    if (selectedObject?.type === 'textbox') {
      setTextColor(selectedObject.fill || '#000000');
      setFontSize(selectedObject.fontSize || 20);
      setFontFamily(selectedObject.fontFamily || 'Arial');
    }
  }, [selectedObject]);

  // Sync background color from slide data
  useEffect(() => {
    if (slide?.backgroundColor) {
      setBackgroundColor(slide.backgroundColor);
    }
  }, [slide?.backgroundColor]);

  // Reset all objects to visible state when slide ID changes
  // This prevents objects from staying hidden (opacity=0) after animations
  // CRITICAL FIX: Skip this reset in presentation mode to prevent flicker before runAnimations fires
  useEffect(() => {
    if (!fabricCanvasRef.current || !isReady) return;
    // In presentation mode, objects with animations start at opacity=0 intentionally.
    // Resetting them here would cause the flicker: visible → hidden → animate-in.
    if (isPresentationMode) return;
    
    setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      canvas.getObjects().forEach((obj: any) => {
        obj.set({
          opacity: 1,
          visible: true,
        });
      });
      canvas.renderAll();
    }, 100);
  }, [slideId, isReady, isPresentationMode]);

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
      fontFamily: 'Arial',
    });

    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.setActiveObject(textbox);
    fabricCanvasRef.current.renderAll();
  };

  // Add Shape
  const handleAddShape = (shapeType: string) => {
    if (!fabricCanvasRef.current || !fabric) return;
    const canvas = fabricCanvasRef.current;
    const cx = BASE_WIDTH / 2 - 75;
    const cy = BASE_HEIGHT / 2 - 75;

    let shape: any = null;

    switch (shapeType) {
      case 'rect':
        shape = new fabric.Rect({ left: cx, top: cy, width: 150, height: 100, fill: '#4a90e2', rx: 0, ry: 0 });
        break;
      case 'rect-rounded':
        shape = new fabric.Rect({ left: cx, top: cy, width: 150, height: 100, fill: '#7ed321', rx: 16, ry: 16 });
        break;
      case 'circle':
        shape = new fabric.Circle({ left: cx, top: cy, radius: 70, fill: '#e94560' });
        break;
      case 'triangle':
        shape = new fabric.Triangle({ left: cx, top: cy, width: 150, height: 130, fill: '#f5a623' });
        break;
      case 'diamond':
        shape = new fabric.Polygon(
          [{ x: 75, y: 0 }, { x: 150, y: 75 }, { x: 75, y: 150 }, { x: 0, y: 75 }],
          { left: cx, top: cy, fill: '#9b59b6' }
        );
        break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 70 : 30;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          pts.push({ x: 75 + r * Math.cos(angle), y: 75 + r * Math.sin(angle) });
        }
        shape = new fabric.Polygon(pts, { left: cx, top: cy, fill: '#fdcb6e' });
        break;
      }
      case 'arrow': {
        const arrowPts = [
          { x: 0, y: 40 }, { x: 90, y: 40 }, { x: 90, y: 15 },
          { x: 150, y: 65 }, { x: 90, y: 115 }, { x: 90, y: 90 }, { x: 0, y: 90 }
        ];
        shape = new fabric.Polygon(arrowPts, { left: cx, top: cy - 20, fill: '#00cec9' });
        break;
      }
      case 'line':
        shape = new fabric.Line([cx, cy + 60, cx + 200, cy + 60], { stroke: '#2d3436', strokeWidth: 4, selectable: true });
        break;
      default:
        return;
    }

    canvas.add(shape);

    if (shapeWithText && shapeType !== 'line') {
      const textbox = new fabric.Textbox('Văn bản', {
        left: shape.left + (shape.width ? shape.width / 2 - 50 : 20),
        top: shape.top + (shape.height ? shape.height / 2 - 12 : 20),
        width: 100,
        fontSize: 16,
        fill: '#ffffff',
        textAlign: 'center',
        fontFamily: 'Arial',
        fontWeight: 'bold',
      });
      canvas.add(textbox);
    }

    canvas.renderAll();
    setShowShapePanel(false);
  };

  // Change shape fill color
  const handleChangeShapeFill = (color: string) => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    const shapeTypes = ['rect', 'circle', 'triangle', 'polygon', 'ellipse', 'path'];
    if (shapeTypes.includes(selectedObject.type)) {
      selectedObject.set({ fill: color });
      fabricCanvasRef.current.renderAll();
      setShapeColor(color);
    }
  };

  // Change shape stroke/border
  const handleChangeShapeStroke = (color: string) => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set({ stroke: color, strokeWidth: shapeBorderWidth || 2 });
    fabricCanvasRef.current.renderAll();
    setShapeBorderColor(color);
  };

  const handleChangeShapeStrokeWidth = (w: number) => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set({ strokeWidth: w });
    fabricCanvasRef.current.renderAll();
    setShapeBorderWidth(w);
  };

  // Per-object sound
  const handleSetObjectSound = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedObject || !fabricCanvasRef.current) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      selectedObject.set('soundUrl', url);
      selectedObject.set('soundName', file.name);
      setObjectSoundUrl(url);
      setObjectSoundName(file.name);
      const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
      updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveObjectSound = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    delete (selectedObject as any).soundUrl;
    delete (selectedObject as any).soundName;
    setObjectSoundUrl('');
    setObjectSoundName('');
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
  };

  // Per-object animation delay
  const handleSetObjectDelay = (ms: number) => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    selectedObject.set('animationDelay', ms);
    setObjectDelay(ms);
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
  };
  const handleAddImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvasRef.current || !fabric) return;

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      alert('Kích thước file ảnh quá lớn. Vui lòng chọn file nhỏ hơn 5MB.');
      return;
    }

    // Validate file type
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Định dạng ảnh không hỗ trợ. Vui lòng chọn JPEG, PNG, GIF hoặc WebP.');
      return;
    }

    // Pre-check: ensure canvas is still valid before starting
    const canvasCheck = () => {
      if (!fabricCanvasRef.current) {
        console.error('[handleAddImage] Canvas ref null');
        return false;
      }
      if (fabricCanvasRef.current.disposed) {
        console.error('[handleAddImage] Canvas already disposed');
        return false;
      }
      if (!canvasRef.current?.parentElement) {
        console.error('[handleAddImage] Canvas element not in DOM');
        return false;
      }
      const ctx = fabricCanvasRef.current.getContext();
      if (!ctx) {
        console.warn('[handleAddImage] Canvas context null during pre-check, attempting recovery');
        return false;
      }
      return true;
    };

    if (!canvasCheck()) {
      alert('Canvas không sẵn sàng. Vui lòng thử lại.');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      // Double-check canvas is still valid before loading image
      if (!canvasCheck()) {
        console.error('[handleAddImage] Canvas became invalid during image read');
        alert('Canvas bị mất khi đang tải ảnh. Vui lòng thử lại.');
        return;
      }

      const imgUrl = e.target?.result as string;

      // Notify parent so it can save to image library
      onImageUploaded?.(imgUrl, { source: 'upload' });

      // Load ảnh từ chuỗi Base64 với error callback
      fabric.Image.fromURL(
        imgUrl,
        (img: any) => {
          // FIX #5: Add debug log to detect Phantom Canvas
          console.log('[handleAddImage] Canvas ref:', fabricCanvasRef.current ? 'valid' : 'invalid', 'Image:', img ? 'valid' : 'invalid');
          
          if (!img) {
            console.error('Fabric không thể khởi tạo đối tượng ảnh.');
            alert('Lỗi định dạng ảnh, vui lòng thử file khác!');
            return;
          }

          // Safety check: ensure canvas still exists and has context
          if (!fabricCanvasRef.current || fabricCanvasRef.current.disposed) {
            console.warn('[handleAddImage] Canvas was disposed, skipping image addition');
            return;
          }

          if (!canvasRef.current?.parentElement) {
            console.error('[handleAddImage] Canvas element removed from DOM');
            return;
          }

          const ctx = fabricCanvasRef.current.getContext();
          if (!ctx) {
            console.error('[handleAddImage] Canvas context is null, cannot add image');
            alert('Lỗi canvas context. Vui lòng tải lại trang.');
            return;
          }

          try {
            const maxWidth = 400;
            const maxHeight = 300;

            // FIX #4: Lấy kích thước an toàn (tránh 0 hoặc undefined)
            const imgW = img.width || img.naturalWidth || 100;
            const imgH = img.height || img.naturalHeight || 100;

            // FIX #4: Tính tỉ lệ scale với kiểm tra NaN/Infinity
            let scaleRatio = 1;
            if (imgW > maxWidth || imgH > maxHeight) {
              scaleRatio = Math.min(maxWidth / imgW, maxHeight / imgH);
            }
            
            // Kiểm tra scaleRatio bị hỏng
            if (isNaN(scaleRatio) || !isFinite(scaleRatio)) {
              console.warn('[handleAddImage] scaleRatio invalid, fallback to 1');
              scaleRatio = 1;
            }

            // FIX #4: Tính tâm an toàn (phòng trường hợp viewportCenter bị NaN)
            let center = { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 };
            if (fabricCanvasRef.current?.getVpCenter) {
              try {
                const vpCenter = fabricCanvasRef.current.getVpCenter();
                if (vpCenter && !isNaN(vpCenter.x) && !isNaN(vpCenter.y)) {
                  center = vpCenter;
                }
              } catch (e) {
                console.warn('[handleAddImage] getVpCenter failed, using default center');
              }
            }

            const left = center.x - (imgW * scaleRatio) / 2;
            const top = center.y - (imgH * scaleRatio) / 2;

            // FIX #4: Kiểm tra left/top bị NaN
            if (isNaN(left) || isNaN(top)) {
              console.warn('[handleAddImage] Computed left/top is NaN, using default center');
              img.set({
                left: BASE_WIDTH / 2,
                top: BASE_HEIGHT / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scaleRatio,
                scaleY: scaleRatio,
              });
            } else {
              img.set({
                left,
                top,
                originX: 'center',
                originY: 'center',
                scaleX: scaleRatio,
                scaleY: scaleRatio,
              });
            }

            // CRITICAL: Check canvas context again before adding to canvas
            if (!fabricCanvasRef.current.getContext()) {
              console.error('[handleAddImage] Canvas context lost before adding image');
              return;
            }

            // IMPORTANT: Call setCoords() to ensure Fabric calculates correct bounding box
            img.setCoords();
            
            fabricCanvasRef.current.add(img);
            fabricCanvasRef.current.setActiveObject(img);
            
            // FIX #3: Force render sau một tick nhỏ để đảm bảo ảnh pixel đã sẵn sàng
            setTimeout(() => {
              if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
                const ctx = fabricCanvasRef.current.getContext();
                if (ctx) {
                  fabricCanvasRef.current.requestRenderAll();
                  console.log('[handleAddImage] Image rendered successfully');
                } else {
                  console.warn('[handleAddImage] Canvas context lost after adding image');
                }
              }
            }, 50);

            // Lưu trạng thái - with another context check
            setTimeout(() => {
              if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
                const ctx = fabricCanvasRef.current.getContext();
                if (ctx) {
                  const canvasData = fabricCanvasRef.current.toJSON();
                  if (canvasData) {
                    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
                  }
                } else {
                  console.warn('[handleAddImage] Cannot save - canvas context lost');
                }
              }
            }, 150);
          } catch (err) {
            console.error('Lỗi trong quá trình đưa ảnh vào canvas:', err);
            alert('Lỗi khi thêm ảnh: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
          }
        },
        null, // options
        (err: any) => {
          // Error callback for image loading
          console.error('[handleAddImage] Failed to load image from URL:', err);
          alert('Không thể tải ảnh. Vui lòng thử file khác.');
        }
      );
    };

    reader.onerror = () => {
      console.error('Lỗi khi đọc file ảnh từ máy tính.');
      alert('Không thể đọc file ảnh. Vui lòng thử lại.');
    };

    reader.readAsDataURL(file);
    event.target.value = ''; // Reset input file
  };

  // Delete selected object
  const handleDelete = () => {
    if (selectedObject && fabricCanvasRef.current) {
      fabricCanvasRef.current.remove(selectedObject);
      fabricCanvasRef.current.requestRenderAll();
      setSelectedObject(null);
    }
  };

  // Duplicate selected object
  const handleDuplicate = useCallback(() => {
    if (!selectedObject || !fabricCanvasRef.current || !fabric) return;
    const clonedObject = fabric.util.object.clone(selectedObject);
    clonedObject.set({
      left: (selectedObject as any).left + 10,
      top: (selectedObject as any).top + 10,
    });
    fabricCanvasRef.current.add(clonedObject);
    fabricCanvasRef.current.requestRenderAll();
  }, [selectedObject, fabric]);

  // Change background color
  const handleChangeBackgroundColor = (color: string) => {
    setBackgroundColor(color);
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.backgroundColor = color;
      fabricCanvasRef.current.requestRenderAll();
      updateSlide(slideId, { backgroundColor: color });
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

  // ── Hyperlink handlers ────────────────────────────────────────────────────────

  /** Get current hyperlink of selected object */
  const selectedHyperlink: string = (selectedObject as any)?.hyperlink || '';

  /** Open the hyperlink input panel */
  const handleOpenHyperlink = () => {
    if (!selectedObject) return;
    setHyperlinkDraft(selectedHyperlink);
    setShowHyperlinkInput(true);
    setTimeout(() => hyperlinkInputRef.current?.focus(), 50);
  };

  /** Save hyperlink to the selected object */
  const handleSaveHyperlink = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    let url = hyperlinkDraft.trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    (selectedObject as any).hyperlink = url || undefined;
    // Add visual underline hint for text objects with links
    if (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text') {
      selectedObject.set({ underline: !!url });
    }
    fabricCanvasRef.current.requestRenderAll();
    // Save to store
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
    setShowHyperlinkInput(false);
    setHyperlinkDraft('');
  };

  /** Remove hyperlink from selected object */
  const handleRemoveHyperlink = () => {
    if (!selectedObject || !fabricCanvasRef.current) return;
    delete (selectedObject as any).hyperlink;
    if (selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text') {
      selectedObject.set({ underline: false });
    }
    fabricCanvasRef.current.requestRenderAll();
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
    setShowHyperlinkInput(false);
    setHyperlinkDraft('');
  };

  // Audio upload handler
  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const audioUrl = e.target?.result as string;
      setAudioUrl(audioUrl);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
      }
      updateSlide(slideId, { audioUrl });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  // Toggle audio playback
  const handlePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.error('Audio play error:', err));
      setIsPlaying(true);
    }
  };

  // Handle audio end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnd = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnd);
    return () => audio.removeEventListener('ended', handleEnd);
  }, []);

  // Sync audio URL from slide
  useEffect(() => {
    if (slide?.audioUrl && audioUrl !== slide.audioUrl) {
      setAudioUrl(slide.audioUrl);
      if (audioRef.current) {
        audioRef.current.src = slide.audioUrl;
      }
    }
  }, [slide?.audioUrl]);

  // Change text color
  const handleChangeTextColor = (color: string) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set({ fill: color });
      fabricCanvasRef.current?.requestRenderAll();
    }
  };

  // Change font size
  const handleChangeFontSize = (size: number) => {
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set({ fontSize: size });
      fabricCanvasRef.current?.requestRenderAll();
    }
  };

  // Change font family
  const handleFontFamilyChange = (font: string) => {
    const activeObject = fabricCanvasRef.current?.getActiveObject();
    if (activeObject && (activeObject.type === 'i-text' || activeObject.type === 'textbox')) {
      activeObject.set('fontFamily', font);
      setFontFamily(font);
      fabricCanvasRef.current.renderAll();
    }
  };

  // Text alignment
  const handleAlignment = (align: 'left' | 'center' | 'right') => {
    if (selectedObject && selectedObject.type === 'textbox') {
      selectedObject.set({ textAlign: align });
      fabricCanvasRef.current?.requestRenderAll();
    }
  };

  // Center object horizontally on canvas
  const handleCenterHorizontal = () => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.centerObjectH(obj);
    obj.setCoords();
    fabricCanvasRef.current.requestRenderAll();
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
  };

  // Center object vertically on canvas
  const handleCenterVertical = () => {
    const obj = fabricCanvasRef.current?.getActiveObject();
    if (!obj || !fabricCanvasRef.current) return;
    fabricCanvasRef.current.centerObjectV(obj);
    obj.setCoords();
    fabricCanvasRef.current.requestRenderAll();
    const canvasData = fabricCanvasRef.current.toJSON(['animation', 'animationOrder', 'crossOrigin', 'hyperlink', 'soundUrl', 'soundName', 'animationDelay']);
    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
  };

  // Initialize centering guidelines (Smart Guides) with visual guide lines
  const initCenteringGuidelines = (canvas: any) => {
    const snapMargin = 8; // Snap threshold in canvas pixels

    // Track which guides are currently active
    let showVGuide = false;
    let showHGuide = false;

    // Draw guide lines on the upper canvas (overlay) after each render
    canvas.on('after:render', () => {
      if (!showVGuide && !showHGuide) return;
      try {
        const upperCtx = canvas.getSelectionContext();
        if (!upperCtx) return;
        const zoom = canvas.getZoom();
        const w = canvas.getWidth();
        const h = canvas.getHeight();

        upperCtx.save();
        upperCtx.setLineDash([6, 4]);
        upperCtx.lineWidth = 1.5;
        upperCtx.strokeStyle = '#FF2D78'; // Canva-style pink guide

        if (showVGuide) {
          const cx = (w / 2);
          upperCtx.beginPath();
          upperCtx.moveTo(cx, 0);
          upperCtx.lineTo(cx, h);
          upperCtx.stroke();
        }
        if (showHGuide) {
          const cy = (h / 2);
          upperCtx.beginPath();
          upperCtx.moveTo(0, cy);
          upperCtx.lineTo(w, cy);
          upperCtx.stroke();
        }
        upperCtx.restore();
      } catch (err) { /* ignore */ }
    });

    canvas.on('object:moving', (e: any) => {
      const obj = e.target;
      if (!obj) return;

      const canvasWidth = BASE_WIDTH;
      const canvasHeight = BASE_HEIGHT;

      // getBoundingRect(true) returns absolute canvas coords regardless of originX/Y
      // We compute the delta shift needed — never touch originX/originY which would
      // lock the object into a new coordinate system and cause it to get stuck.
      const bb = obj.getBoundingRect(true);
      const currentCenterX = bb.left + bb.width / 2;
      const currentCenterY = bb.top + bb.height / 2;

      const canvasCenterX = canvasWidth / 2;
      const canvasCenterY = canvasHeight / 2;

      showVGuide = false;
      showHGuide = false;

      // Snap to vertical center — shift left by the difference
      if (Math.abs(currentCenterX - canvasCenterX) < snapMargin) {
        obj.left += (canvasCenterX - currentCenterX);
        showVGuide = true;
      }

      // Snap to horizontal center — shift top by the difference
      if (Math.abs(currentCenterY - canvasCenterY) < snapMargin) {
        obj.top += (canvasCenterY - currentCenterY);
        showHGuide = true;
      }

      try { obj.setCoords(); } catch (err) { /* ignore */ }
      canvas.requestRenderAll();
    });

    // Clear guides when object stops moving
    canvas.on('object:modified', () => {
      showVGuide = false;
      showHGuide = false;
      canvas.requestRenderAll();
    });
    canvas.on('mouse:up', () => {
      showVGuide = false;
      showHGuide = false;
      canvas.requestRenderAll();
    });
  };

  // Undo
  const handleUndo = useCallback(() => {
    if (history.length > 1 && fabricCanvasRef.current) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      const previousState = newHistory[newHistory.length - 1];
      
      const reviver = (object: any) => {
        if (object.type === 'image') {
          object.crossOrigin = 'anonymous';
        }
        // FIX: Correct invalid textBaseline values for text objects
        if (object.type && (object.type === 'textbox' || object.type === 'text' || object.type === 'i-text')) {
          const validBaselines = ['top', 'hanging', 'middle', 'alphabetic', 'ideographic', 'bottom'];
          if (object.textBaseline && !validBaselines.includes(object.textBaseline)) {
            console.warn(`Invalid textBaseline '${object.textBaseline}' corrected to 'alphabetic'`);
            object.textBaseline = 'alphabetic';
          }
        }
        return object;
      };
      
      fabricCanvasRef.current.loadFromJSON(JSON.parse(previousState), () => {
        setTimeout(() => {
          fabricCanvasRef.current?.renderAll();
        }, 0);
      }, reviver);
    }
  }, [history]);

  // Handle zoom controls
  const handleZoomIn = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(canvasZoom * 1.2, 3);
    
    // Update canvas dimensions to prevent clipping
    fabricCanvasRef.current.setDimensions({ width: BASE_WIDTH * newZoom, height: BASE_HEIGHT * newZoom });
    fabricCanvasRef.current.setZoom(newZoom);
    
    setCanvasZoom(newZoom);
    onZoomChange?.(newZoom);
    fabricCanvasRef.current.requestRenderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(canvasZoom / 1.2, 0.5);
    
    // Update canvas dimensions to prevent clipping
    fabricCanvasRef.current.setDimensions({ width: BASE_WIDTH * newZoom, height: BASE_HEIGHT * newZoom });
    fabricCanvasRef.current.setZoom(newZoom);
    
    setCanvasZoom(newZoom);
    onZoomChange?.(newZoom);
    fabricCanvasRef.current.requestRenderAll();
  };

  const handleFitToScreen = () => {
    if (!fabricCanvasRef.current) return;
    const newZoom = calculateResponsiveZoom();
    
    // Update canvas dimensions to prevent clipping
    fabricCanvasRef.current.setDimensions({ width: BASE_WIDTH * newZoom, height: BASE_HEIGHT * newZoom });
    fabricCanvasRef.current.setZoom(newZoom);
    
    setCanvasZoom(newZoom);
    onZoomChange?.(newZoom);
    fabricCanvasRef.current.requestRenderAll();
  };

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!isReady || !fabricCanvasRef.current || readOnly) return; // Don't bind shortcuts in readOnly mode

    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !canvas.renderAll) return; // More robust check

      // Delete key
      if (e.key === 'Delete' && selectedObject) {
        e.preventDefault();
        try {
          canvas.remove(selectedObject);
          canvas.renderAll();
          setSelectedObject(null);
        } catch (err) {
          console.warn('Error deleting object:', err);
        }
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl/Cmd + C: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedObject && !(selectedObject as any).isEditing) {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Arrow keys: Move selected object (1px or 10px with shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedObject && !(selectedObject as any).isEditing) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const obj = selectedObject as any;

        switch (e.key) {
          case 'ArrowUp':
            obj.top = obj.top - step;
            break;
          case 'ArrowDown':
            obj.top = obj.top + step;
            break;
          case 'ArrowLeft':
            obj.left = obj.left - step;
            break;
          case 'ArrowRight':
            obj.left = obj.left + step;
            break;
        }

        try {
          canvas.requestRenderAll();
        } catch (err) {
          console.warn('Error rendering after arrow key:', err);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, selectedObject, readOnly, handleUndo, handleDuplicate]);

  // Setup paste event listener (Ctrl+V for images)
  useEffect(() => {
    if (!isReady || readOnly) return;

    const handlePaste = createPasteHandler({
      fabricCanvasRef,
      isReady,
      readOnly,
      slideId,
      onImageUploaded,
      updateSlide,
      sanitizeCanvasData,
      fabric,
    });

    window.addEventListener('paste', handlePaste as any);

    return () => {
      window.removeEventListener('paste', handlePaste as any);
    };
  }, [isReady, readOnly, slideId, onImageUploaded, updateSlide]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center w-full h-96">
        <div className="text-center">
          <p className="text-gray-600 font-medium">Đang tải editor...</p>
        </div>
      </div>
    );
  }

  // Handle drag/drop for images
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly) return;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || !fabricCanvasRef.current || !fabric) return;

    // Validate canvas before processing drop
    if (fabricCanvasRef.current.disposed || !fabricCanvasRef.current.getContext()) {
      console.error('[handleDrop] Canvas not valid for drop operation');
      return;
    }

    const files = e.dataTransfer.files;
    if (!files.length) return;

    // Process each dropped image file
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        // Check canvas validity before processing loaded image
        if (!fabricCanvasRef.current || fabricCanvasRef.current.disposed || !fabricCanvasRef.current.getContext()) {
          console.warn('[handleDrop] Canvas became invalid during file read');
          return;
        }

        const imgUrl = event.target?.result as string;

        fabric.Image.fromURL(
          imgUrl,
          (img: any) => {
            if (!img || !fabricCanvasRef.current) return;

            // Canvas validation check before processing image
            if (fabricCanvasRef.current.disposed) {
              console.warn('[handleDrop] Canvas disposed before image processing');
              return;
            }

            const ctx = fabricCanvasRef.current.getContext();
            if (!ctx) {
              console.error('[handleDrop] Canvas context lost during image processing');
              return;
            }

            try {
              const maxWidth = 400;
              const maxHeight = 300;

              const imgW = img.width || 100;
              const imgH = img.height || 100;

              let scaleRatio = 1;
              if (imgW > maxWidth || imgH > maxHeight) {
                scaleRatio = Math.min(maxWidth / imgW, maxHeight / imgH);
              }

              if (isNaN(scaleRatio) || !isFinite(scaleRatio)) {
                scaleRatio = 1;
              }

              // Get drop position or canvas center
              const rect = canvasRef.current?.getBoundingClientRect();
              let center = { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 };
              
              if (rect && fabricCanvasRef.current) {
                const dropX = (e.clientX - rect.left) / canvasZoom;
                const dropY = (e.clientY - rect.top) / canvasZoom;
                if (!isNaN(dropX) && !isNaN(dropY)) {
                  center = { x: dropX, y: dropY };
                }
              }

              const left = center.x - (imgW * scaleRatio) / 2;
              const top = center.y - (imgH * scaleRatio) / 2;

              img.set({
                left: isNaN(left) ? BASE_WIDTH / 2 : left,
                top: isNaN(top) ? BASE_HEIGHT / 2 : top,
                scaleX: scaleRatio,
                scaleY: scaleRatio,
              });

              fabricCanvasRef.current.add(img);
              fabricCanvasRef.current.setActiveObject(img);

              setTimeout(() => {
                if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
                  const ctx = fabricCanvasRef.current.getContext();
                  if (ctx) {
                    // Call setCoords() for dropped image as well
                    try {
                      img.setCoords();
                    } catch (err) {
                      console.warn('Error setting image coordinates:', err);
                    }
                    fabricCanvasRef.current.requestRenderAll();
                  }
                }
              }, 50);

              // Save after image is added - with context check
              setTimeout(() => {
                if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed && fabricCanvasRef.current.getContext()) {
                  const canvasData = fabricCanvasRef.current.toJSON();
                  if (canvasData) {
                    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
                  }
                }
              }, 150);
            } catch (err) {
              console.error('Lỗi khi thêm ảnh từ drag/drop:', err);
            }
          },
          { crossOrigin: 'anonymous' },
          (err: any) => {
            console.error('Error loading dropped image:', err);
          }
        );
      };

      reader.onerror = () => {
        console.error('Error reading dropped file');
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center bg-gray-900"
      style={{ cursor: isPanning ? 'grabbing' : 'auto' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Canvas Container */}
      <div className="relative shadow-2xl rounded-lg" style={{
        width: `${BASE_WIDTH * canvasZoom}px`,
        height: `${BASE_HEIGHT * canvasZoom}px`,
        backgroundColor: slide?.backgroundColor || '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <canvas 
          ref={canvasRef} 
          className="block"
          style={{ display: 'block' }}
        />

        {/* ── LaTeX HTML overlays (edit + readOnly) ────────────────────
            Fabric.js renders to <canvas> (bitmap) and cannot display KaTeX.
            We hide matching Fabric text objects (opacity=0) and render HTML
            <div> overlays positioned exactly over them using KaTeX instead.
            In edit mode: clicking an overlay reveals the raw Fabric textbox
            for editing; on deselect it re-hides and the overlay reappears.  */}
        {latexOverlays.map((ov) => {
          // Hide overlay while user is actively editing this textbox
          if (ov.id === editingLatexId) return null;

          // Convert canvas-unit → rendered pixel coordinates
          const pxLeft   = ov.left   * canvasZoom;
          const pxTop    = ov.top    * canvasZoom;
          const pxWidth  = ov.width  * canvasZoom;
          const pxFontSz = ov.fontSize * canvasZoom;

          return (
            <div
              key={ov.id}
              data-latex-id={ov.id}
              // In edit mode: click overlay → select underlying Fabric object
              onClick={!readOnly ? () => {
                const c = fabricCanvasRef.current;
                if (!c) return;
                const objs = c.getObjects();
                const target = objs.find((o: any) => o.__latexId === ov.id);
                if (target) {
                  c.setActiveObject(target);
                  c.requestRenderAll();
                }
              } : undefined}
              className="absolute"
              style={{
                left:           pxLeft,
                top:            pxTop,
                width:          pxWidth,
                minHeight:      ov.height * canvasZoom,
                fontSize:       pxFontSz,
                color:          ov.fill,
                fontWeight:     ov.fontWeight,
                fontStyle:      ov.fontStyle,
                fontFamily:     ov.fontFamily,
                textAlign:      ov.textAlign as React.CSSProperties['textAlign'],
                transform:      ov.angle ? `rotate(${ov.angle}deg)` : undefined,
                transformOrigin:'top left',
                lineHeight:     1.3,
                wordBreak:      'break-word',
                whiteSpace:     'pre-wrap',
                overflow:       'visible',
                zIndex:         10,
                // In edit mode show a subtle selection ring so user knows it's clickable
                cursor:         readOnly ? 'default' : 'text',
                outline:        (!readOnly && selectedObject === null) ? '1px dashed rgba(99,102,241,0.3)' : 'none',
                pointerEvents:  readOnly ? 'none' : 'auto',
              }}
            >
              <LaTeXRenderer content={ov.text} className="leading-relaxed" />
            </div>
          );
        })}
      </div>

      {/* Only show toolbars when NOT in readOnly mode */}
      {!readOnly && (
        <>
          {/* Object Size/Position Info - Top Center when object selected */}
      {selectedObject && !readOnly && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-3 bg-black/70 text-white text-xs rounded-full px-4 py-1.5 z-50 pointer-events-none font-mono">
          <span>W: {Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}px</span>
          <span className="opacity-40">|</span>
          <span>H: {Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}px</span>
          <span className="opacity-40">|</span>
          <span>X: {Math.round(selectedObject.left || 0)}</span>
          <span className="opacity-40">|</span>
          <span>Y: {Math.round(selectedObject.top || 0)}</span>
        </div>
      )}

      {/* Floating Toolbar - Left Side */}
          <div className="absolute left-6 top-4 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200 z-40 overflow-y-auto" style={{ maxHeight: 'calc(100% - 2rem)' }}>
        <button
          onClick={handleAddText}
          className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          title="Thêm văn bản (T)"
        >
          <Type size={18} />
        </button>

        <label className="flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded hover:bg-green-700 transition cursor-pointer">
          <ImageIcon size={18} />
          <input
            type="file"
            accept="image/*"
            onChange={handleAddImage}
            className="hidden"
            title="Thêm ảnh"
          />
        </label>

        {/* Shapes Button */}
        <button
          onClick={() => setShowShapePanel(prev => !prev)}
          className={`flex items-center justify-center w-10 h-10 rounded transition text-white ${showShapePanel ? 'bg-pink-700' : 'bg-pink-500 hover:bg-pink-600'}`}
          title="Thêm hình học"
        >
          <Shapes size={18} />
        </button>

        {/* Quiz Button */}
        <button
          onClick={() => onAddQuiz?.()}
          className="flex items-center justify-center w-10 h-10 bg-violet-600 text-white rounded hover:bg-violet-700 transition"
          title="Tạo / Hiện Quiz trên slide (💡)"
        >
          <Lightbulb size={18} />
        </button>

        <hr className="my-1" />

        <button
          onClick={handleDelete}
          disabled={!selectedObject}
          className="flex items-center justify-center w-10 h-10 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Xóa (Delete)"
        >
          <Trash2 size={18} />
        </button>

        <button
          onClick={handleDuplicate}
          disabled={!selectedObject}
          className="flex items-center justify-center w-10 h-10 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Sao chép (Ctrl+C)"
        >
          <Copy size={18} />
        </button>

        <button
          onClick={handleUndo}
          disabled={history.length <= 1}
          className="flex items-center justify-center w-10 h-10 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Hoàn tác (Ctrl+Z)"
        >
          <RotateCcw size={18} />
        </button>

        <hr className="my-1" />

        {/* Center alignment buttons */}
        <button
          onClick={handleCenterHorizontal}
          disabled={!selectedObject}
          className="flex items-center justify-center w-10 h-10 bg-sky-600 text-white rounded hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Căn giữa ngang ↔"
        >
          <AlignCenter size={18} />
        </button>

        <button
          onClick={handleCenterVertical}
          disabled={!selectedObject}
          className="flex items-center justify-center w-10 h-10 bg-sky-600 text-white rounded hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          title="Căn giữa dọc ↕"
          style={{ fontSize: 11 }}
        >
          <AlignCenter size={18} style={{ transform: 'rotate(90deg)' }} />
        </button>

        <hr className="my-1" />

        <button
          onClick={handleDownload}
          className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          title="Tải xuống"
        >
          <Download size={18} />
        </button>

        {/* Hyperlink button — only active when an object is selected */}
        <button
          onClick={handleOpenHyperlink}
          disabled={!selectedObject}
          className={`flex items-center justify-center w-10 h-10 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedHyperlink
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={selectedHyperlink ? `Liên kết: ${selectedHyperlink}` : 'Thêm liên kết'}
        >
          <Link2 size={18} />
        </button>

        <hr className="my-1" />

        <label className="flex items-center justify-center w-10 h-10 bg-orange-600 text-white rounded hover:bg-orange-700 transition cursor-pointer"
          title="Thêm nhạc"
        >
          <Music size={18} />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
        </label>

        {audioUrl && (
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-10 h-10 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
            title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
      </div>

      {/* Zoom Controls - Right Side */}
      <div className="absolute right-6 top-20 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2 border border-gray-200 z-40">
        <button
          onClick={handleZoomIn}
          className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          title="Phóng to"
        >
          <ZoomIn size={18} />
        </button>

        <button
          onClick={handleZoomOut}
          className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          title="Thu nhỏ"
        >
          <ZoomOut size={18} />
        </button>

        <button
          onClick={handleFitToScreen}
          className="flex items-center justify-center w-10 h-10 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          title="Vừa màn hình"
        >
          <Maximize2 size={18} />
        </button>

        <span className="text-center text-xs text-gray-600 font-medium px-2 py-1">
          {Math.round(canvasZoom * 100)}%
        </span>
      </div>


      {/* Shape Panel - Top Center (floating, like text toolbar) */}
      {showShapePanel && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-3">
          <div className="flex items-center gap-4">
            {/* 8 shapes in a row */}
            {[
              { type: 'rect',         label: 'Chữ nhật',  svg: <rect x="2" y="6" width="28" height="20" rx="0" fill="#4a90e2"/> },
              { type: 'rect-rounded', label: 'Bo góc',    svg: <rect x="2" y="6" width="28" height="20" rx="7" fill="#7ed321"/> },
              { type: 'circle',       label: 'Tròn',      svg: <circle cx="16" cy="16" r="13" fill="#e94560"/> },
              { type: 'triangle',     label: 'Tam giác',  svg: <polygon points="16,3 30,29 2,29" fill="#f5a623"/> },
              { type: 'diamond',      label: 'Kim cương', svg: <polygon points="16,2 30,16 16,30 2,16" fill="#9b59b6"/> },
              { type: 'star',         label: 'Ngôi sao',  svg: <polygon points="16,2 19,11 29,11 21,17 24,27 16,21 8,27 11,17 3,11 13,11" fill="#fdcb6e"/> },
              { type: 'arrow',        label: 'Mũi tên',   svg: <polygon points="2,12 20,12 20,6 30,16 20,26 20,20 2,20" fill="#00cec9"/> },
              { type: 'line',         label: 'Đường',     svg: <line x1="3" y1="16" x2="29" y2="16" stroke="#2d3436" strokeWidth="3"/> },
            ].map(({ type, label, svg }) => (
              <button
                key={type}
                onClick={() => handleAddShape(type)}
                title={label}
                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition group"
              >
                <svg width="32" height="32" viewBox="0 0 32 32">{svg}</svg>
                <span className="text-[9px] text-gray-500 group-hover:text-gray-700">{label}</span>
              </button>
            ))}

            <div className="w-px h-10 bg-gray-200 mx-1" />

            {/* Checkbox: text inside shape */}
            <button
              onClick={() => setShapeWithText(v => !v)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition group"
              title="Thêm chữ trong hình"
            >
              <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${shapeWithText ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                {shapeWithText && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="1,6 4,10 11,2" stroke="white" strokeWidth="2" fill="none"/></svg>}
              </div>
              <span className="text-[9px] text-gray-500 group-hover:text-gray-700 whitespace-nowrap">+ Chữ</span>
            </button>
          </div>
        </div>
      )}

      {/* Shape Toolbar - Top Center (when shape selected) */}
      {selectedObject && ['rect','circle','triangle','polygon','ellipse','path'].includes(selectedObject.type) && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-xl shadow-xl border border-gray-200 px-3 py-1.5 z-50">
          {/* Fill color */}
          <span className="text-xs text-gray-500 font-medium">Màu nền</span>
          <label
            className="w-7 h-7 rounded-md border-2 border-gray-300 cursor-pointer hover:border-gray-500 transition flex-shrink-0"
            style={{ backgroundColor: shapeColor }}
            title="Đổi màu nền hình"
          >
            <input
              type="color"
              value={shapeColor}
              onChange={(e) => handleChangeShapeFill(e.target.value)}
              className="opacity-0 w-0 h-0 absolute"
            />
          </label>

          <div className="w-px h-5 bg-gray-200" />

          {/* Border color */}
          <span className="text-xs text-gray-500 font-medium">Viền</span>
          <label
            className="w-7 h-7 rounded-md border-2 border-gray-300 cursor-pointer hover:border-gray-500 transition flex-shrink-0"
            style={{ backgroundColor: shapeBorderColor || '#ffffff', outline: shapeBorderColor ? 'none' : '1px dashed #ccc' }}
            title="Đổi màu viền"
          >
            <input
              type="color"
              value={shapeBorderColor || '#000000'}
              onChange={(e) => handleChangeShapeStroke(e.target.value)}
              className="opacity-0 w-0 h-0 absolute"
            />
          </label>

          {/* Border width */}
          <div className="flex items-center gap-1">
            <button onClick={() => handleChangeShapeStrokeWidth(Math.max(0, shapeBorderWidth - 1))} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded text-sm font-bold">−</button>
            <span className="text-xs font-semibold text-gray-700 w-4 text-center">{shapeBorderWidth}</span>
            <button onClick={() => handleChangeShapeStrokeWidth(Math.min(20, shapeBorderWidth + 1))} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded text-sm font-bold">+</button>
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Opacity */}
          <span className="text-xs text-gray-500 font-medium">Mờ</span>
          <input
            type="range" min="0" max="100"
            value={Math.round((selectedObject.opacity ?? 1) * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              selectedObject.set({ opacity: v });
              fabricCanvasRef.current?.renderAll();
            }}
            className="w-20 accent-pink-500"
          />
          <span className="text-xs text-gray-600 w-7">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>

          <div className="w-px h-5 bg-gray-200" />

          {/* Timing delay */}
          <Clock size={13} className="text-gray-400" />
          <input
            type="number" min="0" max="10000" step="100"
            value={objectDelay}
            onChange={(e) => handleSetObjectDelay(Number(e.target.value))}
            className="w-14 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded outline-none focus:border-blue-400"
            title="Trễ trước khi hiện (ms)"
          />
          <span className="text-[10px] text-gray-400">ms</span>

          <div className="w-px h-5 bg-gray-200" />

          {/* Per-object sound */}
          {objectSoundUrl ? (
            <div className="flex items-center gap-1">
              <Volume2 size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-[10px] text-gray-600 max-w-[60px] truncate" title={objectSoundName}>{objectSoundName}</span>
              <button onClick={handleRemoveObjectSound} className="text-red-400 hover:text-red-600 transition" title="Xóa âm thanh"><X size={12} /></button>
            </div>
          ) : (
            <label className="flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 transition" title="Gắn âm thanh khi đối tượng xuất hiện">
              <VolumeX size={14} className="text-gray-400" />
              <span className="text-[10px] text-gray-500">Âm thanh</span>
              <input type="file" accept="audio/*" onChange={handleSetObjectSound} className="hidden" />
            </label>
          )}
        </div>
      )}

      {/* Text Toolbar - Top Center (Canva style) */}
      {selectedObject && selectedObject.type === 'textbox' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-xl shadow-xl border border-gray-200 px-2 py-1.5 z-50">
          {/* Font family */}
          <select
            className="text-xs border-0 outline-none text-gray-700 bg-transparent cursor-pointer font-medium pr-1 max-w-[110px]"
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            value={fontFamily}
            title="Phông chữ"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </select>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Font size */}
          <button onClick={() => { setFontSize(s => Math.max(8, s - 1)); handleChangeFontSize(Math.max(8, fontSize - 1)); }} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded text-sm font-bold">−</button>
          <input
            type="number"
            min="8"
            max="200"
            value={fontSize}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFontSize(v);
              handleChangeFontSize(v);
            }}
            className="w-9 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded outline-none focus:border-blue-400"
          />
          <button onClick={() => { setFontSize(s => Math.min(200, s + 1)); handleChangeFontSize(Math.min(200, fontSize + 1)); }} className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded text-sm font-bold">+</button>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Color */}
          <label className="w-6 h-6 rounded border-2 border-gray-300 cursor-pointer flex-shrink-0 hover:border-gray-500 transition" style={{ backgroundColor: textColor }} title="Màu chữ">
            <input
              type="color"
              value={textColor}
              onChange={(e) => { setTextColor(e.target.value); handleChangeTextColor(e.target.value); }}
              className="opacity-0 w-0 h-0 absolute"
            />
          </label>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Alignment */}
          <button onClick={() => handleAlignment('left')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition text-gray-600" title="Căn trái"><AlignLeft size={14} /></button>
          <button onClick={() => handleAlignment('center')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition text-gray-600" title="Căn giữa"><AlignCenter size={14} /></button>
          <button onClick={() => handleAlignment('right')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition text-gray-600" title="Căn phải"><AlignRight size={14} /></button>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Timing delay */}
          <Clock size={13} className="text-gray-400" />
          <input
            type="number" min="0" max="10000" step="100"
            value={objectDelay}
            onChange={(e) => handleSetObjectDelay(Number(e.target.value))}
            className="w-14 text-center text-xs font-semibold text-gray-800 border border-gray-200 rounded outline-none focus:border-blue-400"
            title="Trễ trước khi hiện (ms)"
          />
          <span className="text-[10px] text-gray-400">ms</span>

          <div className="w-px h-5 bg-gray-200 mx-0.5" />

          {/* Per-object sound */}
          {objectSoundUrl ? (
            <div className="flex items-center gap-1">
              <Volume2 size={14} className="text-green-600 flex-shrink-0" />
              <span className="text-[10px] text-gray-600 max-w-[60px] truncate" title={objectSoundName}>{objectSoundName}</span>
              <button onClick={handleRemoveObjectSound} className="text-red-400 hover:text-red-600 transition" title="Xóa âm thanh"><X size={12} /></button>
            </div>
          ) : (
            <label className="flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded hover:bg-gray-100 transition" title="Gắn âm thanh khi đối tượng xuất hiện">
              <VolumeX size={14} className="text-gray-400" />
              <span className="text-[10px] text-gray-500">Âm thanh</span>
              <input ref={objectSoundInputRef} type="file" accept="audio/*" onChange={handleSetObjectSound} className="hidden" />
            </label>
          )}
        </div>
      )}

      {/* Hint Text */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-gray-500 text-xs pointer-events-none">
        <p>Cuộn chuột để zoom • Delete để xóa • Ctrl+Z để hoàn tác • Mũi tên để di chuyển</p>
      </div>

      {/* Hyperlink Input Panel */}
      {showHyperlinkInput && selectedObject && (
        <div className="absolute left-20 top-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Link2 size={16} />
              <span className="font-semibold text-sm">
                {selectedHyperlink ? 'Chỉnh sửa liên kết' : 'Thêm liên kết'}
              </span>
            </div>
            <button
              onClick={() => setShowHyperlinkInput(false)}
              className="p-1 rounded hover:bg-gray-100 transition text-gray-500"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-200 bg-white transition mb-3">
            <Link2 size={14} className="text-gray-400 shrink-0" />
            <input
              ref={hyperlinkInputRef}
              type="url"
              value={hyperlinkDraft}
              onChange={(e) => setHyperlinkDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveHyperlink();
                if (e.key === 'Escape') setShowHyperlinkInput(false);
              }}
              placeholder="https://example.com"
              className="flex-1 outline-none text-sm text-gray-800 bg-transparent"
            />
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Học sinh sẽ được mở liên kết khi click vào đối tượng này.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleSaveHyperlink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Lưu liên kết
            </button>
            {selectedHyperlink && (
              <button
                onClick={handleRemoveHyperlink}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                title="Xóa liên kết"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {selectedHyperlink && (
            <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
              <Link2 size={12} className="text-blue-400 shrink-0" />
              <a
                href={selectedHyperlink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 truncate hover:underline"
              >
                {selectedHyperlink}
              </a>
            </div>
          )}
        </div>
      )}
        </>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
  }
);

CanvasEditorPro.displayName = 'CanvasEditorPro';

export default CanvasEditorPro;