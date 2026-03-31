// User service for authentication and user management
import { IUser, LoginRequest, RegisterRequest, AuthResponse } from "@/types";

/**
 * Login user
 */
export async function loginUser(data: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Đăng nhập thất bại");
    }
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Register user
 */
export async function registerUser(data: RegisterRequest & { activationCode?: string }): Promise<AuthResponse> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Đăng ký thất bại");
    }
    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<IUser> {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Logout failed");
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<IUser[]> {
  try {
    const response = await fetch("/api/users");
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<IUser> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error("Failed to fetch user");
    return response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
