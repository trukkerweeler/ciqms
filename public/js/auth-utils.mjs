// Authentication utilities for client-side
import { getApiUrl } from "./utils.mjs";

let apiUrl = "";

// Initialize API URL on first use
async function ensureApiUrl() {
  if (!apiUrl) {
    apiUrl = await getApiUrl();
  }
}

// Check if user is logged in
export async function checkAuthStatus() {
  await ensureApiUrl();
  try {
    const response = await fetch(`${apiUrl}/auth/status`, {
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
  await ensureApiUrl();
  const authStatus = await checkAuthStatus();

  if (!authStatus.loggedIn) {
    // Redirect to login page
    window.location.href = `${apiUrl}/login.html`;
    return false;
  }

  return true;
}

// Logout function
export async function logout() {
  await ensureApiUrl();
  try {
    const response = await fetch(`${apiUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      // Redirect to login page
      window.location.href = `${apiUrl}/login.html`;
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
