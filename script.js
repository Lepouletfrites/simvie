// =========================================================
// 1. VARIABLES D'ÉTAT DU JEU
// =========================================================

let argent = 0;
let sante = 100; 
let faim = 0;    
let energie = 100; 
let bonheur = 50; 
let dateActuelle = new Date(2024, 0, 1, 8, 0); 

// Coûts et Gains
const COUT_NOURRITURE = 5; 
const GAIN_NOURRITURE = 40; 
const ENERGIE_POUR_DORMIR = 80; 
const COUT_DIVERTISSEMENT = 10;
const GAIN_BONHEUR = 30;
const COUT_SOIN = 15;
const GAIN_SANTE = 20;

// Coût en temps pour chaque action (en minutes)
const TEMPS_MANGER = 30; 
const TEMPS_DORMIR = 480; 
const TEMPS_DIVERTISSEMENT = 90; 
const TEMPS_SOIGNER = 60; 

// Dictionnaire pour les détails d'actions (pour la modale)
const ACTION_DETAILS = {
    'mendier': {
        title: "Mendier pour quelques pièces",
        description: "Passer du temps à demander l'aumône. Le gain et le coût en énergie sont proportionnels à la durée choisie.",
        // Le temps est désormais variable, donc on met une description
        time: "Choix de la durée (1h ou 2h)",
        effects: `+ Argent (aléatoire), - Énergie (variable), - 5 Bonheur, + Faim.`,
        func: mendier // Fonction mise à jour pour accepter une durée
    },
    'nourriture': {
        title: "Acheter un repas simple",
        description: "Un repas de base pour apaiser la faim et reprendre des forces.",
        time: `${TEMPS_MANGER} min`,
        effects: `- ${COUT_NOURRITURE} $, - ${GAIN_NOURRITURE} Faim, + 5 Bonheur.`,
        func: acheterNourriture 
    },
    'dormir': {
        title: "Dormir et se reposer",
        description: "Dormir 8 heures (si l'heure et la faim le permettent). Essentiel pour la récupération.",
        time: `${TEMPS_DORMIR} min`,
        effects: `+ ${ENERGIE_POUR_DORMIR} Énergie, + 5 Santé, + 10 Bonheur, + 15 Faim.`,
        func: dormir
    },
    'divertissement': {
        title: "Se divertir (loisir simple)",
        description: "Se payer un petit plaisir (musique, lecture, etc.) pour oublier la misère et recharger le moral.",
        time: `${TEMPS_DIVERTISSEMENT} min`,
        effects: `- ${COUT_DIVERTISSEMENT} $, + ${GAIN_BONHEUR} Bonheur, - 10 Énergie.`,
        func: seDivertir
    },
    'soigner': {
        title: "Se soigner (petits bobos)",
        description: "Utiliser des produits de base pour soigner les petites blessures et éviter les complications.",
        time: `${TEMPS_SOIGNER} min`,
        effects: `- ${COUT_SOIN} $, + ${GAIN_SANTE} Santé, - 5 Énergie.`,
        func: seSoigner
    }
};

// =========================================================
// 2. FONCTIONS DE MISE À JOUR DE L'INTERFACE (Inchangé)
// =========================================================

function updateUI() {
    document.getElementById('argent-value').textContent = argent + ' $';
    document.getElementById('sante-bar').value = sante;
    document.getElementById('sante-value').textContent = sante;
    document.getElementById('faim-bar').value = faim;
    document.getElementById('faim-value').textContent = faim;
    document.getElementById('energie-bar').value = energie;
    document.getElementById('energie-value').textContent = energie;
    document.getElementById('bonheur-bar').value = bonheur;
    document.getElementById('bonheur-value').textContent = bonheur;

    const optionsDate = { weekday: 'short', day: 'numeric', month: 'short' };
    const optionsTime = { hour: '2-digit', minute: '2-digit' };
    const dateStr = dateActuelle.toLocaleDateString('fr-FR', optionsDate);
    const timeStr = dateActuelle.toLocaleTimeString('fr-FR', optionsTime);
    document.getElementById('current-time').textContent = `📅 ${dateStr} - ⏰ ${timeStr}`;

    document.getElementById('nourriture-btn').disabled = argent < COUT_NOURRITURE;
    document.getElementById('divertissement-btn').disabled = argent < COUT_DIVERTISSEMENT;
    document.getElementById('soigner-btn').disabled = argent < COUT_SOIN;
}

function logMessage(message) {
    const timeStr = dateActuelle.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('message').innerHTML = `[${timeStr}] ${message}`;
}

// =========================================================
// 3. LOGIQUE DU TEMPS ET DES CONSÉQUENCES (Inchangé)
// =========================================================
function passerTemps(minutes) {
    dateActuelle.setMinutes(dateActuelle.getMinutes() + minutes);

    const heuresPassees = minutes / 60;
    const faimAugmentation = Math.floor(heuresPassees) * 5; 
    const energieDiminution = Math.floor(heuresPassees) * 3;
    const bonheurDiminution = Math.floor(heuresPassees) * 1; 

    faim = Math.min(100, faim + faimAugmentation);
    energie = Math.max(0, energie - energieDiminution);
    bonheur = Math.max(0, bonheur - bonheurDiminution); 
    
    checkStatus();
}

