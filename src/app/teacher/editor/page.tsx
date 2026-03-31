"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PageEditor from "@/components/editor/PageEditor";
import { Loader } from "lucide-react";

function EditorContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title");
  const pageId = searchParams.get("pageId");
  const [authorId, setAuthorId] = useState<string>("");

  useEffect(() => {
    // Get logged-in user from localStorage/sessionStorage
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setAuthorId(user.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  if (!authorId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return <PageEditor authorId={authorId} initialTitle={title || undefined} pageId={pageId || undefined} />;
}

export default function TeacherEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader className="animate-spin" /></div>}>
      <EditorContent />
    </Suspense>
  );
}
