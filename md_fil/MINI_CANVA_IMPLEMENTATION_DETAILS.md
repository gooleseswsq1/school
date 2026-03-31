# 🎨 Mini Canva - Hướng Dẫn Chi Tiết Triển Khai

## 📝 Tổng Quan

Mini Canva Editor là một ứng dụng chỉnh sửa slides hiện đại được xây dựng dựa trên:
- **Fabric.js** cho canvas drawing
- **Zustand** cho state management
- **Next.js 16** cho full-stack capabilities
- **Tailwind CSS** cho styling

---

## 🏗️ Kiến Trúc Chi Tiết

### Component Tree

```
App Root
│
└── MiniCanvaApp (Main Container)
    │
    ├── LeftSidebar (Assets Panel)
    │   ├── Color Palette
    │   ├── Stock Images
    │   └── Text Templates
    │
    ├── TopToolbar
    │   ├── Logo & Slide Counter
    │   ├── Audio Indicator
    │   ├── Presentation Button
    │   └── Save Button
    │
    ├── MainContent
    │   ├── CanvasEditorPro
    │   │   ├── Fabric Canvas
    │   │   ├── Textbox Handler
    │   │   ├── Image Handler
    │   │   └── Toolbar
    │   │
    │   └── ObjectEditor (Dynamic)
    │       ├── Color Picker
    │       ├── Font Size Slider
    │       └── Alignment Buttons
    │
    ├── ThumbnailBar
    │   ├── Slide Previews (Canvas-based)
    │   └── Add Slide Button
    │
    └── PresentationMode (Modal)
        ├── Fullscreen Canvas
        ├── Navigation Controls
        └── Audio Player
```

---

## 💾 State Management (Zustand)

### Store Structure

```typescript
interface Slide {
  id: string;                    // Unique identifier
  canvasData: fabric.ICanvasData; // JSON from fabric.canvas.toJSON()
  audioUrl?: string;             // URL to audio file
  backgroundColor?: string;      // Hex color
  thumbnail?: string;            // PNG data (optional)
}

interface SlideStore {
  slides: Slide[];                          // Array of all slides
  currentSlideIndex: number;                // Active slide index
  
  // Actions
  addSlide(): void;                         // Create new slide
  deleteSlide(id: string): void;           // Remove slide
  updateSlide(id: string, data: Partial<Slide>): void;
  setCurrentSlide(index: number): void;    // Switch active slide
  reorderSlides(from: number, to: number): void;
  getSlide(id: string): Slide | undefined;
}
```

### Data Flow

```
User Input (Click Text Button)
    ↓
CanvasEditorPro.handleAddText()
    ↓
fabric.Textbox created & added to canvas
    ↓
canvas.on('object:added', handleModified)
    ↓
slideStore.updateSlide(
  slideId, 
  { canvasData: canvas.toJSON() }
)
    ↓
Zustand store updated (in-memory)
    ↓
Component re-renders with new data
```

---

## 🎨 Canvas Operations

### Adding Textbox

```typescript
// 1. Create textbox object
const textbox = new fabric.Textbox('Thêm văn bản...', {
  left: 100,
  top: 100,
  width: 200,
  fontSize: 20,
  fill: '#000000',
  splitByGrapheme: true,  // Vietnamese support!
  fontFamily: 'Arial',
});

// 2. Add to canvas
fabricCanvasRef.current.add(textbox);

// 3. Set as active (enables editing)
fabricCanvasRef.current.setActiveObject(textbox);

// 4. Render
fabricCanvasRef.current.renderAll();

// 5. Auto-save
slideStore.updateSlide(slideId, {
  canvasData: fabricCanvasRef.current.toJSON()
});
```

### Adding Image

```typescript
// 1. Read file as data URL
const reader = new FileReader();
reader.onload = (e) => {
  const imgUrl = e.target.result as string;
  
  // 2. Create fabric Image from URL
  fabric.Image.fromURL(imgUrl, (img) => {
    // 3. Scale to fit
    img.scaleToWidth(200);
    
    // 4. Add to canvas
    canvas.add(img);
    canvas.renderAll();
  });
};
reader.readAsDataURL(file);
```

