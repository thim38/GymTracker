// --- NOUVELLE LOGIQUE HISTORIQUE (SWITCH) ---
function switchHistoryMode(mode) {
    historyMode = mode;
    updateHistoryTabsUI();

    const listView = document.getElementById('history-subview-list');
    const calView = document.getElementById('history-subview-calendar');
    const weightView = document.getElementById('history-subview-weight');

    listView.classList.add('hidden');
    calView.classList.add('hidden');
    weightView.classList.add('hidden');

    if (mode === 'list') {
        listView.classList.remove('hidden');
        renderHistory();
    } else if (mode === 'calendar') {
        calView.classList.remove('hidden');
        renderCalendar();
    } else if (mode === 'weight') {
        weightView.classList.remove('hidden');
        renderWeightView();
    }
    updateHistoryTitle();
}

function updateHistoryTabsUI() {
    document.getElementById('switchList').classList.toggle('active', historyMode === 'list');
    document.getElementById('switchCal').classList.toggle('active', historyMode === 'calendar');
    document.getElementById('switchWeight').classList.toggle('active', historyMode === 'weight');
}

function updateHistoryTitle() {
    const titleEl = document.getElementById('mainTitle');
    if (historyMode === 'list') { titleEl.innerText = "Mon Historique"; }
    else if (historyMode === 'calendar') { titleEl.innerText = "Mon Calendrier"; }
    else if (historyMode === 'weight') { titleEl.innerText = "Mon Suivi de Poids"; }
}

// --- LOGIQUE LISTE HISTORIQUE ---
function renderHistory() {
    if (historyMode !== 'list') return;
    const container = document.getElementById('listeHistorique');
    const titleEl = document.getElementById('histMainTitle');
    const btnEl = document.getElementById('histActionBtn');
    container.innerHTML = '';

    if (DB.history.length === 0) {
        titleEl.innerText = "Types de Séances";
        btnEl.innerText = "Effacer tout";
        btnEl.onclick = resetHistoryOnly;
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px">Aucune séance enregistrée.</p>';
        historyState.view = 'categories';
        historyState.selected = null;
        return;
    }

    if (historyState.view === 'categories') {
        titleEl.innerText = "Types de Séances";
        btnEl.innerText = "Effacer tout";
        btnEl.onclick = resetHistoryOnly;

        const groups = {};
        DB.history.forEach(s => {
            if (!groups[s.programName]) groups[s.programName] = 0;
            groups[s.programName]++;
        });

        Object.keys(groups).forEach(name => {
            const count = groups[name];
            const btn = document.createElement('div');
            btn.className = 'hist-category-btn';
            btn.innerHTML = `<span class="hist-cat-title">${name}</span> <span class="hist-count">${count}</span>`;
            btn.onclick = () => { historyState.view = 'details'; historyState.selected = name; renderHistory(); };
            container.appendChild(btn);
        });
    } else {
        titleEl.innerText = "SÉANCES " + historyState.selected;
        btnEl.innerText = "Effacer " + historyState.selected;
        btnEl.onclick = () => deleteCategoryHistory(historyState.selected);

        const backBtn = document.createElement('div');
        backBtn.className = 'btn-back-hist';
        backBtn.innerText = 'Retour aux types de Séances';
        backBtn.onclick = () => { historyState.view = 'categories'; historyState.selected = null; renderHistory(); };
        container.appendChild(backBtn);

        const filtered = DB.history.filter(s => s.programName === historyState.selected);
        filtered.forEach(session => {
            const wrapper = document.createElement('div'); wrapper.className = 'hist-session';
            const header = document.createElement('div'); header.className = 'hist-header';

            header.innerHTML = `
                <span class="hist-date-large">${session.date}</span>
                <div class="hist-actions">
                    <button class="btn-hist-mini btn-hist-edit" onclick="modifierSessionHistory(${session.id}, event)">Modifier</button>
                    <button class="btn-hist-mini btn-hist-del" onclick="supprimerSessionHistory(${session.id}, event)">Supprimer</button>
                </div>
            `;

            const body = document.createElement('div'); body.className = 'hist-body';
            if (session.details && session.details.length > 0) {
                session.details.forEach(log => {
                    let cleanPerf = log.perf.replace(/ \+ Dégressive: /g, " + ").replace(/Dégressive: /g, "+ ");
                    body.innerHTML += `<div class="hist-exo-line"><span class="hist-exo-name">${log.exo} <small style="color:#b2bec3;">(#${log.serie})</small></span><span class="hist-exo-perf">${cleanPerf}</span></div>`;
                });
            } else {
                body.innerHTML = '<div style="padding:10px; color:#999">Pas de détails.</div>';
            }
            header.onclick = () => { body.classList.toggle('open'); };
            wrapper.appendChild(header);
            wrapper.appendChild(body);
            container.appendChild(wrapper);
        });
    }
}

