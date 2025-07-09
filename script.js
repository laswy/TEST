// === Biến toàn cục ===
let tasks = [];
let notes = [];
let currentTaskFilter = 'all';
let currentNoteFilter = 'all';
let currentTab = 'tasks';

// === Chuyển tab ===
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.add('active');

  document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
  const clicked = document.querySelector(`.nav-tab[onclick="switchTab('${tab}')"]`);
  if (clicked) clicked.classList.add('active');
}

// === Dark Mode ===
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkModeEnabled', isDark);
}

// === Thông báo ===
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === Lưu / Tải Dữ liệu ===
function saveData() {
  try {
    const data = { tasks, notes, lastSaved: new Date().toISOString() };
    localStorage.setItem('todoAppData', JSON.stringify(data));
    showToast('Đã lưu thành công!');
  } catch (err) {
    console.error(err);
    showToast('Lỗi khi lưu dữ liệu!', 'error');
  }
}

function loadData() {
  try {
    const stored = JSON.parse(localStorage.getItem('todoAppData'));
    if (stored) {
      tasks = stored.tasks || [];
      notes = stored.notes || [];
    }
  } catch (err) {
    console.error(err);
    tasks = [];
    notes = [];
  }

  renderTasks();
  renderNotes();
  updateTaskStats();
  updateNoteStats();

  const dark = localStorage.getItem('darkModeEnabled');
  if (dark === 'true') document.body.classList.add('dark-mode');
}

// === Công việc ===
function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  const start = document.getElementById('startTime').value;
  const end = document.getElementById('endTime').value;
  const priority = document.getElementById('prioritySelect').value;
  const tagsStr = document.getElementById('taskTags').value.trim();
  if (!text) return showToast('Vui lòng nhập nội dung công việc!', 'error');

  const task = {
    id: Date.now(),
    text,
    start,
    end,
    priority,
    tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
    completed: false,
    completedTime: null,
    pinned: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(task);
  saveData();
  renderTasks();
  updateTaskStats();

  document.getElementById('taskInput').value = '';
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('prioritySelect').value = 'medium';
  document.getElementById('taskTags').value = '';

  showToast('Đã thêm công việc!');
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';

  let filtered = tasks.filter(task => {
    if (currentTaskFilter === 'active') return !task.completed;
    if (currentTaskFilter === 'completed') return task.completed;
    if (currentTaskFilter === 'pinned') return task.pinned;
    return true;
  });

  const search = document.getElementById('taskSearch')?.value.toLowerCase();
  if (search) {
    filtered = filtered.filter(t => t.text.toLowerCase().includes(search) || t.tags.some(tag => tag.toLowerCase().includes(search)));
  }

  filtered.sort((a, b) => b.pinned - a.pinned || new Date(b.createdAt) - new Date(a.createdAt));

  if (filtered.length === 0) {
    list.innerHTML = '<p class="text-center item-meta">Không có công việc nào.</p>';
    return;
  }

  for (const task of filtered) {
    const li = document.createElement('li');
    li.className = 'item task-item';
    if (task.completed) li.classList.add('completed');
    if (task.pinned) li.classList.add('pinned');

    const completedTimeHtml = task.completed && task.completedTime ? `<div class="item-meta" style="color: #28a745; font-weight: bold;">✅ Hoàn thành: ${new Date(task.completedTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ${new Date(task.completedTime).toLocaleDateString('vi-VN')}</div>` : '';

    li.innerHTML = `
      ${task.pinned ? '<div class="pin-icon">📌</div>' : ''}
      <div class="item-title">${task.text}</div>
      <div class="item-tags">${task.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      <div class="item-meta">
        <strong>Độ ưu tiên:</strong> ${task.priority} | 
        <strong>Bắt đầu:</strong> ${task.start || 'Chưa đặt'} | 
        <strong>Kết thúc:</strong> ${task.end || 'Chưa đặt'}
      </div>
      ${completedTimeHtml}
      <div class="item-actions">
        <button class="btn-success" onclick="toggleTaskComplete(${task.id})">${task.completed ? '↩️ Hoàn tác' : '✅ Hoàn thành'}</button>
        <button class="btn-warning" onclick="toggleTaskPin(${task.id})">${task.pinned ? '📌 Bỏ ghim' : '📌 Ghim'}</button>
        <button class="btn-danger" onclick="deleteTask(${task.id})">🗑️ Xóa</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.completedTime = task.completed ? new Date().toISOString() : null;
    saveData();
    renderTasks();
    updateTaskStats();
    showToast(task.completed ? 'Đã hoàn thành công việc!' : 'Đã hoàn tác công việc!');
  }
}

function toggleTaskPin(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.pinned = !task.pinned;
    saveData();
    renderTasks();
    updateTaskStats();
    showToast(task.pinned ? 'Đã ghim công việc!' : 'Đã bỏ ghim công việc!');
  }
}

function deleteTask(id) {
  if (confirm('Bạn có chắc muốn xóa công việc này?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    updateTaskStats();
    showToast('Đã xóa công việc!', 'warning');
  }
}

function setTaskFilter(filter) {
  currentTaskFilter = filter;
  document.querySelectorAll('#tasksTab .filter-buttons button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`#tasksTab .filter-buttons button[onclick="setTaskFilter('${filter}')"]`).classList.add('active');
  renderTasks();
}

function searchTasks() { renderTasks(); }
function updateTaskStats() {
  document.getElementById('totalTasks').textContent = tasks.length;
  document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;
  document.getElementById('activeTasks').textContent = tasks.filter(t => !t.completed).length;
  document.getElementById('pinnedTasks').textContent = tasks.filter(t => t.pinned).length;
}

// === Ghi chú ===
function addNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const tagsStr = document.getElementById('noteTags').value.trim();
  const content = document.getElementById('noteEditor').innerHTML.trim();
  if (!title || !content) return showToast('Vui lòng nhập tiêu đề và nội dung!', 'error');

  notes.unshift({
    id: Date.now(),
    title,
    content,
    tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
    pinned: false,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  });

  saveData();
  renderNotes();
  updateNoteStats();

  document.getElementById('noteTitle').value = '';
  document.getElementById('noteTags').value = '';
  document.getElementById('noteEditor').innerHTML = '';

  showToast('Đã thêm ghi chú!');
}

