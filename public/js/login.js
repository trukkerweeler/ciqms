import { loadHeaderFooter, getApiUrl } from "./utils.mjs";
loadHeaderFooter();

const btnLogin = document.getElementById("btnLogin");
btnLogin.addEventListener("click", async () => {
  const username = document.getElementById("username").value.toUpperCase();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    const errorMsg = document.getElementById("errorMsg");
    errorMsg.textContent = "Please enter both username and password";
    return;
  }

  // Use the auth endpoint for login
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/auth/login`;
  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      credentials: "include", // Important for session cookies
    });

    const data = await response.json();

    if (response.status === 200) {
      // Login successful, redirect to main page
      window.location.href = `${apiUrl}/index.html`;
    } else {
      // Login failed, show error message
      const errorMsg = document.getElementById("errorMsg");
      errorMsg.textContent =
        data.message || "Username or password is incorrect";
    }
  } catch (err) {
    console.log("Login error:", err);
    const errorMsg = document.getElementById("errorMsg");
    errorMsg.textContent = "Login failed. Please try again.";
  }
});
