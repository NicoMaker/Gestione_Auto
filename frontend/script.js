// script.js (COMPLETO CON LOGICA CRUD, UI, GESTIONE JSON E ORDINAMENTO)

// ===================================
// FUNZIONI DI ACCESSO ALL'API (CRUD) - Simulazione per Node.js/JSON-Server
// ===================================

/**
 * Recupera tutti i veicoli dal backend.
 * @returns {Promise<Array>} Array di oggetti veicolo.
 */
async function getVehicles() {
    try {
        // Simula la chiamata a un API (es. JSON-Server /api/vehicles)
        const response = await fetch('/api/vehicles');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero dei veicoli:", error);
        return []; // Ritorna array vuoto in caso di fallimento
    }
}

/**
 * Salva o aggiorna un veicolo tramite API.
 * @param {object} vehicle - Oggetto veicolo da salvare/aggiornare.
 * @returns {Promise<object|null>} Il veicolo salvato con ID aggiornato o null in caso di errore.
 */
async function saveVehicle(vehicle) {
    const method = vehicle.id ? 'PUT' : 'POST';
    const url = vehicle.id ? `/api/vehicles/${vehicle.id}` : '/api/vehicles';

    const bodyData = {
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate,
        year: parseInt(vehicle.year),
        currentKm: parseInt(vehicle.currentKm) || 0
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown Error' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Errore nel salvataggio del veicolo (${method}):`, error);
        alert(`Impossibile salvare il veicolo: ${error.message}`);
        return null;
    }
}

/**
 * Elimina un veicolo dal backend.
 * @param {string} vehicleId - ID del veicolo.
 * @returns {Promise<boolean>} Vero se eliminato con successo.
 */
async function deleteVehicle(vehicleId) {
    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' });
        // Assume 200 OK o 204 No Content per successo
        if (response.status === 404) throw new Error("Veicolo non trovato.");
        if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione del veicolo:", error);
        alert(`Impossibile eliminare il veicolo: ${error.message}`);
        return false;
    }
}

/**
 * Recupera tutte le manutenzioni dal backend.
 * @returns {Promise<Array>} Array di oggetti manutenzione.
 */
async function getMaintenances() {
    try {
        const response = await fetch('/api/maintenances');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero delle manutenzioni:", error);
        return [];
    }
}

/**
 * Salva o aggiorna una manutenzione tramite API.
 * @param {object} maintenance - Oggetto manutenzione da salvare/aggiornare.
 * @returns {Promise<object|null>} La manutenzione salvata con ID aggiornato o null in caso di errore.
 */
