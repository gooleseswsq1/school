# 📊 Kiến trúc và thiết kế hệ thống

## 🏗️ Tổng quan kiến trúc

### Client Side (Frontend)
```
┌─────────────────────────────────────────────┐
│        Page Editor (teacher/editor)         │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────────┐  ┌────────────────────┐  │
│  │  PageTree    │  │   PageEditor       │  │
│  │  (Sidebar)   │  │   (Main Content)   │  │
│  │              │  │                    │  │
│  │ • Trang A    │  │ ┌────────────────┐ │  │
│  │ • Trang B    │  │ │ Edit Title     │ │  │
│  │ • Trang C    │  │ └────────────────┘ │  │
│  │              │  │                    │  │
│  └──────────────┘  │ ┌────────────────┐ │  │
│                    │ │ VideoBlock     │ │  │
│                    │ │ DocumentBlock  │ │  │
│                    │ │ EmbedBlock     │ │  │
│                    │ └────────────────┘ │  │
│                    │                    │  │
│                    │ ┌────────────────┐ │  │
│                    │ │ BlockToolbar   │ │  │
│                    │ │ (Add Block BTN)│ │  │
│                    │ └────────────────┘ │  │
│                    └────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Server Side (Backend)
```
Next.js API Routes
├── /api/pages
│   ├── GET    - Lấy tất cả pages (authorId required)
│   └── POST   - Tạo page mới
├── /api/pages/{id}
│   ├── GET    - Lấy page chi tiết + blocks
│   ├── PUT    - Cập nhật page info
│   └── DELETE - Xóa page
├── /api/blocks
│   └── POST   - Tạo block mới
├── /api/blocks/{id}
│   ├── GET    - Lấy block chi tiết
│   ├── PUT    - Cập nhật block
│   └── DELETE - Xóa block
├── /api/blocks/{id}/documents
│   ├── POST   - Thêm document
│   └── DELETE - Xóa document
└── /api/public/pages/{slug}
    └── GET    - Lấy published page (cho học sinh)
```

### Database Schema
```
┌───────────┐
│   User    │
├───────────┤
│ id (PK)   │
│ email     │
│ name      │
│ password  │
│ role      │
│ isActive  │
└─────┬─────┘
      │
      ├─────────────────────────────────────┬─────────────────┐
      │                                      │                 │
      ▼                                      ▼                 ▼
┌───────────────┐                   ┌──────────────┐      ┌─────────────┐
│ Document      │                   │ Page         │      │ (ActivCode) │
├───────────────┤                   ├──────────────┤      └─────────────┘
│ (authorId)    │                   │ id (PK)      │
│ fileUrl       │                   │ title        │
│ fileType      │                   │ slug         │
│ fileSize      │                   │ parentId (FK)├──────┐
│               │                   │ authorId (FK)│      │
└───────────────┘                   │ order        │  (Self-referential)
                                    │ isPublished  │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ PageBlock    │
                                    ├──────────────┤
                                    │ pageId  (FK) │
                                    │ type         │
                                    │ order        │
                                    │              │
                                    │ (Fields for: │
                                    │  VIDEO:      │
                                    │  videoUrl    │
                                    │  videoType   │
                                    │  poster      │
                                    │              │
                                    │  EMBED:      │
                                    │  embedCode   │
                                    │  embedPageId │
                                    │              │
                                    │  TEXT:       │
                                    │  content)    │
                                    └──────┬───────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ PageDocument │
                                    ├──────────────┤
                                    │ blockId (FK) │
                                    │ title        │
                                    │ fileUrl      │
                                    │ fileType     │
                                    │ fileSize     │
                                    └──────────────┘
