const state = {
  user: null,
  models: [],
  conversations: [],
  activeConversationId: null,
  activeMenuConversationId: null,
  renameConversationId: null,
  isSending: false,
  shouldAutoScroll: true,
  userScrollLocked: false,
  touchStartY: null,
  currentAbortController: null,
};

const els = {
  appShell: document.querySelector("#app-shell"),
  sidebar: document.querySelector("#sidebar"),
  openSidebar: document.querySelector("#open-sidebar"),
  collapseSidebar: document.querySelector("#collapse-sidebar"),
  newChat: document.querySelector("#new-chat"),
  conversationList: document.querySelector("#conversation-list"),
  currentUsername: document.querySelector("#current-username"),
  userAvatar: document.querySelector("#user-avatar"),
  settingsLink: document.querySelector("#settings-link"),
  activeTitle: document.querySelector("#active-title"),
  modelSelect: document.querySelector("#model-select"),
  messages: document.querySelector("#messages"),
  chatMain: document.querySelector("#chat-main"),
  form: document.querySelector("#chat-form"),
  input: document.querySelector("#message-input"),
  sendButton: document.querySelector("#send-button"),
  menu: document.querySelector("#conversation-menu"),
  renameModal: document.querySelector("#rename-modal"),
  renameForm: document.querySelector("#rename-form"),
  renameInput: document.querySelector("#rename-input"),
  renameCancel: document.querySelector("#rename-cancel"),
  toast: document.querySelector("#toast"),
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

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function ensureOk(response, fallbackMessage) {
  if (response.ok) {
    return response;
  }

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  const data = await readJson(response);
  if (typeof data === "string") {
    throw new Error(data);
  }
  if (Array.isArray(data)) {
    throw new Error(data.join("；"));
  }
  throw new Error(fallbackMessage);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

function initials(name) {
  const clean = String(name || "U").trim();
  return clean.slice(0, 2).toUpperCase();
}

function selectedModel() {
  const value = els.modelSelect.value;
  return state.models.find((item) => modelKey(item) === value) || state.models[0] || null;
}

function modelKey(model) {
  return `${model.provider}::${model.model_name}`;
}

function getConversation(uuid) {
  return state.conversations.find((item) => item.uuid === uuid) || null;
}

function normalizeContent(content) {
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("");
  }

  if (typeof content === "string") {
    return content;
  }

  return "";
}

function renderMarkdown(target, markdown) {
  const raw = typeof marked !== "undefined"
    ? marked.parse(markdown || "", { breaks: true, gfm: true })
    : fallbackMarkdown(markdown || "");
  target.innerHTML = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(raw) : raw;
  highlightCodeBlocks(target);

  if (typeof renderMathInElement !== "undefined") {
    renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
      ],
      throwOnError: false,
    });
  }
}

function highlightCodeBlocks(root) {
  root.querySelectorAll("pre code").forEach((block) => {
    const language = getCodeLanguage(block);
    const plainCode = block.textContent || "";
    block.classList.add("hljs");

    if (typeof hljs !== "undefined") {
      const highlighted = language && hljs.getLanguage(language)
        ? hljs.highlight(plainCode, { language, ignoreIllegals: true }).value
        : hljs.highlightAuto(plainCode).value;
      block.innerHTML = highlighted;
      if (language) {
        block.classList.add(`language-${language}`);
      }
      return;
    }

    block.innerHTML = fallbackHighlightCode(plainCode);
  });
}

function getCodeLanguage(block) {
  const className = Array.from(block.classList).find((name) => name.startsWith("language-"));
  if (!className) {
    return "";
  }
  return className.replace("language-", "").trim().toLowerCase();
}

