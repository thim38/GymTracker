// --- BASE DE DONNÉES & ÉTAT GLOBAL ---
const DB = {
    progs: JSON.parse(localStorage.getItem('gym_v8_progs')) || {},
    history: JSON.parse(localStorage.getItem('gym_v21_history')) || [],
    weight: JSON.parse(localStorage.getItem('gym_weight')) || []
};

// Vider/Sauvegarder
function saveDB() {
    localStorage.setItem('gym_v8_progs', JSON.stringify(DB.progs));
    localStorage.setItem('gym_v21_history', JSON.stringify(DB.history));
    localStorage.setItem('gym_weight', JSON.stringify(DB.weight));
}

function saveActiveSessionState(stateObj) {
    if (stateObj) {
        localStorage.setItem('gym_active_session', JSON.stringify(stateObj));
    } else {
        localStorage.removeItem('gym_active_session');
    }
}

function getActiveSessionState() {
    const raw = localStorage.getItem('gym_active_session');
    return raw ? JSON.parse(raw) : null;
}
