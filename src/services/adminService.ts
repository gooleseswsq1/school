// Admin service for managing activation codes
import { APIResponse } from "@/types";

export interface ActivationCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Generate a new activation code
 */
export async function generateActivationCode(): Promise<{ code: string }> {
  try {
    const response = await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to generate code");
    }
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Get all activation codes
 */
export async function getAllActivationCodes(): Promise<{
  codes: ActivationCode[];
}> {
  try {
    const response = await fetch("/api/admin/codes");
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "Failed to fetch codes");
    }
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