function fallbackHighlightCode(code) {
  return escapeHtml(code)
    .replace(/\b(from|import|def|class|return|if|else|elif|for|while|try|except|with|as|in|and|or|not|const|let|var|function|async|await|new)\b/g, '<span class="syntax-keyword">$1</span>')
    .replace(/("[^"]*"|'[^']*')/g, '<span class="syntax-string">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="syntax-number">$1</span>')
    .replace(/(#.*$|\/\/.*$)/gm, '<span class="syntax-comment">$1</span>');
}

function fallbackMarkdown(markdown) {
  const lines = String(markdown || "").split("\n");
  const html = [];
  let inCode = false;
  let codeLines = [];
  let inList = false;
  let inTable = false;
  let tableRows = [];

  function closeList() {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  }

  function closeTable() {
    if (inTable) {
      html.push("<table><tbody>");
      tableRows.forEach((row) => {
        const cells = row
          .split("|")
          .slice(1, -1)
          .map((cell) => `<td>${formatInline(cell.trim())}</td>`)
          .join("");
        html.push(`<tr>${cells}</tr>`);
      });
      html.push("</tbody></table>");
      tableRows = [];
      inTable = false;
    }
  }

  lines.forEach((line) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        closeTable();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (/^\|.+\|$/.test(line.trim()) && !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line.trim())) {
      closeList();
      inTable = true;
      tableRows.push(line);
      return;
    }

    closeTable();

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      return;
    }

    const listItem = line.match(/^\s*[-*]\s+(.+)$/);
    if (listItem) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${formatInline(listItem[1])}</li>`);
      return;
    }

    if (!line.trim()) {
      closeList();
      return;
    }

    closeList();
    html.push(`<p>${formatInline(line)}</p>`);
  });

  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeList();
  closeTable();
  return html.join("");
}

function formatInline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\$\$(.+?)\$\$/g, '<span class="math-fallback math-block">$1</span>')
    .replace(/\$(.+?)\$/g, '<span class="math-fallback">$1</span>');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createMessageElement({ role, model, text }) {
  const wrapper = document.createElement("article");
  wrapper.className = `message ${role}`;

  if (role === "assistant" && model) {
    const meta = document.createElement("div");
    meta.className = "message-meta";
    meta.textContent = model;
    wrapper.append(meta);
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  const markdown = document.createElement("div");
  markdown.className = "markdown";
  bubble.append(markdown);
  wrapper.append(bubble);

  renderMarkdown(markdown, text || "");
  return { wrapper, markdown };
}

function showWelcome() {
  els.messages.innerHTML = `
    <div class="welcome">
      <h1>我们先从哪里开始呢？</h1>
    </div>
  `;
}

function showLoadingMessages() {
  els.messages.innerHTML = '<div class="loading-state">正在加载对话...</div>';
}

function scrollToBottom() {
  els.chatMain.scrollTop = els.chatMain.scrollHeight;
  state.userScrollLocked = false;
  state.shouldAutoScroll = true;
}

function isNearBottom() {
  const distance = els.chatMain.scrollHeight - els.chatMain.scrollTop - els.chatMain.clientHeight;
  return distance < 24;
}

function scrollToBottomIfNeeded() {
  if (state.shouldAutoScroll && !state.userScrollLocked) {
    scrollToBottom();
  }
}

function disableAutoScroll() {
  state.userScrollLocked = true;
  state.shouldAutoScroll = false;
}

function updateAutoScrollFromPosition() {
  if (isNearBottom()) {
    state.userScrollLocked = false;
    state.shouldAutoScroll = true;
    return;
  }

  if (!state.userScrollLocked) {
    state.shouldAutoScroll = false;
  }
}

function resizeInput() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
}

function setSending(isSending) {
  state.isSending = isSending;
  els.input.disabled = isSending;
  renderSendButton();
}

function renderSendButton() {
  if (state.isSending) {
    els.sendButton.disabled = false;
    els.sendButton.classList.add("is-stopping");
    els.sendButton.setAttribute("aria-label", "停止输出");
    els.sendButton.setAttribute("title", "停止输出");
    els.sendButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="8" height="8" rx="1.6"></rect>
      </svg>
    `;
    return;
  }

  els.sendButton.classList.remove("is-stopping");
  els.sendButton.disabled = !els.input.value.trim();
  els.sendButton.setAttribute("aria-label", "发送消息");
  els.sendButton.setAttribute("title", "发送");
  els.sendButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7"></path>
    </svg>
  `;
}

function stopStreaming() {
  if (state.currentAbortController) {
    state.currentAbortController.abort();
  }
}

function renderModelOptions() {
  els.modelSelect.innerHTML = "";

  if (!state.models.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无模型";
    els.modelSelect.append(option);
    els.modelSelect.disabled = true;
    return;
  }

  els.modelSelect.disabled = false;
  state.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = modelKey(model);
    option.textContent = `${model.model_name} · ${model.provider}`;
    els.modelSelect.append(option);
  });
}

function renderConversations() {
  els.conversationList.innerHTML = "";

  if (!state.conversations.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "暂无对话";
    els.conversationList.append(empty);
    return;
  }

  state.conversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "conversation-row";
    row.dataset.uuid = conversation.uuid;
    if (conversation.uuid === state.activeConversationId) {
      row.classList.add("is-active");
    }

    const item = document.createElement("button");
    item.className = "conversation-item";
    item.type = "button";
    item.textContent = conversation.title || "新会话";
    item.title = conversation.title || "新会话";
    item.addEventListener("click", () => selectConversation(conversation.uuid));

    const menuButton = document.createElement("button");
    menuButton.className = "conversation-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "打开对话菜单");
    menuButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h.01M12 12h.01M19 12h.01"></path>
      </svg>
    `;
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      openConversationMenu(conversation.uuid, menuButton);
    });

    row.append(item, menuButton);
    els.conversationList.append(row);
  });
}

