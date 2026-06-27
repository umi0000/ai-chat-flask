const form = document.querySelector("#login-form");
const submitButton = document.querySelector("#login-submit");
const errorBox = document.querySelector("#login-error");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add("is-visible");
}

function clearError() {
  errorBox.textContent = "";
  errorBox.classList.remove("is-visible");
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.join("；");
    }
    if (typeof data === "string") {
      return data;
    }
    return data && data.message ? data.message : "登录失败，请稍后重试";
  } catch (error) {
    return "登录失败，请检查用户名或密码";
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "登录中..." : "登录";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    showError("请输入用户名和密码");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      showError(await readErrorMessage(response));
      return;
    }

    window.location.href = "/chat";
  } catch (error) {
    showError("无法连接后端服务，请确认 Flask 已启动");
  } finally {
    setLoading(false);
  }
});
