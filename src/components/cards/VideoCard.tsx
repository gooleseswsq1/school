"use client";

// Card component for displaying video
export default function VideoCard({ 
  title, 
  author, 
  thumbnail 
}: { 
  title: string; 
  author: string; 
  thumbnail?: string 
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="bg-gray-200 h-40 flex items-center justify-center">
        {thumbnail ? (
          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500">Video</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">Giáo viên: {author}</p>
      </div>
    </div>
  );
}
