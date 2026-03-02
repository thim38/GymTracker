// --- NAVIGATION PRINCIPALE ---
function switchTab(viewName, btn, newIndex) {
    if (newIndex === currentTabIndex) return;
    currentTabIndex = newIndex;

    const views = document.querySelectorAll('.app-view');
    views.forEach(v => {
        v.classList.add('hidden');
        v.classList.remove('anim-right', 'anim-left');
    });

    const newView = document.getElementById('view-' + viewName);
    newView.classList.remove('hidden');

    // Animation simple
    const direction = newIndex > currentTabIndex ? 'anim-right' : 'anim-left';
    newView.classList.add(direction);

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const titleEl = document.getElementById('mainTitle');
    if (viewName === 'seance') titleEl.innerText = "Ma Séance";
    if (viewName === 'progs') titleEl.innerText = "Mon Programme";
    if (viewName === 'history') {
        updateHistoryTitle();
        if (historyMode === 'calendar') renderCalendar();
        if (historyMode === 'weight') renderWeightView();
    }
}

// --- GESTION PARAMETRES ---
function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// --- GESTION CLAVIER (Cacher Nav Bar) ---
document.addEventListener('focusin', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const nav = document.querySelector('.nav-bar');
        if (nav) nav.classList.add('keyboard-active');
    }
});

document.addEventListener('focusout', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const nav = document.querySelector('.nav-bar');
        setTimeout(() => {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                if (nav) nav.classList.remove('keyboard-active');
            }
        }, 100);
    }
});

// --- FORCE L'AFFICHAGE DE LA NAV BAR AU CLIC HORS INPUT ---
document.addEventListener('click', function (e) {
    const nav = document.querySelector('.nav-bar');
    if (!nav) return;

    // Si on ne clique PAS sur un champ de saisie
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // On retire les classes qui cachent la barre
        nav.classList.remove('scroll-hidden');
        nav.classList.remove('keyboard-active');
    }
});

// --- IMPORT / EXPORT (VERSION ANTI-CRASH / PRESSE-PAPIER) ---
function exportData() {
    const dataStr = JSON.stringify(DB);

    navigator.clipboard.writeText(dataStr).then(function () {
        alert("Sauvegarde COPIÉE !\n\nOuvre ton appli 'Notes', crée une nouvelle note et fais 'Coller' pour conserver tes données.");
    }, function (err) {
        prompt("Impossible de copier automatiquement. Copie ce texte manuellement et garde-le précieusement :", dataStr);
    });
}

function triggerImport() {
    toggleSettings();
    const modal = document.getElementById('importModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('importTextarea').value = '';
    }
}

function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
}

function confirmImport() {
    const text = document.getElementById('importTextarea').value;
    if (text && text.trim() !== "") {
        closeImportModal();
        processImport(text);
    } else {
        alert("La zone de texte est vide !");
    }
}

function processImport(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.progs || data.history) {
            if (confirm("Attention : Cela va remplacer TOUTES tes données actuelles par cette sauvegarde.\n\nContinuer ?")) {
                DB.progs = data.progs || {};
                DB.history = data.history || [];
                DB.weight = data.weight || [];
                saveDB();

                alert("Données restaurées avec succès !");
                location.reload();
            }
        } else {
            alert("Ce texte/fichier n'est pas une sauvegarde valide.");
        }
    } catch (err) {
        alert("Erreur : Le format des données est incorrect ou la sauvegarde a été mal copiée.");
    }
}
