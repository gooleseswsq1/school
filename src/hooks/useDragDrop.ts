"use client";

import { useCallback } from "react";
import { useDroppable } from "@dnd-kit/core";

/**
 * Hook để tạo droppable area cho drag & drop
 */
export function useDroppableArea(id: string) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
  });

  return {
    setNodeRef,
    isOver,
    active,
  };
}

/**
 * Hook để quản lý drag & drop với callback
 */
export function useDragDropHandler(
  onPageReorder: (pageId: string, newParentId: string) => Promise<void>
) {
  const handleDragEnd = useCallback(
    async (event: any) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      try {
        await onPageReorder(active.id, over.id);
      } catch (error) {
        console.error("Error reordering page:", error);
      }
    },
    [onPageReorder]
  );

  return { handleDragEnd };
}
