// Global variables
let tasks = [];
let notes = [];
let currentTaskFilter = 'all';
let currentNoteFilter = 'all';
let currentTab = 'tasks'; // Default tab

// Tab switching
function switchTab(tab) {
  currentTab = tab;

  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Show selected tab content
  document.getElementById(tab + 'Tab').classList.add('active');

  // Update navigation buttons active state
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  // Find the button that was clicked and add 'active' class
  const clickedButton = document.querySelector(`.nav-tab[onclick="switchTab('${tab}')"]`);
  if (clickedButton) {
    clickedButton.classList.add('active');
  }
}

// Dark Mode Toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  // Store dark mode preference in localStorage
  localStorage.setItem('darkModeEnabled', isDarkMode);
}

// Data storage functions
function saveData() {
  try {
    const data = {
      tasks: tasks,
      notes: notes,
      lastSaved: new Date().toISOString()
    };
    // Store in localStorage
    localStorage.setItem('todoAppData', JSON.stringify(data));

    showToast('Đã lưu thành công!', 'success');
  } catch (error) {
    showToast('Lỗi khi lưu dữ liệu!', 'error');
    console.error('Save error:', error);
  }
}

function loadData() {
  try {
    // Load from localStorage
    const storedData = localStorage.getItem('todoAppData');
    if (storedData) {
      const data = JSON.parse(storedData);
      tasks = data.tasks || [];
      notes = data.notes || [];
    }

    // Render data
    renderTasks();
    renderNotes();
    updateTaskStats();
    updateNoteStats();

    // Load dark mode preference from localStorage
    const storedDarkMode = localStorage.getItem('darkModeEnabled');
    if (storedDarkMode === 'true') {
      document.body.classList.add('dark-mode');
    }
  } catch (error) {
    showToast('Lỗi khi tải dữ liệu!', 'error');
    console.error('Load error:', error);
    tasks = [];
    notes = [];
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Task management functions
function addTask() {
  const text = document.getElementById('taskInput').value.trim();
  const startInput = document.getElementById('startTime').value;
  const endInput = document.getElementById('endTime').value;
  const priority = document.getElementById('prioritySelect').value;
  const tagsInput = document.getElementById('taskTags').value.trim();

  if (!text || !startInput) {
    showToast("Vui lòng nhập đầy đủ nội dung và ngày bắt đầu.", 'error');
    return;
  }

  const start = new Date(startInput);
  let end = endInput ? new Date(endInput) : new Date(startInput);

  // Process tags
  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  tasks.push({
    id: Date.now(),
    text,
    start: start.toISOString(),
    end: end.toISOString(),
    priority,
    tags,
    completed: false,
    pinned: false,
    createdAt: new Date().toISOString()
  });

  saveData();
  renderTasks();
  updateTaskStats();

  // Clear form
  document.getElementById('taskInput').value = '';
  document.getElementById('startTime').value = '';
  document.getElementById('endTime').value = '';
  document.getElementById('prioritySelect').value = 'medium';
  document.getElementById('taskTags').value = '';

  showToast('Đã thêm công việc mới!', 'success');
}

function calculateProgress(task) {
  if (task.completed) return 100;
  const now = new Date();
  const start = new Date(task.start);
  const end = new Date(task.end);
  if (now < start) return 0; // Task hasn't started yet
  if (now >= end) return 100; // Task is overdue or completed
  const total = end - start;
  const passed = now - start;
  return Math.floor((passed / total) * 100);
}

function getPriorityText(priority) {
  switch(priority) {
    case 'low': return 'Thấp';
    case 'medium': return 'Trung bình';
    case 'high': return 'Cao';
    default: return priority;
  }
}

function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';

  let filteredTasks = tasks.filter(task => {
    if (currentTaskFilter === 'active') return !task.completed;
    if (currentTaskFilter === 'completed') return task.completed;
    if (currentTaskFilter === 'pinned') return task.pinned;
    return true; // 'all' filter
  });

  // Apply search filter
  const searchTerm = document.getElementById('taskSearch')?.value?.toLowerCase() || '';
  if (searchTerm) {
    filteredTasks = filteredTasks.filter(task =>
      task.text.toLowerCase().includes(searchTerm) ||
      task.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Sort tasks
  filteredTasks.sort((a, b) => {
    // Pinned tasks first
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    // Uncompleted tasks before completed tasks
    if (a.completed !== b.completed) return a.completed - b.completed;

    // For active tasks, sort by priority (High > Medium > Low)
    if (!a.completed && !b.completed) {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
    }

    // Then by progress (higher progress first for active tasks, lower progress first for completed tasks to show recent completions)
    const progressA = calculateProgress(a);
    const progressB = calculateProgress(b);
    if (a.completed) { // For completed, sort by newest completion first (assuming new completion means higher progress)
        return new Date(b.createdAt) - new Date(a.createdAt); // Or by actual completion date if tracked
    } else { // For active, sort by higher progress first
        return progressB - progressA;
    }

    // Finally by creation date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (filteredTasks.length === 0) {
    list.innerHTML = '<p class="text-center item-meta">Không có công việc nào.</p>';
    return;
  }

  filteredTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = 'item task-item';
    if (task.completed) {
      li.classList.add('completed');
    }
    if (task.pinned) {
      li.classList.add('pinned');
    }

    const progress = calculateProgress(task);
    let progressBarClass = '';
    if (!task.completed) {
        if (progress >= 100) progressBarClass = 'progress-red'; // Overdue
        else if (progress >= 75) progressBarClass = 'progress-orange';
        else if (progress >= 50) progressBarClass = 'progress-pink';
        else progressBarClass = 'progress-white';
    } else {
        progressBarClass = 'completed-green';
    }
    li.classList.add(progressBarClass);


    li.innerHTML = `
      ${task.pinned ? '<span class="pin-icon">📍</span>' : ''}
      <div class="item-title">${task.text}</div>
      <div class="item-meta">
        Bắt đầu: ${new Date(task.start).toLocaleDateString()}
        ${task.end ? ` | Kết thúc: ${new Date(task.end).toLocaleDateString()}` : ''}
      </div>
      <div class="item-meta">Ưu tiên: ${getPriorityText(task.priority)}</div>
      <div class="item-tags">
        ${task.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width: ${progress}%;"></div>
      </div>
      <div class="item-meta">Tiến độ: ${progress}%</div>
      <div class="item-actions">
        <button class="btn-success" onclick="toggleTaskComplete(${task.id})">
          ${task.completed ? 'Hoàn tác' : 'Hoàn thành'}
        </button>
        <button class="btn-warning" onclick="toggleTaskPin(${task.id})">
          ${task.pinned ? 'Bỏ ghim' : 'Ghim'}
        </button>
        <button class="btn-danger" onclick="deleteTask(${task.id})">Xóa</button>
      </div>
    `;
    list.appendChild(li);
  });
}

function deleteTask(id) {
  if (confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
    tasks = tasks.filter(task => task.id !== id);
    saveData();
    renderTasks();
    updateTaskStats();
    showToast('Đã xóa công việc!', 'warning');
  }
}

function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveData();
    renderTasks();
    updateTaskStats();
    showToast(task.completed ? 'Đã hoàn thành công việc!' : 'Đã hoàn tác công việc!', 'success');
  }
}

