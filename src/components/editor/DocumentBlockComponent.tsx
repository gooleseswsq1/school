"use client";

import { useState, useRef } from "react";
import { X, Plus, Download, FileIcon, Edit2, Upload } from "lucide-react";
import toast from "react-hot-toast";

interface Document {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
}

interface DocumentBlockProps {
  id: string;
  documents?: Document[];
  onAddDocument: (data: {
    title: string;
    fileUrl: string;
    fileType: string;
    fileSize?: number;
  }) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  isEditing?: boolean;
}

export default function DocumentBlockComponent({
  id,
  documents = [],
  onAddDocument,
  onDeleteDocument,
  onDelete,
  isEditing = false,
}: DocumentBlockProps) {
  const [isEdit, setIsEdit] = useState(isEditing);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteConfirmBlock, setDeleteConfirmBlock] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [useUrlMode, setUseUrlMode] = useState(false);

  const handleDeleteBlock = async () => {
    if (!deleteConfirmBlock) {
      setDeleteConfirmBlock(true);
      toast("Nhấn lại để xác nhận xóa", {
        icon: "⚠️",
        duration: 3000,
      });
      setTimeout(() => setDeleteConfirmBlock(false), 3000);
      return;
    }

    setIsLoading(true);
    setDeleteConfirmBlock(false);
    try {
      if (onDelete) {
        await onDelete();
        toast.success("Xóa khối tài liệu thành công");
      }
    } catch (error) {
      console.error("Error deleting block:", error);
      toast.error("Lỗi khi xóa khối tài liệu");
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes("pdf")) return "📄";
    if (
      lower.includes("word") ||
      lower.includes("doc") ||
      lower.includes("docx")
    )
      return "📝";
    if (
      lower.includes("power") ||
      lower.includes("ppt") ||
      lower.includes("pptx")
    )
      return "📊";
    if (lower.includes("excel") || lower.includes("xls")) return "📈";
    return "📎";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-generate title from filename if empty
      if (!title) {
        const fileName = selectedFile.name.replace(/\.[^.]+$/, '');
        setTitle(fileName);
      }
      // Auto-detect file type
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      detectFileType(ext);
    }
  };

  const detectFileType = (ext: string) => {
    if (ext === 'pdf') setFileType('pdf');
    else if (['doc', 'docx'].includes(ext)) setFileType('doc');
    else if (['ppt', 'pptx'].includes(ext)) setFileType('ppt');
    else if (['xls', 'xlsx'].includes(ext)) setFileType('xls');
    else setFileType('other');
  };

  const uploadFile = async (fileToUpload: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Lỗi khi tải file lên');
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên tài liệu");
      return;
    }

    if (!useUrlMode && !file) {
      toast.error("Vui lòng chọn file từ máy tính");
      return;
    }

    if (useUrlMode && !fileUrl.trim()) {
      toast.error("Vui lòng nhập URL");
      return;
    }

    if (!fileType.trim()) {
      toast.error("Vui lòng chọn loại tài liệu");
      return;
    }

    setIsLoading(true);
    try {
      let finalUrl = fileUrl;
      
      // Upload file if using file mode
      if (!useUrlMode && file) {
        finalUrl = await uploadFile(file);
      }

      await onAddDocument({
        title,
        fileUrl: finalUrl,
        fileType,
        fileSize: file?.size,
      });

      // Reset form
      setTitle("");
      setFile(null);
      setFileUrl("");
      setFileType("");
      setIsEdit(false);
      setUseUrlMode(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Thêm tài liệu thành công");
    } catch (error) {
      console.error("Error adding document:", error);
      toast.error(error instanceof Error ? error.message : "Lỗi khi thêm tài liệu");
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (deleteConfirmDoc !== documentId) {
      setDeleteConfirmDoc(documentId);
      toast("Nhấn lại để xác nhận xóa", {
        icon: "⚠️",
        duration: 3000,
      });
      setTimeout(() => setDeleteConfirmDoc(null), 3000);
      return;
    }

    setIsLoading(true);
    setDeleteConfirmDoc(null);
    try {
      await onDeleteDocument(documentId);
      toast.success("Xóa tài liệu thành công");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Lỗi khi xóa tài liệu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Block Toolbar - Always show title and delete button if onDelete is provided */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h4 className="font-semibold text-sm">Tài liệu cho học sinh</h4>
        {onDelete && (
          <button
            onClick={handleDeleteBlock}
            disabled={isLoading}
            className={`p-2 rounded-lg transition ${
              deleteConfirmBlock
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "text-red-600 hover:bg-red-50"
            }`}
            title={deleteConfirmBlock ? "Nhấn lại để xác nhận" : "Xóa khối tài liệu"}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Document List */}
      <div className="space-y-2">
        {documents.length === 0 && !isEdit && (
          <p className="text-xs text-center text-gray-400 py-2">Chưa có tài liệu nào</p>
        )}

        {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl shrink-0">
                  {getFileIcon(doc.fileType)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500">
                    {doc.fileType.toUpperCase()}
                    {doc.fileSize && ` • ${(doc.fileSize / 1024 / 1024).toFixed(2)} MB`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <a
                  href={`/api/download?fileUrl=${encodeURIComponent(doc.fileUrl)}&fileName=${encodeURIComponent(doc.fileUrl.split('/').pop() || 'document')}`}
                  download
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Tải xuống"
                >
                  <Download size={18} />
                </a>
                <button
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={isLoading}
                  className={`p-2 rounded-lg transition ${
                    deleteConfirmDoc === doc.id
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "text-red-600 hover:bg-red-50"
                  }`}
                  title={deleteConfirmDoc === doc.id ? "Nhấn lại để xác nhận" : "Xóa"}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

      {/* Add Document Button */}
      <button
        onClick={() => setIsEdit(!isEdit)}
        className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
      >
        <Plus size={18} />
        Thêm tài liệu
      </button>

      {/* Add Document Form */}
      {isEdit && (
        <form onSubmit={handleAddDocument} className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setUseUrlMode(false)}
              className={`flex-1 py-2 px-3 rounded-lg transition font-medium text-sm ${
                !useUrlMode
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Upload size={16} className="inline mr-1" />
              Tải từ máy
            </button>
            <button
              type="button"
              onClick={() => setUseUrlMode(true)}
              className={`flex-1 py-2 px-3 rounded-lg transition font-medium text-sm ${
                useUrlMode
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              URL
            </button>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Tên tài liệu</label>
            <input
              id="doc-title"
              name="documentTitle"
              type="text"
              placeholder="VD: Bài tập về nhà"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
              disabled={isLoading}
            />
          </div>

          {!useUrlMode ? (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Chọn file từ máy tính</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-3 py-8 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <Upload size={24} className="text-blue-600" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    {file ? file.name : "Nhấp để chọn file"}
                  </p>
                  {!file && (
                    <p className="text-xs text-gray-700">hoặc kéo thả file vào đây</p>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isLoading}
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.gif,.bmp,.webp,.rar,.7z,.mp4,.avi,.mov,.mkv,.wmv"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-900 font-medium mb-1">
                    Đang tải: {uploadProgress}%
                  </p>
                  <div className="w-full bg-gray-300 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">URL tài liệu</label>
              <input
                id="doc-url"
                name="documentUrl"
                type="url"
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Loại tài liệu</label>
            <select
              id="doc-type"
              name="documentType"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
              disabled={isLoading}
            >
              <option value="" className="text-gray-700">Chọn loại...</option>
              <option value="pdf" className="text-gray-900">PDF</option>
              <option value="doc" className="text-gray-900">Word (.doc, .docx)</option>
              <option value="ppt" className="text-gray-900">PowerPoint (.ppt, .pptx)</option>
              <option value="xls" className="text-gray-900">Excel (.xls, .xlsx)</option>
              <option value="other" className="text-gray-900">Khác</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-bold"
            >
              {isLoading ? "Đang xử lý..." : "Thêm"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEdit(false);
                setFile(null);
                setFileUrl("");
                setUseUrlMode(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition text-gray-900 font-medium"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
