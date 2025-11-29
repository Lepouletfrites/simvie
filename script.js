// =========================================================
// 0. FIREBASE SETUP ET IMPORTS
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Configuration de secours 
const fallbackFirebaseConfig = {
    apiKey: "AIzaSyCYDT2S60YamsACaH66AjHhxTIJa_dyYvY",
    authDomain: "simvie-5856a.firebaseapp.com",
    projectId: "simvie-5856a", 
    storageBucket: "simvie-5856a.firebasestorage.app",
    messagingSenderId: "359728066966",
    appId: "1:359728066966:web:245057a85d8c10bce8edb7", 
    measurementId: "G-XWELPM0XHC" 
};

const appId = typeof __app_id !== 'undefined' ? __app_id : fallbackFirebaseConfig.appId;
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : fallbackFirebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db;
let auth;
let userId = null; 

async function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig); 
        db = getFirestore(app);
        auth = getAuth(app);

        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        userId = auth.currentUser?.uid || crypto.randomUUID();
        document.getElementById('firebase-status').textContent = `Connecté. Utilisateur ID: ${userId.substring(0, 8)}...`;

    } catch (error) {
        console.error("Erreur lors de l'initialisation de Firebase ou de l'authentification:", error);
        document.getElementById('firebase-status').textContent = `Erreur de connexion : ${error.message}`; 
    }
}


// =========================================================
// 1. VARIABLES D'ÉTAT DU JEU & DETAILS POUR L'AFFICHAGE
// =========================================================

let argent = 0;
let sante = 100; 
let faim = 0;    
let energie = 100; 
let bonheur = 50; 
let dateActuelle = new Date(2024, 0, 1, 8, 0); 

// Mappage pour l'affichage stylisé et l'accès aux variables globales
const STAT_DETAILS = {
    'argent': { label: 'Argent', icon: '💰', unit: '$', accessor: () => argent },
    'sante': { label: 'Santé', icon: '❤️', unit: '%', accessor: () => sante },
    'faim': { label: 'Faim', icon: '🍽️', unit: '%', accessor: () => faim },
    'energie': { label: 'Énergie', icon: '⚡', unit: '%', accessor: () => energie },
    'bonheur': { label: 'Bonheur', icon: '😊', unit: '%', accessor: () => bonheur },
};

// Fonction utilitaire unique pour les gains aléatoires
const getRandomValue = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;


// =========================================================
// 2. STRUCTURE DE CONFIGURATION DES ACTIONS 
// =========================================================

