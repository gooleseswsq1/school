/**
 * Canvas Paste Handler
 * Handles Ctrl+V paste image functionality for Fabric.js canvas
 */

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 810;

export const createPasteHandler = ({
  fabricCanvasRef,
  isReady,
  readOnly,
  slideId,
  onImageUploaded,
  updateSlide,
  sanitizeCanvasData,
  fabric,
}: {
  fabricCanvasRef: any;
  isReady: boolean;
  readOnly?: boolean;
  slideId: string;
  onImageUploaded?: (url: string, options?: { source?: 'upload' | 'background' | 'paste' }) => void;
  updateSlide: (id: string, data: any) => void;
  sanitizeCanvasData: (data: any) => any;
  fabric: any;
}) => {
  return async (e: ClipboardEvent) => {
    if (readOnly || !isReady || !fabricCanvasRef.current || !fabric) return;
    
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      
      // Only process images
      if (!item.type.startsWith('image/')) continue;

      e.preventDefault();
      
      const blob = item.getAsFile();
      if (!blob) continue;

      // Validate file size (5MB max)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (blob.size > MAX_FILE_SIZE) {
        alert('Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.');
        continue;
      }

      // Validate canvas
      if (!fabricCanvasRef.current || fabricCanvasRef.current.disposed || !fabricCanvasRef.current.getContext()) {
        console.error('[handlePaste] Canvas not valid');
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        // Validate canvas again
        if (!fabricCanvasRef.current || fabricCanvasRef.current.disposed || !fabricCanvasRef.current.getContext()) {
          console.warn('[handlePaste] Canvas became invalid during file read');
          return;
        }

        const imgUrl = event.target?.result as string;
        
        // Notify parent
        onImageUploaded?.(imgUrl, { source: 'paste' });

        // Load image
        fabric.Image.fromURL(
          imgUrl,
          (img: any) => {
            if (!img || !fabricCanvasRef.current) return;

            if (fabricCanvasRef.current.disposed) {
              console.warn('[handlePaste] Canvas disposed during image processing');
              return;
            }

            const ctx = fabricCanvasRef.current.getContext();
            if (!ctx) {
              console.error('[handlePaste] Canvas context lost');
              return;
            }

            try {
              const maxWidth = 400;
              const maxHeight = 300;

              const imgW = img.width || img.naturalWidth || 100;
              const imgH = img.height || img.naturalHeight || 100;

              let scaleRatio = 1;
              if (imgW > maxWidth || imgH > maxHeight) {
                scaleRatio = Math.min(maxWidth / imgW, maxHeight / imgH);
              }

              if (isNaN(scaleRatio) || !isFinite(scaleRatio)) {
                scaleRatio = 1;
              }

              // Center on canvas
              let center = { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2 };
              if (fabricCanvasRef.current?.getVpCenter) {
                try {
                  const vpCenter = fabricCanvasRef.current.getVpCenter();
                  if (vpCenter && !isNaN(vpCenter.x) && !isNaN(vpCenter.y)) {
                    center = vpCenter;
                  }
                } catch (e) {
                  console.warn('[handlePaste] getVpCenter failed');
                }
              }

              const left = center.x - (imgW * scaleRatio) / 2;
              const top = center.y - (imgH * scaleRatio) / 2;

              img.set({
                left: isNaN(left) ? BASE_WIDTH / 2 : left,
                top: isNaN(top) ? BASE_HEIGHT / 2 : top,
                originX: 'center',
                originY: 'center',
                scaleX: scaleRatio,
                scaleY: scaleRatio,
              });

              if (!fabricCanvasRef.current.getContext()) {
                console.error('[handlePaste] Canvas context lost before adding image');
                return;
              }

              img.setCoords();
              fabricCanvasRef.current.add(img);
              fabricCanvasRef.current.setActiveObject(img);
              
              setTimeout(() => {
                if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
                  const ctx = fabricCanvasRef.current.getContext();
                  if (ctx) {
                    fabricCanvasRef.current.requestRenderAll();
                    console.log('[handlePaste] Image pasted successfully');
                  }
                }
              }, 50);

              // Save state
              setTimeout(() => {
                if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed && fabricCanvasRef.current.getContext()) {
                  const canvasData = fabricCanvasRef.current.toJSON();
                  if (canvasData) {
                    updateSlide(slideId, { canvasData: sanitizeCanvasData(canvasData) });
                  }
                }
              }, 150);
            } catch (err) {
              console.error('[handlePaste] Error:', err);
            }
          },
          { crossOrigin: 'anonymous' },
          (err: any) => {
            console.error('[handlePaste] Image load error:', err);
          }
        );
      };

      reader.onerror = () => {
        console.error('[handlePaste] File read error');
      };

      reader.readAsDataURL(blob);
    }
  };
};
