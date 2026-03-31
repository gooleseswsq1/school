"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PageEditor from "@/components/editor/PageEditor";
import { getAuthUser } from "@/lib/auth-storage";
import { Loader } from "lucide-react";

function EditorContent() {
  const searchParams = useSearchParams();
  const title = searchParams.get("title");
  const pageId = searchParams.get("pageId");
  const [authorId, setAuthorId] = useState<string>("");

  useEffect(() => {
    // Get logged-in user using new persistent auth storage
    const user = getAuthUser();
    if (user) {
      setAuthorId(user.id);
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
