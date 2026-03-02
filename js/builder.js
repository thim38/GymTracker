// --- BUILDER & LISTE DES PROGRAMMES ---
function toggleBuilder() {
    const area = document.getElementById('builderArea');
    if (!area.classList.contains('hidden')) {
        resetBuilderForm();
        document.getElementById('newProgName').value = '';
        tempBuilderList = [];
        renderBuilder();
        document.getElementById('btnSaveProg').innerText = "Sauvegarder la Séance";
    }
    area.classList.toggle('hidden');
}

function resetBuilderForm() {
    currentEditingIndex = -1;
    document.getElementById('buildExoName').value = '';
    document.getElementById('buildSeries').value = '';
    document.getElementById('buildReps').value = '';
    document.getElementById('buildExoNameB').value = '';
    document.getElementById('btnAddNormal').innerText = "Ajouter";
    document.getElementById('btnAddSupersetConfirm').innerText = "Valider le Superset";
    annulerModeSuperset();
    renderBuilder();
}

function activerModeSuperset() {
    document.getElementById('blockExoB').classList.remove('hidden');
    document.getElementById('btnGroupNormal').classList.add('hidden');
    document.getElementById('btnGroupSuperset').classList.remove('hidden');
    document.getElementById('labelExoA').classList.remove('hidden');
}

function annulerModeSuperset() {
    document.getElementById('blockExoB').classList.add('hidden');
    document.getElementById('btnGroupNormal').classList.remove('hidden');
    document.getElementById('btnGroupSuperset').classList.add('hidden');
    document.getElementById('labelExoA').classList.add('hidden');
    document.getElementById('buildExoNameB').value = '';
}

function ajouterExoAuBuilder() {
    const n = document.getElementById('buildExoName').value;
    let s = parseInt(document.getElementById('buildSeries').value);
    if (s < 1 || isNaN(s)) s = 1;
    const r = document.getElementById('buildReps').value;
    if (!n) return alert("Nom manquant");

    const newExo = { name: n, sets: s, reps: r, isSuperset: false };
    if (currentEditingIndex > -1) { tempBuilderList[currentEditingIndex] = newExo; }
    else { tempBuilderList.push(newExo); }

    resetBuilderForm();
    renderBuilder();
    document.getElementById('buildExoName').value = '';
    document.getElementById('buildExoName').focus();
}

function validerSupersetBuilder() {
    const nA = document.getElementById('buildExoName').value;
    let sA = parseInt(document.getElementById('buildSeries').value);
    if (sA < 1 || isNaN(sA)) sA = 1;
    const rA = document.getElementById('buildReps').value;

    const nB = document.getElementById('buildExoNameB').value;
    let sB = parseInt(document.getElementById('buildSeriesB').value);
    if (sB < 1 || isNaN(sB)) sB = 1;
    const rB = document.getElementById('buildRepsB').value;

    if (!nA || !nB) return alert("Remplis les deux noms !");

    const exoA = { name: nA, sets: sA, reps: rA, isSuperset: true };
    const exoB = { name: nB, sets: sB, reps: rB, isSuperset: true };

    if (currentEditingIndex > -1) {
        tempBuilderList[currentEditingIndex] = exoA;
        tempBuilderList[currentEditingIndex + 1] = exoB;
    } else {
        tempBuilderList.push(exoA);
        tempBuilderList.push(exoB);
    }
    resetBuilderForm();
    renderBuilder();
    document.getElementById('buildExoName').value = '';
    document.getElementById('buildExoNameB').value = '';
    annulerModeSuperset();
    document.getElementById('buildExoName').focus();
}

// --- VARIABLES POUR LE DRAG & DROP (BUILDER) ---
let dragSrcIndex = -1;
let dragOverIndex = -1;
let longPressTimer = null;
let isDraggingMode = false;