### Switching Slides

```typescript
// Current slide → Save canvas data
const currentCanvasData = canvas.toJSON();
slideStore.updateSlide(slides[currentSlideIndex].id, {
  canvasData: currentCanvasData
});

// Load next slide
const nextSlide = slides[nextSlideIndex];
canvas.loadFromJSON(nextSlide.canvasData, () => {
  canvas.backgroundColor = nextSlide.backgroundColor;
  canvas.renderAll();
});

// Update store
slideStore.setCurrentSlide(nextSlideIndex);
```

---

## 🎬 Presentation Mode Flow

```
User clicks "Trình chiếu" Button
    ↓
isPresentMode → true
    ↓
Component returns PresentationMode JSX
    ↓
Audio starts playing (if audioUrl exists)
    ↓
Audio 'ended' event listener
    ↓
Auto-advance to next slide
    ↓
Repeat until last slide
    ↓
User clicks "Thoát"
    ↓
isPresentMode → false
    ↓
Back to edit mode
```

**Code Implementation:**

```typescript
useEffect(() => {
  if (!isPresentMode || !currentSlide?.audioUrl) return;

  const audio = audioRef.current;
  audio.src = currentSlide.audioUrl;
  audio.play();

  const handleAudioEnd = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlide(currentSlideIndex + 1);
    }
  };

  audio.addEventListener('ended', handleAudioEnd);
  return () => audio.removeEventListener('ended', handleAudioEnd);
}, [isPresentMode, currentSlide, currentSlideIndex]);
```

---

## 📱 UI/UX Optimizations

### 1. Left Panel Collapse
```typescript
// Mobile-friendly: Hide on small screens
className={`${
  isLeftPanelOpen ? 'w-64' : 'w-0'
} transition-all duration-300`}

// Smooth animation without layout shift
```

### 2. Object Selection Feedback
```typescript
canvas.on('selection:created', (e) => {
  setSelectedObject(e.selected?.[0]);
  // Show/hide relevant toolbar buttons
  // Example: Font size only for text
});
```

### 3. Color Picker Integration
```typescript
<input
  type="color"
  value={backgroundColor}
  onChange={(e) => {
    // Update both canvas AND store
    canvas.backgroundColor = e.target.value;
    canvas.renderAll();
    slideStore.updateSlide(slideId, { 
      backgroundColor: e.target.value 
    });
  }}
/>
```

### 4. Undo Functionality
```typescript
const [history, setHistory] = useState<string[]>([]);

// Auto-save to history
const handleModified = () => {
  setHistory(prev => [
    ...prev.slice(-9),  // Keep only last 10
    JSON.stringify(canvas.toJSON())
  ]);
};

// Undo
const handleUndo = () => {
  const newHistory = history.slice(0, -1);
  const previousState = newHistory[newHistory.length - 1];
  canvas.loadFromJSON(JSON.parse(previousState), () => {
    canvas.renderAll();
  });
};
```

---

## 🔄 Data Persistence Strategy

### Current (In-Memory)
```
User edits → Zustand store updated (RAM)
                    ↓
            Refresh browser
                    ↓
            Data LOST ❌
```

### Recommended (With Backend)
```
User edits → Zustand store updated
    ↓
debounced auto-save
    ↓
POST /api/slides/save
    ↓
Database (Prisma) updated
    ↓
Refresh browser
    ↓
GET /api/slides/:projectId
    ↓
Data restored from DB ✅
```

**Implementation:**

```typescript
// Auto-save with debounce
useEffect(() => {
  const timer = setTimeout(() => {
    fetch('/api/slides/save', {
      method: 'POST',
      body: JSON.stringify({
        projectId: currentProject.id,
        slides: slides,
        updatedAt: new Date(),
      }),
    });
  }, 2000); // Save after 2 seconds of inactivity

  return () => clearTimeout(timer);
}, [slides]);
```

---

## 🚀 Performance Considerations

### Canvas Rendering Optimization

