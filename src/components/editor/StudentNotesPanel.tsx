'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  StickyNote, Highlighter, Bookmark, MessageSquare, 
  Plus, X, Edit2, Trash2, Search, Filter,
  ChevronDown, ChevronUp, Star, Clock, Tag
} from 'lucide-react';

interface Note {
  id: string;
  type: 'highlight' | 'sticky' | 'bookmark' | 'comment';
  content: string;
  color?: string;
  pageId: string;
  blockId?: string;
  position?: { x: number; y: number };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface StudentNotesPanelProps {
  studentId: string;
  pageId: string;
  blockId?: string;
  onHighlight?: (text: string, color: string) => void;
  onNoteCreate?: (note: Partial<Note>) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Vàng', value: '#fef08a', border: '#fde047' },
  { name: 'Xanh lá', value: '#bbf7d0', border: '#86efac' },
  { name: 'Xanh dương', value: '#bfdbfe', border: '#93c5fd' },
  { name: 'Hồng', value: '#fbcfe8', border: '#f9a8d4' },
  { name: 'Cam', value: '#fed7aa', border: '#fdba74' },
  { name: 'Tím', value: '#ddd6fe', border: '#c4b5fd' },
];

export default function StudentNotesPanel({
  studentId,
  pageId,
  blockId,
  onHighlight,
  onNoteCreate
}: StudentNotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'highlight' | 'sticky' | 'bookmark'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'sticky' | 'bookmark'>('sticky');
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightColors, setShowHighlightColors] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    const savedNotes = localStorage.getItem(`student_notes_${studentId}_${pageId}`);
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes);
        setNotes(parsed);
      } catch {
        console.error('Failed to parse notes');
      }
    }
  }, [studentId, pageId]);

  // Save notes to localStorage
  const saveNotes = useCallback((updatedNotes: Note[]) => {
    localStorage.setItem(`student_notes_${studentId}_${pageId}`, JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
  }, [studentId, pageId]);

  // Handle text selection for highlighting
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);

  // Create highlight
  const handleCreateHighlight = (color: string) => {
    if (!selectedText) return;

    const newNote: Note = {
      id: `note_${Date.now()}`,
      type: 'highlight',
      content: selectedText,
      color: color,
      pageId,
      blockId,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = [...notes, newNote];
    saveNotes(updatedNotes);
    setSelectedText('');
    setShowHighlightColors(false);
    
    if (onHighlight) {
      onHighlight(selectedText, color);
    }
    if (onNoteCreate) {
      onNoteCreate(newNote);
    }
  };

  // Create note
  const handleCreateNote = () => {
    if (!newNoteContent.trim()) return;

    const newNote: Note = {
      id: `note_${Date.now()}`,
      type: newNoteType,
      content: newNoteContent,
      color: newNoteType === 'sticky' ? selectedColor : undefined,
      pageId,
      blockId,
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = [...notes, newNote];
    saveNotes(updatedNotes);
    setNewNoteContent('');
    setShowNewNote(false);
    
    if (onNoteCreate) {
      onNoteCreate(newNote);
    }
  };

  // Edit note
  const handleEditNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setEditingNoteId(noteId);
      setEditContent(note.content);
    }
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingNoteId || !editContent.trim()) return;

    const updatedNotes = notes.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: editContent, updatedAt: new Date().toISOString() }
        : note
    );
    saveNotes(updatedNotes);
    setEditingNoteId(null);
    setEditContent('');
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    if (confirm('Bạn có chắc muốn xóa ghi chú này?')) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      saveNotes(updatedNotes);
    }
  };

  // Toggle bookmark
  const handleToggleBookmark = (noteId: string) => {
    const updatedNotes = notes.map(note =>
      note.id === noteId
        ? { ...note, tags: note.tags?.includes('starred') 
            ? note.tags.filter(t => t !== 'starred') 
            : [...(note.tags || []), 'starred'] 
          }
        : note
    );
    saveNotes(updatedNotes);
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    // Filter by type
    if (activeTab !== 'all' && note.type !== activeTab) return false;
    
    // Filter by search
    if (searchQuery && !note.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Group notes by type
  const groupedNotes = {
    highlight: filteredNotes.filter(n => n.type === 'highlight'),
    sticky: filteredNotes.filter(n => n.type === 'sticky'),
    bookmark: filteredNotes.filter(n => n.type === 'bookmark'),
    comment: filteredNotes.filter(n => n.type === 'comment'),
  };

  // Stats
  const stats = {
    total: notes.length,
    highlights: notes.filter(n => n.type === 'highlight').length,
    sticky: notes.filter(n => n.type === 'sticky').length,
    bookmarks: notes.filter(n => n.type === 'bookmark').length,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'highlight': return <Highlighter size={14} />;
      case 'sticky': return <StickyNote size={14} />;
      case 'bookmark': return <Bookmark size={14} />;
      case 'comment': return <MessageSquare size={14} />;
      default: return <StickyNote size={14} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'highlight': return 'Highlight';
      case 'sticky': return 'Ghi chú';
      case 'bookmark': return 'Bookmark';
      case 'comment': return 'Bình luận';
      default: return 'Khác';
    }
  };

  return (
    <div className={`fixed right-4 bottom-4 z-50 transition-all duration-300 ${isExpanded ? 'w-80' : 'w-12'}`}>
      {/* Collapsed Toggle */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition relative"
        >
          <StickyNote size={20} />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notes.length}
            </span>
          )}
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[500px]">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <StickyNote size={18} className="text-blue-600" />
              <h3 className="font-semibold text-gray-800">Ghi chú của tôi</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {stats.total}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-white/50 rounded transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="p-2 border-b border-gray-100 flex gap-2">
            {selectedText && (
              <div className="relative">
                <button
                  onClick={() => setShowHighlightColors(!showHighlightColors)}
                  className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200 transition"
                >
                  <Highlighter size={12} />
                  Highlight
                  <ChevronDown size={12} />
                </button>
                {showHighlightColors && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <p className="text-xs text-gray-500 mb-2">Chọn màu:</p>
                    <div className="flex gap-1">
                      {HIGHLIGHT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => handleCreateHighlight(color.value)}
                          className="w-6 h-6 rounded border-2 hover:scale-110 transition"
                          style={{ 
                            backgroundColor: color.value,
                            borderColor: color.border
                          }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => {
                setNewNoteType('sticky');
                setShowNewNote(true);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition"
            >
              <Plus size={12} />
              Ghi chú
            </button>
            <button
              onClick={() => {
                setNewNoteType('bookmark');
                setShowNewNote(true);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition"
            >
              <Bookmark size={12} />
              Bookmark
            </button>
          </div>

          {/* Search & Filter */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm ghi chú..."
                className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-1 mt-2">
              {['all', 'highlight', 'sticky', 'bookmark'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-2 py-1 text-xs rounded transition ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'all' ? 'Tất cả' : getTypeLabel(tab)}
                </button>
              ))}
            </div>
          </div>

          {/* New Note Form */}
          {showNewNote && (
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                {getIcon(newNoteType)}
                <span className="text-sm font-medium">
                  {newNoteType === 'sticky' ? 'Thêm ghi chú' : 'Thêm bookmark'}
                </span>
              </div>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder={newNoteType === 'sticky' ? 'Nhập nội dung ghi chú...' : 'Nhập mô tả bookmark...'}
                className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={3}
                autoFocus
              />
              {newNoteType === 'sticky' && (
                <div className="flex gap-1 mt-2">
                  {HIGHLIGHT_COLORS.slice(0, 4).map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-6 h-6 rounded border-2 transition ${
                        selectedColor === color.value ? 'ring-2 ring-blue-500' : ''
                      }`}
                      style={{ 
                        backgroundColor: color.value,
                        borderColor: color.border
                      }}
                    />
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setShowNewNote(false);
                    setNewNoteContent('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateNote}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Lưu
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <StickyNote size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Chưa có ghi chú nào</p>
                <p className="text-xs mt-1">Highlight văn bản hoặc thêm ghi chú mới</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-2 rounded-lg border transition hover:shadow-sm ${
                    note.type === 'highlight' 
                      ? 'border-l-4' 
                      : note.type === 'sticky'
                      ? 'border-l-4'
                      : 'border border-gray-200'
                  }`}
                  style={{
                    backgroundColor: note.type === 'highlight' 
                      ? `${note.color}40` 
                      : note.type === 'sticky'
                      ? `${note.color}30`
                      : 'white',
                    borderLeftColor: note.color || '#e5e7eb'
                  }}
                >
                  {editingNoteId === note.id ? (
                    <div>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex justify-end gap-1 mt-1">
                        <button
                          onClick={() => setEditingNoteId(null)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            {getIcon(note.type)}
                            <span className="text-xs text-gray-500">
                              {getTypeLabel(note.type)}
                            </span>
                            {note.tags?.includes('starred') && (
                              <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className={`text-sm ${note.type === 'highlight' ? 'italic' : ''}`}>
                            {note.content}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <Clock size={10} />
                            {new Date(note.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleBookmark(note.id)}
                            className="p-1 hover:bg-white/50 rounded transition"
                            title={note.tags?.includes('starred') ? 'Bỏ đánh dấu' : 'Đánh dấu'}
                          >
                            <Star 
                              size={14} 
                              className={note.tags?.includes('starred') ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} 
                            />
                          </button>
                          <button
                            onClick={() => handleEditNote(note.id)}
                            className="p-1 hover:bg-white/50 rounded transition text-gray-400 hover:text-blue-600"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 hover:bg-white/50 rounded transition text-gray-400 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{stats.highlights} highlights</span>
              <span>{stats.sticky} ghi chú</span>
              <span>{stats.bookmarks} bookmarks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}