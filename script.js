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
let activeTaskId = null; // Track which task is currently being worked on
let chartInstance = null;

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
const ambientSelector = document.getElementById('ambient-sound-selector');
let currentAmbientAudio = null;

// --- Initialization ---
function init() {
    loadSettings();
    loadBackground();
    loadTheme();
    renderTasks();
    switchMode('pomodoro');
    requestNotificationPermission();
    updateStreak();
}

// --- Notifications ---
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

function sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png" });
    }
}

// --- Theme Management (Dark/Light) ---
const themeToggleBtn = document.getElementById('theme-toggle');
function loadTheme() {
    const isDark = localStorage.getItem('theme') === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
        themeToggleBtn.textContent = '☀️';
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleBtn.textContent = '🌙';
    }
}

themeToggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
    clickSound.play();
});


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
    document.title = `${timerDisplay.textContent} - FocusFlow`;

    if (timerData.timeLeft === 0) {
        handleTimerComplete();
    } else {
        timerData.timeLeft--;
    }
}

function handleTimerComplete() {
    clearInterval(timerData.interval);
    finishSound.play();
    pauseAmbientSound();
    timerData.isActive = false;
    startBtn.textContent = 'START';
    
    if (timerData.currentMode === 'pomodoro') {
        sendNotification("Pomodoro Complete!", "Great job! Time for a break.");
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        
        // Track Stats
        trackStats(timerData.pomodoro);
        
        // Track Task Sessions
        if (activeTaskId !== null && tasks[activeTaskId]) {
            tasks[activeTaskId].actPomodoros = (tasks[activeTaskId].actPomodoros || 0) + 1;
            saveAndRenderTasks();
        }
    } else {
        sendNotification("Break Over!", "Ready to focus again?");
    }
}

function toggleTimer() {
    clickSound.play();
    if (timerData.isActive) {
        clearInterval(timerData.interval);
        startBtn.textContent = 'START';
        pauseAmbientSound();
    } else {
        // Request notification permission on first user interaction if not set
        requestNotificationPermission(); 
        timerData.interval = setInterval(updateTimer, 1000);
        startBtn.textContent = 'PAUSE';
        playAmbientSound();
    }
    timerData.isActive = !timerData.isActive;
}

function switchMode(mode) {
    clickSound.play();
    timerData.currentMode = mode;
    timerData.isActive = false;
    clearInterval(timerData.interval);
    pauseAmbientSound();
    
    startBtn.textContent = 'START';
    modeBtns.forEach(btn => {
        btn.dataset.mode === mode ? btn.classList.add('active') : btn.classList.remove('active');
    });

    body.className = `min-h-screen flex flex-col items-center py-8 px-4 relative overflow-x-hidden transition-colors duration-500 bg-${mode}`;
    timerData.timeLeft = timerData[mode] * 60;
    updateTimer();
}

// --- Ambient Sounds Logic ---
ambientSelector.addEventListener('change', (e) => {
    pauseAmbientSound();
    const soundType = e.target.value;
    if (soundType !== 'none') {
        currentAmbientAudio = document.getElementById(`ambient-${soundType}`);
        if (timerData.isActive) playAmbientSound();
    } else {
        currentAmbientAudio = null;
    }
});

function playAmbientSound() {
    if (currentAmbientAudio) currentAmbientAudio.play().catch(() => {});
}

function pauseAmbientSound() {
    if (currentAmbientAudio) currentAmbientAudio.pause();
}

// --- Statistics, Streak & Chart Logic ---
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function getStats() {
    return JSON.parse(localStorage.getItem('focusStats')) || {};
}

function saveStats(stats) {
    localStorage.setItem('focusStats', JSON.stringify(stats));
}

function updateStreak() {
    let stats = getStats();
    let today = getTodayString();
    let lastActiveDate = localStorage.getItem('lastActiveDate');
    let streak = parseInt(localStorage.getItem('currentStreak') || '0');

    if (lastActiveDate !== today) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        let yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActiveDate === yesterdayStr) {
            streak++; // Continued streak
        } else if (lastActiveDate !== today) {
            streak = 1; // Reset streak, but they are active today
        }
        localStorage.setItem('lastActiveDate', today);
        localStorage.setItem('currentStreak', streak.toString());
    }
}

function trackStats(minutesFocused) {
    let stats = getStats();
    let today = getTodayString();
    
    if (!stats[today]) {
        stats[today] = { pomodoros: 0, focusTime: 0, tasksCompleted: 0 };
    }
    
    stats[today].pomodoros++;
    stats[today].focusTime += minutesFocused;
    saveStats(stats);
}

function calculateProductivityScore(stats, today, streak) {
    const todayStats = stats[today] || { pomodoros: 0, tasksCompleted: 0 };
    // Score formula: Pomodoros * 10 + Tasks Completed * 20 + Streak * 5
    return (todayStats.pomodoros * 10) + (todayStats.tasksCompleted * 20) + (streak * 5);
}

