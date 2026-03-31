"use client";

// Card component for displaying Word documents
export default function WordCard({ 
  title, 
  author 
}: { 
  title: string; 
  author: string 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="bg-blue-100 h-40 flex items-center justify-center">
        <p className="text-4xl">📄</p>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">Giáo viên: {author}</p>
      </div>
    </div>
  );
}
