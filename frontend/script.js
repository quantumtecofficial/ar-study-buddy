// ============================================
// JARVIS ONLINE - Full Stack Version
// Connects to Flask backend via SocketIO
// Falls back to client-side if backend unavailable
// ============================================

// --- Socket Connection ---
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000
});

let backendConnected = false;

const textOutput = document.getElementById('text-output');
const userInputDisplay = document.getElementById('user-input-display');
const infoContent = document.getElementById('info-content');
const commandInput = document.getElementById('command-input');
const micBtn = document.getElementById('mic-btn');
const arBtn = document.getElementById('ar-btn');
const arVideo = document.getElementById('ar-video');
const pomodoroTimer = document.getElementById('pomodoro-timer');

// Web Speech API Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
} else {
    console.warn("SpeechRecognition not supported in this browser.");
}

// TTS Setup
const synth = window.speechSynthesis;

// Update Clock
function updateClock() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// Simulate System Stats
function simulateSystemStats() {
    const bars = document.querySelectorAll('.fill');
    bars.forEach(bar => {
        const randomWidth = Math.floor(Math.random() * 60) + 40;
        bar.style.width = randomWidth + '%';
    });
}
setInterval(simulateSystemStats, 2000);
simulateSystemStats();

// Simulate Weather
function updateWeather() {
    const temps = [22, 23, 24, 25];
    const descs = ["Clear Sky", "Optimal", "Sunny", "Stable"];
    const temp = temps[Math.floor(Math.random() * temps.length)];
    const desc = descs[Math.floor(Math.random() * descs.length)];
    document.getElementById('weather-temp').innerText = temp + '°C';
    document.getElementById('weather-desc').innerText = desc;
}
setInterval(updateWeather, 60000);
updateWeather();

// ============================================
// SOCKET.IO EVENTS (Backend Connection)
// ============================================

socket.on('connect', () => {
    console.log('Connected to backend');
    backendConnected = true;
    addSystemMessage("Backend connected. Full AI capabilities online.");
    document.querySelector('.status-dot').style.backgroundColor = 'var(--primary-color)';
    document.querySelector('.status-dot').style.boxShadow = '0 0 15px var(--primary-color)';
});

socket.on('disconnect', () => {
    console.log('Disconnected from backend');
    backendConnected = false;
    addSystemMessage("Backend disconnected. Using client-side AI.");
    document.querySelector('.status-dot').style.backgroundColor = '#ff6600';
    document.querySelector('.status-dot').style.boxShadow = '0 0 15px #ff6600';
});

socket.on('connect_error', (error) => {
    console.log('Connection Error:', error);
    backendConnected = false;
});

socket.on('status', (data) => {
    console.log('Status:', data);
});

socket.on('jarvis_speak', (data) => {
    addSystemMessage(data.text);
    speak(data.text);
    startTalkingAnimation();
});

socket.on('user_speak', (data) => {
    userInputDisplay.innerText = '"' + data.text + '"';
});

socket.on('search_results', (data) => {
    displaySearchResults(data.results);
});

socket.on('start_timer', (data) => {
    startPomodoro(data.duration);
});

// ============================================
// CLIENT-SIDE FALLBACK AI (Pollinations.ai)
// ============================================

async function askAIFallback(prompt) {
    try {
        addSystemMessage("Thinking...");
        const response = await fetch("https://text.pollinations.ai/" + encodeURIComponent(prompt));
        if (!response.ok) throw new Error("AI request failed");
        const text = await response.text();
        return text.trim() || "I couldn't generate a response.";
    } catch (err) {
        console.error("AI Fallback Error:", err);
        return "I'm having trouble connecting right now.";
    }
}

async function processCommandClientSide(query) {
    query = query.toLowerCase().trim();

    if (query.includes("time")) {
        speak("The time is " + new Date().toLocaleTimeString());
    } else if (query.includes("date")) {
        speak("Today is " + new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    } else if (query.includes("play")) {
        const term = query.replace("play", "").trim();
        window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(term), '_blank');
        speak("Opening YouTube for " + term + ".");
    } else if (query.includes("open")) {
        const site = query.replace("open", "").trim();
        window.open("https://www." + site + ".com", '_blank');
        speak("Opening " + site + ".");
    } else if (query.includes("who made you") || query.includes("who created you")) {
        speak("Protkarsh, the brilliant boy behind me. He made me.");
    } else if (query.includes("what is your name") || query.includes("who are you")) {
        speak("My name is Quantum AI.");
    } else {
        const response = await askAIFallback(query);
        speak(response);
        addSystemMessage(response);
    }
}

