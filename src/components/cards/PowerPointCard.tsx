"use client";

// Card component for displaying PowerPoint
export default function PowerPointCard({ 
  title, 
  author, 
  pages 
}: { 
  title: string; 
  author: string; 
  pages?: number 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="bg-orange-100 h-40 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl">📊</p>
          <p className="text-orange-600 font-semibold">{pages || 0} trang</p>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">Giáo viên: {author}</p>
      </div>
    </div>
  );
}