function resetHistoryOnly() {
    if (confirm("Effacer tout l'historique ?")) {
        DB.history = [];
        saveDB();
        historyState.view = 'categories';
        renderHistory();
    }
}
function deleteCategoryHistory(catName) {
    if (confirm("Effacer tout l'historique pour " + catName + " ?")) {
        DB.history = DB.history.filter(s => s.programName !== catName);
        saveDB();
        historyState.view = 'categories';
        historyState.selected = null;
        renderHistory();
    }
}

function supprimerSessionHistory(id, event) {
    event.stopPropagation();
    if (confirm("Supprimer définitivement cette séance ?")) {
        DB.history = DB.history.filter(s => s.id !== id);
        saveDB();
        renderHistory();
    }
}

function modifierSessionHistory(id, event) {
    event.stopPropagation();
    const sessionIdx = DB.history.findIndex(s => s.id === id);
    if (sessionIdx === -1) return;
    const sessionToEdit = DB.history[sessionIdx];

    if (hasSessionData() && !confirm("Attention : tu as une séance en cours. L'écraser pour modifier cette ancienne séance ?")) return;
    if (!confirm("Cette séance va être retirée de l'historique et remise en cours pour que tu puisses la modifier. Continuer ?")) return;

    DB.history.splice(sessionIdx, 1);
    saveDB();

    const seanceBtn = document.querySelectorAll('.nav-item')[0];
    switchTab('seance', seanceBtn, 0);

    document.getElementById('selectProgram').value = sessionToEdit.programName;
    window.editingHistoryDate = sessionToEdit.date;
    chargerInterface(true);

    let filledMap = {};

    sessionToEdit.details.forEach(log => {
        const progExos = DB.progs[sessionToEdit.programName];
        if (!progExos) return;

        const s = log.serie;
        let exoIdx = -1;

        for (let i = 0; i < progExos.length; i++) {
            if (progExos[i].name === log.exo && !filledMap[`${i}_${s}`]) {
                exoIdx = i;
                filledMap[`${i}_${s}`] = true;
                break;
            }
        }

        if (exoIdx === -1) return;

        const parts = log.perf.split(' + ');

        const mainMatch = parts[0].match(/([\d.]+) kg x (\d+) reps/);
        if (mainMatch) {
            const pInp = document.getElementById(`p_${exoIdx}_${s}`);
            const rInp = document.getElementById(`r_${exoIdx}_${s}`);
            if (pInp) pInp.value = mainMatch[1];
            if (rInp) rInp.value = mainMatch[2];
        }

        for (let d = 1; d < parts.length; d++) {
            const dropMatch = parts[d].match(/([\d.]+) kg x (\d+) reps/);
            if (dropMatch) {
                ajouterDegressive(`${exoIdx}_${s}`, log.exo, sessionToEdit.programName, s, true);
                const wInp = document.getElementById(`drop_w_${exoIdx}_${s}_${d - 1}`);
                const rInp = document.getElementById(`drop_r_${exoIdx}_${s}_${d - 1}`);
                if (wInp) wInp.value = dropMatch[1];
                if (rInp) rInp.value = dropMatch[2];
            }
        }
    });

    saveCurrentSessionState();
    alert("Séance rechargée ! Corrige tes poids, valide tes exercices, et clique sur 'Terminer la séance' pour l'enregistrer à nouveau.");
}


// --- LOGIQUE CALENDRIER ---
function renderCalendar() {
    if (historyMode !== 'calendar') return;
    const grid = document.getElementById('calendarGrid');
    const monthDisplay = document.getElementById('calMonthDisplay');
    if (!grid || !monthDisplay) return;
    grid.innerHTML = '';

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    monthDisplay.innerText = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    let adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < adjustedFirstDay; i++) {
        const emptyCell = document.createElement('div');
        grid.appendChild(emptyCell);
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div'); cell.className = 'cal-day active-month'; cell.innerText = d;
        const cellDateObj = new Date(year, month, d);
        const cellDateStr = cellDateObj.toLocaleDateString('fr-FR');

        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.classList.add('today');
        }

        const hasSession = DB.history.some(s => s.date === cellDateStr);
        if (hasSession) cell.classList.add('has-session');

        cell.onclick = () => {
            document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            showDayDetails(cellDateStr);
        };
        grid.appendChild(cell);
    }
}