const GAME_ACTIONS_CONFIG = {
    // CATEGORIE 1
    'survival': {
        containerId: "survival-actions-container",
        actions: {
            'mendier': {
                label: "Mendier",
                title: "Mendier pour quelques pièces",
                description: "Passer du temps à demander l'aumône. Le gain est aléatoire.",
                // Temps: Objet avec fonction d'exécution et plage pour l'affichage
                time: { 
                    value: () => getRandomValue(60, 120),
                    min: 60,
                    max: 120
                }, 
                effects: [
                    { 
                        stat: 'argent', 
                        value: () => getRandomValue(2, 7), 
                        isRandom: true,
                        min: 2, 
                        max: 7
                    },
                    { 
                        stat: 'energie', 
                        value: () => -getRandomValue(5, 15), 
                        isRandom : true,
                        min: -15, 
                        max: -5  
                    },
                    { stat: 'bonheur', value: -5 },
                    { stat: 'faim', value: +10 }
                ],
                isAvailable: () => energie >= 15 
            },
            'nourriture': {
                label: "Acheter de la nourriture (5 $)",
                title: "Acheter un repas simple",
                description: "Un repas de base pour apaiser la faim et reprendre des forces.",
                time: 30, // Temps fixe (nombre)
                effects: [
                    { stat: 'argent', value: -5 },
                    { stat: 'faim', value: -40 },
                    { stat: 'bonheur', value: +5 }
                ],
                isAvailable: () => argent >= 5
            },
            'fouille': {
                label: "Fouiller les poubelles",
                title: "Chercher un repas dans les poubelles",
                description: "Une activité de survie risquée. Peut réduire la faim, mais diminue le moral.",
                time: 30, // Temps fixe (nombre)
                effects: [
                    { 
                        stat: 'faim', 
                        value: () => -getRandomValue(5, 15), 
                        isRandom: true,
                        min: -15, 
                        max: -5  
                    },
                    { stat: 'energie', value: -5 }, 
                    { stat: 'bonheur', value: -10 } 
                ],
                isAvailable: () => energie >= 5 && faim > 0 
            }
        }
    },
    // CATEGORIE 2
    'health': {
        containerId: "health-actions-container",
        actions: {
            'wait': {
                label: "Attendre sur un banc (2h)",
                title: "Se reposer sur un banc",
                description: "Prendre quelques heures pour se reposer et regagner de l'énergie. Moins efficace que dormir.",
                time: 120, // Temps fixe (nombre)
                effects: [
                    { stat: 'energie', value: +30 }, 
                    { stat: 'faim', value: +5 },     
                    { stat: 'bonheur', value: +5 }  
                ],
                isAvailable: () => energie < 100 
            },
            'dormir': {
                label: "Dormir (8h)",
                title: "Dormir et se reposer",
                description: "Dormir 8 heures. Essentiel, mais risqué si affamé ou en plein jour.",
                time: 480, // Temps fixe (nombre)
                effects: [
                    { stat: 'energie', value: +80 },
                    { stat: 'sante', value: +5 },
                    { stat: 'faim', value: +15 },
                    { stat: 'bonheur', value: +10 }
                ],
                isAvailable: () => faim < 80 && (dateActuelle.getHours() <= 8 || dateActuelle.getHours() >= 20),
                onExecute: () => {
                    const heure = dateActuelle.getHours();
                    if (faim >= 80 || (heure > 8 && heure < 20)) {
                         sante = Math.max(0, sante - 5); 
                         logMessage("Impossible de dormir correctement (insécurité/faim). Un malus de santé a été appliqué !");
                    } else {
                        logMessage("Vous avez passé la nuit dehors. Énergie et moral récupérés.");
                    }
                }
            },
            'soigner': {
                label: "Se soigner (15 $)",
                title: "Se soigner (petits bobos)",
                description: "Utiliser des produits de base pour soigner les petites blessures.",
                time: 60, // Temps fixe (nombre)
                effects: [
                    { stat: 'argent', value: -15 },
                    { stat: 'sante', value: +20 },
                    { stat: 'energie', value: -5 }
                ],
                isAvailable: () => argent >= 15 && sante < 98
            }
        }
    },
    // CATEGORIE 3
    'moral': {
        containerId: "moral-actions-container",
        actions: {
            'divertissement': {
                label: "Se divertir (10 $)",
                title: "Se divertir (loisir simple)",
                description: "Se payer un petit plaisir pour recharger le moral.",
                time: 90, // Temps fixe (nombre)
                effects: [
                    { stat: 'argent', value: -10 },
                    { stat: 'bonheur', value: +30 },
                    { stat: 'energie', value: -10 }
                ],
                isAvailable: () => argent >= 10
            },
            'lire': { // NOUVELLE ACTION GRATUITE
                label: "Lire à la bibliothèque (Gratuit)",
                title: "Lire un livre pour s'évader",
                description: "Passer du temps à la bibliothèque pour améliorer son moral sans dépenser d'argent.",
                time: 120, // 2 heures
                effects: [
                    { stat: 'bonheur', value: +20 },
                    { stat: 'energie', value: -15 }, // Coûte de l'énergie
                    { stat: 'faim', value: +5 }      // Fait monter légèrement la faim
                ],
                isAvailable: () => energie >= 15 // Nécessite un minimum d'énergie
            }
        }
    }
};


// =========================================================
// 3. LOGIQUE D'EXÉCUTION ET MISE À JOUR DES STATS
// =========================================================

/**
 * Applique les effets définis dans la structure d'action aux variables globales.
 * @param {Array} actionEffects - Liste des objets { stat, value }.
 * @returns {string} Résumé des changements pour le journal.
 */
