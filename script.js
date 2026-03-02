// --- State Management ---
let timerData = {
    pomodoro: 25,
    short: 5,
    long: 15,
    currentMode: 'pomodoro',
    timeLeft: 25 * 60,
    isActive: false,
    interval: null
};

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

// --- DOM Elements ---
const body = document.body;
const timerDisplay = document.getElementById('timer-display');
const progressBar = document.getElementById('progress-bar');
const startBtn = document.getElementById('start-btn');
const skipBtn = document.getElementById('skip-btn');
const modeBtns = document.querySelectorAll('.mode-btn');

// Sounds
const clickSound = document.getElementById('click-sound');
const finishSound = document.getElementById('finish-sound');

// --- Initialization ---
function init() {
    loadSettings();
    loadBackground();
    renderTasks();
    switchMode('pomodoro');

    const headerTitle = document.querySelector('header h1');
const savedName = localStorage.getItem('focusUserName');
if (savedName) {
    headerTitle.textContent = `FocusFlow — ${savedName}'s Session`;
}
}


// --- Timer Logic ---
function updateTimer() {
    const minutes = Math.floor(timerData.timeLeft / 60);
    const seconds = timerData.timeLeft % 60;
    
    // UI Update
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Progress Bar Update
    const totalSeconds = timerData[timerData.currentMode] * 60;
    const progress = ((totalSeconds - timerData.timeLeft) / totalSeconds) * 100;
    progressBar.style.width = `${progress}%`;

    // Title Tag Update
    document.title = `${timerDisplay.textContent} - FocusFlow`;

    if (timerData.timeLeft === 0) {
        clearInterval(timerData.interval);
        finishSound.play();
        timerData.isActive = false;
        startBtn.textContent = 'START';
        alert('Time is up!');
    } else {
        timerData.timeLeft--;
    }
}

function toggleTimer() {
    clickSound.play();
    if (timerData.isActive) {
        clearInterval(timerData.interval);
        startBtn.textContent = 'START';
    } else {
        timerData.interval = setInterval(updateTimer, 1000);
        startBtn.textContent = 'PAUSE';
    }
    timerData.isActive = !timerData.isActive;
}

function switchMode(mode) {
    clickSound.play();
    timerData.currentMode = mode;
    timerData.isActive = false;
    clearInterval(timerData.interval);
    
    // UI Logic
    startBtn.textContent = 'START';
    modeBtns.forEach(btn => {
        btn.dataset.mode === mode ? btn.classList.add('active') : btn.classList.remove('active');
    });

    // Color shift
    body.className = `min-h-screen flex flex-col items-center py-8 px-4 relative overflow-x-hidden bg-${mode}`;
    
    // Reset Time
    timerData.timeLeft = timerData[mode] * 60;
    updateTimer();
}

// --- Personalization Logic ---
const bgOverlay = document.getElementById('bg-overlay');
const bgUrlInput = document.getElementById('bg-url-input');
const bgFileInput = document.getElementById('bg-file-input');

function setBackgroundImage(src) {
    if (!src) {
        bgOverlay.style.backgroundImage = 'none';
        return;
    }
    bgOverlay.style.backgroundImage = `url('${src}')`;
    localStorage.setItem('customBg', src);
}

bgUrlInput.addEventListener('change', (e) => setBackgroundImage(e.target.value));

bgFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => setBackgroundImage(reader.result);
    if (file) reader.readAsDataURL(file);
});

document.getElementById('reset-bg').addEventListener('click', () => {
    localStorage.removeItem('customBg');
    setBackgroundImage(null);
});

function loadBackground() {
    const savedBg = localStorage.getItem('customBg');
    if (savedBg) setBackgroundImage(savedBg);
}

// --- Task Management ---
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const taskInputContainer = document.getElementById('task-input-container');

