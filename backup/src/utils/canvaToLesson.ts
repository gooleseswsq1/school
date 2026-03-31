/**
 * Chuyển đổi slidesData từ Canva Mini sang InteractiveLesson format
 * Canva slides → Interactive Lesson slides
 */

interface CanvaSlide {
  id: string;
  canvasData: any;
  audioUrl?: string;
  backgroundColor?: string;
  thumbnail?: string;
  quiz?: {
    id?: string;
    title?: string;
    questions?: any[];
    [key: string]: any;
  };
}

interface CanvaSlidesData {
  slides: CanvaSlide[];
  autoNextAfterAudio?: boolean;
}

// InteractiveLesson types (matches InteractiveLessonCreator.tsx)
interface TextElement {
  type: "text";
  id: string;
  content: string;
}

interface ImageElement {
  type: "image";
  id: string;
  url: string;
  caption?: string;
}

interface QuizElement {
  type: "quiz";
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  feedback?: string;
}

type SlideElement = TextElement | ImageElement | QuizElement;

interface LessonSlide {
  id: string;
  title: string;
  elements: SlideElement[];
}

interface LessonData {
  type: "interactive-lesson";
  title: string;
  slides: LessonSlide[];
  settings: {
    theme: "default" | "dark" | "colorful";
    showProgress: boolean;
  };
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * Trích xuất text từ Fabric.js canvasData
 */
function extractTextsFromCanvas(canvasData: any): string[] {
  if (!canvasData?.objects) return [];
  return canvasData.objects
    .filter((obj: any) => obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text')
    .map((obj: any) => obj.text || '')
    .filter((t: string) => t.trim());
}

/**
 * Parse canvaSlidesData - hỗ trợ cả string JSON và object
 */
function parseCanvaData(slidesData: any): CanvaSlidesData | null {
  try {
    const raw = typeof slidesData === 'string' ? JSON.parse(slidesData) : slidesData;
    const slides: CanvaSlide[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.slides) ? raw.slides : []);
    return {
      slides,
      autoNextAfterAudio: raw?.autoNextAfterAudio ?? true,
    };
  } catch {
    return null;
  }
}

/**
 * Convert Canva slidesData → InteractiveLesson LessonData
 */
export function canvaToLesson(slidesData: any, title?: string): LessonData | null {
  const parsed = parseCanvaData(slidesData);
  if (!parsed || parsed.slides.length === 0) return null;

  const lessonSlides: LessonSlide[] = parsed.slides.map((slide, index) => {
    const elements: SlideElement[] = [];

    // 1. Nếu có thumbnail → thêm image element (ảnh snapshot của slide)
    if (slide.thumbnail) {
      elements.push({
        type: "image",
        id: generateId(),
        url: slide.thumbnail,
        caption: `Slide ${index + 1}`,
      });
    }

    // 2. Trích xuất text từ canvas
    const texts = extractTextsFromCanvas(slide.canvasData);
    for (const text of texts) {
      elements.push({
        type: "text",
        id: generateId(),
        content: text,
      });
    }

    // 3. Nếu có quiz → convert thành quiz elements
    if (slide.quiz?.questions && slide.quiz.questions.length > 0) {
      for (const q of slide.quiz.questions) {
        const options = (q.options || []).map((o: any) =>
          typeof o === 'string' ? o : (o.text || o.label || '')
        );
        const correctIndex = (q.options || []).findIndex((o: any) =>
          typeof o === 'string' ? false : o.isCorrect
        );
        elements.push({
          type: "quiz",
          id: generateId(),
          question: q.questionText || q.question || q.text || '',
          options,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          feedback: q.explanation || undefined,
        });
      }
    }

    // 4. Nếu có audio → thêm ghi chú về audio
    if (slide.audioUrl) {
      elements.push({
        type: "text",
        id: generateId(),
        content: `🔊 Audio: ${slide.audioUrl}`,
      });
    }

    return {
      id: generateId(),
      title: `Slide ${index + 1}`,
      elements,
    };
  });

  return {
    type: "interactive-lesson",
    title: title || "Bài giảng từ Canva",
    slides: lessonSlides,
    settings: {
      theme: "default",
      showProgress: true,
    },
  };
}

export type { LessonData, CanvaSlidesData };
