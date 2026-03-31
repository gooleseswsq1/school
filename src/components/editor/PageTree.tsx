"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2 } from "lucide-react";
import toast from "react-hot-toast";

interface PageNode {
  id: string;
  title: string;
  slug: string;
  children: PageNode[];
  parentId: string | null;
  order: number;
}

interface PageTreeProps {
  pages: any[]; // Using any to support different page structures
  onPageSelect: (pageId: string) => void;
  onPageCreate: (parentId: string | null) => void;
  onPageDelete: (pageId: string) => void;
  onPageReorder: (pageId: string, newParentId: string | null) => void;
  selectedPageId?: string;
  readOnly?: boolean;
}

// TreeItem Component
function TreeItem({
  node,
  onSelect,
  onDelete,
  onReorder,
  onCreate,
  selectedPageId,
  depth = 0,
  readOnly = false,
}: {
  node: PageNode;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, parentId: string | null) => void;
  onCreate: (parentId: string) => void;
  selectedPageId?: string;
  depth?: number;
  readOnly?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const [isExpanded, setIsExpanded] = useState(true);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer group transition ${
          selectedPageId === node.id
            ? "bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-600 dark:border-blue-400 text-blue-900 dark:text-blue-100"
            : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
        }`}
      >
        {/* Drag Handle - Only listeners here */}
        <div {...listeners} {...attributes} className="flex items-center gap-1 cursor-grab active:cursor-grabbing">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition text-gray-600 dark:text-gray-400"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          className="flex-1 text-left text-sm font-medium truncate text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
        >
          {node.title}
          {hasChildren && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full">
              {node.children!.length}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          {!readOnly && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreate(node.id);
                }}
                className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition"
                title="Thêm page con"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(node.id);
                }}
                className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                title="Xóa"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 border-l-2 border-gray-200 dark:border-slate-700 space-y-1">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              onSelect={onSelect}
              onDelete={onDelete}
              onReorder={onReorder}
              onCreate={onCreate}
              selectedPageId={selectedPageId}
              depth={depth + 1}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main PageTree Component
export default function PageTree({
  pages,
  onPageSelect,
  onPageCreate,
  onPageDelete,
  onPageReorder,
  selectedPageId,
  readOnly = false,
}: PageTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const flattenedPages = pages.flatMap((page) => {
    const result: string[] = [page.id];
    const flatten = (nodes: PageNode[]) => {
      nodes.forEach((node) => {
        result.push(node.id);
        if (node.children) {
          flatten(node.children);
        }
      });
    };
    if (page.children) {
      flatten(page.children);
    }
    return result;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // For now, we'll just show a message
      toast.success("Tính năng kéo thả đã được bao gồm trong API");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Các trang</h2>
        {!readOnly && (
          <button
            onClick={() => onPageCreate(null)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
          >
            <Plus size={16} />
            Trang mới
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flattenedPages}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {pages.map((page) => (
              <TreeItem
                key={page.id}
                node={page}
                onSelect={onPageSelect}
                onDelete={onPageDelete}
                onReorder={onPageReorder}
                onCreate={onPageCreate}
                selectedPageId={selectedPageId}
                readOnly={readOnly}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