function checkStatus() {
    let messageAvertissement = "";

    if (bonheur <= 10) {
        energie = Math.max(0, energie - 5); 
        messageAvertissement = "Le désespoir vous gagne. Votre énergie diminue. ";
    } else if (bonheur >= 80) {
        energie = Math.min(100, energie + 3); 
    }
    if (faim >= 90) {
        sante = Math.max(0, sante - 10);
        messageAvertissement = "La faim est critique ! Santé en danger. ";
    } else if (faim >= 60) {
        sante = Math.max(0, sante - 3); 
    }
    if (energie <= 10 && sante > 0) {
        sante = Math.max(0, sante - 5);
        messageAvertissement = "Épuisement total, votre santé souffre. ";
    }
    
    if (messageAvertissement && messageAvertissement !== document.getElementById('message').textContent.substring(10)) {
        logMessage(`Avertissement : ${messageAvertissement}`);
    }

    if (sante <= 0) {
        logMessage("GAME OVER ! Votre santé est tombée à zéro. La rue a eu raison de vous.");
        disableAllButtons();
    }
}

function disableAllButtons() {
    document.querySelectorAll('button').forEach(btn => btn.disabled = true);
}


// =========================================================
// 4. LOGIQUE DES ACTIONS (MISES À JOUR)
// =========================================================

/** * Action : Mendier.
 * @param {number} minutes - La durée choisie par l'utilisateur (60 ou 120).
 */
function mendier(minutes = 60) {
    // Coût en énergie proportionnel : 15 pour 1h, 30 pour 2h
    const coutEnergie = minutes === 60 ? 15 : 30;
    const tempsPasse = minutes;

    if (energie < coutEnergie) {
        logMessage("Vous n'avez pas assez d'énergie pour mendier aussi longtemps.");
        updateUI(); return; 
    }

    // Gain ajusté pour la durée : plus de temps = plus de gains potentiels
    const gainBase = Math.floor(Math.random() * (tempsPasse / 30)) + 2; 
    const gainBonus = bonheur > 70 ? 2 : 0; 
    const gain = gainBase + gainBonus;

    argent += gain;
    energie = Math.max(0, energie - coutEnergie); 
    bonheur = Math.max(0, bonheur - 5); 
    
    passerTemps(tempsPasse);
    logMessage(`Vous avez mendié pendant ${Math.floor(tempsPasse / 60)}h ${tempsPasse % 60}min et gagné ${gain} $.`);
    updateUI();
}

/** Actions à durée fixe (signatures inchangées) */
function acheterNourriture() {
    if (argent < COUT_NOURRITURE) {
        logMessage("Pas d'argent.");
        updateUI(); return;
    }
    argent -= COUT_NOURRITURE;
    faim = Math.max(0, faim - GAIN_NOURRITURE);
    bonheur = Math.min(100, bonheur + 5); 
    passerTemps(TEMPS_MANGER);
    logMessage(`Vous avez mangé pour ${COUT_NOURRITURE} $.`);
    updateUI();
}

function dormir() {
    const heure = dateActuelle.getHours();
    if (faim >= 80 || (heure > 8 && heure < 20)) {
         logMessage("Impossible de dormir correctement maintenant (faim/insécurité).");
         sante = Math.max(0, sante - 5); 
         passerTemps(60); 
         updateUI(); return;
    }
    energie = Math.min(100, energie + ENERGIE_POUR_DORMIR);
    sante = Math.min(100, sante + 5); 
    faim = Math.min(100, faim + 15); 
    bonheur = Math.min(100, bonheur + 10); 
    passerTemps(TEMPS_DORMIR);
    logMessage("Vous avez passé la nuit dehors. Énergie et moral récupérés.");
    updateUI();
}

function seDivertir() {
    if (argent < COUT_DIVERTISSEMENT) {
        logMessage("Vous n'avez pas de quoi vous offrir un moment de détente.");
        updateUI(); return;
    }
    argent -= COUT_DIVERTISSEMENT;
    bonheur = Math.min(100, bonheur + GAIN_BONHEUR);
    energie = Math.max(0, energie - 10); 
    passerTemps(TEMPS_DIVERTISSEMENT);
    logMessage(`Vous vous êtes diverti et avez rechargé vos batteries mentales. (-${COUT_DIVERTISSEMENT} $)`);
    updateUI();
}

function seSoigner() {
    if (sante >= 98) {
        logMessage("Votre santé est déjà excellente, pas besoin de soins.");
        passerTemps(10); updateUI(); return;
    }
    if (argent < COUT_SOIN) {
        logMessage("Vous ne pouvez pas vous payer les produits de base pour vous soigner.");
        updateUI(); return;
    }
    argent -= COUT_SOIN;
    sante = Math.min(100, sante + GAIN_SANTE);
    energie = Math.max(0, energie - 5); 
    passerTemps(TEMPS_SOIGNER);
    logMessage(`Vous avez pris le temps de vous soigner. Votre santé est remontée. (-${COUT_SOIN} $)`);
    updateUI();
}


