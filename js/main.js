let currentSessionLogs = [];
let tempBuilderList = [];
let currentEditingIndex = -1;
let currentCalDate = new Date();
let currentTabIndex = 0;
let historyMode = 'list';
let historyState = { view: 'categories', selected: null };
let currentProgramKey = '';

// --- INITIALISATION PRINCIPALE ---
document.addEventListener('DOMContentLoaded', () => {
    const savedSession = getActiveSessionState();

    updateSelectMenu();
    renderProgramList();
    renderHistory();
    renderCalendar();

    const dateDisplay = document.getElementById('weightDateDisplay');
    if (dateDisplay) {
        dateDisplay.innerText = new Date().toLocaleDateString('fr-FR');
    }

    if (savedSession) {
        try {
            const sessionState = savedSession;
            const select = document.getElementById('selectProgram');

            if (select.querySelector(`option[value="${sessionState.prog}"]`)) {
                select.value = sessionState.prog;
                currentProgramKey = sessionState.prog;

                if (sessionState.logs) {
                    currentSessionLogs = sessionState.logs;
                }

                chargerInterface(false);

                // RESTAURATION INTELLIGENTE (Drop Sets & Valeurs)
                if (sessionState.inputs) {
                    const dropMap = {};
                    Object.keys(sessionState.inputs).forEach(key => {
                        if (key.startsWith('drop_w_')) {
                            const parts = key.split('_');
                            const baseId = `${parts[2]}_${parts[3]}`;
                            const dropIdx = parseInt(parts[4]);

                            if (!dropMap[baseId] || dropIdx > dropMap[baseId]) {
                                dropMap[baseId] = dropIdx;
                            }
                        }
                    });

                    Object.keys(dropMap).forEach(baseId => {
                        const count = dropMap[baseId] + 1;
                        for (let i = 0; i < count; i++) {
                            ajouterDegressive(baseId, '', '', 0, true);
                        }
                    });

                    Object.keys(sessionState.inputs).forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.value = sessionState.inputs[id];
                    });
                }
            }
        } catch (e) { console.log("Erreur restauration session", e); }
    }
});

// --- SÉCURITÉS ---
window.addEventListener('beforeunload', () => { saveCurrentSessionState(); });
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveCurrentSessionState();
});

// --- DETECTION SCROLL ---
document.addEventListener('DOMContentLoaded', () => {
    const navBar = document.querySelector('.nav-bar');
    let lastScrollTop = 0;

    if (navBar) {
        window.addEventListener('scroll', function () {
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

            if (scrollTop <= 0) {
                navBar.classList.remove('scroll-hidden');
                lastScrollTop = 0;
                return;
            }

            if (Math.abs(lastScrollTop - scrollTop) > 5) {
                if (scrollTop > lastScrollTop && scrollTop > 50) {
                    navBar.classList.add('scroll-hidden');
                } else {
                    navBar.classList.remove('scroll-hidden');
                }
                lastScrollTop = scrollTop;
            }
        }, { passive: true });
    }
});
