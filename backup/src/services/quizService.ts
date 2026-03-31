/**
 * Quiz Service
 * Service functions for managing quizzes
 */

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: Array<{
    id: string;
    optionText: string;
    isCorrect: boolean;
  }>;
  order: number;
}

export interface Quiz {
  id: string;
  title?: string;
  questions: QuizQuestion[];
  blockId?: string;
  order?: number;
}

/**
 * Fetch all quizzes
 */
export async function getAllQuizzes(): Promise<Quiz[]> {
  try {
    const response = await fetch("/api/quiz", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch quizzes");
    return response.json();
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    throw error;
  }
}

/**
 * Fetch quiz by ID
 */
export async function getQuizById(quizId: string): Promise<Quiz> {
  try {
    const response = await fetch(`/api/quiz/${quizId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch quiz");
    return response.json();
  } catch (error) {
    console.error("Error fetching quiz:", error);
    throw error;
  }
}

/**
 * Create a new quiz
 */
export async function createQuiz(data: Partial<Quiz>): Promise<Quiz> {
  try {
    const response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create quiz");
    return response.json();
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
}

/**
 * Update a quiz
 */
export async function updateQuiz(quizId: string, data: Partial<Quiz>): Promise<Quiz> {
  try {
    const response = await fetch(`/api/quiz/${quizId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update quiz");
    return response.json();
  } catch (error) {
    console.error("Error updating quiz:", error);
    throw error;
  }
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string): Promise<void> {
  try {
    const response = await fetch(`/api/quiz/${quizId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete quiz");
  } catch (error) {
    console.error("Error deleting quiz:", error);
    throw error;
  }
}
