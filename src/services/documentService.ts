// Document service for managing documents
import { IDocument } from "@/types";

/**
 * Fetch all documents
 */
export async function getAllDocuments(): Promise<IDocument[]> {
  try {
    const response = await fetch("/api/documents");
    if (!response.ok) throw new Error("Failed to fetch documents");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Fetch documents by author
 */
export async function getDocumentsByAuthor(authorId: string): Promise<IDocument[]> {
  try {
    const response = await fetch(`/api/documents?authorId=${authorId}`);
    if (!response.ok) throw new Error("Failed to fetch documents");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Fetch document by ID
 */
export async function getDocumentById(id: string): Promise<IDocument> {
  try {
    const response = await fetch(`/api/documents/${id}`);
    if (!response.ok) throw new Error("Failed to fetch document");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Create a new document
 */
export async function createDocument(data: Partial<IDocument>): Promise<IDocument> {
  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create document");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  id: string,
  data: Partial<IDocument>
): Promise<IDocument> {
  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update document");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/documents/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete document");
  } catch (error) {
    console.error(error);
    throw error;
  }
}
