# Mini Canva - Developer Technical Guide

**Date**: February 21, 2026  
**By**: Architecture & UX/UI Specialist  
**For**: Developers maintaining/extending this codebase

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [Key Algorithms](#key-algorithms)
4. [State Management](#state-management)
5. [Event Handling](#event-handling)
6. [Code Patterns](#code-patterns)
7. [Performance Considerations](#performance-considerations)
8. [Testing Strategy](#testing-strategy)
9. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Design Principle: Separation of Concerns

```
MiniCanvaApp (Layout Container)
├── Sidebar (Static)
├── Header (Navigation)
├── Main Workspace
│   └── CanvasEditorPro (Canvas Logic)
│       ├── Fabric.js Canvas
│       ├── Event Handlers
│       └── Floating UI
├── Footer (Thumbnails)
└── Right Panel (Contextual)
```

**Key Insight**: Layout and canvas logic are separated to allow:
- Independent styling of workspace
- Reusable canvas component
- Easy theme switching
- Simplified testing

---

## Component Structure

### 1. MiniCanvaApp.tsx

**Purpose**: Main app layout and slide management  
**Size**: ~280 lines  
**Key Responsibilities**:

- Layout container (full-screen)
- Sidebar toggle state
- Slide navigation
- Presentation mode
- Audio playback

**Key Props**:
```typescript
interface Props {
  // No props - uses Zustand store internally
}

interface State {
  isLeftPanelOpen: boolean;      // Sidebar visibility
  isRightPanelOpen: boolean;     // Properties panel
  isPresentMode: boolean;         // Presentation mode
  zoom: number;                   // Canvas zoom level
  currentSlideIndex: number;      // From Zustand store
}
```

**Dependencies**:
- `useSlideStore` (Zustand)
- `CanvasEditorPro` (dynamic import)
- `SlideThumbnailBar`

**Layout Grid**:
```css
.flex h-screen w-screen /* Full viewport */
├── aside.w-72 /* Left sidebar */
├── main.flex-1
│   ├── header.h-16 /* Navigation bar */
│   ├── main.flex-1 /* Canvas area */
│   └── footer.h-24 /* Thumbnails */
└── aside.w-72 /* Right panel - contextual */
```

**Color Scheme**:
```
bg-gray-900   /* Dark background - visual rest */
bg-white      /* Containers, panels, surfaces */
text-gray-600 /* Secondary text */
text-gray-900 /* Primary text */
```

---

### 2. CanvasEditorPro.tsx

**Purpose**: Canvas manipulation and editing interface  
**Size**: ~540 lines  
**Key Responsibilities**:

- Fabric.js canvas initialization
- Object manipulation (add, delete, modify)
- Keyboard shortcuts
- Zoom controls
- Auto-saving
- Responsive scaling

**Core Algorithms**:

#### A. Responsive Zoom Calculation

```typescript
const calculateResponsiveZoom = useCallback(() => {
  if (!containerRef.current) return 1;
  
  const containerWidth = containerRef.current.clientWidth;
  const containerHeight = containerRef.current.clientHeight;
  
  // Constants: Base canvas dimensions (16:9 aspect ratio like Canva)
  const BASE_WIDTH = 960;
  const BASE_HEIGHT = 540;
  
  // Calculate scale factors for each dimension
  const scaleX = (containerWidth - 40) / BASE_WIDTH;   // -40 for padding
  const scaleY = (containerHeight - 40) / BASE_HEIGHT;
  
  // Use smaller scale to maintain aspect ratio
  const scale = Math.min(scaleX, scaleY);
  
  // Clamp between reasonable bounds
  const MIN_ZOOM = 0.5;  // 50% minimum
  const MAX_ZOOM = 1.5;  // 150% maximum
  
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
}, []);
```

**Why this works**:
1. **Aspect Ratio Preservation**: `Math.min(scaleX, scaleY)` ensures no distortion
2. **Padding Consideration**: `-40` avoids content clipping
3. **Bounds Safety**: Prevents unusable zoom levels
4. **Responsive**: Recalculates on `window.resize` event

#### B. Fabric.js Canvas Initialization

```typescript
const canvas = new fabric.Canvas(canvasRef.current, {
  width: 960,
  height: 540,
  backgroundColor: '#ffffff',
  selection: true,
  preserveObjectStacking: true,
  enablePointerEvents: true,
  renderOnAddRemove: true,
});
```

**Configuration Explained**:
- `width/height`: Base dimensions (16:9 ratio)
- `selection: true`: Enable multi-select
- `preserveObjectStacking`: Keep z-index on modify
- `enablePointerEvents`: Allow canvas interaction
- `renderOnAddRemove`: Auto-render after changes

#### C. Keyboard Shortcuts Handler

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Delete key
    if (e.key === 'Delete' && selectedObject) {
      e.preventDefault();
      canvas.remove(selectedObject);
      canvas.renderAll();
      setSelectedObject(null);
    }

    // Ctrl/Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      handleUndo();
    }

    // Ctrl/Cmd + C: Duplicate
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedObject) {
      if (!(selectedObject as any).isEditing) {
        e.preventDefault();
        handleDuplicate();
      }
    }

    // Arrow Keys: Pixel-perfect movement
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (selectedObject && !(selectedObject as any).isEditing) {
        e.preventDefault();
        
        const step = e.shiftKey ? 10 : 1; // 1px or 10px
        const obj = selectedObject as any;

        switch (e.key) {
          case 'ArrowUp':
            obj.top = Math.max(0, obj.top - step);
            break;
          case 'ArrowDown':
            obj.top = Math.min(BASE_HEIGHT - (obj.height || 0), obj.top + step);
            break;
          case 'ArrowLeft':
            obj.left = Math.max(0, obj.left - step);
            break;
          case 'ArrowRight':
            obj.left = Math.min(BASE_WIDTH - (obj.width || 0), obj.left + step);
            break;
        }

        canvas.renderAll();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isReady, selectedObject]);
```

**Key Implementation Details**:

1. **isEditing Check**: Prevents arrow keys when user is typing
2. **Bounds Checking**: Objects don't move outside canvas
3. **Step Variable**: `Shift` key doubles movement distance (user preference)
4. **Event Prevention**: `e.preventDefault()` stops browser default behavior
5. **Cross-platform**: `e.ctrlKey || e.metaKey` supports Windows and Mac

**Supported Shortcuts Overview**:

| Shortcut | Handler | Use Case |
|----------|---------|----------|
| `Delete` | Custom function | Remove objects |
| `Ctrl+Z` | `handleUndo()` | Revert changes |
| `Ctrl+C` | `handleDuplicate()` | Clone object |
| Arrow keys | Direct modification | Move 1px |
| `Shift+Arrow` | Direct modification | Move 10px |

---

## State Management

### Local Component State (CanvasEditorPro)

```typescript
const [selectedObject, setSelectedObject] = useState<any>(null);
const [backgroundColor, setBackgroundColor] = useState('#ffffff');
const [history, setHistory] = useState<string[]>([]);
const [isReady, setIsReady] = useState(false);
const [canvasZoom, setCanvasZoom] = useState(1);
const [isPanning, setIsPanning] = useState(false);
```

**State Purpose**:

| State | Purpose | Updated By |
|-------|---------|-----------|
| `selectedObject` | Current selection on canvas | Fabric.js events |
| `backgroundColor` | Canvas background color | Color picker input |
| `history` | Undo history buffer | Canvas modifications |
| `isReady` | Fabric.js loaded flag | useEffect hook |
| `canvasZoom` | Current zoom percentage | Zoom handlers, mouse wheel |
| `isPanning` | Pan mode active flag | Mouse handlers (future) |

**History Implementation** (Undo/Redo):

```typescript
// Store current state
setHistory((prev) => [...prev.slice(-9), JSON.stringify(canvasData)]);

// Undo - restore from history
const handleUndo = () => {
  if (history.length > 1) {
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const previousState = newHistory[newHistory.length - 1];
    canvas.loadFromJSON(JSON.parse(previousState), () => {
      canvas.renderAll();
    });
  }
};
```

**Limitations**:
- History limited to last 10 states (prevents memory leak)
- No redo (only undo)
- Serializes entire canvas (slow for complex designs)

### Global State (Zustand)

```typescript
// From useSlideStore
const { 
  slides,                    // Array of slides
  currentSlideIndex,         // Current active slide
  setCurrentSlide,           // Switch slide
  updateSlide,               // Save slide data
  getSlide                   // Fetch slide
} = useSlideStore();
```

**Separation**:
- **Local State**: UI interactions (zoom, selection)
- **Global State**: Data persistence (slides, canvas data)
- **Result**: Easy to test, clear responsibility

---

## Event Handling

### Fabric.js Event Listeners

#### Canvas Events

```typescript
// Selection events
canvas.on('selection:created', (e) => {
  setSelectedObject(e.selected?.[0] || null);
});

canvas.on('selection:updated', (e) => {
  setSelectedObject(e.selected?.[0] || null);
});

canvas.on('selection:cleared', () => {
  setSelectedObject(null);
});

// Modification events (auto-save trigger)
canvas.on('object:modified', handleModified);
canvas.on('object:added', handleModified);
canvas.on('object:removed', handleModified);

// Mouse wheel zoom
canvas.on('mouse:wheel', function (opt) {
  const delta = (opt.e as WheelEvent).deltaY;
  let zoom = canvas.getZoom();
  zoom *= 0.999 ** delta; // Exponential scaling
  
  // Clamp zoom
  if (zoom > 20) zoom = 20;
  if (zoom < 0.5) zoom = 0.5;
  
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  (opt.e as WheelEvent).preventDefault();
  setCanvasZoom(zoom);
});
```

**Event Flow**:
```
User Action → Fabric.js Event → React Handler → State Update → Re-render
```

---

## Code Patterns

### Pattern 1: Controlled Component with External State

```typescript
// From MiniCanvaApp
const [zoom, setZoom] = useState(1);
const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

<CanvasEditorPro
  slideId={currentSlide.id}
  zoom={zoom}
  onZoomChange={setZoom}
  onRightPanelToggle={() => setIsRightPanelOpen(!isRightPanelOpen)}
/>
```

**Benefits**:
- Parent controls UI state
- Multiple children can access same state
- Easy to sync layout with canvas zoom

### Pattern 2: useCallback for Event Handlers

```typescript
// Prevents unnecessary recreations
const calculateResponsiveZoom = useCallback(() => {
  // Calculation logic...
}, []);

const handleZoomIn = useCallback(() => {
  // Zoom logic...
}, [canvasZoom]);
```

**Why**: 
- Prevents infinite loops in useEffect dependencies
- Optimizes child component re-renders
- Stable function references

### Pattern 3: Conditional Rendering for UI Panels

```typescript
// Only render when relevant
{selectedObject && selectedObject.type === 'textbox' && (
  <div className="fixed bottom-6 right-6 bg-white rounded-lg">
    {/* Text editor UI */}
  </div>
)}
```

**Rationale**:
- Cleaner UI when not needed
- Prevents layout shift
- User focuses on canvas

### Pattern 4: Dynamic CSS with Inline Styles

```typescript
// Responsive canvas size based on zoom
<div 
  className="relative bg-white shadow-2xl rounded-lg"
  style={{
    width: `${BASE_WIDTH * canvasZoom}px`,
    height: `${BASE_HEIGHT * canvasZoom}px`,
  }}
>
```

**Instead of**:
- Tailwind classes (limited precision)
- Complex CSS media queries
- JavaScript calculations that cause flashing

---

## Performance Considerations

### 1. Render Optimization

**Current**: Canvas re-renders only when needed
**Issue**: Zoom changes cause parent re-render
**Solution**: Lift zoom state to MiniCanvaApp level

```typescript
// ❌ Before: Re-renders entire app
const [zoom, setZoom] = useState(1);

// ✅ After: Parent controls, children read prop
<CanvasEditorPro zoom={zoom} onZoomChange={setZoom} />
```

### 2. Event Listener Cleanup

**Current**: Keyboard listeners added in useEffect
**Risk**: Multiple listeners on re-render
**Solution**: Proper cleanup in return function

```typescript
useEffect(() => {
  window.addEventListener('keydown', handleKeyDown);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [isReady, selectedObject]);
```

### 3. History Memory Management

**Current**: Limited to 10 states
**Why**: Fabric.js serialization is expensive
**Tradeoff**: Limited undo vs acceptable performance

```typescript
// Keep only last 10 states
setHistory((prev) => [...prev.slice(-9), newState]);
```

### 4. Canvas Rendering Triggers

**Efficient**:
```typescript
canvas.renderAll(); // Explicit render
```

**Inefficient**:
```typescript
// On every state change in React
// (avoid if canvas has many objects)
```

---

## Testing Strategy

### Unit Tests (Recommended)

#### Test 1: Responsive Zoom Calculation

```typescript
describe('calculateResponsiveZoom', () => {
  it('should calculate correct zoom for 960x540 container', () => {
    const zoom = calculateResponsiveZoom(960, 540);
    expect(zoom).toBe(1);
  });

  it('should clamp maximum zoom to 1.5', () => {
    const zoom = calculateResponsiveZoom(2000, 2000);
    expect(zoom).toBeLessThanOrEqual(1.5);
  });

  it('should maintain minimum zoom of 0.5', () => {
    const zoom = calculateResponsiveZoom(100, 100);
    expect(zoom).toBeGreaterThanOrEqual(0.5);
  });
});
```

#### Test 2: Keyboard Shortcuts

```typescript
describe('keyboard shortcuts', () => {
  it('should delete selected object on Delete key', () => {
    const mockCanvas = { remove: jest.fn(), renderAll: jest.fn() };
    
    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    handleKeyDown(event);
    
    expect(mockCanvas.remove).toHaveBeenCalled();
  });

  it('should not move text if in edit mode', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    selectedObject.isEditing = true;
    
    handleKeyDown(event);
    
    expect(event.defaultPrevented).toBe(false);
  });
});
```

### Integration Tests (E2E)

#### Test Workflow: Add Text and Format

```typescript
describe('text editing workflow', () => {
  it('should add text, select, and format', async () => {
    // 1. Add text
    user.click(screen.getByTitle('Thêm văn bản'));
    
    // 2. Type
    user.type(screen.getByRole('textbox'), 'Hello');
    
    // 3. Click outside to finish editing
    user.click(screen.getByClass('canvas'));
    
    // 4. Select text
    user.click(screen.getByText('Hello'));
    
    // 5. Change properties
    user.click(screen.getByTitle('Màu chữ'));
    user.selectOption(colorPicker, '#FF0000');
    
    // Assert
    expect(canvas.toJSON()).toContainText('color: #FF0000');
  });
});
```

---

## Future Enhancements

### Phase 2: Smart Features (High Priority)

#### 2.1 Smart Guides
```typescript
// Show alignment guides while dragging
canvas.on('object:moving', (e) => {
  const obj = e.target;
  
  // Check alignment with other objects
  const alignments = findAlignedObjects(obj);
  
  if (alignments.length > 0) {
    drawSmartGuides(canvas, alignments);
  }
});
```

**UX Benefit**: Professional typography and spacing

#### 2.2 Layer Panel
```typescript
// Display objects in nested list
objects.map((obj) => (
  <div key={obj.id} onClick={() => canvas.setActiveObject(obj)}>
    {obj.name}
    <IconEye onClick={() => obj.set({ visible: !obj.visible })} />
    <IconLock onClick={() => obj.set({ selectable: !obj.selectable })} />
  </div>
))
```

**UX Benefit**: Manage complex designs with many objects

#### 2.3 Text Styles
```typescript
// Pre-defined text styles
const textStyles = [
  { name: 'Title', fontSize: 48, fontWeight: 'bold' },
  { name: 'Subtitle', fontSize: 32, fontWeight: 'normal' },
  { name: 'Body', fontSize: 16, fontWeight: 'normal' },
];

// Apply with one click
<button onClick={() => applyStyle(selectedObject, 'Title')}>
  Apply Title Style
</button>
```

### Phase 3: Collaboration

```typescript
// Real-time editing with WebSocket
const socket = io('http://localhost:3001');

socket.on('object:modified', (data) => {
  canvas.loadFromJSON(data, () => {
    canvas.renderAll();
  });
});

canvas.on('object:modified', (e) => {
  socket.emit('object:modified', canvas.toJSON());
});
```

### Phase 4: Export Features

```typescript
// Multiple export formats
export const exportDesign = async (format: 'png' | 'svg' | 'pdf') => {
  switch (format) {
    case 'png':
      return canvas.toDataURL('image/png');
    case 'svg':
      return canvas.toSVG();
    case 'pdf':
      return generatePDF(canvas);
  }
};
```

---

## Code Review Checklist

### Before Committing

- [ ] No console.log statements left
- [ ] Event listeners properly cleaned up
- [ ] TypeScript types are correct
- [ ] No unused imports
- [ ] Keyboard shortcuts documented in tooltips
- [ ] Responsive zoom tested on 3+ screen sizes
- [ ] History limit (10 states) verified
- [ ] Undo/Redo works correctly
- [ ] Text editing doesn't trigger keyboard shortcuts
- [ ] Zoom controls update display correctly

### Before Deploying

- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Performance tested (Chrome DevTools)
- [ ] Canvas works on small screens
- [ ] All floating panels visible
- [ ] Download feature tested
- [ ] No console errors on refresh
- [ ] Slide switching doesn't lose canvas state

---

## Debugging Tips

### Problem: Canvas not responding to clicks

```typescript
// Check 1: Canvas selection enabled?
console.log(canvas.selection);

// Check 2: Object selectable?
console.log(selectedObject.selectable);

// Check 3: Canvas rendered?
canvas.renderAll();
```

### Problem: Zoom level incorrect

```typescript
// Check container size
console.log(containerRef.current.clientWidth);
console.log(containerRef.current.clientHeight);

// Verify calculation
const zoom = calculateResponsiveZoom();
console.log('Calculated zoom:', zoom);
console.log('Actual canvas zoom:', canvas.getZoom());
```

### Problem: Keyboard shortcuts not working

```typescript
// Check if component ready
console.log('isReady:', isReady);

// Check if listener attached
window.addEventListener('keydown', (e) => {
  console.log('Key pressed:', e.key);
});

// Check if text is in edit mode
console.log('isEditing:', selectedObject?.isEditing);
```

---

## References

- [Fabric.js Docs](http://fabricjs.com/docs/)
- [React Hooks Guide](https://react.dev/reference/react)
- [Zustand Store](https://github.com/pmndrs/zustand)
- [Tailwind CSS Docs](https://tailwindcss.com/)

---

*This guide is living documentation - update it as the codebase evolves.*
