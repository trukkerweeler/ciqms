// Authentication utilities for client-side
import { myport } from "./utils.mjs";

const port = myport();

// Check if user is logged in
export async function checkAuthStatus() {
  try {
    const response = await fetch(`http://localhost:${port}/auth/status`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { loggedIn: false };
  } catch (err) {
    console.error("Auth status check failed:", err);
    return { loggedIn: false };
  }
}

// Redirect to login if not authenticated
export async function requireAuth() {
  const authStatus = await checkAuthStatus();

  if (!authStatus.loggedIn) {
    // Redirect to login page
    window.location.href = `http://localhost:${port}/login.html`;
    return false;
  }

  return true;
}

// Logout function
export async function logout() {
  try {
    const response = await fetch(`http://localhost:${port}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      // Redirect to login page
      window.location.href = `http://localhost:${port}/login.html`;
    }
  } catch (err) {
    console.error("Logout failed:", err);
  }
}

// Get current user info
export async function getCurrentUser() {
  const authStatus = await checkAuthStatus();
  return authStatus.loggedIn ? authStatus.user : null;
}
