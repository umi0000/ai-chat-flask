const els = {
  status: document.querySelector("#status"),
  userCount: document.querySelector("#user-count"),
  selectedCount: document.querySelector("#selected-count"),
  usersBody: document.querySelector("#users-body"),
  selectAll: document.querySelector("#select-all"),
  bulkDeleteButton: document.querySelector("#bulk-delete-button"),
  createUserButton: document.querySelector("#create-user-button"),
  createModal: document.querySelector("#create-modal"),
  closeModalButton: document.querySelector("#close-modal-button"),
  cancelCreateButton: document.querySelector("#cancel-create-button"),
  createUserForm: document.querySelector("#create-user-form"),
  newUsername: document.querySelector("#new-username"),
  newPassword: document.querySelector("#new-password"),
  submitCreateButton: document.querySelector("#submit-create-button"),
  modalStatus: document.querySelector("#modal-status"),
};

const state = {
  currentUserId: null,
  users: [],
  selectedIds: new Set(),
  isBusy: false,
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

function redirectToLogin() {
  window.location.href = "/login";
}

function showStatus(message, type = "error") {
  els.status.textContent = message;
  els.status.className = `status is-visible ${type}`;
}

function clearStatus() {
  els.status.textContent = "";
  els.status.className = "status";
}

function showModalStatus(message, type = "error") {
  els.modalStatus.textContent = message;
  els.modalStatus.className = `modal-status is-visible ${type}`;
}

function clearModalStatus() {
  els.modalStatus.textContent = "";
  els.modalStatus.className = "modal-status";
}

function setBusy(isBusy) {
  state.isBusy = isBusy;
  els.bulkDeleteButton.disabled = isBusy || state.selectedIds.size === 0;
  els.createUserButton.disabled = isBusy;
}

function setCreateLoading(isLoading) {
  els.submitCreateButton.disabled = isLoading;
  els.cancelCreateButton.disabled = isLoading;
  els.closeModalButton.disabled = isLoading;
  els.submitCreateButton.textContent = isLoading ? "提交中..." : "提交";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "待补充";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSelectableUsers() {
  return state.users.filter((user) => user.id !== state.currentUserId);
}

function syncSelectionUi() {
  const selectableUsers = getSelectableUsers();
  const allSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((user) => state.selectedIds.has(user.id));
  const someSelected = selectableUsers.some((user) => state.selectedIds.has(user.id));

  els.selectAll.checked = allSelected;
  els.selectAll.indeterminate = !allSelected && someSelected;
  els.selectAll.disabled = selectableUsers.length === 0 || state.isBusy;
  els.selectedCount.textContent = String(state.selectedIds.size);
  els.bulkDeleteButton.disabled = state.isBusy || state.selectedIds.size === 0;
}

function renderUsers() {
  els.userCount.textContent = String(state.users.length);

  if (state.users.length === 0) {
    els.usersBody.innerHTML = '<tr><td colspan="7" class="empty-cell">暂无用户</td></tr>';
    syncSelectionUi();
    return;
  }

  els.usersBody.innerHTML = state.users
    .map((user) => {
      const isCurrentUser = user.id === state.currentUserId;
      const isSelected = state.selectedIds.has(user.id);
      const roleLabel = user.privilege === "admin" ? "管理员" : "普通用户";
      const roleClass = user.privilege === "admin" ? "admin" : "";
      const rowTitle = isCurrentUser ? "当前登录用户不能删除" : `选择用户 ${user.name}`;

      return `
        <tr data-user-id="${user.id}">
          <td class="check-cell">
            <input
              class="row-check"
              type="checkbox"
              aria-label="${escapeHtml(rowTitle)}"
              ${isSelected ? "checked" : ""}
              ${isCurrentUser || state.isBusy ? "disabled" : ""}
            >
          </td>
          <td class="muted">${escapeHtml(user.id)}</td>
          <td>
            <div class="user-name" title="${escapeHtml(user.name)}">
              ${escapeHtml(user.name)}${isCurrentUser ? "（当前用户）" : ""}
            </div>
          </td>
          <td><span class="role-pill ${roleClass}">${roleLabel}</span></td>
          <td class="muted">${escapeHtml(formatDate(user.created_at))}</td>
          <td class="muted">${escapeHtml(formatDate(user.updated_at))}</td>
          <td class="action-cell">
            <button
              class="row-danger-button"
              type="button"
              data-action="delete"
              ${isCurrentUser || state.isBusy ? "disabled" : ""}
            >删除</button>
          </td>
        </tr>
      `;
    })
    .join("");

  syncSelectionUi();
}

async function loadCurrentUser() {
  const response = await apiFetch("/api/auth/me");
  if (response.status === 401) {
    redirectToLogin();
    return false;
  }

  if (!response.ok) {
    showStatus("无法获取当前用户");
    return false;
  }

  const user = await response.json();
  state.currentUserId = user.id;
  return true;
}

async function loadUsers() {
  clearStatus();
  setBusy(true);

  try {
    const response = await apiFetch("/api/admin/users");
    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showStatus(await readMessage(response, "无法获取用户列表"));
      return;
    }

    const users = await response.json();
    state.users = Array.isArray(users)
      ? users.slice().sort((a, b) => Number(a.id) - Number(b.id))
      : [];
    state.selectedIds = new Set(
      Array.from(state.selectedIds).filter((id) =>
        state.users.some((user) => user.id === id && id !== state.currentUserId),
      ),
    );
  } catch (error) {
    showStatus("无法连接后端服务");
  } finally {
    setBusy(false);
    renderUsers();
  }
}

async function deleteUser(id) {
  const response = await apiFetch("/api/admin/userdel", {
    method: "POST",
    body: JSON.stringify({ id }),
  });

  if (response.status === 401) {
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(await readMessage(response, "删除用户失败"));
  }
}

async function handleRowDelete(user) {
  if (!user || user.id === state.currentUserId || state.isBusy) {
    return;
  }

  const confirmed = window.confirm(`确定删除用户「${user.name}」吗？`);
  if (!confirmed) {
    return;
  }

  clearStatus();
  setBusy(true);
  try {
    await deleteUser(user.id);
    state.selectedIds.delete(user.id);
    await loadUsers();
    showStatus(`已删除用户「${user.name}」`, "success");
  } catch (error) {
    if (error.message !== "Unauthorized") {
      showStatus(error.message || "删除用户失败");
    }
  } finally {
    setBusy(false);
    syncSelectionUi();
  }
}

async function handleBulkDelete() {
  const ids = Array.from(state.selectedIds).filter((id) => id !== state.currentUserId);
  if (ids.length === 0 || state.isBusy) {
    return;
  }

  const confirmed = window.confirm(`确定删除选中的 ${ids.length} 个用户吗？`);
  if (!confirmed) {
    return;
  }

  clearStatus();
  setBusy(true);
  const failed = [];

  for (const id of ids) {
    try {
      await deleteUser(id);
      state.selectedIds.delete(id);
    } catch (error) {
      if (error.message === "Unauthorized") {
        return;
      }
      failed.push(`#${id}: ${error.message || "删除失败"}`);
    }
  }

  await loadUsers();
  setBusy(false);

  if (failed.length > 0) {
    showStatus(`部分用户删除失败：${failed.join("；")}`);
  } else {
    showStatus(`已删除 ${ids.length} 个用户`, "success");
  }
  syncSelectionUi();
}

function openModal() {
  clearModalStatus();
  els.createUserForm.reset();
  els.createModal.hidden = false;
  window.setTimeout(() => els.newUsername.focus(), 0);
}

function closeModal() {
  if (els.submitCreateButton.disabled) {
    return;
  }

  els.createModal.hidden = true;
  clearModalStatus();
}

function hideModalAfterSuccess() {
  els.createModal.hidden = true;
  clearModalStatus();
}

async function submitCreateUser(event) {
  event.preventDefault();
  clearModalStatus();

  const username = els.newUsername.value.trim();
  const password = els.newPassword.value;
  if (!username || !password) {
    showModalStatus("请输入新用户名称和密码");
    return;
  }

  setCreateLoading(true);
  try {
    const response = await apiFetch("/api/admin/useradd", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        privilege: "user",
      }),
    });

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showModalStatus(await readMessage(response, "创建用户失败"));
      return;
    }

    hideModalAfterSuccess();
    await loadUsers();
    showStatus(`已创建用户「${username}」`, "success");
  } catch (error) {
    showModalStatus("无法连接后端服务");
  } finally {
    setCreateLoading(false);
  }
}