function renderNotes() {
  const list = document.getElementById('noteList');
  list.innerHTML = '';

  let filtered = notes.filter(n => {
    if (currentNoteFilter === 'pinned') return n.pinned;
    if (currentNoteFilter === 'recent') {
      const limit = new Date();
      limit.setDate(limit.getDate() - 7);
      return new Date(n.lastModified) > limit;
    }
    return true;
  });

  const search = document.getElementById('noteSearch')?.value.toLowerCase();
  if (search) {
    filtered = filtered.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
  }

  filtered.sort((a, b) => b.pinned - a.pinned || new Date(b.lastModified) - new Date(a.lastModified));

  if (filtered.length === 0) {
    list.innerHTML = '<p class="text-center item-meta">Không có ghi chú nào.</p>';
    return;
  }

  for (const note of filtered) {
    const li = document.createElement('li');
    li.className = 'item note-item';
    if (note.pinned) li.classList.add('pinned');
    li.innerHTML = `
      ${note.pinned ? '<div class="pin-icon">📌</div>' : ''}
      <div class="item-title">${note.title}</div>
      <div class="item-content">${note.content}</div>
      <div class="item-tags">${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
      <div class="item-meta">Cập nhật: ${new Date(note.lastModified).toLocaleDateString()}</div>
      <div class="item-actions">
        <button class="btn-warning" onclick="toggleNotePin(${note.id})">${note.pinned ? 'Bỏ ghim' : 'Ghim'}</button>
        <button class="btn-danger" onclick="deleteNote(${note.id})">Xóa</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function deleteNote(id) {
  if (confirm('Xóa ghi chú này?')) {
    notes = notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
    updateNoteStats();
    showToast('Đã xóa ghi chú!', 'warning');
  }
}

function toggleNotePin(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    note.pinned = !note.pinned;
    note.lastModified = new Date().toISOString();
    saveData();
    renderNotes();
    updateNoteStats();
    showToast(note.pinned ? 'Đã ghim ghi chú!' : 'Đã bỏ ghim!');
  }
}

function setNoteFilter(filter) {
  currentNoteFilter = filter;
  document.querySelectorAll('#notesTab .filter-buttons button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`#notesTab .filter-buttons button[onclick="setNoteFilter('${filter}')"]`).classList.add('active');
  renderNotes();
}

function searchNotes() { renderNotes(); }
function updateNoteStats() {
  const limit = new Date();
  limit.setDate(limit.getDate() - 7);
  document.getElementById('totalNotes').textContent = notes.length;
  document.getElementById('pinnedNotes').textContent = notes.filter(n => n.pinned).length;
  document.getElementById('recentNotes').textContent = notes.filter(n => new Date(n.lastModified) > limit).length;
}

// === Editor ===
function formatText(cmd, val = null) {
  document.execCommand(cmd, false, val);
  document.getElementById('noteEditor').focus();
}
function insertLink() {
  const url = prompt('Nhập URL:');
  if (url) document.execCommand('createLink', false, url);
  document.getElementById('noteEditor').focus();
}

// === Load ===
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  switchTab(currentTab);
});
