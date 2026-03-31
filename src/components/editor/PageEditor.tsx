"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageTree from "./PageTree";
import VideoBlockComponent from "./VideoBlockComponent";
import DocumentBlockComponent from "./DocumentBlockComponent";
import RichTextBlockComponent from "./RichTextBlockComponent";
import FlashcardBlockComponent from "./FlashcardBlockComponent";
import EmbedBlockComponent from "./EmbedBlockComponent";
import InteractiveLessonCreator from "./InteractiveLessonCreator";
import CanvaBlockComponent from "./CanvaBlockComponent";
import BlockToolbar from "./BlockToolbar";
import CommentsContainer from "./CommentsContainer";
import toast from "react-hot-toast";
import { ChevronLeft, Save, Eye, EyeOff, ArrowUp, ArrowDown, Trash2, Edit2, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  image?: string;
  shortcutUrl?: string;
  shortcutCode?: string;
}

interface PageBlock {
  id: string;
  type: "VIDEO" | "DOCUMENT" | "TEXT" | "CONTENT" | "QUIZ" | "CANVA" | "RICH_TEXT" | "FLASHCARD" | "EMBED";
  order: number;
  videoUrl?: string;
  videoType?: string;
  poster?: string;
  interactions?: string; // JSON string of video interactions
  content?: string;
  items?: ContentItem[];
  quiz?: any;
  documents?: Array<{
    id: string;
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }>;
  // Rich Text fields
  richTextContent?: string;
  // Flashcard fields
  flashcardTitle?: string;
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
    hint?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    confidence?: number;
    reviewCount?: number;
    isStarred?: boolean;
  }>;
}

interface Page {
  id: string;
  title: string;
  slug: string;
  description?: string;
  parentId?: string;
  parent?: { id: string; title: string };
  children: Page[];
  blocks: PageBlock[];
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  authorId: string;
}

interface PageEditorProps {
  authorId: string;
  readOnly?: boolean;
  initialTitle?: string;
  pageId?: string;
  courseId?: string;
}