function toggleTaskPin(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.pinned = !task.pinned;
    saveData();
    renderTasks();
    updateTaskStats();
    showToast(task.pinned ? 'Đã ghim công việc!' : 'Đã bỏ ghim công việc!', 'success');
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
  renderTasks(); // Re-render tasks with search filter applied
}

function updateTaskStats() {
  document.getElementById('totalTasks').textContent = tasks.length;
  document.getElementById('completedTasks').textContent = tasks.filter(task => task.completed).length;
  document.getElementById('activeTasks').textContent = tasks.filter(task => !task.completed).length;
  document.getElementById('pinnedTasks').textContent = tasks.filter(task => task.pinned).length;
}


// Notes management functions
function addNote() {
  const title = document.getElementById('noteTitle').value.trim();
  const tagsInput = document.getElementById('noteTags').value.trim();
  const content = document.getElementById('noteEditor').innerHTML.trim();

  if (!title || !content) {
    showToast("Vui lòng nhập đầy đủ tiêu đề và nội dung ghi chú.", 'error');
    return;
  }

  const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

  notes.push({
    id: Date.now(),
    title,
    content,
    tags,
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

  showToast('Đã thêm ghi chú mới!', 'success');
}


function renderNotes() {
    const list = document.getElementById('noteList');
    list.innerHTML = '';

    let filteredNotes = notes.filter(note => {
        if (currentNoteFilter === 'pinned') return note.pinned;
        if (currentNoteFilter === 'recent') {
            // Filter notes modified in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return new Date(note.lastModified) >= sevenDaysAgo;
        }
        return true; // 'all' filter
    });

    const searchTerm = document.getElementById('noteSearch')?.value?.toLowerCase() || '';
    if (searchTerm) {
        filteredNotes = filteredNotes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    // Sort notes
    filteredNotes.sort((a, b) => {
        // Pinned notes first
        if (a.pinned !== b.pinned) return b.pinned ? -1 : 1;
        // Then by last modified (newest first)
        return new Date(b.lastModified) - new Date(a.lastModified);
    });


    if (filteredNotes.length === 0) {
        list.innerHTML = '<p class="text-center item-meta">Không có ghi chú nào.</p>';
        return;
    }

    filteredNotes.forEach(note => {
        const li = document.createElement('li');
        li.className = 'item';
        if (note.pinned) {
            li.classList.add('pinned');
        }
        li.innerHTML = `
            ${note.pinned ? '<span class="pin-icon">📍</span>' : ''}
            <div class="item-title">${note.title}</div>
            <div class="item-content">${note.content}</div>
            <div class="item-tags">
                ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="item-meta">Cập nhật: ${new Date(note.lastModified).toLocaleDateString()} ${new Date(note.lastModified).toLocaleTimeString()}</div>
            <div class="item-actions">
                <button class="btn-warning" onclick="toggleNotePin(${note.id})">
                    ${note.pinned ? 'Bỏ ghim' : 'Ghim'}
                </button>
                <button class="btn-primary" onclick="editNote(${note.id})">Sửa</button>
                <button class="btn-danger" onclick="deleteNote(${note.id})">Xóa</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function deleteNote(id) {
    if (confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) {
        notes = notes.filter(note => note.id !== id);
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
        note.lastModified = new Date().toISOString(); // Update modification date on pin/unpin
        saveData();
        renderNotes();
        updateNoteStats();
        showToast(note.pinned ? 'Đã ghim ghi chú!' : 'Đã bỏ ghim ghi chú!', 'success');
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
    renderNotes(); // Re-render notes with search filter applied
}

function updateNoteStats() {
    document.getElementById('totalNotes').textContent = notes.length;
    document.getElementById('pinnedNotes').textContent = notes.filter(note => note.pinned).length;
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    document.getElementById('recentNotes').textContent = notes.filter(note => new Date(note.lastModified) >= sevenDaysAgo).length;
}

// Rich text editor functions for notes
function formatText(command, value = null) {
  document.execCommand(command, false, value);
  document.getElementById('noteEditor').focus(); // Keep focus on editor
}

function insertLink() {
  const url = prompt('Nhập URL:');
  if (url) {
    document.execCommand('createLink', false, url);
  }
  document.getElementById('noteEditor').focus();
}

function editNote(id) {
  const noteToEdit = notes.find(note => note.id === id);
  if (noteToEdit) {
    // Switch to notes tab if not already there
    switchTab('notes');

    // Populate the form with existing note data
    document.getElementById('noteTitle').value = noteToEdit.title;
    document.getElementById('noteTags').value = noteToEdit.tags.join(', ');
    document.getElementById('noteEditor').innerHTML = noteToEdit.content;

    // Change the add button to an update button
    const addButton = document.querySelector('#notesTab .add-btn');
    addButton.textContent = 'CẬP NHẬT GHI CHÚ';
    addButton.onclick = () => updateNote(id);

    // Show a toast message
    showToast('Đang chỉnh sửa ghi chú...', 'info');
  }
}

function updateNote(id) {
  const noteIndex = notes.findIndex(note => note.id === id);
  if (noteIndex > -1) {
    const updatedTitle = document.getElementById('noteTitle').value.trim();
    const updatedTagsInput = document.getElementById('noteTags').value.trim();
    const updatedContent = document.getElementById('noteEditor').innerHTML.trim();

    if (!updatedTitle || !updatedContent) {
      showToast("Vui lòng nhập đầy đủ tiêu đề và nội dung ghi chú.", 'error');
      return;
    }

    const updatedTags = updatedTagsInput ? updatedTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    notes[noteIndex] = {
      ...notes[noteIndex], // Keep existing properties
      title: updatedTitle,
      content: updatedContent,
      tags: updatedTags,
      lastModified: new Date().toISOString() // Update modification date
    };

    saveData();
    renderNotes();
    updateNoteStats();

    // Reset form and button
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteTags').value = '';
    document.getElementById('noteEditor').innerHTML = '';
    const addButton = document.querySelector('#notesTab .add-btn');
    addButton.textContent = '➕ THÊM GHI CHÚ';
    addButton.onclick = addNote;

    showToast('Đã cập nhật ghi chú!', 'success');
  } else {
    showToast('Không tìm thấy ghi chú để cập nhật.', 'error');
  }
}


// Initial load when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  // Ensure the correct tab is active on load
  switchTab(currentTab);
});