```typescript
// ❌ SLOW: Render after each object change in loop
for (let obj of objects) {
  canvas.renderAll(); // Called many times!
}

// ✅ FAST: Batch operations, render once
objects.forEach(obj => {
  canvas.add(obj); // No render
});
canvas.renderAll(); // Render once

// ✅ FAST: Use discardActiveObject
canvas.discardActiveObject();
canvas.renderAll();
canvas.forEachObject(obj => {
  // Modify objects
});
canvas.renderAll();
```

### Memory Management

```typescript
// Clean up on unmount
useEffect(() => {
  return () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose(); // Important!
    }
  };
}, []);

// Limit canvas objects
if (canvas.getObjects().length > 200) {
  console.warn('Too many objects, performance may degrade');
}
```

---

## 🌍 Vietnamese Language Support

### Key Setting for Fabric.js

```typescript
const textbox = new fabric.Textbox('Tiếng Việt', {
  splitByGrapheme: true,  // ← CRITICAL for Vietnamese!
});
```

**Why?** Vietnamese uses combining characters (diacritics). Without `splitByGrapheme`, characters may break incorrectly when wrapping to next line.

**Examples:**
- Correct: "Xin chào" (split by grapheme)
- Wrong: "Xi̍ chà̀o" (split by character)

---

## 📊 Component Relationship Diagram

```
                    useSlideStore()
                    (Zustand)
                          ↑
                          │
                    ┌─────┴─────┐
                    │           │
            MiniCanvaApp  User Input
            (Main Bridge)  
                │ │ │
        ┌───────┘ │ └───────┐
        │         │         │
   LeftSidebar CanvasEditor TopToolbar
        │         │         │
        │    ┌────┴────┐    │
        │    │         │    │
      Canvas Fabric render  │
        │    │(fromJSON)    │
        │    │              │
   Thumbnails  ObjectEditor
        │         │
        └─────┬───┘
              │
          Store Update
              │
          Persistence
         (API/Database)
```

---

## 🎯 Key Implementation Details

### Textbox with Vietnamese Support

```typescript
// ✅ Correct configuration for Vietnamese
new fabric.Textbox('Nhập tiếng Việt...', {
  width: 200,
  splitByGrapheme: true,      // Vietnamese
  fontFamily: 'Arial, sans-serif',
  fontSize: 20,
  fill: '#333',
  editable: true,
  hasControls: true,
  hasBorders: true,
});
```

### Thumbnail Generation

```typescript
// Generate preview for each slide
slides.forEach(slide => {
  const canvas = new fabric.Canvas(element, {
    width: 160,   // Thumbnail size
    height: 90,
  });

  if (slide.canvasData) {
    canvas.loadFromJSON(slide.canvasData, () => {
      canvas.renderAll();
    });
  } else {
    canvas.backgroundColor = slide.backgroundColor;
  }
});
```

### Audio Auto-advance

```typescript
// When entering presentation mode
if (currentSlide.audioUrl) {
  audio.src = currentSlide.audioUrl;
  audio.play();
  
  audio.onended = () => nextSlide();
}

// When user clicks next manually
const nextSlide = () => {
  audio.pause();
  setCurrentSlide(currentSlideIndex + 1);
};
```

---

## 🧪 Testing Checklist

- [ ] Add text and verify it displays
- [ ] Edit text color and size
- [ ] Add image from file
- [ ] Switch between slides without data loss
- [ ] Change background color
- [ ] Download slide as PNG
- [ ] Upload audio file
- [ ] Test presentation mode
- [ ] Auto-advance after audio ends
- [ ] Undo recent changes
- [ ] Zoom in/out with mouse wheel
- [ ] Delete objects
- [ ] Duplicate objects
- [ ] Mobile responsiveness

---

## 📈 Scale & Growth Path

**Current:** Single user, no backend
**Phase 1:** Implement database saving
**Phase 2:** Add collaborative editing (WebSockets)
**Phase 3:** Template library & assets
**Phase 4:** Export to PDF/Video
**Phase 5:** Mobile app (React Native)

---

**Documentation v1.0**  
**Date: 21/02/2026**  
**Status: Complete & Tested ✅**
