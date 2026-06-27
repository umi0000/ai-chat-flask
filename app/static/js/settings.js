const els = {
  currentUsername: document.querySelector("#current-username"),
  userAvatar: document.querySelector("#user-avatar"),
  status: document.querySelector("#status"),
  tabs: Array.from(document.querySelectorAll(".tab")),
  panels: {
    username: document.querySelector("#username-panel"),
    password: document.querySelector("#password-panel"),
  },
  usernameForm: document.querySelector("#username-form"),
  passwordForm: document.querySelector("#password-form"),
  newUsername: document.querySelector("#new-username"),
  oldPassword: document.querySelector("#old-password"),
  newPassword: document.querySelector("#new-password"),
  usernameSubmit: document.querySelector("#username-submit"),
  passwordSubmit: document.querySelector("#password-submit"),
};

function apiFetch(url, options = {}) {
  return fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
}

async function readMessage(response, fallback) {
  try {
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.join("；");
    }
    if (typeof data === "string") {
      return data;
    }
    return data && data.message ? data.message : fallback;
  } catch (error) {
    return fallback;
  }
}

function showStatus(message, type = "error") {
  els.status.textContent = message;
  els.status.className = `status is-visible ${type}`;
}

function clearStatus() {
  els.status.textContent = "";
  els.status.className = "status";
}

function initials(name) {
  return String(name || "U").trim().slice(0, 2).toUpperCase();
}

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? "提交中..." : "提交";
}

function redirectToLoginSoon() {
  window.setTimeout(() => {
    window.location.href = "/login";
  }, 900);
}

function switchTab(name) {
  clearStatus();
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === name;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  Object.entries(els.panels).forEach(([panelName, panel]) => {
    const isActive = panelName === name;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  const firstInput = name === "username" ? els.newUsername : els.oldPassword;
  window.setTimeout(() => firstInput.focus(), 0);
}

async function loadCurrentUser() {
  const response = await apiFetch("/api/auth/me");
  if (response.status === 401) {
    window.location.href = "/login";
    return;
  }

  if (!response.ok) {
    showStatus("无法获取当前用户");
    return;
  }

  const user = await response.json();
  els.currentUsername.textContent = user.username;
  els.userAvatar.textContent = initials(user.username);
}

async function submitUsername(event) {
  event.preventDefault();
  clearStatus();

  const newUsername = els.newUsername.value.trim();
  if (!newUsername) {
    showStatus("请输入新用户名");
    return;
  }

  setLoading(els.usernameSubmit, true);
  try {
    const response = await apiFetch("/api/auth/me/change_username", {
      method: "POST",
      body: JSON.stringify({ new_username: newUsername }),
    });

    if (!response.ok) {
      showStatus(await readMessage(response, "修改用户名失败"));
      return;
    }

    showStatus("用户名已修改，请重新登录", "success");
    redirectToLoginSoon();
  } catch (error) {
    showStatus("无法连接后端服务");
  } finally {
    setLoading(els.usernameSubmit, false);
  }
}

async function submitPassword(event) {
  event.preventDefault();
  clearStatus();

  const oldPassword = els.oldPassword.value;
  const newPassword = els.newPassword.value;
  if (!oldPassword || !newPassword) {
    showStatus("请输入旧密码和新密码");
    return;
  }

  setLoading(els.passwordSubmit, true);
  try {
    const response = await apiFetch("/api/auth/me/change_password", {
      method: "POST",
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      showStatus(await readMessage(response, "修改密码失败"));
      return;
    }

    showStatus("密码已修改，请重新登录", "success");
    redirectToLoginSoon();
  } catch (error) {
    showStatus("无法连接后端服务");
  } finally {
    setLoading(els.passwordSubmit, false);
  }
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.usernameForm.addEventListener("submit", submitUsername);
  els.passwordForm.addEventListener("submit", submitPassword);
}

bindEvents();
loadCurrentUser();