function updateActiveTitle() {
  const conversation = getConversation(state.activeConversationId);
  els.activeTitle.textContent = conversation ? conversation.title || "新会话" : "新会话";
}

async function loadCurrentUser() {
  const response = await ensureOk(await apiFetch("/api/auth/me"), "无法获取当前用户");
  state.user = await response.json();
  els.currentUsername.textContent = state.user.username;
  els.userAvatar.textContent = initials(state.user.username);
}

async function loadModels() {
  const response = await ensureOk(await apiFetch("/api/models"), "无法获取模型列表");
  state.models = await response.json();
  renderModelOptions();
}

async function loadConversations({ selectFirst = true } = {}) {
  const response = await ensureOk(await apiFetch("/api/conversations"), "无法获取会话列表");
  state.conversations = await response.json();
  renderConversations();

  if (!state.conversations.length) {
    state.activeConversationId = null;
    updateActiveTitle();
    showWelcome();
    return;
  }

  const activeStillExists = state.conversations.some((item) => item.uuid === state.activeConversationId);
  if (selectFirst && !activeStillExists) {
    state.activeConversationId = state.conversations[0].uuid;
    await loadMessages(state.activeConversationId);
  } else {
    updateActiveTitle();
  }
}

async function createConversation() {
  const response = await ensureOk(
    await apiFetch("/api/conversations", { method: "POST" }),
    "无法创建新会话",
  );
  const data = await response.json();
  state.activeConversationId = data.uuid;
  await loadConversations({ selectFirst: false });
  renderConversations();
  updateActiveTitle();
  showWelcome();
  closeSidebarOnMobile();
}

async function selectConversation(uuid) {
  if (state.isSending || uuid === state.activeConversationId) {
    return;
  }

  state.activeConversationId = uuid;
  closeConversationMenu();
  renderConversations();
  updateActiveTitle();
  await loadMessages(uuid);
  closeSidebarOnMobile();
}

async function loadMessages(uuid) {
  showLoadingMessages();
  const response = await ensureOk(
    await apiFetch(`/api/conversations/${uuid}/messages`),
    "无法获取消息",
  );
  const messages = await response.json();
  els.messages.innerHTML = "";

  if (!messages.length) {
    showWelcome();
    return;
  }

  messages.forEach((message) => {
    const text = normalizeContent(message.content);
    const model = message.role === "assistant" ? message.model : "";
    const { wrapper } = createMessageElement({ role: message.role, model, text });
    els.messages.append(wrapper);
  });
  scrollToBottom();
}

function openConversationMenu(uuid, anchor) {
  state.activeMenuConversationId = uuid;
  const rect = anchor.getBoundingClientRect();
  els.menu.hidden = false;
  const top = Math.min(rect.bottom + 6, window.innerHeight - 96);
  const left = Math.min(rect.left - 108, window.innerWidth - 154);
  els.menu.style.top = `${Math.max(8, top)}px`;
  els.menu.style.left = `${Math.max(8, left)}px`;
}