// ============================================
// SEND COMMAND (Backend or Fallback)
// ============================================

function sendCommand(command) {
    if (backendConnected) {
        console.log("Sending to backend:", command);
        socket.emit('user_command', { command: command });
    } else {
        console.log("Backend offline, processing client-side:", command);
        processCommandClientSide(command);
    }
}

// ============================================
// TTS & UI
// ============================================

window.currentUtterance = null;

function loadVoices() {
    const voices = synth.getVoices();
    console.log("Voices loaded:", voices.length);
    return voices;
}

if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
}

function speak(text) {
    console.log("Attempting to speak:", text);
    synth.cancel();

    if (text !== '') {
        const ttsText = text.length > 500 ? text.substring(0, 500) + "..." : text;
        const utterThis = new SpeechSynthesisUtterance(ttsText);
        window.currentUtterance = utterThis;

        utterThis.onend = function () { console.log('SpeechSynthesisUtterance.onend'); }
        utterThis.onerror = function (event) { console.error('SpeechSynthesisUtterance.onerror', event); }

        const isHindi = /[\u0900-\u097F]/.test(text);
        const voices = synth.getVoices();
        let preferredVoice;

        if (isHindi) {
            preferredVoice = voices.find(v => v.lang.includes('hi') || v.name.includes('Hindi') || v.name.includes('Lekha'));
        }

        if (!preferredVoice) {
            preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices.find(v => v.lang === 'en-US') || voices[0];
        }

        if (preferredVoice) {
            utterThis.voice = preferredVoice;
        }

        utterThis.pitch = 1;
        utterThis.rate = 1;
        synth.speak(utterThis);
        startTalkingAnimation();
    }
}

// Start Overlay
const startOverlay = document.createElement('div');
startOverlay.style.position = 'fixed';
startOverlay.style.top = '0';
startOverlay.style.left = '0';
startOverlay.style.width = '100%';
startOverlay.style.height = '100%';
startOverlay.style.backgroundColor = 'rgba(0,0,0,0.9)';
startOverlay.style.zIndex = '1000';
startOverlay.style.display = 'flex';
startOverlay.style.justifyContent = 'center';
startOverlay.style.alignItems = 'center';
startOverlay.style.flexDirection = 'column';
startOverlay.innerHTML = `
    <h1 style="color: #00f3ff; font-family: 'Orbitron'; margin-bottom: 20px;">SYSTEM INITIALIZATION</h1>
    <button id="start-btn" style="padding: 15px 40px; font-size: 1.5rem; background: #00f3ff; border: none; color: #000; cursor: pointer; font-family: 'Rajdhani'; font-weight: bold; box-shadow: 0 0 20px #00f3ff;">INITIALIZE JARVIS</button>
`;
document.body.appendChild(startOverlay);

document.getElementById('start-btn').addEventListener('click', () => {
    startOverlay.style.display = 'none';
    speak("System Initialized. Listening for Quantum.");
    isListening = true;
    if (recognition) {
        try {
            recognition.start();
            userInputDisplay.innerText = "Listening (Always On)...";
            micBtn.classList.add('listening');
        } catch (e) {
            console.log("Error starting recognition:", e);
        }
    } else {
        userInputDisplay.innerText = "Voice not supported. Use text input.";
    }
});

// Mic Button
micBtn.addEventListener('click', () => {
    if (!recognition) {
        speak("Speech recognition not supported. Use Chrome.");
        return;
    }
    if (isListening) {
        isListening = false;
        recognition.stop();
        userInputDisplay.innerText = "Listening Stopped.";
        micBtn.classList.remove('listening');
    } else {
        isListening = true;
        try {
            recognition.start();
            userInputDisplay.innerText = "Listening (Always On)...";
            micBtn.classList.add('listening');
        } catch (e) {
            console.log("Recognition already started or error", e);
        }
    }
});

// AR Mode
let isARMode = false;
arBtn.addEventListener('click', async () => {
    if (!isARMode) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            arVideo.srcObject = stream;
            arVideo.style.display = 'block';
            document.body.style.background = 'transparent';
            isARMode = true;
            arBtn.style.color = '#00f3ff';
            arBtn.style.boxShadow = '0 0 15px #00f3ff';
            speak("AR Mode Engaged.");
        } catch (err) {
            console.error("Error accessing camera:", err);
            speak("I cannot access the camera.");
        }
    } else {
        const stream = arVideo.srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        arVideo.style.display = 'none';
        document.body.style.background = '';
        isARMode = false;
        arBtn.style.color = '';
        arBtn.style.boxShadow = '';
        speak("AR Mode Disengaged.");
    }
});