// --- FONCTION RENDER BUILDER ---
function renderBuilder() {
    const listDiv = document.getElementById('builderListDisplay');
    listDiv.innerHTML = '';

    for (let i = 0; i < tempBuilderList.length; i++) {
        const item = tempBuilderList[i];
        let editingClass = '';

        if (currentEditingIndex !== -1 && i === currentEditingIndex) {
            editingClass = 'editing-active';
        }

        let htmlContent = '';
        let isSupersetStart = (item.isSuperset && tempBuilderList[i + 1] && tempBuilderList[i + 1].isSuperset);
        let isSupersetSecond = (item.isSuperset && tempBuilderList[i - 1] && tempBuilderList[i - 1].isSuperset);

        let draggableAttr = isSupersetSecond ? '' : 'data-draggable="true"';

        if (isSupersetStart) {
            const nextItem = tempBuilderList[i + 1];
            const dataJson = JSON.stringify({ type: 'superset', dataA: item, dataB: nextItem });

            htmlContent = `
            <div class="builder-item builder-item-superset ${editingClass}" 
                 data-index="${i}" ${draggableAttr} data-json='${dataJson}'>
                <span class="delete-x" onclick="event.stopPropagation(); tempBuilderList.splice(${i}, 2); resetBuilderForm(); renderBuilder()">✖</span>
                <div class="builder-click-zone" onclick="editBuilderItem(${i})">
                    <div style="margin-bottom:8px;"> <span class="builder-exo-name">${item.name}</span> <span class="builder-exo-info">${item.sets} x ${item.reps} reps</span> </div>
                    <div> <span class="builder-exo-name">${nextItem.name}</span> <span class="builder-exo-info">${nextItem.sets} x ${nextItem.reps} reps</span> </div>
                </div>
            </div>`;
            i++;
        } else if (!isSupersetSecond) {
            const dataJson = JSON.stringify({ type: 'solo', data: item });
            htmlContent = `
            <div class="builder-item builder-item-solo ${editingClass}" 
                 data-index="${i}" ${draggableAttr} data-json='${dataJson}'>
                <span class="delete-x" onclick="event.stopPropagation(); tempBuilderList.splice(${i}, 1); resetBuilderForm(); renderBuilder()">✖</span>
                <div class="builder-click-zone" onclick="editBuilderItem(${i})">
                    <span class="builder-exo-name">${item.name}</span> <span class="builder-exo-info">${item.sets} x ${item.reps} reps</span>
                </div>
            </div>`;
        }
        listDiv.innerHTML += htmlContent;
    }

    // --- GESTION TACTILE DRAG & DROP ---
    const items = listDiv.querySelectorAll('.builder-item[data-draggable="true"]');
    items.forEach(el => {
        el.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('delete-x')) return;
            dragSrcIndex = parseInt(el.getAttribute('data-index'));
            isDraggingMode = false;
            longPressTimer = setTimeout(() => {
                isDraggingMode = true;
                el.classList.add('dragging-active');
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }, { passive: false });

        el.addEventListener('touchmove', (e) => {
            if (!isDraggingMode) { clearTimeout(longPressTimer); return; }
            e.preventDefault();
            const touch = e.touches[0];
            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            const closestItem = targetEl ? targetEl.closest('.builder-item') : null;
            document.querySelectorAll('.drag-over').forEach(i => i.classList.remove('drag-over'));
            if (closestItem && closestItem !== el) {
                closestItem.classList.add('drag-over');
                dragOverIndex = parseInt(closestItem.getAttribute('data-index'));
            }
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            clearTimeout(longPressTimer);
            el.classList.remove('dragging-active');
            document.querySelectorAll('.drag-over').forEach(i => i.classList.remove('drag-over'));
            if (isDraggingMode && dragOverIndex !== -1 && dragSrcIndex !== -1 && dragSrcIndex !== dragOverIndex) {
                handleDropLogic(dragSrcIndex, dragOverIndex);
            }
            isDraggingMode = false;
            dragSrcIndex = -1;
            dragOverIndex = -1;
        });
    });
}