function closeConversationMenu() {
  els.menu.hidden = true;
  state.activeMenuConversationId = null;
}

function openRenameModal() {
  const conversation = getConversation(state.activeMenuConversationId);
  if (!conversation) {
    return;
  }
  state.renameConversationId = conversation.uuid;
  els.renameInput.value = conversation.title || "";
  els.renameModal.hidden = false;
  closeConversationMenu();
  window.setTimeout(() => els.renameInput.focus(), 0);
}

function closeRenameModal() {
  els.renameModal.hidden = true;
  els.renameInput.value = "";
  state.renameConversationId = null;
}

async function renameActiveConversation() {
  const uuid = state.renameConversationId;
  const newName = els.renameInput.value.trim();
  if (!uuid || !newName) {
    showToast("请输入新的对话标题");
    return;
  }

  await ensureOk(
    await apiFetch(`/api/conversations/${uuid}/rename`, {
      method: "POST",
      body: JSON.stringify({ new_name: newName }),
    }),
    "无法重命名对话",
  );
  closeRenameModal();
  await loadConversations({ selectFirst: false });
  renderConversations();
  updateActiveTitle();
  showToast("对话已重命名");
}

async function deleteActiveConversation() {
  const uuid = state.activeMenuConversationId;
  const conversation = getConversation(uuid);
  if (!uuid || !conversation) {
    return;
  }

  const confirmed = window.confirm(`删除“${conversation.title || "新会话"}”？`);
  if (!confirmed) {
    closeConversationMenu();
    return;
  }

  await ensureOk(
    await apiFetch(`/api/conversations/${uuid}/messages`, { method: "DELETE" }),
    "无法删除对话",
  );

  if (state.activeConversationId === uuid) {
    state.activeConversationId = null;
  }
  closeConversationMenu();
  await loadConversations();
}

function appendUserMessage(text, model) {
  const { wrapper } = createMessageElement({ role: "user", model, text });
  if (els.messages.querySelector(".welcome")) {
    els.messages.innerHTML = "";
  }
  state.shouldAutoScroll = true;
  els.messages.append(wrapper);
  scrollToBottom();
}

function appendAssistantMessage(model) {
  const { wrapper, markdown } = createMessageElement({ role: "assistant", model, text: "" });
  const typing = document.createElement("div");
  typing.className = "typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  markdown.replaceChildren(typing);
  els.messages.append(wrapper);
  scrollToBottom();
  return markdown;
}

function extractStreamText(parts) {
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("");
}

async function readSseStream(response, onText) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventText of events) {
      const lines = eventText.split("\n");
      const dataLines = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart());
      if (!dataLines.length) {
        continue;
      }

      const data = dataLines.join("\n");
      if (data === "[DONE]") {
        return;
      }

      try {
        const parsed = JSON.parse(data);
        onText(extractStreamText(parsed));
      } catch (error) {
        onText("");
      }
    }
  }
}

async function sendMessage() {
  const text = els.input.value.trim();
  const model = selectedModel();

  if (!text || state.isSending) {
    return;
  }

  if (!model) {
    showToast("没有可用模型");
    return;
  }

  if (!state.activeConversationId) {
    await createConversation();
  }

  const conversationId = state.activeConversationId;
  appendUserMessage(text, model.model_name);
  els.input.value = "";
  resizeInput();
  setSending(true);

  const assistantMarkdown = appendAssistantMessage(model.model_name);
  let assistantText = "";
  let wasStopped = false;
  const controller = new AbortController();
  state.currentAbortController = controller;

  try {
    const response = await apiFetch("/api/chat", {
      method: "POST",
      signal: controller.signal,
      body: JSON.stringify({
        conversation_uuid: conversationId,
        message: text,
        requested_model: model.model_name,
        provider: model.provider,
      }),
    });
    await ensureOk(response, "发送失败");

    await readSseStream(response, (chunkText) => {
      if (!chunkText) {
        return;
      }
      assistantText += chunkText;
      renderMarkdown(assistantMarkdown, assistantText);
      scrollToBottomIfNeeded();
    });

    if (!assistantText) {
      renderMarkdown(assistantMarkdown, "模型没有返回内容。");
    }
    await loadConversations({ selectFirst: false });
    renderConversations();
    updateActiveTitle();
  } catch (error) {
    wasStopped = error.name === "AbortError";
    if (wasStopped) {
      if (assistantText) {
        renderMarkdown(assistantMarkdown, `${assistantText}\n\n> 已停止输出`);
      } else {
        renderMarkdown(assistantMarkdown, "> 已停止输出");
      }
      showToast("已停止输出");
    } else {
      renderMarkdown(assistantMarkdown, `发送失败：${error.message}`);
      showToast(error.message);
    }
  } finally {
    if (state.currentAbortController === controller) {
      state.currentAbortController = null;
    }
    setSending(false);
    els.input.focus();
  }
}