function changeMonth(delta) {
    currentCalDate.setMonth(currentCalDate.getMonth() + delta);
    renderCalendar();
}

function showDayDetails(dateStr) {
    const listDiv = document.getElementById('daySessionsList');
    listDiv.innerHTML = '';
    const sessions = DB.history.filter(s => s.date === dateStr);
    if (sessions.length === 0) {
        listDiv.innerHTML = '<div style="color:#b2bec3; font-style:italic;">Aucune séance ce jour-là.</div>';
        return;
    }
    sessions.forEach(s => {
        const item = document.createElement('div'); item.className = 'session-item-detail';
        item.innerHTML = `<span>${s.programName}</span> <small style="color:#636e72">Voir Historique pour détails</small>`;
        listDiv.appendChild(item);
    });
}

// --- LOGIQUE POIDS & GRAPHIQUE ---
function renderWeightView() {
    if (historyMode !== 'weight') return;
    renderWeightList();
    drawWeightChart();
}

function addWeightEntry() {
    const valInput = document.getElementById('weightValueInput');
    const weightVal = parseFloat(valInput.value);

    const dateVal = new Date().toISOString().split('T')[0];

    if (isNaN(weightVal)) return alert("Poids invalide");

    DB.weight.push({ date: dateVal, value: weightVal });
    DB.weight.sort((a, b) => new Date(a.date) - new Date(b.date));

    saveDB();
    valInput.value = '';
    renderWeightView();
}

function deleteWeight(index) {
    if (confirm("Supprimer cette pesée ?")) {
        DB.weight.splice(index, 1);
        saveDB();
        renderWeightView();
    }
}

function renderWeightList() {
    const listDiv = document.getElementById('weightHistoryList');
    listDiv.innerHTML = '';
    const sortedForList = [...DB.weight].reverse();

    if (sortedForList.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#b2bec3;">Aucune donnée.</p>';
        return;
    }

    sortedForList.forEach((item, index) => {
        const realIndex = DB.weight.length - 1 - index;
        const d = new Date(item.date);
        const dateStr = d.toLocaleDateString('fr-FR');

        listDiv.innerHTML += `
            <div class="weight-item">
                <span class="weight-date">${dateStr}</span>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span class="weight-val">${item.value} kg</span>
                    <button class="btn-hist-mini btn-hist-del" onclick="deleteWeight(${realIndex})">Supprimer</button>
                </div>
            </div>
        `;
    });
}

function drawWeightChart() {
    const canvas = document.getElementById('weightChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (DB.weight.length < 2) {
        ctx.fillStyle = "#b2bec3";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";

        ctx.fillText("Ajoutez 2 mesures", w / 2, h / 2 - 10);
        ctx.fillText("pour voir le graphique", w / 2, h / 2 + 15);
        return;
    }

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const graphW = w - padLeft - padRight;
    const graphH = h - padTop - padBottom;

    const values = DB.weight.map(i => i.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    const range = maxVal - minVal;
    minVal -= (range * 0.1) || 1;
    maxVal += (range * 0.1) || 1;

    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padLeft, h - padBottom);
    ctx.lineTo(w - padRight, h - padBottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    const stepX = graphW / (DB.weight.length - 1);

    const points = DB.weight.map((item, i) => {
        const x = padLeft + (i * stepX);
        const ratio = (item.value - minVal) / (maxVal - minVal);
        const y = (h - padBottom) - (ratio * graphH);
        return { x, y, val: item.value, date: item.date };
    });

    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.fillStyle = "#2d3436";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";

    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillText(p.val, p.x, p.y - 10);
    });

    ctx.fillStyle = "#636e72";
    ctx.font = "10px sans-serif";

    const dateStep = Math.ceil(points.length / 5);
    points.forEach((p, i) => {
        if (i % dateStep === 0 || i === points.length - 1) {
            const d = new Date(p.date);
            const str = `${d.getDate()}/${d.getMonth() + 1}`;
            ctx.fillText(str, p.x, h - 5);
        }
    });
}