function handleDropLogic(fromIndex, toIndex) {
    let itemA = tempBuilderList[fromIndex];
    let isSupersetA = (itemA && itemA.isSuperset && tempBuilderList[fromIndex + 1] && tempBuilderList[fromIndex + 1].isSuperset);
    let sizeA = isSupersetA ? 2 : 1;

    let itemB = tempBuilderList[toIndex];
    let isSupersetB = (itemB && itemB.isSuperset && tempBuilderList[toIndex + 1] && tempBuilderList[toIndex + 1].isSuperset);
    let sizeB = isSupersetB ? 2 : 1;

    let movingItems = tempBuilderList.slice(fromIndex, fromIndex + sizeA);
    tempBuilderList.splice(fromIndex, sizeA);

    let finalDest = toIndex;
    if (fromIndex < toIndex) {
        // En descendant, on "saute" la taille de l'élément cible pour s'insérer après
        // tout en compensant la suppression de l'élément qu'on a pris plus haut (- sizeA)
        finalDest = toIndex - sizeA + sizeB;
    }

    if (finalDest < 0) finalDest = 0;
    tempBuilderList.splice(finalDest, 0, ...movingItems);
    renderBuilder();
}

function editBuilderItem(index) {
    currentEditingIndex = index; const item = tempBuilderList[index]; document.getElementById('builderArea').scrollIntoView({ behavior: 'smooth' });
    if (item.isSuperset && tempBuilderList[index + 1] && tempBuilderList[index + 1].isSuperset) {
        const itemB = tempBuilderList[index + 1]; activerModeSuperset();
        document.getElementById('buildExoName').value = item.name; document.getElementById('buildSeries').value = item.sets; document.getElementById('buildReps').value = item.reps;
        document.getElementById('buildExoNameB').value = itemB.name; document.getElementById('buildSeriesB').value = itemB.sets; document.getElementById('buildRepsB').value = itemB.reps;
        document.getElementById('btnAddSupersetConfirm').innerText = "Modifier le Superset";
    } else {
        annulerModeSuperset(); document.getElementById('buildExoName').value = item.name; document.getElementById('buildSeries').value = item.sets; document.getElementById('buildReps').value = item.reps;
        document.getElementById('btnAddNormal').innerText = "Modifier l'exercice";
    }
    renderBuilder(); document.getElementById('buildExoName').focus();
}

function sauvegarderProgrammeFinal() {
    const pendingName = document.getElementById('buildExoName').value;
    if (pendingName.trim() !== "") { alert("Attention : Tu as un exercice en cours de saisie !"); return; }

    const name = document.getElementById('newProgName').value;
    if (name && tempBuilderList.length > 0) {
        DB.progs[name] = tempBuilderList;
        saveDB();
        resetBuilderForm();
        tempBuilderList = [];
        document.getElementById('newProgName').value = '';
        renderBuilder();
        updateSelectMenu();
        renderProgramList();
        toggleBuilder();
    }
}

function startEditProgram(btn, e) {
    e.stopPropagation();
    const name = btn.getAttribute('data-name');
    resetBuilderForm();
    tempBuilderList = JSON.parse(JSON.stringify(DB.progs[name]));
    document.getElementById('newProgName').value = name;
    document.getElementById('builderArea').classList.remove('hidden');
    renderBuilder();
    document.getElementById('builderArea').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('btnSaveProg').innerText = "Mettre à jour la Séance";
}

function deleteProg(name, e) {
    e.stopPropagation();
    if (confirm("Supprimer ?")) {
        delete DB.progs[name];
        saveDB();
        updateSelectMenu();
        renderProgramList();
        chargerInterface();
    }
}

function updateSelectMenu() {
    const s = document.getElementById('selectProgram');
    s.innerHTML = '<option value="">Choisir une Séance</option>';
    Object.keys(DB.progs).forEach(k => s.innerHTML += `<option value="${k}">${k}</option>`);
}

let progDragSrcIndex = -1;
let progDragOverIndex = -1;
let progLongPressTimer = null;
let isProgDraggingMode = false;