function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const div = document.createElement('div');
        div.className = `task-item flex items-center justify-between p-4 rounded-lg text-white ${task.completed ? 'task-completed' : ''}`;
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})" class="task-checkbox">
                <span>${task.text}</span>
            </div>
            <button onclick="deleteTask(${index})" class="text-white/50 hover:text-white">✕</button>
        `;
        taskList.appendChild(div);
    });
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function addTask() {
    if (taskInput.value.trim() === '') return;
    tasks.push({ text: taskInput.value, completed: false });
    taskInput.value = '';
    taskInputContainer.classList.add('hidden');
    renderTasks();
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    renderTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);
    renderTasks();
}

// --- Settings Logic ---
function loadSettings() {
    const savedSettings = JSON.parse(localStorage.getItem('timerSettings'));
    if (savedSettings) {
        timerData.pomodoro = savedSettings.pomodoro;
        timerData.short = savedSettings.short;
        timerData.long = savedSettings.long;
        document.getElementById('pomo-duration').value = savedSettings.pomodoro;
        document.getElementById('short-duration').value = savedSettings.short;
        document.getElementById('long-duration').value = savedSettings.long;
    }
}

function saveSettings() {
    timerData.pomodoro = parseInt(document.getElementById('pomo-duration').value);
    timerData.short = parseInt(document.getElementById('short-duration').value);
    timerData.long = parseInt(document.getElementById('long-duration').value);
    
    localStorage.setItem('timerSettings', JSON.stringify({
        pomodoro: timerData.pomodoro,
        short: timerData.short,
        long: timerData.long
    }));
    
    switchMode(timerData.currentMode); // Reset with new times
}

// --- Event Listeners ---
startBtn.addEventListener('click', toggleTimer);
skipBtn.addEventListener('click', () => {
    const modes = ['pomodoro', 'short', 'long'];
    let nextIndex = (modes.indexOf(timerData.currentMode) + 1) % modes.length;
    switchMode(modes[nextIndex]);
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
});

// Modal Toggles
document.getElementById('settings-btn').addEventListener('click', () => document.getElementById('settings-modal').classList.remove('hidden'));
document.getElementById('close-settings').addEventListener('click', () => {
    saveSettings();
    document.getElementById('settings-modal').classList.add('hidden');
});

document.getElementById('personalize-btn').addEventListener('click', () => document.getElementById('personalize-modal').classList.remove('hidden'));
document.getElementById('close-personalize').addEventListener('click', () => document.getElementById('personalize-modal').classList.add('hidden'));

// Task UI Toggles
document.getElementById('add-task-btn').addEventListener('click', () => taskInputContainer.classList.toggle('hidden'));
document.getElementById('cancel-task').addEventListener('click', () => taskInputContainer.classList.add('hidden'));
document.getElementById('save-task').addEventListener('click', addTask);

// Start

init();

// --- Welcome Celebration Logic ---
const welcomeModal = document.getElementById('welcome-modal');
const startWelcomeBtn = document.getElementById('start-welcome');
const nameInput = document.getElementById('user-name-input');
const celebrationArea = document.getElementById('celebration-area');
const welcomeMessage = document.getElementById('welcome-message');

function generateMessage(name) {
    const messages = [
        `Welcome, ${name}! 🌸 Time to focus like a legend.`,
        `${name}, today you're unstoppable 🚀`,
        `Let’s build something powerful, ${name}!`,
        `${name}, your productivity era starts now ✨`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

function createPetals() {
    for (let i = 0; i < 20; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        petal.innerHTML = '🌸';
        petal.style.left = Math.random() * 100 + 'vw';
        petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(petal);

        setTimeout(() => petal.remove(), 5000);
    }
}

startWelcomeBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;

    localStorage.setItem('focusUserName', name);

    celebrationArea.classList.remove('hidden');
    welcomeMessage.textContent = generateMessage(name);

    createPetals();

    confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
    });

    setTimeout(() => {
        welcomeModal.classList.add('hidden');
    }, 4000);
});

// Auto skip if already entered name
window.addEventListener('load', () => {
    const savedName = localStorage.getItem('focusUserName');
    if (savedName) {
        welcomeModal.classList.add('hidden');
    }
});