function bindEvents() {
  els.selectAll.addEventListener("change", () => {
    const selectableUsers = getSelectableUsers();
    if (els.selectAll.checked) {
      selectableUsers.forEach((user) => state.selectedIds.add(user.id));
    } else {
      selectableUsers.forEach((user) => state.selectedIds.delete(user.id));
    }
    renderUsers();
  });

  els.usersBody.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".row-check");
    if (!checkbox) {
      return;
    }

    const row = checkbox.closest("tr");
    const id = Number(row.dataset.userId);
    if (checkbox.checked) {
      state.selectedIds.add(id);
    } else {
      state.selectedIds.delete(id);
    }
    syncSelectionUi();
  });

  els.usersBody.addEventListener("click", (event) => {
    const deleteButton = event.target.closest('[data-action="delete"]');
    if (!deleteButton) {
      return;
    }

    const row = deleteButton.closest("tr");
    const id = Number(row.dataset.userId);
    const user = state.users.find((item) => item.id === id);
    handleRowDelete(user);
  });

  els.bulkDeleteButton.addEventListener("click", handleBulkDelete);
  els.createUserButton.addEventListener("click", openModal);
  els.closeModalButton.addEventListener("click", closeModal);
  els.cancelCreateButton.addEventListener("click", closeModal);
  els.createUserForm.addEventListener("submit", submitCreateUser);

  els.createModal.addEventListener("click", (event) => {
    if (event.target === els.createModal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.createModal.hidden) {
      closeModal();
    }
  });
}

async function init() {
  bindEvents();
  const hasUser = await loadCurrentUser();
  if (hasUser) {
    await loadUsers();
  }
}

init();
