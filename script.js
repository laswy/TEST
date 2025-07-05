<script>
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
  localStorage.setItem("darkMode", isDarkMode);
}

// Data storage functions
function saveData() {
  try {
    const data = {
      tasks: tasks,
      notes: notes,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem("taskNotesData", JSON.stringify(data));
    showToast('Đã lưu thành công!', 'success');
  } catch (error) {
    showToast('Lỗi khi lưu dữ liệu!', 'error');
    console.error('Save error:', error);
  }
}

function loadData() {
  try {
    const dataStr = localStorage.getItem("taskNotesData");
    if (dataStr) {
      const data = JSON.parse(dataStr);
      tasks = data.tasks || [];
      notes = data.notes || [];
    }
    renderTasks();
    renderNotes();
    updateTaskStats();
    updateNoteStats();

    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add('dark-mode');
    }
  } catch (error) {
    showToast('Lỗi khi tải dữ liệu!', 'error');
    console.error('Load error:', error);
    tasks = [];
    notes = [];
  }
}
</script>
