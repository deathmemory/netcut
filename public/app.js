const dropZone = document.getElementById('dropZone');
const textInput = document.getElementById('textInput');
const submitText = document.getElementById('submitText');
const fileInput = document.getElementById('fileInput');
const itemsGrid = document.getElementById('itemsGrid');
const emptyState = document.getElementById('emptyState');
const clearAllBtn = document.getElementById('clearAll');
const toast = document.getElementById('toast');

let toastTimer;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪切板');
  } catch {
    showToast('复制失败，请手动选择文字复制');
  }
}

async function copyImage(dataUrl) {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    showToast('图片已复制到剪切板');
  } catch {
    showToast('当前浏览器不支持图片复制，请右键另存为');
  }
}

function downloadFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  card.dataset.id = item.id;

  const ICONS = {
    text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  };

  const LABELS = { text: '文本', image: '图片', file: '文件' };
  const BADGE_CLASSES = { text: 'badge-text', image: 'badge-image', file: 'badge-file' };

  let actionsBtns = '';
  if (item.type === 'text') {
    actionsBtns = `<button class="action-btn copy-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制
    </button>`;
  } else if (item.type === 'image') {
    actionsBtns = `
      <button class="action-btn copy-img-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制
      </button>
      <button class="action-btn download-img-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载
      </button>`;
  } else if (item.type === 'file') {
    actionsBtns = `<button class="action-btn download-file-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>下载
    </button>`;
  }

  card.innerHTML = `
    <div class="item-header">
      <span class="item-badge ${BADGE_CLASSES[item.type]}">${ICONS[item.type]} ${LABELS[item.type]}</span>
      <span class="item-time">${formatTime(item.createdAt)}</span>
      <div class="item-actions">
        ${actionsBtns}
        <button class="action-btn delete delete-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>删除
        </button>
      </div>
    </div>
    ${item.type === 'text' ? `<div class="text-content">${escapeHtml(item.content)}</div>` : ''}
    ${item.type === 'image' ? `<div class="image-content"><img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" loading="lazy"></div>` : ''}
    ${item.type === 'file' ? `
      <div class="file-content">
        <div class="file-icon">${ICONS.file}</div>
        <div class="file-info">
          <div class="file-name" title="${escapeHtml(item.originalName)}">${escapeHtml(item.originalName)}</div>
          <div class="file-size">${formatSize(item.size)}</div>
        </div>
      </div>` : ''}
  `;

  card.querySelector('.copy-btn')?.addEventListener('click', () => copyText(item.content));
  card.querySelector('.copy-img-btn')?.addEventListener('click', () => copyImage(item.dataUrl));
  card.querySelector('.download-img-btn')?.addEventListener('click', () => downloadFile(item.dataUrl, item.name));
  card.querySelector('.download-file-btn')?.addEventListener('click', () => downloadFile(`/api/files/${item.filename}`, item.originalName));
  card.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id, card));

  return card;
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updateEmpty(count) {
  emptyState.style.display = count === 0 ? 'block' : 'none';
  clearAllBtn.style.display = count > 0 ? 'inline-block' : 'none';
}

async function loadItems() {
  try {
    const items = await fetch('/api/items').then(r => r.json());
    itemsGrid.innerHTML = '';
    itemsGrid.appendChild(emptyState);
    items.forEach(item => itemsGrid.appendChild(createCard(item)));
    updateEmpty(items.length);
  } catch {
    showToast('加载失败，请刷新页面重试');
  }
}

async function deleteItem(id, card) {
  try {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    card.style.opacity = '0';
    card.style.transform = 'scale(.97)';
    card.style.transition = 'all .15s';
    setTimeout(() => {
      card.remove();
      updateEmpty(itemsGrid.querySelectorAll('.item-card').length);
    }, 150);
    showToast('已删除');
  } catch {
    showToast('删除失败');
  }
}

async function saveText(content) {
  if (!content.trim()) return;
  try {
    const item = await fetch('/api/items/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }).then(r => r.json());
    prependCard(item);
    showToast('文本已保存');
  } catch {
    showToast('保存失败');
  }
}

async function saveImage(dataUrl, name) {
  try {
    const item = await fetch('/api/items/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, name }),
    }).then(r => r.json());
    prependCard(item);
    showToast('图片已保存');
  } catch {
    showToast('图片保存失败');
  }
}

async function saveFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const item = await fetch('/api/items/file', { method: 'POST', body: formData }).then(r => r.json());
    prependCard(item);
    showToast(`文件 "${file.name}" 已保存`);
  } catch {
    showToast('文件上传失败');
  }
}

function prependCard(item) {
  const card = createCard(item);
  emptyState.after(card);
  updateEmpty(itemsGrid.querySelectorAll('.item-card').length);
}

function readImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

// Clipboard paste (Ctrl+V anywhere on page)
document.addEventListener('paste', async (e) => {
  const active = document.activeElement;
  if (active === textInput) return; // let textarea handle it normally

  const items = e.clipboardData.items;
  let handled = false;

  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      e.preventDefault();
      const file = it.getAsFile();
      const dataUrl = await readImageFile(file);
      await saveImage(dataUrl, file.name || 'image.png');
      handled = true;
      break;
    }
  }

  if (!handled) {
    for (const it of items) {
      if (it.kind === 'file') {
        e.preventDefault();
        await saveFile(it.getAsFile());
        handled = true;
        break;
      }
    }
  }

  if (!handled) {
    const text = e.clipboardData.getData('text/plain');
    if (text.trim()) {
      e.preventDefault();
      await saveText(text);
    }
  }
});

// Drop zone drag events
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const files = [...e.dataTransfer.files];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const dataUrl = await readImageFile(file);
      await saveImage(dataUrl, file.name);
    } else {
      await saveFile(file);
    }
  }
  const text = e.dataTransfer.getData('text/plain');
  if (text.trim() && files.length === 0) await saveText(text);
});

// Text submit
submitText.addEventListener('click', async () => {
  const val = textInput.value;
  if (!val.trim()) return;
  await saveText(val);
  textInput.value = '';
});

textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    submitText.click();
  }
});

// File input
fileInput.addEventListener('change', async () => {
  const files = [...fileInput.files];
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const dataUrl = await readImageFile(file);
      await saveImage(dataUrl, file.name);
    } else {
      await saveFile(file);
    }
  }
  fileInput.value = '';
});

// Clear all
clearAllBtn.addEventListener('click', async () => {
  if (!confirm('确定要清空所有内容吗？')) return;
  const cards = itemsGrid.querySelectorAll('.item-card');
  for (const card of cards) {
    const id = card.dataset.id;
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    card.remove();
  }
  updateEmpty(0);
  showToast('已清空');
});

// Auto-refresh every 30s (for multi-device sync)
setInterval(loadItems, 30000);

loadItems();
