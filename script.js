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
        <button class="btn-info" onclick="editTask(${task.id})">✏️ Sửa</button>
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

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  document.getElementById('taskInput').value = task.text;
  document.getElementById('startTime').value = task.start;
  document.getElementById('endTime').value = task.end;
  document.getElementById('prioritySelect').value = task.priority;
  document.getElementById('taskTags').value = task.tags.join(', ');
  deleteTask(id);
  showToast('Bạn có thể chỉnh sửa công việc và nhấn thêm lại.', 'info');
}

// === Ghi chú ===
function renderNotes() {
  const list = document.getElementById('noteList');
  list.innerHTML = '';

  let filtered = notes;

  const search = document.getElementById('noteSearch')?.value.toLowerCase();
  if (search) {
    filtered = filtered.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search));
  }

  filtered.sort((a, b) => b.pinned - a.pinned || new Date(b.createdAt) - new Date(a.createdAt));

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
      <div class="item-meta">Tạo: ${new Date(note.createdAt).toLocaleDateString('vi-VN')}</div>
      <div class="item-actions">
        <button class="btn-info" onclick="editNote(${note.id})">✏️ Sửa</button>
        <button class="btn-warning" onclick="toggleNotePin(${note.id})">${note.pinned ? '📌 Bỏ ghim' : '📌 Ghim'}</button>
        <button class="btn-danger" onclick="deleteNote(${note.id})">🗑️ Xóa</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function editNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  document.getElementById('noteTitle').value = note.title;
  document.getElementById('noteTags').value = note.tags.join(', ');
  document.getElementById('noteEditor').innerHTML = note.content;
  deleteNote(id);
  showToast('Bạn có thể chỉnh sửa ghi chú và nhấn thêm lại.', 'info');
}