function applyEffects(actionEffects) {
    let messageParts = [];
    
    actionEffects.forEach(effect => {
        // Exécute la fonction si 'value' est une fonction, sinon prend la valeur directement
        let value = typeof effect.value === 'function' ? effect.value() : effect.value;
        const statName = effect.stat;
        
        // Mise à jour des variables globales par leur nom
        switch (statName) {
            case 'argent': argent = Math.max(0, argent + value); break;
            case 'sante': sante = Math.min(100, Math.max(0, sante + value)); break;
            case 'faim': faim = Math.min(100, Math.max(0, faim + value)); break;
            case 'energie': energie = Math.min(100, Math.max(0, energie + value)); break;
            case 'bonheur': bonheur = Math.min(100, Math.max(0, bonheur + value)); break;
            default: break;
        }

        // Construction du message de log
        if (value !== 0) {
            const details = STAT_DETAILS[statName];
            const sign = value > 0 ? '+' : (value < 0 ? '' : ''); 
            const absValue = Math.abs(value);
            // Pour le log, on affiche la valeur réelle qui a été utilisée
            const valueDisplay = (effect.isRandom ? `${sign}${absValue} (Aléatoire)` : `${sign}${absValue}`);
            messageParts.push(`${valueDisplay}${details.unit} ${details.label}`);
        }
    });
    
    return messageParts.join(', '); 
}

/**
 * Fonction générique pour exécuter n'importe quelle action définie dans la configuration.
 * @param {string} actionId - L'ID de l'action à exécuter.
 */
function executeAction(actionId) {
    let action = null;
    for(const categoryKey in GAME_ACTIONS_CONFIG) {
        if (GAME_ACTIONS_CONFIG[categoryKey].actions[actionId]) {
            action = GAME_ACTIONS_CONFIG[categoryKey].actions[actionId];
            break;
        }
    }
    if (!action || !action.isAvailable()) {
        logMessage(`Impossible d'exécuter l'action ${actionId}. Conditions non remplies.`);
        return;
    }

    // 1. Appliquer les effets de statut standard
    const summary = applyEffects(action.effects);
    
    // 2. Passer le temps
    const timeValueObject = action.time; 
    const timeSpent = (typeof timeValueObject === 'object' && timeValueObject.value) 
        ? timeValueObject.value() // Exécution de la fonction aléatoire
        : timeValueObject; // Valeur fixe
        
    passerTemps(timeSpent);
    
    // 3. Exécuter la logique supplémentaire (si onExecute est défini)
    if (action.onExecute && typeof action.onExecute === 'function') {
        action.onExecute();
    } else {
         // 4. Loguer le message final si pas de logique custom
        const timeStr = timeSpent >= 60 ? `${Math.floor(timeSpent / 60)}h ${timeSpent % 60}min` : `${timeSpent} min`;
        logMessage(`Action '${action.label}' effectuée (${timeStr}). Changements: ${summary}.`);
    }

    // 5. Mettre à jour l'UI
    updateUI();
}


// =========================================================
// 4. FONCTIONS DE MISE À JOUR DE L'INTERFACE
// =========================================================

function updateUI() {
    document.getElementById('argent-value').textContent = argent + STAT_DETAILS.argent.unit; 
    document.getElementById('sante-value').textContent = sante; 
    document.getElementById('faim-value').textContent = faim;   
    document.getElementById('energie-value').textContent = energie; 
    document.getElementById('bonheur-value').textContent = bonheur; 

    // Mise à jour de l'Heure
    const optionsDate = { weekday: 'short', day: 'numeric', month: 'short' };
    const optionsTime = { hour: '2-digit', minute: '2-digit' };
    const dateStr = dateActuelle.toLocaleDateString('fr-FR', optionsDate);
    const timeStr = dateActuelle.toLocaleTimeString('fr-FR', optionsTime);
    document.getElementById('current-time').textContent = `📅 ${dateStr} - ⏰ ${timeStr}`;

    updateActionButtonsState();
}

function updateActionButtonsState() {
    for (const categoryKey in GAME_ACTIONS_CONFIG) {
        const category = GAME_ACTIONS_CONFIG[categoryKey];
        for (const actionId in category.actions) {
            const action = category.actions[actionId];
            const button = document.getElementById(`${actionId}-btn`);
            
            if (button && action.isAvailable) {
                button.disabled = !action.isAvailable();
            }
        }
    }
}

function logMessage(message) {
    const timeStr = dateActuelle.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('message').innerHTML = `[${timeStr}] ${message}`;
}


// =========================================================
// 5. LOGIQUE DU TEMPS ET DES CONSÉQUENCES (Faim non-automatique)
// =========================================================

