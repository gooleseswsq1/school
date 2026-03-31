import { create } from 'zustand';

export interface SlideQuizOverlayStyle {
  mode:    'glass' | 'solid';
  bgColor: string;
  opacity: number;
  radius:  number;
  width:   number;
  posX:    number;
  posY:    number;
}

export interface SlideQuiz {
  id?:           string;
  title?:        string;
  questions?:    any[];
  overlayStyle?: SlideQuizOverlayStyle;
  [key: string]: any;
}

export interface Slide {
  id:               string;
  canvasData:       any;
  audioUrl?:        string;
  backgroundColor?: string;
  thumbnail?:       string;
  /** Quiz gắn vào slide — hiển thị overlay khi trình chiếu */
  quiz?:            SlideQuiz;
}

interface SlideStore {
  slides: Slide[];
  currentSlideIndex: number;
  addSlide: () => void;
  deleteSlide: (id: string) => void;
  updateSlide: (id: string, data: Partial<Slide>) => void;
  setCurrentSlide: (index: number) => void;
  reorderSlides: (fromIndex: number, toIndex: number) => void;
  getSlide: (id: string) => Slide | undefined;
  initializeSlides: (slides: Slide[]) => void;
  resetSlides: () => void;
}

export const useSlideStore = create<SlideStore>((set, get) => ({
  slides: [
    {
      id: `slide-${Date.now()}`,
      canvasData: null,
      backgroundColor: '#ffffff',
    },
  ],
  currentSlideIndex: 0,

  addSlide: () =>
    set((state) => ({
      slides: [
        ...state.slides,
        {
          id: `slide-${Date.now()}`,
          canvasData: null,
          backgroundColor: '#ffffff',
        },
      ],
    })),

  deleteSlide: (id) =>
    set((state) => ({
      slides: state.slides.filter((slide) => slide.id !== id),
      currentSlideIndex: Math.max(0, state.currentSlideIndex - 1),
    })),

  updateSlide: (id, data) =>
    set((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === id ? { ...slide, ...data } : slide
      ),
    })),

  setCurrentSlide: (index) =>
    set(() => ({
      currentSlideIndex: index,
    })),

  reorderSlides: (fromIndex, toIndex) =>
    set((state) => {
      const newSlides = [...state.slides];
      const [movedSlide] = newSlides.splice(fromIndex, 1);
      newSlides.splice(toIndex, 0, movedSlide);
      return { slides: newSlides };
    }),

  getSlide: (id) => {
    const { slides } = get();
    return slides.find((slide) => slide.id === id);
  },

  initializeSlides: (newSlides) =>
    set(() => ({
      slides: newSlides && newSlides.length > 0 ? newSlides : [
        {
          id: `slide-${Date.now()}`,
          canvasData: null,
          backgroundColor: '#ffffff',
        },
      ],
      currentSlideIndex: 0,
    })),

  resetSlides: () =>
    set(() => ({
      slides: [
        {
          id: `slide-${Date.now()}`,
          canvasData: null,
          backgroundColor: '#ffffff',
        },
      ],
      currentSlideIndex: 0,
    })),
}));