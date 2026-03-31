'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Link2, Image, Code, Sigma, Trash2,
  Heading1, Heading2, Heading3, Quote, Undo, Redo, Palette
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface RichTextBlockProps {
  id: string;
  content?: string;
  onUpdate?: (data: { content: string }) => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  heading: 0 | 1 | 2 | 3;
  list: 'none' | 'bullet' | 'ordered';
  blockquote: boolean;
}

const COLORS = [
  '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#db2777'
];

export default function RichTextBlockComponent({ 
  id, 
  content = '', 
  onUpdate, 
  onDelete,
  readOnly = false 
}: RichTextBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [latexInput, setLatexInput] = useState('');
  const [showLatexInput, setShowLatexInput] = useState(false);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
    heading: 0,
    list: 'none',
    blockquote: false
  });

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && content && !isEditing) {
      editorRef.current.innerHTML = content;
    }
  }, [content, isEditing]);

  // Save content
  const saveContent = useCallback(() => {
    if (editorRef.current && onUpdate) {
      const html = editorRef.current.innerHTML;
      onUpdate({ content: html });
    }
  }, [onUpdate]);

  // Execute command for formatting
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateFormatState();
    saveContent();
  }, [saveContent]);

  // Update format state based on current selection
  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      align: document.queryCommandState('justifyCenter') ? 'center' 
           : document.queryCommandState('justifyRight') ? 'right' 
           : 'left',
      heading: 0,
      list: 'none',
      blockquote: false
    });
  }, []);

  // Handle text formatting
  const handleBold = () => execCommand('bold');
  const handleItalic = () => execCommand('italic');
  const handleUnderline = () => execCommand('underline');
  const handleAlign = (align: 'left' | 'center' | 'right') => {
    const command = align === 'left' ? 'justifyLeft' 
                  : align === 'center' ? 'justifyCenter' 
                  : 'justifyRight';
    execCommand(command);
  };

  // Handle headings
  const handleHeading = (level: 1 | 2 | 3) => {
    execCommand('formatBlock', `h${level}`);
  };

  // Handle lists
  const handleList = (type: 'bullet' | 'ordered') => {
    const command = type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList';
    execCommand(command);
  };

  // Handle blockquote
  const handleBlockquote = () => {
    execCommand('formatBlock', 'blockquote');
  };

  // Handle undo/redo
  const handleUndo = () => execCommand('undo');
  const handleRedo = () => execCommand('redo');

  // Handle color
  const handleColor = (color: string) => {
    execCommand('foreColor', color);
    setShowColorPicker(false);
  };

  // Handle link insertion
  const handleInsertLink = () => {
    if (linkUrl) {
      execCommand('createLink', linkUrl);
      setLinkUrl('');
      setShowLinkDialog(false);
    }
  };

  // Handle image insertion
  const handleInsertImage = () => {
    const url = prompt('Nhập URL hình ảnh:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  // Handle code block
  const handleCodeBlock = () => {
    execCommand('formatBlock', 'pre');
  };

  // Handle LaTeX insertion
  const handleInsertLatex = () => {
    if (latexInput && editorRef.current) {
      const latexHtml = `<span class="latex-inline" data-latex="${latexInput}">${latexInput}</span>`;
      document.execCommand('insertHTML', false, latexHtml);
      setLatexInput('');
      setShowLatexInput(false);
      saveContent();
    }
  };

  // Handle input changes
  const handleInput = () => {
    updateFormatState();
    saveContent();
  };

  // Handle key shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          handleBold();
          break;
        case 'i':
          e.preventDefault();
          handleItalic();
          break;
        case 'u':
          e.preventDefault();
          handleUnderline();
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
          break;
      }
    }
  };

  // Render LaTeX content
  const renderLatex = (text: string) => {
    // Simple regex to find LaTeX patterns
    const latexRegex = /\$\$(.*?)\$\$/g;
    const parts = text.split(latexRegex);
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is LaTeX content
        try {
          return <BlockMath key={index} math={part} />;
        } catch {
          return <span key={index} className="text-red-500">[LaTeX Error: {part}]</span>;
        }
      }
      return part;
    });
  };

  if (readOnly) {
    return (
      <div 
        className="prose prose-sm max-w-none rich-text-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-gray-200 p-2 flex flex-wrap items-center gap-1 bg-gray-50">
          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={handleRedo}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Text Formatting */}
          <button
            onClick={handleBold}
            className={`p-1.5 rounded transition ${formatState.bold ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={handleItalic}
            className={`p-1.5 rounded transition ${formatState.italic ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={handleUnderline}
            className={`p-1.5 rounded transition ${formatState.underline ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Headings */}
          <button
            onClick={() => handleHeading(1)}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => handleHeading(2)}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>
          <button
            onClick={() => handleHeading(3)}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Heading 3"
          >
            <Heading3 size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Alignment */}
          <button
            onClick={() => handleAlign('left')}
            className={`p-1.5 rounded transition ${formatState.align === 'left' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => handleAlign('center')}
            className={`p-1.5 rounded transition ${formatState.align === 'center' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => handleAlign('right')}
            className={`p-1.5 rounded transition ${formatState.align === 'right' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-200'}`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Lists */}
          <button
            onClick={() => handleList('bullet')}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => handleList('ordered')}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Ordered List"
          >
            <ListOrdered size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Blockquote */}
          <button
            onClick={handleBlockquote}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Quote"
          >
            <Quote size={16} />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Color */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1.5 hover:bg-gray-200 rounded transition"
              title="Text Color"
            >
              <Palette size={16} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="grid grid-cols-8 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColor(color)}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Link */}
          <button
            onClick={() => setShowLinkDialog(true)}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Insert Link"
          >
            <Link2 size={16} />
          </button>

          {/* Image */}
          <button
            onClick={handleInsertImage}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Insert Image"
          >
            <Image size={16} />
          </button>

          {/* Code */}
          <button
            onClick={handleCodeBlock}
            className="p-1.5 hover:bg-gray-200 rounded transition"
            title="Code Block"
          >
            <Code size={16} />
          </button>

          {/* LaTeX */}
          <button
            onClick={() => setShowLatexInput(true)}
            className="p-1.5 hover:bg-gray-200 rounded transition text-purple-600"
            title="Insert LaTeX Formula"
          >
            <Sigma size={16} />
          </button>

          {/* Delete */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-100 rounded transition text-red-500 ml-auto"
              title="Delete Block"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        className="min-h-[150px] p-4 focus:outline-none rich-text-editor"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsEditing(true)}
        onBlur={() => {
          setIsEditing(false);
          saveContent();
        }}
        suppressContentEditableWarning
      />

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Chèn liên kết</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleInsertLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Chèn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LaTeX Input Dialog */}
      {showLatexInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Chèn công thức LaTeX</h3>
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="Ví dụ: \frac{a}{b} hoặc x^2 + y^2 = r^2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoFocus
            />
            {latexInput && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Xem trước:</p>
                <div className="latex-preview">
                  <InlineMath math={latexInput} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowLatexInput(false);
                  setLatexInput('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleInsertLatex}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Chèn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}