async function saveMaintenance(maintenance) {
    const method = maintenance.id ? 'PUT' : 'POST';
    const url = maintenance.id ? `/api/maintenances/${maintenance.id}` : '/api/maintenances';

    // Assicurarsi che i dati siano nel formato corretto per il backend
    const bodyData = {
        vehicleId: maintenance.vehicleId,
        type: maintenance.type,
        dueDate: maintenance.dueDate || null,
        dueKm: maintenance.dueKm || null,
        notifyDaysBefore: parseInt(maintenance.notifyDaysBefore) || 7,
        notes: maintenance.notes,
        completed: maintenance.completed || false,
        completedAt: maintenance.completed ? (maintenance.completedAt || new Date().toISOString()) : null
    };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Errore nel salvataggio della manutenzione (${method}):`, error);
        alert(`Impossibile salvare la manutenzione: ${error.message}`);
        return null;
    }
}

/**
 * Elimina una manutenzione dal backend.
 * @param {string} maintenanceId - ID della manutenzione.
 * @returns {Promise<boolean>} Vero se eliminato con successo.
 */
async function deleteMaintenance(maintenanceId) {
    try {
        const response = await fetch(`/api/maintenances/${maintenanceId}`, { method: 'DELETE' });
        if (response.status === 404) throw new Error("Manutenzione non trovata.");
        if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione della manutenzione:", error);
        alert(`Impossibile eliminare la manutenzione: ${error.message}`);
        return false;
    }
}

// ===================================
// GESTIONE TIPI MANUTENZIONE DA JSON E ORDINAMENTO ALFABETICO (NUOVA LOGICA)
// ===================================

let maintenanceTypes = []; // Array per i tipi di manutenzione dal JSON (ordinato)

/**
 * Recupera e ordina i tipi di manutenzione dal file JSON.
 * @returns {Promise<Array>} Array di stringhe dei tipi di manutenzione, ordinati alfabeticamente.
 */
async function loadMaintenanceTypes() {
    try {
        const response = await fetch('maintenance_types.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (Array.isArray(data.types)) {
            // Ordina in base all'alfabeto italiano (per gestire gli accenti e ordinare correttamente)
            maintenanceTypes = data.types.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
            return maintenanceTypes;
        } else {
            console.error("Il formato del file maintenance_types.json non è corretto.");
            return [];
        }
    } catch (error) {
        console.error("Errore nel recupero o nell'ordinamento dei tipi di manutenzione:", error);
        // Fallback in caso di errore o file mancante
        maintenanceTypes = ["Altro", "Controllo", "Collaudo"].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
        return maintenanceTypes;
    }
}

/**
 * Popola l'elemento <select> specificato con le opzioni dei tipi di manutenzione.
 * @param {string} elementId - L'ID dell'elemento <select> ('type' o 'editType').
 * @param {string|null} selectedValue - Il valore da pre-selezionare.
 */
function populateMaintenanceTypeSelect(elementId, selectedValue = null) {
    const selectEl = document.getElementById(elementId);
    if (!selectEl) return;

    // Pulisce le opzioni esistenti e aggiunge il placeholder
    selectEl.innerHTML = '<option value="" disabled selected>Seleziona tipo</option>';

    // Aggiunge le opzioni ordinate
    maintenanceTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (selectedValue === type) {
            option.selected = true;
            // Rimuove l'attributo 'selected' dall'opzione 'Seleziona tipo'
             selectEl.querySelector('option[disabled]').selected = false;
        }
        selectEl.appendChild(option);
    });
}


// ===================================
// GESTIONE STATO E UTILITY
// ===================================

let vehicles = [];
let maintenances = [];
let alerts = [];
let notifiedAlerts = new Set();
let currentVehicle = null; // Usato per modale Aggiungi/Modifica Veicolo e Dettagli
let currentMaintenance = null; // Usato per modale Modifica Manutenzione


function getVehicleById(id) {
    return vehicles.find(v => v.id === id);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT');
}

/**
 * Controlla lo stato di scadenza di una manutenzione.
 */
function checkMaintenanceDue(maintenance, currentKm) {
    const now = new Date();
    const dueDate = maintenance.dueDate ? new Date(maintenance.dueDate) : null;
    const dueKm = maintenance.dueKm;
    const notifyDaysBefore = maintenance.notifyDaysBefore || 7;

    let isDue = false;
    let reason = '';
    let kmUntil = null;
    let daysUntil = Infinity;

    // 1. Check date
    if (dueDate) {
        daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
            isDue = true;
            const daysOverdue = Math.abs(daysUntil);
            reason = `Scaduto da ${daysOverdue} ${daysOverdue === 1 ? ' giorno' : ' giorni'}`;
        } else if (daysUntil <= notifyDaysBefore) {
            isDue = true;
            reason = `Scadenza tra ${daysUntil} ${daysUntil === 1 ? ' giorno' : ' giorni'}`;
        }
    }

    // 2. Check km
    if (dueKm && currentKm !== null && currentKm !== undefined) {
        kmUntil = dueKm - currentKm;
        // Notifica se mancano meno di 3000km o se è superato
        if (kmUntil < 0) {
            isDue = true;
            const kmOverdue = Math.abs(kmUntil);
            reason = reason ? `${reason} e superato di ${kmOverdue.toLocaleString()} km` : `Superato di ${kmOverdue.toLocaleString()} km`;
        } else if (kmUntil <= 3000) {
            isDue = true;
            const kmText = `Mancano ${kmUntil.toLocaleString()} km`;
            reason = reason ? `${reason} / ${kmText}` : kmText;
        }
    }

    return { isDue, daysUntil, kmUntil, reason };
}

/**
 * Controlla tutte le manutenzioni per generare la lista di alerts.
 */
function checkAllMaintenances(vehicles, maintenances) {
    const alerts = [];

    vehicles.forEach(vehicle => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);

        vehicleMaintenances.forEach(maintenance => {
            if (maintenance.completed) return;

            const check = checkMaintenanceDue(maintenance, vehicle.currentKm);

            if (check.isDue) {
                alerts.push({
                    vehicle,
                    maintenance,
                    ...check
                });
            }
        });
    });

    return alerts;
}


// Gestione Tema
const THEME_KEY = 'theme';

function getInitialTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleUI(theme);
}

function updateThemeToggleUI(theme) {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.setAttribute('aria-label', theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro');
    btn.innerHTML = theme === 'dark'
        ? '<i class="fas fa-sun"></i><span class="toggle-label">Chiaro</span>'
        : '<i class="fas fa-moon"></i><span class="toggle-label">Scuro</span>';
}

// Gestione Notifiche Browser
function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
        return Notification.permission === 'granted';
    }
    return false;
}

function showBrowserNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'https://tse1.mm.bing.net/th/id/OIP.kQpL0TADFnsvlZ6ujg16xQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3',
        });
    }
}

function checkMaintenancesAndNotify() {
    // Ricarica i dati per avere gli alert aggiornati
    loadData().then(() => {
        if (Notification.permission !== 'granted') return;

        const newNotifiedAlerts = new Set();
        alerts.forEach(alert => {
            const alertId = `${alert.vehicle.id}-${alert.maintenance.id}`;

            // Solo se non è stato notificato prima (per non spammare)
            if (!notifiedAlerts.has(alertId)) {
                let message = `Veicolo: ${alert.vehicle.brand} ${alert.vehicle.model}, Manutenzione: ${alert.maintenance.type}. ${alert.reason}.`;
                showBrowserNotification('🚨 Scadenza Manutenzione', message);
                newNotifiedAlerts.add(alertId);
            }
        });
        notifiedAlerts = newNotifiedAlerts;
    });
}


// ===================================
// FUNZIONI DI RENDERING
// ===================================

const totalVehiclesEl = document.getElementById('totalVehicles');
const totalVehiclesLabelEl = document.getElementById('totalVehiclesLabel');
const totalMaintenancesEl = document.getElementById('totalMaintenances');
const totalMaintenancesLabelEl = document.getElementById('totalMaintenancesLabel');
const activeAlertsEl = document.getElementById('activeAlerts');
const activeAlertsLabelEl = document.getElementById('activeAlertsLabel');
const alertsIconEl = document.getElementById('alertsIcon');
const alertsSectionEl = document.getElementById('alertsSection');
const alertsContainerEl = document.getElementById('alertsContainer');
const vehiclesContainerEl = document.getElementById('vehiclesContainer');
const emptyStateEl = document.getElementById('emptyState');

// Dialogs
const dialogAddVehicleEl = document.getElementById('dialogAddVehicle');
const dialogAddMaintenanceEl = document.getElementById('dialogAddMaintenance');
const dialogVehicleDetailsEl = document.getElementById('dialogVehicleDetails');
const dialogEditMaintenanceEl = document.getElementById('dialogEditMaintenance');
const dialogConfirmEl = document.getElementById('dialogConfirm');

// Forms
const formAddVehicleEl = document.getElementById('formAddVehicle');
const formAddMaintenanceEl = document.getElementById('formAddMaintenance');
const formEditMaintenanceEl = document.getElementById('formEditMaintenance');

function renderStats() {
    totalVehiclesEl.textContent = vehicles.length;
    totalMaintenancesEl.textContent = maintenances.length;
    activeAlertsEl.textContent = alerts.length;

    totalVehiclesLabelEl.textContent = vehicles.length === 1 ? 'Veicolo Totale' : 'Veicoli Totali';
    totalMaintenancesLabelEl.textContent = maintenances.length === 1 ? 'Manutenzione' : 'Manutenzioni';
    activeAlertsLabelEl.textContent = alerts.length === 1 ? 'Scadenza Attiva' : 'Scadenze Attive';

    if (alerts.length > 0) {
        alertsIconEl.className = 'stat-icon stat-icon-red pulse-animation';
        alertsIconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        alertsIconEl.className = 'stat-icon stat-icon-gray';
        alertsIconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
}

function renderAlerts() {
    if (alerts.length === 0) {
        alertsSectionEl.style.display = 'none';
        return;
    }

    alertsSectionEl.style.display = 'block';
    alertsContainerEl.innerHTML = '';

    // Ordina: Scaduti prima, poi quelli in arrivo (dal più vicino)
    alerts.sort((a, b) => {
        // Usa daysUntil come metrica principale
        return a.daysUntil - b.daysUntil;
    });

    alerts.forEach(alert => {
        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message warning';
        alertMessage.onclick = () => handleViewDetails(alert.vehicle.id);

        const formattedDate = alert.maintenance.dueDate ? new Date(alert.maintenance.dueDate).toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/D';

        alertMessage.innerHTML = `
            <div class="alert-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-message-content">
                <strong>${alert.vehicle.brand} ${alert.vehicle.model}: ${alert.maintenance.type}</strong>
                <p>Scadenza: ${formattedDate} (${alert.reason})</p>
                    <small>Clicca sulla card per i dettagli.</small>
                </div>
                <div class="alert-actions">
                    <button class="btn btn-sm btn-success" onclick="event.stopPropagation(); handleToggleComplete('${alert.maintenance.id}', true)">
                        <i class="fas fa-check"></i> Completa
                    </button>
            </div>
        `;
        alertsContainerEl.appendChild(alertMessage);
    });
}

function renderVehicles() {
    vehiclesContainerEl.innerHTML = '';

    if (vehicles.length === 0) {
        emptyStateEl.style.display = 'flex'; // Usare flex per centrare
        vehiclesContainerEl.style.display = 'none';
        return;
    }

    emptyStateEl.style.display = 'none';
    vehiclesContainerEl.style.display = 'grid'; // Assumendo grid dal CSS

    vehicles.forEach((vehicle) => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);
        const maintenanceText = vehicleMaintenances.length === 1 ? 'manutenzione' : 'manutenzioni';

        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'vehicle-card';

        vehicleCard.innerHTML = `
            <div class="vehicle-card-header">
                <div class="vehicle-card-info">
                    <div class="vehicle-icon">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="vehicle-info">
                        <h3>${vehicle.brand} ${vehicle.model}</h3>
                        <p>${vehicle.plate}</p>
                    </div>
                </div>
                <div class="vehicle-header-actions">
                    <button class="btn-icon btn-secondary" onclick="handleEditVehicle('${vehicle.id}')" aria-label="Modifica Veicolo">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="handleDeleteVehicle('${vehicle.id}')" aria-label="Elimina Veicolo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                </div>
            <div class="vehicle-card-footer">
                <div class="vehicle-card-info-item">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>${(vehicle.currentKm || 0).toLocaleString()} km</span>
                </div>
                <div class="vehicle-card-info-item">
                    <i class="fas fa-calendar"></i>
                    <span>${vehicleMaintenances.length} ${maintenanceText}</span>
                </div>
            </div>
            <div class="vehicle-card-actions">
                <button class="btn btn-secondary btn-full" onclick="handleViewDetails('${vehicle.id}')">
                    Dettagli
                </button>
                <button class="btn btn-primary btn-full" onclick="handleAddMaintenance('${vehicle.id}')">
                    <i class="fas fa-plus"></i>
                    Manutenzione
                </button>
            </div>
        `;

        vehiclesContainerEl.appendChild(vehicleCard);
    });
}

function handleViewDetails(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicleId);

    // Set dialog info
    document.getElementById('detailsVehicleName').textContent = `${vehicle.brand} ${vehicle.model}`;
    document.getElementById('detailsVehicleInfo').textContent = `${vehicle.plate} - Anno ${vehicle.year}`;
    document.getElementById('updateKm').value = vehicle.currentKm || 0;

    // Render maintenances
    const maintenancesListEl = document.getElementById('maintenancesList');
    
    // Ordina: Scaduti/In Scadenza (non completati) > Non in scadenza (non completati) > Completati (dal più recente)
    vehicleMaintenances.sort((a, b) => {
        if (a.completed && !b.completed) return 1;
        if (!a.completed && b.completed) return -1;
        if (a.completed && b.completed) {
            return new Date(b.completedAt) - new Date(a.completedAt); 
        }
        // Per i non completati, usa i giorni alla scadenza (meno giorni = più priorità)
        const checkA = checkMaintenanceDue(a, vehicle.currentKm);
        const checkB = checkMaintenanceDue(b, vehicle.currentKm);
        return checkA.daysUntil - checkB.daysUntil;
    });


    if (vehicleMaintenances.length === 0) {
        maintenancesListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem 0;">Nessuna manutenzione aggiunta per questo veicolo.</p>';
        document.getElementById('maintenanceCount').textContent = '(0)'; 
    } else {
        const completedCount = vehicleMaintenances.filter(m => m.completed).length;
        document.getElementById('maintenanceCount').textContent = `(${vehicleMaintenances.length} totali - ${completedCount} completate)`;

        maintenancesListEl.innerHTML = '';
        vehicleMaintenances.forEach(maintenance => {
            const maintenanceItem = document.createElement('div');
            let isOverdue = false;
            let kmText = '';
            let dateText = maintenance.dueDate ? formatDate(maintenance.dueDate) : 'N/D';
            let statusClass = maintenance.completed ? 'maintenance-completed' : '';

            if (!maintenance.completed) {
                const check = checkMaintenanceDue(maintenance, vehicle.currentKm);

                if (check.daysUntil < 0 || (check.kmUntil !== null && check.kmUntil < 0)) {
                    statusClass = 'maintenance-overdue';
                    isOverdue = true;
                } else if (check.isDue) {
                    statusClass = 'maintenance-due-soon';
                }

                if (maintenance.dueKm) {
                    if (check.kmUntil === null || check.kmUntil === Infinity) {
                        kmText = `${maintenance.dueKm.toLocaleString()} km`;
                    } else if (check.kmUntil < 0) {
                        kmText = `Superato di ${Math.abs(check.kmUntil).toLocaleString()} km`;
                    } else {
                        kmText = `Mancano ${check.kmUntil.toLocaleString()} km`;
                    }
                }
            } else {
                dateText = `Completata il ${formatDate(maintenance.completedAt)}`;
            }


            maintenanceItem.className = `maintenance-item ${statusClass}`;
            maintenanceItem.innerHTML = `
                <div class="maintenance-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <div class="maintenance-content">
                    <h4>${maintenance.type}</h4>
                    <div class="maintenance-details">
                        <div class="maintenance-detail-item">
                            <i class="fas fa-calendar"></i>
                            <span class="${isOverdue ? 'text-overdue' : 'text-normal'}">${dateText}</span>
                        </div>
                        ${maintenance.dueKm ? `
                        <div class="maintenance-detail-item">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>${kmText}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${maintenance.notes ? `<p class="maintenance-notes" style="color: var(--text-secondary)">Note: ${maintenance.notes}</p>` : ''}
                </div>
                <div class="maintenance-actions">
                    <button class="btn-icon ${maintenance.completed ? 'btn-success' : 'btn-secondary'}" onclick="event.stopPropagation(); handleToggleComplete('${maintenance.id}', ${!maintenance.completed})" aria-label="${maintenance.completed ? 'Segna come non completata' : 'Segna come completata'}">
                        <i class="fas ${maintenance.completed ? 'fa-check-square' : 'fa-square'}"></i>
                    </button>
                    <button class="btn-icon btn-secondary" onclick="event.stopPropagation(); handleEditMaintenance('${maintenance.id}')" aria-label="Modifica Manutenzione">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="event.stopPropagation(); handleDeleteMaintenance('${maintenance.id}')" aria-label="Elimina Manutenzione">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            maintenancesListEl.appendChild(maintenanceItem);
        });
    }

    dialogVehicleDetailsEl.classList.add('show');
}

// Funzioni di supporto per Dialog
function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    
    const oldBtn = document.getElementById('btnConfirmAction');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.style.display = 'inline-block';
    document.getElementById('btnCancelConfirm').textContent = 'Annulla';

    newBtn.addEventListener('click', () => {
        onConfirm();
        dialogConfirmEl.classList.remove('show');
    }, { once: true });
    
    dialogConfirmEl.classList.add('show');
}

function showAlertDialog(title, message) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    
    document.getElementById('btnConfirmAction').style.display = 'none'; 
    document.getElementById('btnCancelConfirm').textContent = 'OK'; 

    const oldBtn = document.getElementById('btnCancelConfirm');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);

    newBtn.addEventListener('click', () => {
        dialogConfirmEl.classList.remove('show');
        document.getElementById('btnConfirmAction').style.display = 'inline-block'; 
        newBtn.textContent = 'Annulla'; 
    }, { once: true });

    dialogConfirmEl.classList.add('show');
}


// ===================================
// GESTIONE EVENTI (HANDLERS)
// ===================================

function handleEditVehicle(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle; // Usa currentVehicle per tracciare il veicolo in modifica
    
    document.getElementById('dialogAddVehicleTitle').textContent = 'Modifica Veicolo';
    document.getElementById('brand').value = vehicle.brand;
    document.getElementById('model').value = vehicle.model;
    document.getElementById('plate').value = vehicle.plate;
    document.getElementById('year').value = vehicle.year;
    document.getElementById('currentKm').value = vehicle.currentKm;

    dialogAddVehicleEl.classList.add('show');
}

async function handleDeleteVehicle(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    showConfirmDialog(
        'Conferma Eliminazione Veicolo',
        `Sei sicuro di voler eliminare il veicolo "${vehicle.brand} ${vehicle.model}" e tutte le sue manutenzioni?`,
        async () => {
            const success = await deleteVehicle(vehicleId);
            if (success) {
                await loadData();
                dialogVehicleDetailsEl.classList.remove('show');
                currentVehicle = null;
            }
        }
    );
}

function handleAddMaintenance(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    document.getElementById('maintenanceVehicleInfo').textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`;
    
    formAddMaintenanceEl.reset();
    document.getElementById('notifyDaysBefore').value = '7'; 
    
    // NUOVO: Popola il select con i tipi ordinati
    populateMaintenanceTypeSelect('type'); 

    dialogAddMaintenanceEl.classList.add('show');
}

function handleEditMaintenance(maintenanceId) { 
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance) return; 

    // Trova il veicolo associato per popolare il sottotitolo
    const vehicle = getVehicleById(maintenance.vehicleId);
    if (!vehicle) return;

    currentMaintenance = maintenance;
    currentVehicle = vehicle; // Imposta currentVehicle per il back-navigate al Dettagli

    // Imposta le info nel modale
    document.getElementById('editMaintenanceTitle').textContent = `Modifica Manutenzione: ${maintenance.type}`;
    document.getElementById('editMaintenanceVehicleInfo').textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`;
    
    // NUOVO: Popola il select con l'opzione corretta preselezionata
    populateMaintenanceTypeSelect('editType', maintenance.type);

    document.getElementById('editDueDate').value = maintenance.dueDate || '';
    document.getElementById('editDueKm').value = maintenance.dueKm || '';
    document.getElementById('editNotifyDaysBefore').value = maintenance.notifyDaysBefore || '7';
    document.getElementById('editNotes').value = maintenance.notes || '';
    document.getElementById('editCompleted').checked = maintenance.completed;

    dialogEditMaintenanceEl.classList.add('show');
}

async function handleDeleteMaintenance(maintenanceId) {
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance || !currentVehicle) return;

    showConfirmDialog(
        'Conferma Eliminazione Manutenzione',
        `Sei sicuro di voler eliminare la manutenzione "${maintenance.type}"?`,
        async () => {
            const success = await deleteMaintenance(maintenanceId);
            if (success) {
                await loadData();
                handleViewDetails(currentVehicle.id);
            }
        }
    );
}

async function handleToggleComplete(maintenanceId, newCompletedStatus) {
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance) return;

    const updatedMaintenance = {
        ...maintenance,
        completed: newCompletedStatus,
        completedAt: newCompletedStatus ? (maintenance.completedAt || new Date().toISOString()) : null
    };

    const savedMaintenance = await saveMaintenance(updatedMaintenance);
    if (savedMaintenance) {
        await loadData();

        if (currentVehicle && currentVehicle.id === savedMaintenance.vehicleId) {
            handleViewDetails(currentVehicle.id);
        }
    }
}

async function handleUpdateKm() {
    if (!currentVehicle) return;
    const newKm = parseInt(document.getElementById('updateKm').value);
    
    if (isNaN(newKm) || newKm < 0) {
        showAlertDialog('Errore', 'Inserisci un valore valido per i Km.');
        return;
    }

    if (newKm < (currentVehicle.currentKm || 0)) {
        showAlertDialog('Attenzione', 'I chilometri inseriti sono inferiori a quelli attuali. Se desideri modificarli, fallo tramite il tasto Modifica Veicolo.');
        return;
    }

    const updatedVehicle = {
        ...currentVehicle,
        currentKm: newKm,
        // Includi tutti i campi obbligatori per la PUT
        brand: currentVehicle.brand,
        model: currentVehicle.model,
        plate: currentVehicle.plate,
        year: currentVehicle.year
    };

    const savedVehicle = await saveVehicle(updatedVehicle);
    if (savedVehicle) {
        currentVehicle = savedVehicle;
        await loadData();
        handleViewDetails(currentVehicle.id);
    }
}


// ===================================
// INIZIALIZZAZIONE E GESTORI DI EVENTI GLOBALI
// ===================================

async function loadData() {
    // 1. Carica e ordina i tipi di manutenzione (NUOVO)
    await loadMaintenanceTypes(); 
    
    // 2. Carica veicoli e manutenzioni
    vehicles = await getVehicles();
    maintenances = await getMaintenances();
    alerts = checkAllMaintenances(vehicles, maintenances);

    // 3. Render
    renderStats();
    renderAlerts();
    renderVehicles();
}

// Inizializzazione all'apertura della pagina
window.onload = () => {
    setTheme(getInitialTheme());
    requestNotificationPermission();
    loadData();

    // Check every 5 minutes 
    setInterval(checkMaintenancesAndNotify, 5 * 60 * 1000); 

    // Toggle Tema
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Apertura Modali Veicolo
    document.getElementById('btnAddVehicle').addEventListener('click', () => {
        currentVehicle = null;
        formAddVehicleEl.reset();
        document.getElementById('dialogAddVehicleTitle').textContent = 'Aggiungi Nuovo Veicolo';
        dialogAddVehicleEl.classList.add('show');
    });
    document.getElementById('btnAddVehicleEmpty').addEventListener('click', () => {
        currentVehicle = null;
        formAddVehicleEl.reset();
        document.getElementById('dialogAddVehicleTitle').textContent = 'Aggiungi Nuovo Veicolo';
        dialogAddVehicleEl.classList.add('show');
    });

    // Chiusura Modali
    document.getElementById('btnCancelAddVehicle').addEventListener('click', () => dialogAddVehicleEl.classList.remove('show'));
    document.getElementById('btnCancelAddMaintenance').addEventListener('click', () => dialogAddMaintenanceEl.classList.remove('show'));
    document.getElementById('btnCancelEditMaintenance').addEventListener('click', () => dialogEditMaintenanceEl.classList.remove('show'));
    document.getElementById('btnCloseDetails').addEventListener('click', () => {
        dialogVehicleDetailsEl.classList.remove('show');
        currentVehicle = null;
    });

    // Azioni in Dettagli Veicolo
    document.getElementById('btnEditVehicleFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        dialogVehicleDetailsEl.classList.remove('show');
        setTimeout(() => handleEditVehicle(currentVehicle.id), 200);
    });

    document.getElementById('btnAddMaintenanceFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        dialogVehicleDetailsEl.classList.remove('show');
        setTimeout(() => handleAddMaintenance(currentVehicle.id), 200);
    });
    
    document.getElementById('btnUpdateKm').addEventListener('click', handleUpdateKm);
    document.getElementById('btnCancelConfirm').addEventListener('click', () => dialogConfirmEl.classList.remove('show'));


    // SUBMIT: Aggiungi/Modifica Veicolo
    formAddVehicleEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const vehicle = {
            id: currentVehicle ? currentVehicle.id : null, 
            brand: document.getElementById('brand').value.trim(),
            model: document.getElementById('model').value.trim(),
            plate: document.getElementById('plate').value.trim().toUpperCase(),
            year: parseInt(document.getElementById('year').value),
            currentKm: parseInt(document.getElementById('currentKm').value) || 0,
        };

        if (vehicle.plate.length === 0 || vehicle.brand.length === 0 || vehicle.model.length === 0) {
            showAlertDialog('Errore', 'Marca, Modello e Targa sono obbligatori.');
            return;
        }

        const savedVehicle = await saveVehicle(vehicle);

        if (savedVehicle) {
            dialogAddVehicleEl.classList.remove('show');
            await loadData();
        }
    });
    
    // SUBMIT: Aggiungi Manutenzione
    formAddMaintenanceEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentVehicle) return;

        const dueDate = document.getElementById('dueDate').value;
        const dueKm = document.getElementById('dueKm').value;

        if (!dueDate && !dueKm) {
            showAlertDialog('Errore', 'Devi specificare almeno una data di scadenza o un chilometraggio di scadenza.');
            return;
        }
        
        const maintenance = {
            vehicleId: currentVehicle.id,
            type: document.getElementById('type').value.trim(),
            dueDate: dueDate,
            dueKm: document.getElementById('dueKm').value ? parseInt(document.getElementById('dueKm').value) : null,
            notifyDaysBefore: parseInt(document.getElementById('notifyDaysBefore').value) || 7,
            notes: document.getElementById('notes').value.trim(),
        };

        if (!maintenance.type) {
            showAlertDialog('Errore', 'Il tipo di manutenzione è obbligatorio.');
            return;
        }

        const savedMaintenance = await saveMaintenance(maintenance);

        if (savedMaintenance) {
            dialogAddMaintenanceEl.classList.remove('show');
            await loadData();
            handleViewDetails(currentVehicle.id);
        }
    });

    // SUBMIT: Modifica Manutenzione
    formEditMaintenanceEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentMaintenance || !currentVehicle) return;
        
        const dueDate = document.getElementById('editDueDate').value;
        const dueKm = document.getElementById('editDueKm').value;

        if (!dueDate && !dueKm) {
            showAlertDialog('Errore', 'Devi specificare almeno una data di scadenza o un chilometraggio di scadenza.');
            return;
        }
        
        const isCompleted = document.getElementById('editCompleted').checked;

        const maintenance = {
            ...currentMaintenance, // Mantiene l'id e vehicleId
            type: document.getElementById('editType').value.trim(),
            dueDate: dueDate,
            dueKm: document.getElementById('editDueKm').value ? parseInt(document.getElementById('editDueKm').value) : null,
            notifyDaysBefore: parseInt(document.getElementById('editNotifyDaysBefore').value) || 7,
            notes: document.getElementById('editNotes').value.trim(),
            completed: isCompleted,
            completedAt: isCompleted ? (currentMaintenance.completedAt || new Date().toISOString()) : null
        };

        if (!maintenance.type) {
            showAlertDialog('Errore', 'Il tipo di manutenzione è obbligatorio.');
            return;
        }

        const savedMaintenance = await saveMaintenance(maintenance);

        if (savedMaintenance) {
            dialogEditMaintenanceEl.classList.remove('show');
            await loadData();
            handleViewDetails(currentVehicle.id);
        }
    });
};