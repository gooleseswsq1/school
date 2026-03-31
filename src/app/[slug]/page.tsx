import React from "react";
import { Metadata } from "next";
import PublicPageRenderer from "@/components/editor/PublicPageRenderer";

export const metadata: Metadata = {
  title: "Trang bài giảng",
  description: "Xem nội dung bài giảng từ giáo viên",
};

export default function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = React.use(params);

  return <PublicPageRenderer slug={resolvedParams.slug} />;
}