function passerTemps(minutes) {
    dateActuelle.setMinutes(dateActuelle.getMinutes() + minutes);

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
    document.querySelectorAll('.action-category button').forEach(btn => btn.disabled = true);
}


// =========================================================
// 6. LOGIQUE DE SAUVEGARDE ET DE CHARGEMENT (FIREBASE)
// =========================================================

function getGameState() {
    return {
        argent: argent,
        sante: sante,
        faim: faim,
        energie: energie,
        bonheur: bonheur,
        dateActuelle: dateActuelle.toISOString(), 
        version: 1
    };
}

function applyGameState(state) {
    argent = state.argent;
    sante = state.sante;
    faim = state.faim;
    energie = state.energie;
    bonheur = state.bonheur;
    dateActuelle = new Date(state.dateActuelle); 
    updateUI();
    logMessage("Progression chargée avec succès ! Reprenez votre lutte.");
}

async function saveGame(slotName) {
    if (!db || !userId) { 
        logMessage("Échec de la sauvegarde: Firebase non prêt ou non authentifié.");
        return; 
    }
    if (!slotName || slotName.trim() === '') return logMessage("Veuillez entrer un nom de slot de sauvegarde valide.");

    const stateToSave = getGameState();
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/game_saves`, slotName.trim());

    try {
        await setDoc(docRef, stateToSave);
        logMessage(`Partie sauvegardée dans le slot: "${slotName.trim()}" !`);
        closeSaveLoadModal();
    } catch (e) {
        console.error("Erreur lors de la sauvegarde :", e);
        logMessage("Échec de la sauvegarde. Vérifiez les règles de sécurité Firestore.");
    }
}

async function loadGame(slotName) {
    if (!db || !userId) { 
        logMessage("Échec du chargement: Firebase non prêt ou non authentifié.");
        return; 
    }
    if (!slotName || slotName.trim() === '') return logMessage("Veuillez entrer un nom de slot de chargement valide.");

    const docRef = doc(db, `artifacts/${appId}/users/${userId}/game_saves`, slotName.trim());

    try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const loadedState = docSnap.data();
            applyGameState(loadedState);
            closeSaveLoadModal();
        } else {
            logMessage(`Aucune sauvegarde trouvée pour le slot: "${slotName.trim()}".`);
        }
    } catch (e) {
        console.error("Erreur lors du chargement :", e);
        logMessage("Échec du chargement. Vérifiez les règles de sécurité Firestore.");
    }
}


// =========================================================
// 7. GESTION DES MODALES ET LISTENERS
// =========================================================

const actionModal = document.getElementById("action-modal");
const saveLoadModal = document.getElementById("save-load-modal");

const actionCloseBtn = document.querySelector(".action-close");
const saveCloseBtn = document.querySelector(".save-close");

const executeBtn = document.getElementById("modal-execute-btn");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const slotInput = document.getElementById("slot-name-input");


/**
 * Formatte l'affichage des effets pour la modale.
 * Affiche la plage Min/Max si l'effet est aléatoire, gérant correctement les signes.
 * @param {Array} effects - Liste des objets { stat, value, isRandom, min, max }.
 * @returns {string} HTML formaté pour la modale.
 */
function formatEffectsForModal(effects) {
    let html = '';
    
    effects.forEach(effect => {
        const statName = effect.stat;
        const details = STAT_DETAILS[statName];
        
        let valueDisplay;
        // On récupère la valeur statique ou on exécute la fonction pour avoir une référence (utilisé seulement si non aléatoire)
        let value = typeof effect.value === 'function' ? effect.value() : effect.value;
        
        // Le signe pour les valeurs fixes
        const sign = value > 0 ? '+' : (value < 0 ? '' : '');
        
        if (effect.isRandom) {
            // Utilisation des propriétés min et max définies dans l'objet d'effet
            const min = effect.min;
            const max = effect.max;
            
            // Affichage: on utilise les valeurs min et max telles que définies (incluant le signe)
            const minDisplay = min > 0 ? `+${min}` : `${min}`;
            const maxDisplay = max > 0 ? `+${max}` : `${max}`;

            valueDisplay = `(Aléatoire) ${minDisplay} - ${maxDisplay}`;
        } else {
            const absValue = Math.abs(value);
            valueDisplay = `${sign}${absValue}`;
        }
        
        // La couleur dépend du signe de la valeur (ou du min si aléatoire)
        const referenceValue = effect.isRandom ? effect.min : value;
        const style = referenceValue > 0 ? 'color: green;' : (referenceValue < 0 ? 'color: red;' : '');

        html += `<p style="${style}"><strong>${details.icon} ${details.label} :</strong> ${valueDisplay}${details.unit}</p>`;
    });

    return html;
}


// --- Modale d'Action ---

function openActionModal(actionId) {
    let action = null;
    for(const categoryKey in GAME_ACTIONS_CONFIG) {
        if (GAME_ACTIONS_CONFIG[categoryKey].actions[actionId]) {
            action = GAME_ACTIONS_CONFIG[categoryKey].actions[actionId];
            break;
        }
    }
    
    if (!action) return;

    document.getElementById('modal-title').textContent = action.title;
    document.getElementById('modal-description').textContent = action.description;
    
    // Temps (gère l'affichage aléatoire ou fixe)
    const timeValueObject = action.time; 
    let timeDisplay;

    // Fonction d'aide pour le formatage du temps (minutes -> h/min)
    const formatTime = (minutes) => {
        if (typeof minutes !== 'number' || minutes < 0) return 'Temps indéfini';
        return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes} min`;
    };

    // Si action.time est un objet, c'est que le temps est aléatoire
    if (typeof timeValueObject === 'object' && timeValueObject.min && timeValueObject.max) {
        const minTime = timeValueObject.min;
        const maxTime = timeValueObject.max;
        timeDisplay = `(Aléatoire) ${formatTime(minTime)} - ${formatTime(maxTime)}`;
    } else {
        // Temps fixe (timeValueObject est le nombre de minutes)
        timeDisplay = formatTime(timeValueObject);
    }

    // Disposition visuelle générée à partir des données structurées
    document.getElementById('modal-effects').innerHTML = `
        <p><strong>🕒 Temps estimé :</strong> ${timeDisplay}</p>
        <hr/>
        ${formatEffectsForModal(action.effects)}
    `;

    // Vérification de la disponibilité
    const isActionDisabled = !action.isAvailable();

    executeBtn.disabled = isActionDisabled;
    executeBtn.textContent = isActionDisabled 
        ? `Conditions non remplies` 
        : `Confirmer et Exécuter`;

    executeBtn.onclick = () => {
        if (!isActionDisabled) {
            executeAction(actionId); // Appel de la fonction générique
        }
        closeActionModal();
    };
    
    actionModal.style.display = "block";
}