function openStatsModal() {
    const stats = getStats();
    const today = getTodayString();
    const streak = parseInt(localStorage.getItem('currentStreak') || '0');
    const todayStats = stats[today] || { pomodoros: 0, focusTime: 0, tasksCompleted: 0 };

    // Update UI text
    document.getElementById('stat-streak').textContent = `${streak} 🔥`;
    document.getElementById('stat-pomos').textContent = todayStats.pomodoros;
    document.getElementById('stat-score').textContent = calculateProductivityScore(stats, today, streak);
    
    const hours = Math.floor(todayStats.focusTime / 60);
    const mins = todayStats.focusTime % 60;
    document.getElementById('stat-time').textContent = `${hours}h ${mins}m`;

    renderChart(stats);
    document.getElementById('stats-modal').classList.remove('hidden');
}

function renderChart(stats) {
    const ctx = document.getElementById('productivityChart').getContext('2d');
    
    // Generate last 7 days labels
    const labels = [];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const displayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        labels.push(displayLabel);
        data.push(stats[dateStr] ? stats[dateStr].focusTime : 0);
    }

    // Destroy old chart if exists to prevent overlapping
    if (chartInstance) chartInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e2e8f0' : '#475569';

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Focus Time (Minutes)',
                data: data,
                backgroundColor: isDark ? '#3b82f6' : '#1e293b',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            },
            plugins: {
                legend: { labels: { color: textColor } }
            }
        }
    });
}

// --- Task Management ---
const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const taskEstInput = document.getElementById('task-est');
const taskInputContainer = document.getElementById('task-input-container');

function saveAndRenderTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
        const isActive = index === activeTaskId;
        const div = document.createElement('div');
        div.className = `task-item flex items-center justify-between p-4 rounded-lg text-white cursor-pointer ${task.completed ? 'task-completed' : ''} ${isActive ? 'active-task' : ''}`;
        
        // Clicking task sets it as active
        div.onclick = (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
                activeTaskId = isActive ? null : index;
                renderTasks();
            }
        };

        const pomodoroFraction = `${task.actPomodoros || 0}/${task.estPomodoros || 1}`;

        div.innerHTML = `
            <div class="flex items-center gap-3 w-full">
                <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})" class="task-checkbox">
                <span class="flex-1 font-medium truncate">${task.text}</span>
                <span class="text-xs bg-white/20 px-2 py-1 rounded-md tracking-widest">${pomodoroFraction} 🍅</span>
            </div>
            <button onclick="deleteTask(${index})" class="text-white/50 hover:text-red-300 ml-3 text-lg transition">✕</button>
        `;
        taskList.appendChild(div);
    });
}

function addTask() {
    if (taskInput.value.trim() === '') return;
    tasks.push({ 
        text: taskInput.value, 
        completed: false, 
        estPomodoros: parseInt(taskEstInput.value) || 1,
        actPomodoros: 0 
    });
    taskInput.value = '';
    taskEstInput.value = '1';
    taskInputContainer.classList.add('hidden');
    saveAndRenderTasks();
}

function toggleTask(index) {
    tasks[index].completed = !tasks[index].completed;
    
    if (tasks[index].completed) {
        let stats = getStats();
        let today = getTodayString();
        if (!stats[today]) stats[today] = { pomodoros: 0, focusTime: 0, tasksCompleted: 0 };
        stats[today].tasksCompleted++;
        saveStats(stats);
        
        // Trigger tiny confetti on task complete
        confetti({ particleCount: 50, spread: 40, origin: { y: 0.8 } });
        
        // Remove active status if completed
        if (activeTaskId === index) activeTaskId = null;
    }
    saveAndRenderTasks();
}

function deleteTask(index) {
    tasks.splice(index, 1);
    if (activeTaskId === index) activeTaskId = null;
    else if (activeTaskId > index) activeTaskId--;
    saveAndRenderTasks();
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
    bgUrlInput.value = '';
    bgFileInput.value = '';
    setBackgroundImage(null);
});

function loadBackground() {
    const savedBg = localStorage.getItem('customBg');
    if (savedBg) setBackgroundImage(savedBg);
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

document.getElementById('stats-btn').addEventListener('click', openStatsModal);
document.getElementById('close-stats').addEventListener('click', () => document.getElementById('stats-modal').classList.add('hidden'));

// Task UI Toggles
document.getElementById('add-task-btn').addEventListener('click', () => {
    taskInputContainer.classList.remove('hidden');
    taskInput.focus();
});
document.getElementById('cancel-task').addEventListener('click', () => taskInputContainer.classList.add('hidden'));
document.getElementById('save-task').addEventListener('click', addTask);

// Start
init();
