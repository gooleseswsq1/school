'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  RotateCcw, ChevronLeft, ChevronRight, Shuffle, 
  Plus, Edit2, Trash2, Eye, EyeOff, Star, StarOff,
  Volume2, Check, X, Brain, Zap, Trophy
} from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed?: string;
  nextReview?: string;
  confidence?: number; // 0-5
  reviewCount?: number;
  isStarred?: boolean;
}

interface FlashcardBlockProps {
  id: string;
  title?: string;
  cards?: Flashcard[];
  onUpdate?: (data: { title?: string; cards?: Flashcard[] }) => void;
  onDelete?: () => void;
  readOnly?: boolean;
  studentId?: string;
}

const DIFFICULTY_COLORS = {
  easy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  hard: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
};

const DIFFICULTY_LABELS = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó'
};

export default function FlashcardBlockComponent({
  id,
  title = 'Flashcards',
  cards = [],
  onUpdate,
  onDelete,
  readOnly = false,
  studentId
}: FlashcardBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editCards, setEditCards] = useState<Flashcard[]>(cards);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [mode, setMode] = useState<'study' | 'review' | 'test'>('study');
  const [studyStats, setStudyStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0
  });
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCard, setNewCard] = useState<Partial<Flashcard>>({
    front: '',
    back: '',
    hint: '',
    difficulty: 'medium'
  });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Load progress from localStorage
  useEffect(() => {
    if (studentId) {
      const saved = localStorage.getItem(`flashcard_progress_${studentId}_${id}`);
      if (saved) {
        try {
          const progress = JSON.parse(saved);
          // Update cards with saved progress
          const updatedCards = cards.map(card => {
            const savedCard = progress.find((p: Flashcard) => p.id === card.id);
            return savedCard ? { ...card, ...savedCard } : card;
          });
          setEditCards(updatedCards);
        } catch {
          setEditCards(cards);
        }
      } else {
        setEditCards(cards);
      }
    }
  }, [studentId, id, cards]);

  // Save progress to localStorage
  const saveProgress = useCallback((updatedCards: Flashcard[]) => {
    if (studentId) {
      localStorage.setItem(
        `flashcard_progress_${studentId}_${id}`,
        JSON.stringify(updatedCards)
      );
    }
  }, [studentId, id]);

  // Calculate next review date based on confidence
  const calculateNextReview = (confidence: number): string => {
    const now = new Date();
    const daysToAdd = Math.pow(2, confidence); // Spaced repetition: 1, 2, 4, 8, 16, 32 days
    now.setDate(now.getDate() + daysToAdd);
    return now.toISOString();
  };

  // Handle card flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Handle confidence rating
  const handleRate = (confidence: number) => {
    const updatedCards = [...editCards];
    const card = updatedCards[currentCardIndex];
    updatedCards[currentCardIndex] = {
      ...card,
      confidence,
      lastReviewed: new Date().toISOString(),
      nextReview: calculateNextReview(confidence),
      reviewCount: (card.reviewCount || 0) + 1
    };
    setEditCards(updatedCards);
    saveProgress(updatedCards);

    // Update stats
    setStudyStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correct: confidence >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: confidence < 3 ? prev.incorrect + 1 : prev.incorrect
    }));

    // Move to next card
    if (currentCardIndex < editCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  // Shuffle cards
  const handleShuffle = () => {
    const shuffled = [...editCards].sort(() => Math.random() - 0.5);
    setEditCards(shuffled);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // Reset progress
  const handleReset = () => {
    const resetCards = editCards.map(card => ({
      ...card,
      confidence: 0,
      lastReviewed: undefined,
      nextReview: undefined,
      reviewCount: 0
    }));
    setEditCards(resetCards);
    saveProgress(resetCards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyStats({ reviewed: 0, correct: 0, incorrect: 0 });
  };

  // Toggle star
  const handleToggleStar = (cardId: string) => {
    const updatedCards = editCards.map(card =>
      card.id === cardId ? { ...card, isStarred: !card.isStarred } : card
    );
    setEditCards(updatedCards);
    saveProgress(updatedCards);
  };

  // Add new card
  const handleAddCard = () => {
    if (!newCard.front?.trim() || !newCard.back?.trim()) return;

    const card: Flashcard = {
      id: `card_${Date.now()}`,
      front: newCard.front,
      back: newCard.back,
      hint: newCard.hint,
      difficulty: newCard.difficulty as 'easy' | 'medium' | 'hard',
      confidence: 0,
      reviewCount: 0
    };

    const updatedCards = [...editCards, card];
    setEditCards(updatedCards);
    if (onUpdate) {
      onUpdate({ title: editTitle, cards: updatedCards });
    }
    setNewCard({ front: '', back: '', hint: '', difficulty: 'medium' });
    setShowAddCard(false);
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    if (confirm('Bạn có chắc muốn xóa thẻ này?')) {
      const updatedCards = editCards.filter(card => card.id !== cardId);
      setEditCards(updatedCards);
      if (onUpdate) {
        onUpdate({ title: editTitle, cards: updatedCards });
      }
      if (currentCardIndex >= updatedCards.length) {
        setCurrentCardIndex(Math.max(0, updatedCards.length - 1));
      }
    }
  };

  // Save title
  const handleSaveTitle = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate({ title: editTitle, cards: editCards });
    }
  };

  // Navigation
  const goToNext = () => {
    if (currentCardIndex < editCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  const goToPrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
      setShowHint(false);
    }
  };

  // Parse LaTeX in content
  const renderContent = (content: string) => {
    // Check if content contains LaTeX
    if (content.includes('$')) {
      const parts = content.split(/(\$.*?\$)/g);
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const latex = part.slice(1, -1);
          try {
            return <InlineMath key={index} math={latex} />;
          } catch {
            return <span key={index}>{part}</span>;
          }
        }
        return <span key={index}>{part}</span>;
      });
    }
    return content;
  };

  const currentCard = editCards[currentCardIndex];
  const progress = editCards.length > 0 
    ? Math.round((studyStats.reviewed / editCards.length) * 100) 
    : 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              className="text-lg font-semibold bg-transparent border-b-2 border-purple-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-800">{editTitle}</h3>
              {!readOnly && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-white/50 rounded text-gray-500"
                >
                  <Edit2 size={14} />
                </button>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {editCards.length} thẻ
            </span>
            {!readOnly && onDelete && (
              <button
                onClick={onDelete}
                className="p-1.5 hover:bg-red-100 rounded text-red-500 transition"
                title="Xóa block"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setMode('study')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              mode === 'study' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Eye size={14} className="inline mr-1" />
            Học
          </button>
          <button
            onClick={() => setMode('review')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              mode === 'review' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <RotateCcw size={14} className="inline mr-1" />
            Ôn tập
          </button>
          <button
            onClick={() => setMode('test')}
            className={`px-3 py-1 text-sm rounded-lg transition ${
              mode === 'test' 
                ? 'bg-purple-600 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap size={14} className="inline mr-1" />
            Kiểm tra
          </button>
        </div>
      </div>

      {/* Card Display */}
      {editCards.length > 0 ? (
        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>Thẻ {currentCardIndex + 1}/{editCards.length}</span>
              <span>{progress}% hoàn thành</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <div 
            className="relative perspective-1000 cursor-pointer mb-6"
            onClick={handleFlip}
          >
            <div 
              className={`relative w-full min-h-[250px] transition-transform duration-500 transform-style-preserve-3d ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front */}
              <div 
                className={`absolute inset-0 backface-hidden rounded-xl p-6 flex flex-col items-center justify-center ${
                  isFlipped ? 'invisible' : ''
                } ${DIFFICULTY_COLORS[currentCard.difficulty].bg} border-2 ${DIFFICULTY_COLORS[currentCard.difficulty].border}`}
              >
                <div className="absolute top-3 left-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${DIFFICULTY_COLORS[currentCard.difficulty].bg} ${DIFFICULTY_COLORS[currentCard.difficulty].text}`}>
                    {DIFFICULTY_LABELS[currentCard.difficulty]}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {currentCard.isStarred && (
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStar(currentCard.id);
                    }}
                    className="p-1 hover:bg-white/50 rounded"
                  >
                    {currentCard.isStarred ? (
                      <StarOff size={16} className="text-gray-400" />
                    ) : (
                      <Star size={16} className="text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">MẶT TRƯỚC</p>
                  <p className="text-xl font-medium text-gray-800">
                    {renderContent(currentCard.front)}
                  </p>
                </div>
                {showHint && currentCard.hint && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/80 rounded-lg p-3 text-sm text-gray-600">
                    <strong>Gợi ý:</strong> {currentCard.hint}
                  </div>
                )}
                <div className="absolute bottom-3 text-xs text-gray-400">
                  Nhấp để lật thẻ
                </div>
              </div>

              {/* Back */}
              <div 
                className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl p-6 flex flex-col items-center justify-center bg-white border-2 border-gray-200 ${
                  !isFlipped ? 'invisible' : ''
                }`}
              >
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">MẶT SAU</p>
                  <p className="text-xl font-medium text-gray-800">
                    {renderContent(currentCard.back)}
                  </p>
                </div>
                <div className="absolute bottom-3 text-xs text-gray-400">
                  Nhấp để lật lại
                </div>
              </div>
            </div>
          </div>

          {/* Hint Button */}
          {!isFlipped && currentCard.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="w-full mb-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              {showHint ? 'Ẩn gợi ý' : 'Hiện gợi ý'}
            </button>
          )}

          {/* Rating Buttons (after flip) */}
          {isFlipped && mode !== 'study' && (
            <div className="mb-4">
              <p className="text-sm text-gray-500 text-center mb-3">Bạn nhớ的程度如何?</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRate(rating)}
                    className={`py-3 rounded-lg text-sm font-medium transition ${
                      rating <= 2 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : rating === 3 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rating === 1 && '😵 Không nhớ'}
                    {rating === 2 && '😕 Khó nhớ'}
                    {rating === 3 && '😐 Bình thường'}
                    {rating === 4 && '😊 Nhớ tốt'}
                    {rating === 5 && '🤩 Nhớ很清楚'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrev}
              disabled={currentCardIndex === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
              Trước
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleShuffle}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Xáo trộn"
              >
                <Shuffle size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                title="Đặt lại"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <button
              onClick={goToNext}
              disabled={currentCardIndex === editCards.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Tiếp
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Stats */}
          {mode !== 'study' && studyStats.reviewed > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{studyStats.reviewed}</p>
                  <p className="text-xs text-gray-500">Đã ôn</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{studyStats.correct}</p>
                  <p className="text-xs text-gray-500">Đúng</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{studyStats.incorrect}</p>
                  <p className="text-xs text-gray-500">Sai</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-400">
          <Brain size={48} className="mx-auto mb-3 opacity-50" />
          <p>Chưa có thẻ nào</p>
          {!readOnly && (
            <p className="text-sm mt-1">Nhấn nút + đểThêm thẻ đầu tiên</p>
          )}
        </div>
      )}

      {/* Add Card Button */}
      {!readOnly && (
        <div className="border-t border-gray-200 p-3">
          <button
            onClick={() => setShowAddCard(true)}
            className="w-full py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Plus size={16} />
           Thêm thẻ mới
          </button>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Thêm thẻ mới</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mặt trước <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newCard.front}
                  onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                  placeholder="Nhập câu hỏi hoặc từ vựng..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mặt sau <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newCard.back}
                  onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                  placeholder="Nhập câu trả lời hoặc định nghĩa..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gợi ý (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newCard.hint}
                  onChange={(e) => setNewCard({ ...newCard, hint: e.target.value })}
                  placeholder="Thêm gợi ý nếu cần..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Độ khó
                </label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setNewCard({ ...newCard, difficulty: diff })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        newCard.difficulty === diff
                          ? `${DIFFICULTY_COLORS[diff].bg} ${DIFFICULTY_COLORS[diff].text} ${DIFFICULTY_COLORS[diff].border} border-2`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {DIFFICULTY_LABELS[diff]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddCard(false);
                  setNewCard({ front: '', back: '', hint: '', difficulty: 'medium' });
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleAddCard}
                disabled={!newCard.front?.trim() || !newCard.back?.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}