function closeActionModal() {
    actionModal.style.display = "none";
}

function openSaveLoadModal() {
    saveLoadModal.style.display = "block";
    slotInput.focus();
}

function closeSaveLoadModal() {
    saveLoadModal.style.display = "none";
}


// --- Génération des boutons (Data-Driven UI) ---

function createActionButtons() {
    for (const categoryKey in GAME_ACTIONS_CONFIG) {
        const category = GAME_ACTIONS_CONFIG[categoryKey];
        const container = document.getElementById(category.containerId);
        
        if (container) {
            for (const actionId in category.actions) {
                const action = category.actions[actionId];
                
                const button = document.createElement('button');
                button.id = `${actionId}-btn`;
                button.textContent = action.label;
                // Attacher l'ouverture du modal à la fonction openActionModal
                button.addEventListener('click', () => openActionModal(actionId));
                
                container.appendChild(button);
            }
        }
    }
    updateActionButtonsState();
}

// --- Configuration des événements ---

function setupListeners() {
    saveBtn.addEventListener('click', () => { saveGame(slotInput.value); });
    loadBtn.addEventListener('click', () => { loadGame(slotInput.value); });
    
    // Ouvre le modal de sauvegarde/chargement en cliquant sur les stats
    document.getElementById('stats-container').addEventListener('click', openSaveLoadModal);

    actionCloseBtn.onclick = closeActionModal;
    saveCloseBtn.onclick = closeSaveLoadModal;

    window.onclick = function(event) {
        if (event.target == actionModal) { closeActionModal(); }
        if (event.target == saveLoadModal) { closeSaveLoadModal(); }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Démarrer Firebase
    await initializeFirebase();
    
    // 2. Génération des boutons 
    createActionButtons();
    
    // 3. Configuration des événements
    setupListeners();

    // 4. Afficher l'état initial
    updateUI();
});