```

---

## 🧩 Component Interactions

### PageEditor (Main Component)
- **Khi render**: Fetch tất cả pages từ API
- **State management**: 
  - `pages`: Danh sách tất cả pages
  - `selectedPageId`: Page đang được edit
  - `currentPage`: Dữ liệu page chi tiết
  - `editTitle`, `editSlug`, `editDescription`: Form inputs

- **Key Functions**:
  - `handleCreatePage()`: Gọi POST /api/pages
  - `handleDeletePage()`: Gọi DELETE /api/pages/{id}
  - `handleSavePage()`: Gọi PUT /api/pages/{id}
  - `handleBlockUpdated()`: Refresh blocks sau khi thay đổi
  - `handleUpdateBlock()`: Gọi PUT /api/blocks/{id}
  - `handleAddDocument()`: Gọi POST /api/blocks/{id}/documents

### PageTree (Sidebar)
- **Input**: Array of pages
- **Output**: 
  - Event khi page được select
  - Events khi create/delete/reorder page
- **Features**:
  - Recursive rendering cho nested pages
  - Drag & Drop support (DndContext)
  - Expand/collapse tree nodes

### Block Components

#### VideoBlockComponent
```
State:
- isEdit: boolean
- inputUrl: string
- posterUrl: string

Process:
1. User nhập URL
2. Component parse URL (detectVideoPlatform)
3. Extract video ID (extractYouTubeId, extractVimeoId)
4. Generate embed URL (generateVideoEmbedUrl)
5. Send PUT /api/blocks/{id}
6. Update UI
```

#### DocumentBlockComponent
```
State:
- isEdit: boolean
- title: string
- fileUrl: string
- fileType: string (pdf|doc|ppt|xls|other)

Process:
1. User nhập tài liệu info
2. POST /api/blocks/{id}/documents
3. Thêm vào documents array
4. Hiển thị với icon tương ứng
5. Button download tương ứng
```

#### EmbedBlockComponent
```
State:
- isEdit: boolean
- code: string (HTML/iframe)

Process:
1. User paste embed code
2. Send PUT /api/blocks/{id}
3. Server sanitize với DOMPurify
4. Render with dangerouslySetInnerHTML
5. Only safe attributes allowed
```

### BlockToolbar
- 3 buttons:
  1. "Thêm Video" → POST /api/blocks (type: VIDEO)
  2. "Tài liệu" → POST /api/blocks (type: DOCUMENT)
  3. "Nhúng" → POST /api/blocks (type: EMBED)

---

## 🔄 Data Flow Examples

### Flow 1: Create New Page
```
User → Click "Trang mới"
  ↓
Prompt dialog "Tên trang?"
  ↓
Prompt dialog "Slug?"
  ↓
POST /api/pages {
  title, slug, authorId, parentId
}
  ↓
Server create with prisma.page.create()
  ↓
Response: new Page object
  ↓
setPages([...pages, newPage])
  ↓
setSelectedPageId(newPage.id)
  ↓
UI updates, new page selected in tree
```

### Flow 2: Add Video Block
```
User → Click "Thêm Video" button
  ↓
POST /api/blocks {
  pageId, type: "VIDEO"
}
  ↓
Server create with prisma.pageBlock.create()
  ↓
Response: new PageBlock object
  ↓
handleBlockUpdated() → Fetch updated page
  ↓
GET /api/pages/{currentPageId}
  ↓
Response: Page with new block in blocks[]
  ↓
setCurrentPage(updatedPage)
  ↓
VideoBlockComponent renders with empty state
  ↓
User clicks to edit, enter video URL
  ↓
PUT /api/blocks/{blockId} {
  videoUrl, videoType, poster
}
  ↓
Server sanitize, save
  ↓
Response: updated block
  ↓
Re-fetch page, update UI
```

### Flow 3: Publish & View Page (Student)
```
Teacher:
User → Toggle "Công khai"
  ↓
PUT /api/pages/{id} {
  isPublished: true
}
  ↓
Server update isPublished = true

Student:
Browse → Visit /{page-slug}
  ↓
Get page metadata from server (SSR/SSG)
  ↓
PublicPageRenderer component loads
  ↓
Fetch from GET /api/public/pages/{slug}
  ↓
