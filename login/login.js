import { api } from "../shared/api.js";

document.getElementById("btnLogin").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const data = await api.login(username, password);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    window.location.href = "/editor/editor.html";

  } catch (err) {
    document.getElementById("error").innerText =
      err.body?.error || "Sai thông tin đăng nhập!";
  }
});
