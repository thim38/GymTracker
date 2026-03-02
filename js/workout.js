// --- LOGIQUE SÉANCE ---
function hasSessionData() {
    const inputs = document.querySelectorAll('#zoneTravail input[type="number"]');
    for (const input of inputs) {
        if (input.value && input.value.trim() !== '') return true;
    }
    return currentSessionLogs.length > 0;
}

function handleProgramChange() {
    const select = document.getElementById('selectProgram');
    const newKey = select.value;

    if (hasSessionData()) {
        if (!confirm("Tu as des données en cours. Changer de séance effacera tout. Continuer ?")) {
            select.value = currentProgramKey;
            return;
        }
    }

    if (newKey === "") {
        currentProgramKey = "";
        currentSessionLogs = [];
        saveActiveSessionState(null);

        document.getElementById('zoneTravail').innerHTML = "";
        document.getElementById('zoneFinSeance').innerHTML = "";
        return;
    }

    currentProgramKey = newKey;
    chargerInterface(true);
}

function chargerInterface(shouldClear = true) {
    const key = document.getElementById('selectProgram').value;
    if (!key) { currentProgramKey = ""; return; }
    currentProgramKey = key;

    if (shouldClear) {
        currentSessionLogs = [];
        saveActiveSessionState(null);
    }

    const zone = document.getElementById('zoneTravail');
    const btnZone = document.getElementById('zoneFinSeance');
    zone.innerHTML = '';
    btnZone.innerHTML = '';

    const exos = DB.progs[key];
    if (!exos) return;

    for (let i = 0; i < exos.length; i++) {
        const exoA = exos[i]; const exoB = exos[i + 1];

        if (exoA.isSuperset && exoB && exoB.isSuperset) {
            renderSuperset(zone, exoA, i, exoB, i + 1, key);

            const isDone = currentSessionLogs.some(log => log.exo === exoA.name || log.exo === exoB.name);
            if (isDone) {
                const btn = document.getElementById(`btn_finish_${i}`);
                if (btn) {
                    btn.classList.add('validated');
                    btn.innerText = "Validé";
                    const container = document.getElementById(`sets_super_${i}`);
                    if (container) {
                        container.querySelectorAll('input').forEach(inp => inp.disabled = true);
                        container.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'none');
                        container.querySelectorAll('.drop-icon').forEach(icon => icon.style.display = 'none');
                    }
                }
            }
            i++;
        } else {
            renderNormal(zone, exoA, i, key);

            const isDone = currentSessionLogs.some(log => log.exo === exoA.name);
            if (isDone) {
                const btn = document.getElementById(`btn_finish_${i}`);
                if (btn) {
                    btn.classList.add('validated');
                    btn.innerText = "Validé";
                    const container = document.getElementById(`sets_${i}`);
                    if (container) {
                        container.querySelectorAll('input').forEach(inp => inp.disabled = true);
                        container.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'none');
                        container.querySelectorAll('.drop-icon').forEach(icon => icon.style.display = 'none');
                    }
                }
            }
        }
    }
    btnZone.innerHTML = `<button class="btn-terminate-session" onclick="terminerLaSeance('${key}')">Terminer la Séance</button>`;

    document.querySelectorAll('#zoneTravail input').forEach(input => {
        if (!input.disabled) {
            input.addEventListener('input', saveCurrentSessionState);
        }
    });
}

function createInputWithUnit(id, unit) {
    return `<div class="input-wrapper"><input type="number" id="${id}" placeholder="" min="0" oninput="if(this.value!=='')this.value=Math.abs(this.value)"><span class="unit-label">${unit}</span></div>`;
}
function createDropInput(id, className, unit) {
    return `<div class="input-wrapper"><input type="number" id="${id}" class="${className}" placeholder="" min="0" oninput="if(this.value!=='')this.value=Math.abs(this.value)"><span class="unit-label">${unit}</span></div>`;
}

