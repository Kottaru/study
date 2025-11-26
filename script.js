// Theme toggle
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
function loadTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') root.classList.add('light'); else root.classList.remove('light');
}
function toggleTheme() {
  root.classList.toggle('light');
  localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
}
themeToggle.addEventListener('click', toggleTheme);
loadTheme();

// Elements
const addBtn = document.getElementById('addTask');
const titleEl = document.getElementById('taskTitle');
const catEl = document.getElementById('taskCategory');
const dueEl = document.getElementById('taskDue');
const prioEl = document.getElementById('taskPriority');
const descEl = document.getElementById('taskDesc');
const searchEl = document.getElementById('search');
const filterPrioEl = document.getElementById('filterPriority');

const colToday = document.getElementById('col-today');
const colWeek  = document.getElementById('col-week');
const colDone  = document.getElementById('col-done');

const countToday = document.getElementById('count-today');
const countWeek  = document.getElementById('count-week');
const countDone  = document.getElementById('count-done');

// Storage
function getTasks() { return JSON.parse(localStorage.getItem('tasks') || '[]'); }
function setTasks(list) { localStorage.setItem('tasks', JSON.stringify(list)); }

function createTask() {
  const title = titleEl.value.trim();
  if (!title) {
    titleEl.focus();
    return;
  }
  const task = {
    id: crypto.randomUUID(),
    title,
    category: catEl.value.trim(),
    desc: descEl.value.trim(),
    due: dueEl.value || null,
    priority: prioEl.value,
    column: 'today',
    createdAt: Date.now()
  };
  const list = getTasks();
  list.unshift(task);
  setTasks(list);
  clearForm();
  render();
}

function clearForm() {
  titleEl.value = ''; catEl.value = ''; descEl.value = ''; dueEl.value = ''; prioEl.value = 'baixa';
}

addBtn.addEventListener('click', createTask);

// Render
const template = document.getElementById('taskTemplate');

function cardFromTask(task) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.card');
  card.dataset.id = task.id;

  node.querySelector('.category').textContent = task.category || 'Sem categoria';
  const pr = node.querySelector('.priority');
  pr.textContent = 'Prioridade: ' + task.priority;
  pr.style.borderColor = task.priority === 'alta' ? '#ff5c7a' : task.priority === 'media' ? '#ffba5c' : '#2dd4bf';
  pr.style.color = pr.style.borderColor;

  node.querySelector('.title').textContent = task.title;
  node.querySelector('.desc').textContent = task.desc || 'Sem descrição';
  node.querySelector('.due').textContent = task.due ? '📅 ' + task.due : '📅 Sem prazo';

  // Drag
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    card.style.opacity = '0.6';
  });
  card.addEventListener('dragend', () => { card.style.opacity = '1'; });

  // Actions
  node.querySelector('.del').addEventListener('click', () => {
    const list = getTasks().filter(t => t.id !== task.id);
    setTasks(list);
    render();
  });

  node.querySelector('.edit').addEventListener('click', () => {
    titleEl.value = task.title;
    catEl.value = task.category || '';
    descEl.value = task.desc || '';
    dueEl.value = task.due || '';
    prioEl.value = task.priority;

    // Convert edit → save
    addBtn.textContent = 'Salvar alterações';
    addBtn.onclick = () => {
      const list = getTasks();
      const idx = list.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          title: titleEl.value.trim() || list[idx].title,
          category: catEl.value.trim(),
          desc: descEl.value.trim(),
          due: dueEl.value || null,
          priority: prioEl.value
        };
        setTasks(list);
        clearForm();
        addBtn.textContent = 'Adicionar';
        addBtn.onclick = createTask;
        render();
      }
    };
  });

  node.querySelector('.move').addEventListener('click', () => {
    const order = ['today', 'week', 'done'];
    const next = order[(order.indexOf(task.column) + 1) % order.length];
    const list = getTasks().map(t => t.id === task.id ? { ...t, column: next } : t);
    setTasks(list);
    render();
  });

  return node;
}

function render() {
  [colToday, colWeek, colDone].forEach(col => col.innerHTML = '');

  const q = searchEl.value.toLowerCase();
  const pf = filterPrioEl.value;

  const list = getTasks().filter(t => {
    const matchesText =
      t.title.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      (t.desc || '').toLowerCase().includes(q);
    const matchesPrio = (pf === 'todas') || (t.priority === pf);
    return matchesText && matchesPrio;
  });

  list.forEach(task => {
    const card = cardFromTask(task);
    if (task.column === 'today') colToday.appendChild(card);
    else if (task.column === 'week') colWeek.appendChild(card);
    else colDone.appendChild(card);
  });

  countToday.textContent = list.filter(t => t.column === 'today').length;
  countWeek.textContent  = list.filter(t => t.column === 'week').length;
  countDone.textContent  = list.filter(t => t.column === 'done').length;
}

// Dropzones
document.querySelectorAll('.dropzone').forEach(zone => {
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.outline = '2px dashed #7c5cff'; });
  zone.addEventListener('dragleave', () => { zone.style.outline = 'none'; });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.style.outline = 'none';
    const id = e.dataTransfer.getData('text/plain');
    const col = zone.id === 'col-today' ? 'today' : zone.id === 'col-week' ? 'week' : 'done';
    const list = getTasks().map(t => t.id === id ? { ...t, column: col } : t);
    setTasks(list);
    render();
  });
});

searchEl.addEventListener('input', render);
filterPrioEl.addEventListener('change', render);

// Export / Import
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(getTasks(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'focusflow-tarefas.json';
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('arquivo inválido');
    setTasks(data);
    render();
  } catch {
    alert('Arquivo inválido.');
  } finally {
    importFile.value = '';
  }
});

// Clear all
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('Tem certeza que deseja apagar todas as tarefas?')) {
    localStorage.removeItem('tasks');
    render();
  }
});

// Initial
render();