function renderProgramList() {
    const div = document.getElementById('listeMesProgrammes');
    div.innerHTML = '';

    const progKeys = Object.keys(DB.progs);

    progKeys.forEach((k, index) => {
        let html = ` 
        <div class="prog-item" data-index="${index}" onclick="toggleDetails('${k}')"> 
            <div style="flex:1">
                <span class="prog-title">${k}</span> 
            </div>
            <div class="prog-header-actions">
                <button class="btn-edit" data-name="${k}" onclick="startEditProgram(this, event)">Modifier</button>
                <button class="btn-danger" onclick="deleteProg('${k.replace(/'/g, "\\'")}', event)">Supprimer</button>
            </div> 
        </div> 
        <div id="details-${k}" class="prog-details-box">`;

        const exos = DB.progs[k];
        for (let i = 0; i < exos.length; i++) {
            const e = exos[i];
            if (e.isSuperset && exos[i + 1] && exos[i + 1].isSuperset) {
                const eNext = exos[i + 1];
                html += `<div class="superset-wrapper"> <div class="prog-line prog-line-superset"> <span class="prog-line-name">${e.name}</span> <span class="prog-line-info">${e.sets} x ${e.reps} reps</span> </div> <div class="prog-line prog-line-superset prog-line-superset-b"> <span class="prog-line-name">${eNext.name}</span> <span class="prog-line-info">${eNext.sets} x ${eNext.reps} reps</span> </div></div>`;
                i++;
            } else {
                html += `<div class="exo-wrapper"> <div class="prog-line"> <span class="prog-line-name">${e.name}</span> <span class="prog-line-info">${e.sets} x ${e.reps} reps</span> </div> </div>`;
            }
        }
        html += `</div>`;
        div.innerHTML += html;
    });

    const items = div.querySelectorAll('.prog-item');
    items.forEach(el => {
        el.addEventListener('touchstart', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            progDragSrcIndex = parseInt(el.getAttribute('data-index'));
            isProgDraggingMode = false;

            progLongPressTimer = setTimeout(() => {
                isProgDraggingMode = true;
                el.classList.add('dragging-active');
                el.style.opacity = '0.9';
                el.style.backgroundColor = '#e9ecef';
                el.style.transform = 'scale(1.03)';
                el.style.zIndex = '100';
                el.style.pointerEvents = 'none';
                if (navigator.vibrate) navigator.vibrate(50);
            }, 500);
        }, { passive: false });

        el.addEventListener('touchmove', (e) => {
            if (!isProgDraggingMode) {
                clearTimeout(progLongPressTimer);
                return;
            }
            e.preventDefault();

            const touch = e.touches[0];
            const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
            const closestItem = targetEl ? targetEl.closest('.prog-item') : null;

            div.querySelectorAll('.drag-over').forEach(i => {
                i.classList.remove('drag-over');
                i.style.border = '';
            });

            if (closestItem && closestItem !== el) {
                closestItem.classList.add('drag-over');
                closestItem.style.border = '2px dashed #b2bec3';
                progDragOverIndex = parseInt(closestItem.getAttribute('data-index'));
            }
        }, { passive: false });

        el.addEventListener('touchend', (e) => {
            clearTimeout(progLongPressTimer);
            el.classList.remove('dragging-active');
            el.style.opacity = '';
            el.style.backgroundColor = '';
            el.style.transform = '';
            el.style.zIndex = '';
            el.style.pointerEvents = '';

            div.querySelectorAll('.drag-over').forEach(i => {
                i.classList.remove('drag-over');
                i.style.border = '';
            });

            if (isProgDraggingMode && progDragOverIndex !== -1 && progDragSrcIndex !== -1 && progDragSrcIndex !== progDragOverIndex) {
                handleProgramDrop(progDragSrcIndex, progDragOverIndex);
            }

            isProgDraggingMode = false;
            progDragSrcIndex = -1;
            progDragOverIndex = -1;
        });
    });
}

function handleProgramDrop(fromIndex, toIndex) {
    const keys = Object.keys(DB.progs);
    const movedKey = keys[fromIndex];

    keys.splice(fromIndex, 1);
    keys.splice(toIndex, 0, movedKey);

    const newProgs = {};
    keys.forEach(key => {
        newProgs[key] = DB.progs[key];
    });

    DB.progs = newProgs;
    saveDB();

    updateSelectMenu();
    renderProgramList();
}

function toggleDetails(id) { document.getElementById('details-' + id).classList.toggle('open'); }