export default function PageEditor({ authorId, readOnly = false, initialTitle, pageId, courseId }: PageEditorProps) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [videoEditingId, setVideoEditingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Helper function to update page in tree
  const updatePageInTree = (pages: Page[], pageId: string, updater: (p: Page) => Page): Page[] => {
    return pages.map((p) => {
      if (p.id === pageId) {
        return updater(p);
      }
      return {
        ...p,
        children: updatePageInTree(p.children || [], pageId, updater),
      };
    });
  };

  // Helper function to find page in tree
  const findPageInTree = (pages: Page[], pageId: string): Page | null => {
    for (const page of pages) {
      if (page.id === pageId) return page;
      const found = findPageInTree(page.children || [], pageId);
      if (found) return found;
    }
    return null;
  };

  // Fetch pages - theo courseId nếu có,否则 fetch tất cả
  useEffect(() => {
    const fetchPages = async () => {
      setIsLoading(true);
      try {
        let url = `/api/pages?authorId=${authorId}`;
        
        // Nếu có courseId, fetch theo courseId (chỉ lấy pages thuộc bài giảng này)
        if (courseId) {
          url = `/api/pages/${courseId}`;
        }
        
        const response = await fetch(url, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        if (!response.ok) throw new Error("Failed to fetch pages");

        const data = await response.json();
        
        if (courseId) {
          // Nếu fetch theo courseId, data là một page object
          // Lấy children của page đó làm danh sách pages
          const coursePage = data;
          setPages([coursePage]);
          
          // Nếu có pageId, chọn page đó
          if (pageId) {
            const targetPage = findPageInTree([coursePage], pageId);
            if (targetPage) {
              setSelectedPageId(targetPage.id);
              setCurrentPage(targetPage);
              setEditTitle(targetPage.title);
              setEditSlug(targetPage.slug);
              setEditDescription((targetPage.description || "").replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, ''));
            }
          } else {
            // Chọn courseId page làm trang mặc định
            setSelectedPageId(coursePage.id);
            setCurrentPage(coursePage);
            setEditTitle(coursePage.title);
            setEditSlug(coursePage.slug);
            setEditDescription((coursePage.description || "").replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, ''));
          }
        } else {
          // Nếu không có courseId, fetch tất cả pages
          setPages(data);

          // If pageId is provided, select that page
          if (pageId) {
            const targetPage = findPageInTree(data, pageId);
            if (targetPage) {
              setSelectedPageId(targetPage.id);
              setCurrentPage(targetPage);
              setEditTitle(targetPage.title);
              setEditSlug(targetPage.slug);
              setEditDescription((targetPage.description || "").replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, ''));
            }
          }
          // Otherwise select first page
          else if (data.length > 0) {
            setSelectedPageId(data[0].id);
            setCurrentPage(data[0]);
            setEditTitle(data[0].title);
            setEditSlug(data[0].slug);
            setEditDescription(data[0].description || "");
          }
        }
      } catch (error) {
        console.error("Error fetching pages:", error);
        toast.error("Lỗi khi tải trang");
      } finally {
        setIsLoading(false);
      }
    };

    if (authorId) {
      fetchPages();
    }
  }, [authorId, pageId, courseId]);

  // Show new page form if initialTitle is provided and no pages exist
  useEffect(() => {
    if (initialTitle && pages.length === 0 && !isLoading) {
      // Pre-fill the form with initialTitle but don't create page yet
      setEditTitle(initialTitle);
      const slug = initialTitle.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setEditSlug(`${slug}-${Date.now()}`);
      setEditDescription("");
      setIsCreatingNew(true);
    }
  }, [initialTitle, pages.length, isLoading]);

  // Handle create new page from form
  const handleCreateNewPage = async () => {
    if (!editTitle.trim()) {
      toast.error("Tên trang không được trống");
      return;
    }
    if (!editSlug.trim()) {
      toast.error("Slug không được trống");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          slug: editSlug.trim(),
          authorId,
          description: editDescription.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create page");
      }

      const newPage = await response.json();
      
      // Refetch all pages
      const allPagesResponse = await fetch(`/api/pages?authorId=${authorId}`);
      if (allPagesResponse.ok) {
        const updatedPages = await allPagesResponse.json();
        setPages(updatedPages);
        setTimeout(() => {
          setSelectedPageId(newPage.id);
          setCurrentPage(newPage);
          setIsCreatingNew(false);
        }, 100);
      }
      
      toast.success("Trang mới được tạo");
    } catch (error) {
      console.error("Error creating page:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi khi tạo trang");
    } finally {
      setIsLoading(false);
    }
  };

  // Update current page when selected
  useEffect(() => {
    if (selectedPageId && pages.length > 0) {
      const page = findPageInTree(pages, selectedPageId);
      if (page) {
        setCurrentPage(page);
        setEditTitle(page.title);
        setEditSlug(page.slug);
        setEditDescription((page.description || "").replace(/^\[TERM:(MID_1|FINAL_1|MID_2|FINAL_2)\]\s*/i, ''));
      }
    }
  }, [selectedPageId, pages]);

  const handleCreatePage = async (parentId: string | null) => {
    const title = prompt("Nhập tên trang:");
    if (!title || !title.trim()) {
      toast.error("Tên trang không được trống");
      return;
    }

    const slug = prompt("Nhập slug (URL):", title.toLowerCase().replace(/\s+/g, "-"));
    if (!slug || !slug.trim()) {
      toast.error("Slug không được trống");
      return;
    }

    setIsLoading(true);
    try {
      // Nếu có courseId, sử dụng courseId làm parentId
      // Nhưng chỉ khi courseId thuộc về authorId hiện tại
      let finalParentId = parentId || null;
      
      if (courseId && !parentId) {
        // Kiểm tra xem courseId có thuộc về authorId hiện tại không
        const courseCheck = await fetch(`/api/pages/${courseId}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        if (courseCheck.ok) {
          const courseData = await courseCheck.json();
          if (courseData.authorId === authorId) {
            finalParentId = courseId;
          } else {
            // courseId không thuộc về authorId hiện tại, không sử dụng parentId
            finalParentId = null;
          }
        }
      }

      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          authorId,
          parentId: finalParentId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create page");
      }

      const newPage = await response.json();
      
      // Refetch pages based on courseId if present
      if (courseId) {
        const courseResponse = await fetch(`/api/pages/${courseId}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          setPages([courseData]);
        }
      } else {
        // Refetch all pages
        const allPagesResponse = await fetch(`/api/pages?authorId=${authorId}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        });
        if (allPagesResponse.ok) {
          const updatedPages = await allPagesResponse.json();
          setPages(updatedPages);
        }
      }
      
      // Wait for state update then select the new page
      setTimeout(() => setSelectedPageId(newPage.id), 100);
      
      toast.success("Trang mới được tạo");
    } catch (error) {
      console.error("Error creating page:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi khi tạo trang");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa trang này? Tất cả trang con cũng sẽ bị xóa.")) return;

    if (!authorId) {
      toast.error("Lỗi: Không tìm thấy ID người dùng");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/pages/${pageId}?authorId=${authorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete page");
      }

      // Refetch pages to ensure consistency
      const allPagesResponse = await fetch(`/api/pages?authorId=${authorId}`);
      if (allPagesResponse.ok) {
        const updatedPages = await allPagesResponse.json();
        setPages(updatedPages);
      }

      if (selectedPageId === pageId) {
        setSelectedPageId(null);
        setCurrentPage(null);
      }
      toast.success("Trang đã được xóa");
    } catch (error) {
      console.error("Error deleting page:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi khi xóa trang");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePage = async () => {
    if (!currentPage) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/pages/${currentPage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
        }),
      });

      if (!response.ok) throw new Error("Failed to save page");

      const updated = await response.json();
      setCurrentPage(updated);
      
      // Update pages tree with proper recursive search
      setPages((prev) =>
        updatePageInTree(prev, currentPage.id, () => updated)
      );

      toast.success("Trang đã được lưu");
    } catch (error) {
      console.error("Error saving page:", error);
      toast.error("Lỗi khi lưu trang");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!currentPage) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/pages/${currentPage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished: !currentPage.isPublished,
        }),
      });

      if (!response.ok) throw new Error("Failed to update publish status");

      const updated = await response.json();
      setCurrentPage(updated);
      
      // Update pages tree with proper recursive search
      setPages((prev) =>
        updatePageInTree(prev, currentPage.id, () => updated)
      );

      toast.success(updated.isPublished ? "Trang đã được phát hành" : "Trang đã được ẩn");
    } catch (error) {
      console.error("Error updating publish status:", error);
      toast.error("Lỗi khi cập nhật trạng thái phát hành");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockUpdated = async () => {
    if (!selectedPageId) return;

    try {
      const response = await fetch(`/api/pages/${selectedPageId}`);
      if (!response.ok) throw new Error("Failed to fetch updated page");

      const updated = await response.json();
      setCurrentPage(updated);

      // Update in pages array with proper tree traversal
      setPages((prev) =>
        updatePageInTree(prev, selectedPageId, () => updated)
      );
    } catch (error) {
      console.error("Error refreshing blocks:", error);
    }
  };

  const handleBlockDelete = async (blockId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete block");

      if (currentPage) {
        // Update both currentPage and pages tree
        const updatedBlocks = currentPage.blocks.filter((b) => b.id !== blockId);
        const updatedPage = { ...currentPage, blocks: updatedBlocks };
        
        setCurrentPage(updatedPage);
        // Also update in the pages tree for consistency
        setPages((prev) =>
          updatePageInTree(prev, currentPage.id, () => updatedPage)
        );
      }

      toast.success("Block đã được xóa");
    } catch (error) {
      console.error("Error deleting block:", error);
      toast.error("Lỗi khi xóa block");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBlock = async (blockId: string, data: any) => {
    try {
      // Serialize interactions array to JSON string if present
      const processedData = {
        ...data,
        interactions: data.interactions ? JSON.stringify(data.interactions) : undefined,
      };

      const response = await fetch(`/api/blocks/${blockId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(
          errorData?.error || `Failed to update block (${response.status})`
        );
      }

      await handleBlockUpdated();
    } catch (error) {
      console.error("Error updating block:", error);
      toast.error(
        error instanceof Error ? error.message : "Lỗi khi cập nhật block"
      );
    }
  };

  const handleAddDocument = async (blockId: string, docData: any) => {
    try {
      const response = await fetch(`/api/blocks/${blockId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docData),
      });

      if (!response.ok) throw new Error("Failed to add document");

      await handleBlockUpdated();
    } catch (error) {
      console.error("Error adding document:", error);
      toast.error("Lỗi khi thêm tài liệu");
    }
  };

  const handleDeleteDocument = async (blockId: string, documentId: string) => {
    try {
      const response = await fetch(
        `/api/blocks/${blockId}/documents?documentId=${documentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete document");

      await handleBlockUpdated();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Lỗi khi xóa tài liệu");
    }
  };

  const handleMoveBlockUp = async (blockIndex: number) => {
    if (!currentPage || blockIndex === 0) return;

    try {
      const blocks = [...currentPage.blocks];
      const temp = blocks[blockIndex];
      blocks[blockIndex] = blocks[blockIndex - 1];
      blocks[blockIndex - 1] = temp;

      // Update order property
      blocks.forEach((block, idx) => {
        block.order = idx;
      });

      // Update all blocks with new order
      const response = await fetch(`/api/pages/${currentPage.id}/blocks/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });

      if (!response.ok) throw new Error("Failed to reorder blocks");

      setCurrentPage({ ...currentPage, blocks });
      setPages((prev) =>
        updatePageInTree(prev, currentPage.id, () => ({ ...currentPage, blocks }))
      );
      toast.success("Di chuyển block lên thành công");
    } catch (error) {
      console.error("Error moving block up:", error);
      toast.error("Lỗi khi di chuyển block");
    }
  };

  const handleMoveBlockDown = async (blockIndex: number) => {
    if (!currentPage || blockIndex >= currentPage.blocks.length - 1) return;

    try {
      const blocks = [...currentPage.blocks];
      const temp = blocks[blockIndex];
      blocks[blockIndex] = blocks[blockIndex + 1];
      blocks[blockIndex + 1] = temp;

      // Update order property
      blocks.forEach((block, idx) => {
        block.order = idx;
      });

      // Update all blocks with new order
      const response = await fetch(`/api/pages/${currentPage.id}/blocks/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });

      if (!response.ok) throw new Error("Failed to reorder blocks");

      setCurrentPage({ ...currentPage, blocks });
      setPages((prev) =>
        updatePageInTree(prev, currentPage.id, () => ({ ...currentPage, blocks }))
      );
      toast.success("Di chuyển block xuống thành công");
    } catch (error) {
      console.error("Error moving block down:", error);
      toast.error("Lỗi khi di chuyển block");
    }
  };

  if (isLoading && !currentPage) {
    return <div className="flex items-center justify-center h-screen">Đang tải...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Page Tree */}
      <div className={`relative flex-shrink-0 border-r bg-white flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden border-r-0'}`}>
        <PageTree
          pages={pages}
          onPageSelect={setSelectedPageId}
          onPageCreate={handleCreatePage}
          onPageDelete={handleDeletePage}
          onPageReorder={() => {}}
          selectedPageId={selectedPageId || undefined}
          readOnly={readOnly}
        />
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarOpen(prev => !prev)}
        className="flex-shrink-0 self-start mt-4 -ml-0 z-20 bg-white border border-gray-200 rounded-r-lg px-1.5 py-2 hover:bg-gray-50 shadow-sm transition"
        title={sidebarOpen ? "Ẩn danh sách trang" : "Hiện danh sách trang"}
      >
        {sidebarOpen
          ? <PanelLeftClose size={16} className="text-gray-500" />
          : <PanelLeftOpen size={16} className="text-gray-500" />
        }
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentPage ? (
          <>
            {/* Publish Status Banner */}
            {!readOnly && (
              <div className={`px-4 py-3 text-sm font-medium flex items-center justify-between ${
                currentPage.isPublished
                  ? 'bg-green-50 border-b border-green-200 text-green-800'
                  : 'bg-yellow-50 border-b border-yellow-200 text-yellow-800'
              }`}>
                <span>
                  {currentPage.isPublished
                    ? '✓ Trang này đang được công khai cho học sinh'
                    : '⚠ Trang này bị ẩn - Học sinh không thể nhìn thấy'}
                </span>
              </div>
            )}

            {/* Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between relative z-[100]">
              <div className="flex-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={readOnly}
                  className="text-2xl font-bold border-none focus:outline-none w-full text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Tiêu đề trang"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={readOnly}
                  className="text-sm text-gray-700 border-none focus:outline-none w-full mt-1 placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Mô tả (tùy chọn)"
                />
              </div>

              <div className="flex items-center gap-2 ml-4">
                {/* Comments – compact, same style as student side */}
                {currentPage && (
                  <CommentsContainer
                    blockId={`page-${currentPage.id}`}
                    authorId={authorId}
                    currentUserRole="TEACHER"
                  />
                )}

                {!readOnly && (
                  <>
                    <button
                      onClick={handlePublishToggle}
                      disabled={isSaving}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm font-medium ${
                        currentPage?.isPublished
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      } disabled:opacity-50`}
                      title={currentPage?.isPublished ? "Ấy trang" : "Phát hành trang"}
                    >
                      {currentPage?.isPublished ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                      {currentPage?.isPublished ? "Công khai" : "Ẩn"}
                    </button>
                    <button
                      onClick={handleSavePage}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium"
                    >
                      <Save size={18} />
                      Lưu
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Blocks Editor */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
              {currentPage.blocks && currentPage.blocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Không có block nào. Sử dụng các nút bên dưới để thêm nội dung.
                </div>
              ) : (
                currentPage.blocks?.map((block, blockIndex) => (
                  <div
                    key={block.id}
                    className="group bg-white rounded-xl border border-transparent hover:border-blue-200 shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    {/* ── Block Content ─────────────────────────── */}
                    <div className="p-4">
                      {block.type === "VIDEO" && (
                        <VideoBlockComponent
                          id={block.id}
                          videoUrl={block.videoUrl}
                          videoType={block.videoType}
                          poster={block.poster}
                          interactions={block.interactions}
                          onUpdate={(data) => handleUpdateBlock(block.id, data)}
                          onDelete={() => handleBlockDelete(block.id)}
                          onEditDone={() => setVideoEditingId(null)}
                          isEditing={videoEditingId === block.id}
                        />
                      )}

                      {block.type === "DOCUMENT" && (
                        <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <p className="text-sm">Block Bài giảng không còn hỗ trợ. Vui lòng sử dụng CanvaMini để tạo slide.</p>
                          {!readOnly && <button onClick={() => handleBlockDelete(block.id)} className="mt-2 text-xs text-red-400 hover:text-red-600">Xóa block</button>}
                        </div>
                      )}

                      {block.type === "QUIZ" && (
                        <div className="p-4 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <p className="text-sm">Block Quiz không còn hỗ trợ. Vui lòng sử dụng hệ thống kiểm tra ở trang chủ.</p>
                          {!readOnly && <button onClick={() => handleBlockDelete(block.id)} className="mt-2 text-xs text-red-400 hover:text-red-600">Xóa block</button>}
                        </div>
                      )}

                      {block.type === "CANVA" && (
                        <CanvaBlockComponent
                          block={block}
                          onDelete={() => handleBlockDelete(block.id)}
                          readOnly={readOnly}
                          onBlockUpdate={handleUpdateBlock}
                        />
                      )}

                      {block.type === "RICH_TEXT" && (
                        <RichTextBlockComponent
                          id={block.id}
                          content={block.richTextContent || block.content || ''}
                          onUpdate={(data) => handleUpdateBlock(block.id, data)}
                          onDelete={() => handleBlockDelete(block.id)}
                          readOnly={readOnly}
                        />
                      )}

                      {block.type === "TEXT" && (
                        <RichTextBlockComponent
                          id={block.id}
                          content={block.content || ''}
                          onUpdate={(data) => handleUpdateBlock(block.id, data)}
                          onDelete={() => handleBlockDelete(block.id)}
                          readOnly={readOnly}
                        />
                      )}

                      {block.type === "FLASHCARD" && (
                        <FlashcardBlockComponent
                          id={block.id}
                          title={block.flashcardTitle || 'Flashcards'}
                          cards={block.flashcards || []}
                          onUpdate={(data) => handleUpdateBlock(block.id, data)}
                          onDelete={() => handleBlockDelete(block.id)}
                          readOnly={readOnly}
                        />
                      )}

                      {block.type === "EMBED" && (
                        <EmbedBlockComponent
                          id={block.id}
                          content={block.content}
                          onUpdate={(data) => handleUpdateBlock(block.id, data)}
                          onDelete={() => handleBlockDelete(block.id)}
                          readOnly={readOnly}
                        />
                      )}
                    </div>

                    {/* ── Block Action Bar (bottom strip, no overlap) ── */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity border-t border-gray-100 bg-gray-50 px-3 py-1.5 flex items-center justify-end gap-2">
                      {/* Block controls */}
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          {block.type === "VIDEO" && (
                            <button
                              onClick={() => setVideoEditingId(block.id)}
                              title="Chỉnh sửa video"
                              className="p-1.5 hover:bg-white rounded-lg transition text-indigo-600 border border-transparent hover:border-gray-200"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleMoveBlockUp(blockIndex)}
                            disabled={blockIndex === 0}
                            title="Di chuyển lên"
                            className="p-1.5 hover:bg-white rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed text-blue-600 border border-transparent hover:border-gray-200"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            onClick={() => handleMoveBlockDown(blockIndex)}
                            disabled={blockIndex === currentPage.blocks.length - 1}
                            title="Di chuyển xuống"
                            className="p-1.5 hover:bg-white rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed text-blue-600 border border-transparent hover:border-gray-200"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            onClick={() => handleBlockDelete(block.id)}
                            title="Xóa block"
                            className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500 hover:text-red-700 border border-transparent hover:border-red-200"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

            </div>

            {/* Block Toolbar */}
            {!readOnly && <BlockToolbar pageId={currentPage.id} onBlockAdded={handleBlockUpdated} />}
          </>
        ) : isCreatingNew || (pages.length === 0 && initialTitle) ? (
          /* New Page Form */
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b p-4">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Tạo bài giảng mới</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiêu đề bài giảng *
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tiêu đề bài giảng"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (URL) *
                    </label>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="bai-giang-toan-hoc"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL: /{editSlug}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả (tùy chọn)
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Mô tả ngắn về bài giảng"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setIsCreatingNew(false);
                        setEditTitle("");
                        setEditSlug("");
                        setEditDescription("");
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleCreateNewPage}
                      disabled={isLoading || !editTitle.trim() || !editSlug.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Tạo bài giảng
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex-1 p-6 bg-gray-50">
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Xem trước</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-500">Tiêu đề:</span>
                      <p className="font-medium text-gray-900">{editTitle || "Chưa có tiêu đề"}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">URL:</span>
                      <p className="font-mono text-sm text-blue-600">/{editSlug || "slug"}</p>
                    </div>
                    {editDescription && (
                      <div>
                        <span className="text-sm text-gray-500">Mô tả:</span>
                        <p className="text-gray-700">{editDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Chọn một trang để bắt đầu chỉnh sửa
          </div>
        )}
      </div>
    </div>
  );
}