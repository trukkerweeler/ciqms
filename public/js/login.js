import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();
const port = myport();

const btnLogin = document.getElementById("btnLogin");
btnLogin.addEventListener("click", async () => {
    const user = document.getElementById("username").value.toUpperCase();
    const password = document.getElementById("password").value;
    // console.log("user: " + user);
 
    // fetch the record with the matching username
    const url = `http://localhost:${port}/user/login`;
    try {
        const response = await fetch(url, { method: "POST", mode: "cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, password }) });
        if (response.status === 200) {
            window.location.href = `http://localhost:${port}/index.html`;
        } else {
            const errorMsg = document.getElementById("errorMsg");
            errorMsg.textContent = "Username or password is incorrect";
        }
    } catch (err) {
        console.log(err);
    }
}
);

