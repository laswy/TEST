// === Biến toàn cục ===
let tasks = [];
let notes = [];
let currentTaskFilter = 'all';
let currentNoteFilter = 'all';
let currentTab = 'tasks';
let editingTaskId = null; // Biến để lưu ID của công việc đang chỉnh sửa
let editingNoteId = null; // Biến để lưu ID của ghi chú đang chỉnh sửa

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

  // Clear form fields
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
        <button class="btn-info" onclick="openEditTaskModal(${task.id})">✏️ Sửa</button>
        <button class="btn-success" onclick="toggleTaskComplete(${task.id})">${task.completed ? '↩️ Hoàn tác' : '✅ Hoàn thành'}</button>
        <button class="btn-warning" onclick="toggleTaskPin(${task.id})">${task.pinned ? '📌 Bỏ ghim' : '📌 Ghim'}</button>
        <button class="btn-danger" onclick="deleteTask(${task.id})">🗑️ Xóa</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function setTaskFilter(filter) {
  currentTaskFilter = filter;
  document.querySelectorAll('#tasksTab .filter-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`#tasksTab .filter-buttons button[onclick="setTaskFilter('${filter}')"]`).classList.add('active');
  renderTasks();
}

function searchTasks() {
  renderTasks();
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

function deleteTask(id) {
  if (confirm('Bạn có chắc chắn muốn xóa công việc này không?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveData();
    renderTasks();
    updateTaskStats();
    showToast('Đã xóa công việc!');
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

function updateTaskStats() {
  document.getElementById('totalTasks').textContent = tasks.length;
  document.getElementById('completedTasks').textContent = tasks.filter(t => t.completed).length;
  document.getElementById('activeTasks').textContent = tasks.filter(t => !t.completed).length;
  document.getElementById('pinnedTasks').textContent = tasks.filter(t => t.pinned).length;
}

// === Edit Task Modal Functions ===
function openEditTaskModal(id) {
  editingTaskId = id;
  const task = tasks.find(t => t.id === id);
  if (task) {
    document.getElementById('editTaskInput').value = task.text;
    document.getElementById('editStartTime').value = task.start;
    document.getElementById('editEndTime').value = task.end;
    document.getElementById('editPrioritySelect').value = task.priority;
    document.getElementById('editTaskTags').value = task.tags.join(', ');
    document.getElementById('editTaskModal').style.display = 'block';
  }
}

function closeEditTaskModal() {
  document.getElementById('editTaskModal').style.display = 'none';
  editingTaskId = null;
}

function saveEditTask() {
  const task = tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.text = document.getElementById('editTaskInput').value.trim();
    task.start = document.getElementById('editStartTime').value;
    task.end = document.getElementById('editEndTime').value;
    task.priority = document.getElementById('editPrioritySelect').value;
    task.tags = document.getElementById('editTaskTags').value.trim().split(',').map(t => t.trim());
    saveData();
    renderTasks();
    updateTaskStats();
    showToast('Đã cập nhật công việc!');
    closeEditTaskModal();
  }
}

// === Ghi chú ===
function addNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteEditor').innerHTML.trim();
  const tagsStr = document.getElementById('noteTags').value.trim();
  if (!title) return showToast('Vui lòng nhập tiêu đề ghi chú!', 'error');
  if (!content) return showToast('Vui lòng nhập nội dung ghi chú!', 'error');

  const note = {
    id: Date.now(),
    title,
    content,
    tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
    pinned: false,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  };

  notes.unshift(note);
  saveData();
  renderNotes();
  updateNoteStats();

  document.getElementById('noteTitle').value = '';
  document.getElementById('noteEditor').innerHTML = '';
  document.getElementById('noteTags').value = '';
  document.getElementById('imagePreview').innerHTML = ''; // Clear image preview

  showToast('Đã thêm ghi chú!');
}

function renderNotes() {
  const list = document.getElementById('noteList');
  list.innerHTML = '';

  let filtered = notes;

  const search = document.getElementById('noteSearch')?.value.toLowerCase();
  if (search) {
    filtered = filtered.filter(n => n.title.toLowerCase().includes(search) || n.content.toLowerCase().includes(search) || n.tags.some(tag => tag.toLowerCase().includes(search)));
  }

  filtered.sort((a, b) => {
    if (currentNoteFilter === 'pinned') return b.pinned - a.pinned;
    if (currentNoteFilter === 'recent') return new Date(b.lastModified) - new Date(a.lastModified);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

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
      <div class="item-meta">Tạo: ${new Date(note.createdAt).toLocaleDateString('vi-VN')} | Cập nhật: ${new Date(note.lastModified).toLocaleDateString('vi-VN')}</div>
      <div class="item-actions">
        <button class="btn-info" onclick="openEditNoteModal(${note.id})">✏️ Sửa</button>
        <button class="btn-warning" onclick="toggleNotePin(${note.id})">${note.pinned ? '📌 Bỏ ghim' : '📌 Ghim'}</button>
        <button class="btn-danger" onclick="deleteNote(${note.id})">🗑️ Xóa</button>
      </div>
    `;
    list.appendChild(li);
  }
}

function setNoteFilter(filter) {
  currentNoteFilter = filter;
  document.querySelectorAll('#notesTab .filter-buttons button').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`#notesTab .filter-buttons button[onclick="setNoteFilter('${filter}')"]`).classList.add('active');
  renderNotes();
}

function searchNotes() {
  renderNotes();
}

function deleteNote(id) {
  if (confirm('Bạn có chắc chắn muốn xóa ghi chú này không?')) {
    notes = notes.filter(n => n.id !== id);
    saveData();
    renderNotes();
    updateNoteStats();
    showToast('Đã xóa ghi chú!');
  }
}

function toggleNotePin(id) {
  const note = notes.find(n => n.id === id);
  if (note) {
    note.pinned = !note.pinned;
    saveData();
    renderNotes();
    updateNoteStats();
    showToast(note.pinned ? 'Đã ghim ghi chú!' : 'Đã bỏ ghim ghi chú!');
  }
}

function updateNoteStats() {
  document.getElementById('totalNotes').textContent = notes.length;
  document.getElementById('pinnedNotes').textContent = notes.filter(n => n.pinned).length;
  // For recent notes, let's define "recent" as created/modified in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  document.getElementById('recentNotes').textContent = notes.filter(n => new Date(n.lastModified) >= sevenDaysAgo).length;
}

// === Rich Editor Functions ===
function formatText(command, value = null) {
  document.execCommand(command, false, value);
}

function insertLink() {
  const url = prompt('Nhập URL:');
  if (url) {
    document.execCommand('createLink', false, url);
  }
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      document.getElementById('noteEditor').appendChild(img);
      document.getElementById('imagePreview').innerHTML = `<img src="${e.target.result}" style="max-width: 100px; max-height: 100px;">`;
    };
    reader.readAsDataURL(file);
  }
}

// === Edit Note Modal Functions ===
function openEditNoteModal(id) {
  editingNoteId = id;
  const note = notes.find(n => n.id === id);
  if (note) {
    document.getElementById('editNoteTitle').value = note.title;
    document.getElementById('editNoteTags').value = note.tags.join(', ');
    document.getElementById('editNoteEditor').innerHTML = note.content;
    document.getElementById('editNoteModal').style.display = 'block';
  }
}

function closeEditNoteModal() {
  document.getElementById('editNoteModal').style.display = 'none';
  editingNoteId = null;
}

function saveEditNote() {
  const note = notes.find(n => n.id === editingNoteId);
  if (note) {
    note.title = document.getElementById('editNoteTitle').value.trim();
    note.tags = document.getElementById('editNoteTags').value.trim().split(',').map(t => t.trim());
    note.content = document.getElementById('editNoteEditor').innerHTML.trim();
    note.lastModified = new Date().toISOString();
    saveData();
    renderNotes();
    updateNoteStats();
    showToast('Đã cập nhật ghi chú!');
    closeEditNoteModal();
  }
}

// === Initial Load ===
document.addEventListener('DOMContentLoaded', loadData);

// Close modals when clicking outside
window.onclick = function(event) {
  if (event.target == document.getElementById('editTaskModal')) {
    closeEditTaskModal();
  }
  if (event.target == document.getElementById('editNoteModal')) {
    closeEditNoteModal();
  }
}
