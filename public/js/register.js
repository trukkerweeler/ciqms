import { loadHeaderFooter, getApiUrl } from "./utils.mjs";
loadHeaderFooter();

const register = document.querySelector("#register");
register.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(register);
  const username = formData.get("username").toLocaleUpperCase();
  const password = formData.get("password");

  const body = { username, password };
  // console.log(body);
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/user`;
  fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    })
    .then((data) => {
      // redirect to login page on success
      window.location.href = "/login.html";
    })
    .catch((err) => {
      err.json().then((errorMessage) => {
        const errorHTML = `
            <div class="alert alert-danger">
                ${errorMessage.message}
            </div>
            `;
        document.querySelector("#error-container").innerHTML = errorHTML;
      });
    });
});