// Pomodoro Timer
let timerInterval;
function startPomodoro(minutes) {
    let seconds = minutes * 60;
    if (pomodoroTimer) pomodoroTimer.style.display = 'block';
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (pomodoroTimer) pomodoroTimer.innerText = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
        if (seconds <= 0) {
            clearInterval(timerInterval);
            if (pomodoroTimer) pomodoroTimer.style.display = 'none';
            speak("Time is up. Take a break.");
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play();
        }
        seconds--;
    }, 1000);
}

// Speech Recognition Events
if (recognition) {
    recognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
        console.log("Heard:", transcript);

        const isWakeWord = transcript.includes("quantum");

        if (isWakeWord && !window.isActiveCommandMode) {
            document.body.style.boxShadow = "inset 0 0 50px #00f3ff";
            setTimeout(() => document.body.style.boxShadow = "none", 500);
            userInputDisplay.innerText = '"' + transcript + '"';

            let command = transcript.replace("hey quantum", "").replace("quantum", "").trim();

            if (command.length > 2) {
                sendCommand(command);
                window.isActiveCommandMode = false;
            } else {
                window.isActiveCommandMode = true;
                speak("Yes?");
                micBtn.style.backgroundColor = "#00f3ff";
                micBtn.style.boxShadow = "0 0 20px #00f3ff";

                if (window.commandModeTimeout) clearTimeout(window.commandModeTimeout);
                window.commandModeTimeout = setTimeout(() => {
                    window.isActiveCommandMode = false;
                    micBtn.style.backgroundColor = "";
                    micBtn.style.boxShadow = "";
                }, 8000);
            }
            return;
        }

        if (window.isActiveCommandMode) {
            userInputDisplay.innerText = '"' + transcript + '"';
            sendCommand(transcript);
            window.isActiveCommandMode = false;
            micBtn.style.backgroundColor = "";
            micBtn.style.boxShadow = "";
            if (window.commandModeTimeout) clearTimeout(window.commandModeTimeout);
        }
    };

    recognition.onend = () => {
        if (isListening) {
            setTimeout(() => {
                try { recognition.start(); } catch (e) {
                    setTimeout(() => { try { recognition.start(); } catch (e2) { } }, 1000);
                }
            }, 200);
        } else {
            micBtn.classList.remove('listening');
        }
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            userInputDisplay.innerText = "Microphone Blocked. Allow permission.";
            isListening = false;
            micBtn.classList.remove('listening');
        }
    };
}

// UI Functions
function addSystemMessage(text) {
    const p = document.createElement('p');
    p.className = 'jarvis-text';
    textOutput.innerHTML = '';
    textOutput.appendChild(p);

    let i = 0;
    function typeWriter() {
        if (i < text.length) {
            p.innerHTML += text.charAt(i);
            i++;
            setTimeout(typeWriter, 30);
        }
    }
    typeWriter();
}

function displaySearchResults(results) {
    let html = '<ul style="list-style: none; padding: 0;">';
    results.forEach(res => {
        html += '<li class="search-result-item" onclick="window.open(\'' + res.href + '\', \'_blank\')">' +
            '<a href="' + res.href + '" target="_blank" onclick="event.stopPropagation()">' + res.title + '</a>' +
            '<p>' + res.body + '</p>' +
        '</li>';
    });
    html += '</ul>';
    infoContent.innerHTML = html;
}

let talkInterval;
function startTalkingAnimation() {
    if (talkInterval) clearInterval(talkInterval);
    let count = 0;
    talkInterval = setInterval(() => {
        if (window.updateAvatar) window.updateAvatar(Math.random() * 0.5 + 0.5);
        count++;
        if (count > 20) {
            clearInterval(talkInterval);
            if (window.updateAvatar) window.updateAvatar(0.1);
        }
    }, 100);
}

// Text Input
commandInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const command = commandInput.value;
        if (command) {
            userInputDisplay.innerText = '"' + command + '"';
            commandInput.value = '';
            sendCommand(command);
        }
    }
});

// Debug
window.sendTestCommand = function () { sendCommand("hello"); };
