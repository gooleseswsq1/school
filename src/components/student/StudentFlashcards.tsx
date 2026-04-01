'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Edit2, Brain, RotateCcw, ChevronLeft, ChevronRight, Shuffle, Star, StarOff, X } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isStarred?: boolean;
}

interface FlashcardSet {
  id: string;
  title: string;
  cards: Flashcard[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'student-flashcard-sets';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function loadSets(): FlashcardSet[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSets(sets: FlashcardSet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
}

/* ─── Study Mode ───────────────────────────────────────── */
function StudyMode({ set, onBack }: { set: FlashcardSet; onBack: () => void }) {
  const [cards, setCards] = useState(set.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0, incorrect: 0 });

  const card = cards[currentIndex];

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setIsFlipped(false);
    }
  };

  const handleRate = (correct: boolean) => {
    setStats(s => ({
      reviewed: s.reviewed + 1,
      correct: s.correct + (correct ? 1 : 0),
      incorrect: s.incorrect + (correct ? 0 : 1),
    }));
    handleNext();
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Bộ thẻ này chưa có thẻ nào</p>
        <button onClick={onBack} className="text-blue-600 hover:underline">← Quay lại</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft size={18} /> Quay lại
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{set.title}</h2>
        <button onClick={handleShuffle} className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800">
          <Shuffle size={16} /> Trộn
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
        <span>{currentIndex + 1} / {cards.length}</span>
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }} />
        </div>
        {stats.reviewed > 0 && (
          <span className="text-xs">
            ✅ {stats.correct} · ❌ {stats.incorrect}
          </span>
        )}
      </div>

      {/* Card */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 min-h-[250px] flex items-center justify-center cursor-pointer select-none shadow-lg hover:shadow-xl transition-all"
      >
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-3">
            {isFlipped ? '📝 Đáp án' : '❓ Câu hỏi'} · Nhấn để lật
          </div>
          <div className="text-xl font-medium text-gray-900 dark:text-white whitespace-pre-wrap">
            {isFlipped ? card.back : card.front}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
          <ChevronLeft size={20} />
        </button>
        {isFlipped && (
          <>
            <button onClick={() => handleRate(false)} className="px-5 py-2.5 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition text-sm">
              ❌ Chưa nhớ
            </button>
            <button onClick={() => handleRate(true)} className="px-5 py-2.5 rounded-xl bg-green-100 text-green-700 font-medium hover:bg-green-200 transition text-sm">
              ✅ Đã nhớ
            </button>
          </>
        )}
        <button onClick={handleNext} disabled={currentIndex === cards.length - 1} className="p-3 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

/* ─── Edit Set Modal ───────────────────────────────────── */
function EditSetModal({ set, onSave, onClose }: {
  set: FlashcardSet | null;
  onSave: (data: { title: string; cards: Flashcard[] }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(set?.title || '');
  const [cards, setCards] = useState<Flashcard[]>(set?.cards || []);

  const addCard = () => {
    setCards([...cards, { id: generateId(), front: '', back: '', difficulty: 'medium' }]);
  };

  const updateCard = (id: string, field: keyof Flashcard, value: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCard = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 z-200 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {set ? 'Chỉnh sửa bộ thẻ' : 'Tạo bộ thẻ mới'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tên bộ thẻ</label>
          <input
            id="flashcard-set-title"
            name="flashcardSetTitle"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="VD: Từ vựng Tiếng Anh Unit 1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-3 mb-4">
          {cards.map((card, index) => (
            <div key={card.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500">Thẻ {index + 1}</span>
                <button onClick={() => removeCard(card.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                id={`flashcard-front-${card.id}`}
                name={`flashcardFront-${card.id}`}
                value={card.front}
                onChange={e => updateCard(card.id, 'front', e.target.value)}
                placeholder="Mặt trước (câu hỏi)"
                className="w-full px-3 py-2 mb-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <input
                id={`flashcard-back-${card.id}`}
                name={`flashcardBack-${card.id}`}
                value={card.back}
                onChange={e => updateCard(card.id, 'back', e.target.value)}
                placeholder="Mặt sau (đáp án)"
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <button onClick={addCard} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition mb-4">
          <Plus size={16} className="inline mr-1" /> Thêm thẻ
        </button>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={() => {
              if (!title.trim()) return;
              onSave({ title: title.trim(), cards: cards.filter(c => c.front.trim() || c.back.trim()) });
            }}
            disabled={!title.trim()}
            className="flex-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition px-6"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */
export default function StudentFlashcards() {
  const { user, isLoading } = useAuth({ requiredRole: 'STUDENT' });
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [studyingSet, setStudyingSet] = useState<FlashcardSet | null>(null);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null | 'new'>(null);

  useEffect(() => {
    setSets(loadSets());
  }, []);

  const handleSaveSet = (data: { title: string; cards: Flashcard[] }) => {
    let updated: FlashcardSet[];
    if (editingSet === 'new') {
      const newSet: FlashcardSet = {
        id: generateId(),
        title: data.title,
        cards: data.cards,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated = [newSet, ...sets];
    } else if (editingSet) {
      updated = sets.map(s => s.id === (editingSet as FlashcardSet).id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
    } else {
      return;
    }
    setSets(updated);
    saveSets(updated);
    setEditingSet(null);
  };

  const handleDeleteSet = (id: string) => {
    const updated = sets.filter(s => s.id !== id);
    setSets(updated);
    saveSets(updated);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (studyingSet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
        <StudyMode set={studyingSet} onBack={() => setStudyingSet(null)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/student" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
              <ArrowLeft size={20} className="text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flashcard</h1>
              <p className="text-sm text-gray-500">Tạo bộ thẻ ghi nhớ để ôn tập</p>
            </div>
          </div>
          <button
            onClick={() => setEditingSet('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition"
          >
            <Plus size={16} /> Tạo bộ thẻ
          </button>
        </div>

        {/* Sets Grid */}
        {sets.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Chưa có bộ thẻ nào</h3>
            <p className="text-gray-500 mb-6">Tạo bộ thẻ đầu tiên để bắt đầu ôn tập!</p>
            <button
              onClick={() => setEditingSet('new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700"
            >
              <Plus size={16} /> Tạo bộ thẻ
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map(set => (
              <div key={set.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-lg transition group">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Brain size={20} className="text-purple-600" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditingSet(set)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteSet(set.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{set.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{set.cards.length} thẻ</p>
                  <button
                    onClick={() => setStudyingSet(set)}
                    className="w-full py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm font-semibold hover:bg-purple-100 transition"
                  >
                    Học ngay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSet && (
        <EditSetModal
          set={editingSet === 'new' ? null : editingSet}
          onSave={handleSaveSet}
          onClose={() => setEditingSet(null)}
        />
      )}
    </div>
  );
}