Server query:
  - WHERE { slug, isPublished: true }
  - SELECT with all blocks and documents
  ↓
Response: Complete page data
  ↓
Render:
  - Page title & description
  - Videos (iframe or <video>)
  - Documents (download buttons)
  - Embeds (sanitized iframe)
  - Child pages (as cards)
```

---

## 🎛️ State Management Flow

```
PageEditor Component
├── pages: Page[]
│   ├── Used by: PageTree
│   ├── Updated by: handleCreatePage, handleDeletePage, handleBlockUpdated
│   └── Source: GET /api/pages
│
├── selectedPageId: string | null
│   ├── Used by: PageTree (styling), PageEditor (fetch details)
│   ├── Updated by: setSelectedPageId (when tree item clicked)
│   └── Triggers: useEffect to fetch currentPage
│
├── currentPage: Page | null
│   ├── Used by: Render blocks, show edit form
│   ├── Updated by: useEffect (when selectedPageId changes) or handleBlockUpdated
│   └── Source: GET /api/pages/{selectedPageId}
│
├── editTitle, editSlug, editDescription: string
│   ├── Used by: Form inputs
│   ├── Updated by: onChange handlers
│   └── Submitted: handleSavePage() → PUT /api/pages
│
└── Block-level State (VideoBlockComponent, DocumentBlockComponent, etc)
    ├── isEdit: boolean
    ├── inputUrl/input data
    └── Submitted to individual /api/blocks endpoints
```

---

## ⚡ API Request/Response Contract

### POST /api/pages
```
Request:
{
  title: string,
  slug: string,
  description?: string,
  authorId: string,
  parentId?: string | null
}

Response:
{
  id: string,
  title: string,
  slug: string,
  description: string | null,
  parentId: string | null,
  authorId: string,
  blocks: PageBlock[],
  children: Page[],
  order: number,
  isPublished: boolean,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### POST /api/blocks
```
Request:
{
  pageId: string,
  type: "VIDEO" | "DOCUMENT" | "EMBED" | "TEXT",
  order?: number,
  videoUrl?: string,     // for VIDEO
  videoType?: string,    // for VIDEO
  poster?: string,       // for VIDEO
  embedCode?: string,    // for EMBED
  embedPageId?: string,  // for EMBED
  content?: string       // for TEXT
}

Response:
{
  id: string,
  pageId: string,
  type: BlockType,
  order: number,
  videoUrl?: string,
  videoType?: string,
  poster?: string,
  embedCode?: string,
  embedPageId?: string,
  content?: string,
  documents: PageDocument[],
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### PUT /api/blocks/{id}
```
Request:
{
  type?: BlockType,
  order?: number,
  videoUrl?: string,
  videoType?: string,
  poster?: string,
  embedCode?: string,
  embedPageId?: string,
  content?: string
}

Response: Updated PageBlock object
```

---

## 🔐 Security Flow

### Embed Code Sanitization
```
User pastes HTML:
"<script>alert('xss')</script><iframe src='...'></iframe>"
          ↓
Server receive in PUT /api/blocks
          ↓
DOMPurify.sanitize(code, {
  ALLOWED_TAGS: ["iframe"],
  ALLOWED_ATTR: ["src", "width", "height", "frameborder", "scrolling", "allow", "allowfullscreen"]
})
          ↓
Result:
"<iframe src='...'></iframe>"
          ↓
Store in database
          ↓
On client, render with dangerouslySetInnerHTML
```

---

## 📈 Performance Considerations

1. **Query Optimization**:
   - Index on: authorId, parentId, isPublished, createdAt
   - Use include() cho relationships

2. **Caching**:
   - Public pages có thể cache (ISR/SSG)
   - Editor pages fetch fresh (no cache)

3. **Bundle Size**:
   - DnD-kit is tree-shakeable
   - dompurify ~0.4MB (small)
   - react-hot-toast is lightweight

---

**Architecture Version**: 1.0  
**Last Updated**: February 15, 2026
