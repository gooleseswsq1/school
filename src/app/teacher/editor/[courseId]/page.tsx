"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import PageEditor from "@/components/editor/PageEditor";
import { getAuthUser } from "@/lib/auth-storage";
import { Loader } from "lucide-react";

function EditorContent() {
  const params = useParams();
  const courseId = params.courseId as string;
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

  return <PageEditor authorId={authorId} courseId={courseId} />;
}

export default function TeacherEditorPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader className="animate-spin" /></div>}>
      <EditorContent />
    </Suspense>
  );
}