function toggleSidebar() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    els.appShell.classList.toggle("sidebar-mobile-open");
    return;
  }
  els.appShell.classList.toggle("sidebar-collapsed");
}

function openSidebar() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    els.appShell.classList.add("sidebar-mobile-open");
    return;
  }
  els.appShell.classList.remove("sidebar-collapsed");
}

function closeSidebarOnMobile() {
  if (window.matchMedia("(max-width: 760px)").matches) {
    els.appShell.classList.remove("sidebar-mobile-open");
  }
}

function goSettings() {
  window.location.href = "/settings";
}

function bindEvents() {
  els.openSidebar.addEventListener("click", openSidebar);
  els.collapseSidebar.addEventListener("click", toggleSidebar);
  els.newChat.addEventListener("click", createConversation);
  els.settingsLink.addEventListener("click", goSettings);

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isSending) {
      stopStreaming();
      return;
    }
    sendMessage();
  });

  els.input.addEventListener("input", () => {
    resizeInput();
    renderSendButton();
  });

  els.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      sendMessage();
    }
  });

  els.chatMain.addEventListener("wheel", (event) => {
    if (state.isSending && event.deltaY < 0) {
      disableAutoScroll();
    }
  }, { passive: true });

  els.chatMain.addEventListener("touchstart", (event) => {
    state.touchStartY = event.touches[0]?.clientY ?? null;
  }, { passive: true });

  els.chatMain.addEventListener("touchmove", (event) => {
    const currentY = event.touches[0]?.clientY;
    if (state.isSending && state.touchStartY !== null && currentY !== undefined && currentY > state.touchStartY) {
      disableAutoScroll();
    }
  }, { passive: true });

  els.chatMain.addEventListener("scroll", updateAutoScrollFromPosition);

  els.chatMain.addEventListener("keydown", (event) => {
    if (!state.isSending) {
      return;
    }

    const upwardKeys = ["ArrowUp", "PageUp", "Home"];
    if (upwardKeys.includes(event.key)) {
      disableAutoScroll();
    }
  });

  els.menu.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    if (action === "rename") {
      openRenameModal();
    }
    if (action === "delete") {
      deleteActiveConversation().catch((error) => showToast(error.message));
    }
  });

  els.renameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renameActiveConversation().catch((error) => showToast(error.message));
  });

  els.renameCancel.addEventListener("click", closeRenameModal);

  document.addEventListener("click", (event) => {
    if (!els.menu.hidden && !event.target.closest("#conversation-menu") && !event.target.closest(".conversation-menu-button")) {
      closeConversationMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeConversationMenu();
      closeRenameModal();
      closeSidebarOnMobile();
    }
  });

  window.addEventListener("resize", () => {
    closeConversationMenu();
    if (!window.matchMedia("(max-width: 760px)").matches) {
      els.appShell.classList.remove("sidebar-mobile-open");
    }
  });
}

async function init() {
  bindEvents();
  setSending(false);
  els.conversationList.innerHTML = '<div class="loading-state">正在加载对话...</div>';

  try {
    await loadCurrentUser();
    await loadModels();
    await loadConversations();
  } catch (error) {
    if (error.message !== "Unauthorized") {
      showToast(error.message);
    }
  }
}

init();