// =========================================================
// 5. GESTION DE LA MODALE ET DES INTERACTIONS (NOUVELLE LOGIQUE)
// =========================================================

const modal = document.getElementById("action-modal");
const closeBtn = document.getElementsByClassName("close-button")[0];
const executeBtn = document.getElementById("modal-execute-btn");
const durationInputContainer = document.getElementById('modal-duration-input');

/**
 * Met à jour les détails affichés dans la modale (utile pour les actions variables).
 * @param {string} actionId - L'ID de l'action.
 * @param {number} [duration=null] - La durée choisie (uniquement pour "mendier").
 */
function updateModalEffects(actionId, duration = null) {
    const details = ACTION_DETAILS[actionId];
    let timeText = details.time;
    let effectsText = details.effects;

    if (actionId === 'mendier' && duration !== null) {
        const coutEnergie = duration === 60 ? 15 : 30;
        timeText = `${duration / 60} heure(s)`;
        effectsText = `+ Argent (aléatoire), - ${coutEnergie} Énergie, - 5 Bonheur, + Faim.`;
    }
    
     document.getElementById('modal-effects').innerHTML = `
        <p><strong>🕒 Temps :</strong> ${timeText}</p>
        <p><strong>✨ Effets :</strong> ${effectsText}</p>
    `;
}

/**
 * Ouvre la modale, configure l'entrée de durée si nécessaire et prépare le bouton d'exécution.
 * @param {string} actionId - L'ID de l'action (ex: 'mendier').
 */
function openModal(actionId) {
    const details = ACTION_DETAILS[actionId];
    if (!details) return;

    document.getElementById('modal-title').textContent = details.title;
    document.getElementById('modal-description').textContent = details.description;
    durationInputContainer.innerHTML = ''; // Nettoie le conteneur de durée

    let isActionDisabled = document.getElementById(`${actionId}-btn`).disabled;
    
    // --- 1. Gestion de l'input de durée (pour "Mendier") ---
    if (actionId === 'mendier') {
        durationInputContainer.innerHTML = `
            <div class="duration-control">
                <label for="mendier-duration">Durée de l'action :</label>
                <select id="mendier-duration" class="modal-input">
                    <option value="60">1 heure (Coût approx. 15 Énergie)</option>
                    <option value="120">2 heures (Coût approx. 30 Énergie)</option>
                </select>
            </div>
        `;
        
        // Mettre à jour les effets si la sélection change
        document.getElementById('mendier-duration').onchange = (e) => {
            updateModalEffects(actionId, parseInt(e.target.value));
            // La désactivation ne change pas avec la durée choisie dans ce cas, mais on met à jour le texte du bouton.
            isActionDisabled = energie < (parseInt(e.target.value) === 60 ? 15 : 30);
            executeBtn.disabled = isActionDisabled;
            executeBtn.textContent = isActionDisabled ? `Énergie insuffisante` : `Exécuter l'action`;
        };
    } 

    // --- 2. Mise à jour des effets initiaux ---
    // Si c'est Mendier, on met à jour avec la valeur par défaut (60min)
    const initialDuration = actionId === 'mendier' ? 60 : null;
    updateModalEffects(actionId, initialDuration);

    // --- 3. Configuration du bouton d'exécution ---
    
    // On doit recalculer si c'est Mendier car la désactivation dépend de la durée.
    if (actionId === 'mendier') {
        isActionDisabled = energie < 15; // Vérification minimale pour le défaut
    }

    executeBtn.disabled = isActionDisabled;
    executeBtn.textContent = isActionDisabled 
        ? `Action indisponible (manque argent/condition)` 
        : `Confirmer et exécuter`;

    executeBtn.onclick = () => {
        if (isActionDisabled) {
            closeModal();
            return; // Ne rien faire si c'est désactivé
        }
        
        // Exécution : on passe la durée si c'est "mendier"
        if (actionId === 'mendier') {
            const duration = parseInt(document.getElementById('mendier-duration').value);
            details.func(duration);
        } else {
            details.func();
        }
        closeModal();
    };
    
    modal.style.display = "block";
}

/**
 * Ferme la modale.
 */
function closeModal() {
    modal.style.display = "none";
}

// Lier le bouton de fermeture de la modale
closeBtn.onclick = closeModal;

// Fermer la modale si l'utilisateur clique en dehors
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}


/**
 * Configure les événements d'interaction (simple clic/tap pour ouvrir la modale).
 */
function setupActionButtons() {
    const actionButtons = document.querySelectorAll('#actions-container button'); 
    
    actionButtons.forEach(button => {
        const actionId = button.id.replace('-btn', '');

        // Le simple clic/tap ouvre la modale de confirmation
        button.addEventListener('click', () => {
             openModal(actionId);
        });

        // Empêche le menu contextuel (clic droit/appui long)
        button.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
        });
    });
}


// =========================================================
// 6. INITIALISATION DU JEU (Lancement)
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuration des boutons
    setupActionButtons();

    // 2. Afficher l'état initial du jeu
    updateUI();
});
