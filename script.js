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

let stats = JSON.parse(localStorage.getItem("stats")) || {
    sessionsToday: 0,
    totalSessions: 0,
    streak: 0,
    lastDate: null,
    weekly: [0,0,0,0,0,0,0]
};

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
    updateDashboard();
   
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

    // NEW FEATURES
    updateStats();       // updates session count
    showNotification();  // desktop notification

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
        function updateStats(){
        
            const today = new Date().toDateString();
        
            if(stats.lastDate !== today){
                stats.sessionsToday = 0;
            }
        
            stats.sessionsToday++;
            stats.totalSessions++;
        
            if(stats.lastDate !== today){
                stats.streak++;
            }
        
            stats.lastDate = today;
        
            const day = new Date().getDay();
            stats.weekly[day]++;
        
            localStorage.setItem("stats",JSON.stringify(stats));
        
            updateDashboard();
        }
        
        function updateDashboard(){
        
            document.getElementById("sessions-today").textContent = stats.sessionsToday;
        
            document.getElementById("focus-streak").textContent = stats.streak;
        
            const score = stats.sessionsToday * 10;
        
            document.getElementById("productivity-score").textContent = score;
        
            drawChart();
        }
        
        let chart;
        
        function drawChart(){
        
        const ctx = document.getElementById("focusChart");
        
        if(chart){
        chart.destroy();
        }
        
        chart = new Chart(ctx,{
        type:"bar",
        data:{
        labels:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
        datasets:[{
        label:"Focus Sessions",
        data:stats.weekly
        }]
        }
        });
        }
        
        function showNotification(){
        
        if(Notification.permission !== "granted"){
        Notification.requestPermission();
        }
        
        if(Notification.permission === "granted"){
        new Notification("Pomodoro Completed!",{
        body:"Take a break and recharge!"
        });
        }
        }
        
        const rainSound = document.getElementById("rain-sound");
        
        document.getElementById("sound-toggle").addEventListener("click",()=>{
        
        if(rainSound.paused){
        rainSound.play();
        }else{
        rainSound.pause();
        }
        
        });
        
        document.getElementById("theme-toggle").addEventListener("click",()=>{
        
        document.body.classList.toggle("bg-gray-900");
        
        });

init();