function getSplitPerf(exoName, setNum, progName, currentIdx) {
    const lastSession = DB.history.find(session => session.programName === progName && session.details && session.details.some(log => log.exo === exoName));
    if (!lastSession) return null;

    const progExos = DB.progs[progName];
    let orderIndex = 0;
    if (progExos && currentIdx !== undefined) {
        for (let i = 0; i < currentIdx; i++) {
            if (progExos[i] && progExos[i].name === exoName) orderIndex++;
        }
    }

    const matchingLogs = lastSession.details.filter(l => l.exo === exoName && l.serie === setNum);
    if (matchingLogs.length === 0) return null;

    const log = matchingLogs[orderIndex] || matchingLogs[matchingLogs.length - 1];
    if (!log) return null;

    let cleanRaw = log.perf.replace(/ \+ Dégressive: /g, " + ").replace(/Dégressive: /g, "+ ");
    const parts = cleanRaw.split(" + ");
    return { main: parts[0], drop: parts[1] || null };
}

function renderNormal(container, exo, idx, progName) {
    let html = `<div class="card" style="animation-delay: ${idx * 0.1}s"><div class="card-header"><div class="header-top"><span class="exo-title">${exo.name}</span><span class="exo-badge">Fourchette de reps : ${exo.reps}</span></div></div><div id="sets_${idx}">`;
    for (let s = 1; s <= exo.sets; s++) {
        const data = getSplitPerf(exo.name, s, progName, idx);
        const mainPerfHTML = (data && data.main) ? `<span class="last-perf">Précédent : ${data.main}</span>` : '';
        const safeExoName = exo.name.replace(/'/g, "\\'");
        const safeProgName = progName.replace(/'/g, "\\'");
        html += `<div class="serie-container" id="container_${idx}_${s}"><div class="input-row"><div class="set-col"><div class="set-num">#${s}</div><button class="btn-mini-add" onclick="ajouterDegressive('${idx}_${s}', '${safeExoName}', '${safeProgName}', ${s})">+</button></div>${createInputWithUnit(`p_${idx}_${s}`, 'kg')}${createInputWithUnit(`r_${idx}_${s}`, 'reps')}</div>${mainPerfHTML}</div>`;
    }
    html += `</div><button class="btn-finish-exo" id="btn_finish_${idx}" onclick="validerExerciceNormal('${exo.name}', ${idx}, ${exo.sets}, this)">Exercice Fini</button></div>`;
    container.innerHTML += html;
}

function renderSuperset(container, exoA, idxA, exoB, idxB, progName) {
    const max = Math.max(exoA.sets, exoB.sets);
    const safeProgName = progName.replace(/'/g, "\\'");
    const safeExoNameA = exoA.name.replace(/'/g, "\\'");
    const safeExoNameB = exoB.name.replace(/'/g, "\\'");
    let html = `<div class="card superset-container" style="animation-delay: ${idxA * 0.1}s;"><span class="superset-label">Superset</span>`;
    html += `<div class="card-header" style="border:none; padding-bottom:5px; margin-bottom:5px;"><div class="header-top"><span class="exo-title">A. ${exoA.name}</span> <span class="exo-badge">Fourchette de reps : ${exoA.reps}</span></div></div>`;
    html += `<div class="card-header"><div class="header-top"><span class="exo-title">B. ${exoB.name}</span> <span class="exo-badge">Fourchette de reps : ${exoB.reps}</span></div></div>`;
    html += `<div id="sets_super_${idxA}">`;
    for (let s = 1; s <= max; s++) {
        html += `<div class="set-block">`;
        if (s <= exoA.sets) {
            const dataA = getSplitPerf(exoA.name, s, progName, idxA);
            const mainPerfHTMLA = (dataA && dataA.main) ? `<span class="last-perf">Précédent : ${dataA.main}</span>` : '';
            html += `<div class="serie-container" id="container_${idxA}_${s}"><div class="input-row"><div class="set-col"><div class="set-num">A</div><button class="btn-mini-add" onclick="ajouterDegressive('${idxA}_${s}', '${safeExoNameA}', '${safeProgName}', ${s})">+</button></div>${createInputWithUnit(`p_${idxA}_${s}`, 'kg')}${createInputWithUnit(`r_${idxA}_${s}`, 'reps')}</div>${mainPerfHTMLA}</div>`;
        }
        if (s <= exoB.sets) {
            const dataB = getSplitPerf(exoB.name, s, progName, idxB);
            const mainPerfHTMLB = (dataB && dataB.main) ? `<span class="last-perf">Précédent : ${dataB.main}</span>` : '';
            html += `<div class="serie-container" id="container_${idxB}_${s}"><div class="input-row"><div class="set-col"><div class="set-num">B</div><button class="btn-mini-add" onclick="ajouterDegressive('${idxB}_${s}', '${safeExoNameB}', '${safeProgName}', ${s})">+</button></div>${createInputWithUnit(`p_${idxB}_${s}`, 'kg')}${createInputWithUnit(`r_${idxB}_${s}`, 'reps')}</div>${mainPerfHTMLB}</div>`;
        }
        html += `</div>`;
    }
    html += `</div><button class="btn-finish-exo" id="btn_finish_${idxA}" onclick="validerSuperset('${exoA.name}', ${idxA}, '${exoB.name}', ${idxB}, ${max}, this)">Exercices Finis</button></div>`;
    container.innerHTML += html;
}

function ajouterDegressive(baseId, exoName, progName, setNum, restorationMode = false) {
    const container = document.getElementById('container_' + baseId);
    const dropIndex = container.querySelectorAll('.drop-row').length;
    const dropWeightId = `drop_w_${baseId}_${dropIndex}`;
    const dropRepsId = `drop_r_${baseId}_${dropIndex}`;

    const div = document.createElement('div'); div.className = 'input-row drop-row';

    let dropHint = '';
    if (!restorationMode) {
        const currentIdx = parseInt(baseId.split('_')[0]);
        const data = getSplitPerf(exoName, setNum, progName, currentIdx);
        dropHint = (data && data.drop) ? `<span class="last-perf" style="margin-left:45px;">Précédent : ${data.drop}</span>` : '';
    }

    div.innerHTML = `<div class="set-col"><div class="drop-icon" onclick="this.closest('.drop-row').remove(); saveCurrentSessionState();" title="Supprimer">↳</div></div>${createDropInput(dropWeightId, 'drop-weight', 'kg')}${createDropInput(dropRepsId, 'drop-reps', 'reps')}`;
    div.style.flexWrap = "wrap";
    if (dropHint) div.innerHTML += `<div style="width:100%;">${dropHint}</div>`;

    container.appendChild(div);
    div.querySelectorAll('input').forEach(i => i.addEventListener('input', saveCurrentSessionState));
}

function getDropsString(containerId) {
    const container = document.getElementById(containerId);
    let drops = [];
    container.querySelectorAll('.drop-row').forEach(row => {
        const w = row.querySelector('.drop-weight').value; const r = row.querySelector('.drop-reps').value;
        if (w && r) drops.push(`${w} kg x ${r} reps`);
    });
    if (drops.length > 0) return " + " + drops.join(' + ');
    return "";
}

function validerExerciceNormal(nomExo, idx, totalSets, btn) {
    if (btn.classList.contains('validated')) {
        btn.classList.remove('validated'); btn.innerText = "Exercice Fini";
        for (let s = 1; s <= totalSets; s++) {
            document.getElementById(`p_${idx}_${s}`).disabled = false; document.getElementById(`r_${idx}_${s}`).disabled = false;
            const c = document.getElementById(`container_${idx}_${s}`); c.querySelectorAll('input').forEach(i => i.disabled = false); if (c.querySelector('.btn-mini-add')) c.querySelector('.btn-mini-add').style.display = 'flex'; c.querySelectorAll('.drop-icon').forEach(icon => icon.style.display = 'block');
        }
        currentSessionLogs = currentSessionLogs.filter(log => log.exo !== nomExo); saveCurrentSessionState(); return;
    }
    let savedCount = 0; let tempLogs = [];
    for (let s = 1; s <= totalSets; s++) {
        const p = document.getElementById(`p_${idx}_${s}`).value; const r = document.getElementById(`r_${idx}_${s}`).value;
        if (p && r) { let dropText = getDropsString(`container_${idx}_${s}`); tempLogs.push({ exo: nomExo, perf: `${p} kg x ${r} reps${dropText}`, serie: s }); savedCount++; }
    }
    if (savedCount > 0) {
        currentSessionLogs.push(...tempLogs); btn.classList.add('validated'); btn.innerText = "Validé";
        for (let s = 1; s <= totalSets; s++) {
            document.getElementById(`p_${idx}_${s}`).disabled = true; document.getElementById(`r_${idx}_${s}`).disabled = true;
            const c = document.getElementById(`container_${idx}_${s}`); c.querySelectorAll('input').forEach(i => i.disabled = true); if (c.querySelector('.btn-mini-add')) c.querySelector('.btn-mini-add').style.display = 'none'; c.querySelectorAll('.drop-icon').forEach(icon => icon.style.display = 'none');
        }
        saveCurrentSessionState();
    } else { alert("Remplis au moins une série !"); }
}

function validerSuperset(nomA, idxA, nomB, idxB, totalSets, btn) {
    if (btn.classList.contains('validated')) {
        btn.classList.remove('validated'); btn.innerText = "Exercices Finis";
        for (let s = 1; s <= totalSets; s++) {
            const cA = document.getElementById(`container_${idxA}_${s}`); if (cA) { cA.querySelectorAll('input').forEach(i => i.disabled = false); cA.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'flex'); cA.querySelectorAll('.drop-icon').forEach(i => i.style.display = 'block'); }
            const cB = document.getElementById(`container_${idxB}_${s}`); if (cB) { cB.querySelectorAll('input').forEach(i => i.disabled = false); cB.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'flex'); cB.querySelectorAll('.drop-icon').forEach(i => i.style.display = 'block'); }
        }
        currentSessionLogs = currentSessionLogs.filter(log => log.exo !== nomA && log.exo !== nomB); saveCurrentSessionState(); return;
    }
    let savedCount = 0; let tempLogs = [];
    for (let s = 1; s <= totalSets; s++) {
        if (document.getElementById(`p_${idxA}_${s}`)) { const pA = document.getElementById(`p_${idxA}_${s}`).value; const rA = document.getElementById(`r_${idxA}_${s}`).value; if (pA && rA) { let dropA = getDropsString(`container_${idxA}_${s}`); tempLogs.push({ exo: nomA, perf: `${pA} kg x ${rA} reps${dropA}`, serie: s }); savedCount++; } }
        if (document.getElementById(`p_${idxB}_${s}`)) { const pB = document.getElementById(`p_${idxB}_${s}`).value; const rB = document.getElementById(`r_${idxB}_${s}`).value; if (pB && rB) { let dropB = getDropsString(`container_${idxB}_${s}`); tempLogs.push({ exo: nomB, perf: `${pB} kg x ${rB} reps${dropB}`, serie: s }); savedCount++; } }
    }
    if (savedCount > 0) {
        currentSessionLogs.push(...tempLogs); btn.classList.add('validated'); btn.innerText = "Validé";
        for (let s = 1; s <= totalSets; s++) {
            const cA = document.getElementById(`container_${idxA}_${s}`); if (cA) { cA.querySelectorAll('input').forEach(i => i.disabled = true); cA.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'none'); cA.querySelectorAll('.drop-icon').forEach(i => i.style.display = 'none'); }
            const cB = document.getElementById(`container_${idxB}_${s}`); if (cB) { cB.querySelectorAll('input').forEach(i => i.disabled = true); cB.querySelectorAll('.btn-mini-add').forEach(b => b.style.display = 'none'); cB.querySelectorAll('.drop-icon').forEach(i => i.style.display = 'none'); }
        }
        saveCurrentSessionState();
    } else { alert("Remplis au moins une série !"); }
}

function terminerLaSeance(progName) {
    if (currentSessionLogs.length === 0) return alert("Tu n'as rien validé !");
    if (confirm("Confirmer la fin de la séance ?")) {

        // On garde la date d'origine si on modifiait une séance
        let finalDate = new Date().toLocaleDateString('fr-FR');
        if (window.editingHistoryDate) {
            finalDate = window.editingHistoryDate;
            window.editingHistoryDate = null;
        }

        const sessionObject = { id: Date.now(), date: finalDate, programName: progName, details: currentSessionLogs };
        DB.history.unshift(sessionObject);
        saveDB();
        saveActiveSessionState(null);
        currentSessionLogs = [];
        alert("Séance sauvegardée !");

        document.getElementById('selectProgram').value = ""; currentProgramKey = "";
        document.getElementById('zoneTravail').innerHTML = ""; document.getElementById('zoneFinSeance').innerHTML = "";
        historyMode = 'list'; historyState.view = 'categories'; historyState.selected = null;

        updateHistoryTabsUI();
        renderHistory();
    }
}

function saveCurrentSessionState() {
    const prog = document.getElementById('selectProgram').value; if (!prog) return;
    const inputs = {}; document.querySelectorAll('#zoneTravail input').forEach(i => { if (i.value) inputs[i.id] = i.value; });

    // Save state via store
    saveActiveSessionState({ prog: prog, inputs: inputs, logs: currentSessionLogs });
}
