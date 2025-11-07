// script.js (MODIFICATO PER USARE L'API BACKEND NODE.JS)

// ===================================
// FUNZIONI DI ACCESSO ALL'API (CRUD)
// ===================================

/**
 * Recupera tutti i veicoli dal backend.
 * @returns {Promise<Array>} Array di oggetti veicolo.
 */
async function getVehicles() {
    try {
        const response = await fetch('/api/vehicles');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero dei veicoli:", error);
        return [];
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
    
    // Per i veicoli POST, il campo ID sarà ignorato dal backend
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
            const errorData = await response.json();
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
        const response = await fetch(`/api/vehicles/${vehicleId}`, {
            method: 'DELETE'
        });
        if (response.status === 404) {
             throw new Error("Veicolo non trovato.");
        }
        // Il backend restituisce 204 No Content in caso di successo
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
        // vehicleId è necessario per POST, e non viene modificato per PUT
        vehicleId: maintenance.vehicleId, 
        type: maintenance.type,
        dueDate: maintenance.dueDate,
        dueKm: maintenance.dueKm ? parseInt(maintenance.dueKm) : null,
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
        const response = await fetch(`/api/maintenances/${maintenanceId}`, {
            method: 'DELETE'
        });
        if (response.status === 404) {
             throw new Error("Manutenzione non trovata.");
        }
        if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione della manutenzione:", error);
        alert(`Impossibile eliminare la manutenzione: ${error.message}`);
        return false;
    }
}

// ===================================
// GESTIONE STATO E UI (Adattata per Async)
// ===================================

function checkMaintenanceDue(maintenance, currentKm) {
    const now = new Date();
    const dueDate = new Date(maintenance.dueDate);
    const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let isDue = false;
    let reason = '';
    let kmUntil = null;

    // Check date
    if (daysUntil <= maintenance.notifyDaysBefore && daysUntil > 1) {
        isDue = true;
        reason = `Scadenza tra ${daysUntil} giorni`;
    } else if (daysUntil === 0) {
        isDue = true;
        reason = `Scade oggi`;
    } else if (daysUntil === 1) {
        isDue = true;
        reason = `Scade domani`;
    } else if (daysUntil < 0) {
        isDue = true;
        const daysOverdue = Math.abs(daysUntil);
        reason = `Scaduto da ${daysOverdue} ${daysOverdue === 1 ? ' giorno' : ' giorni'}`;
    }

    // Check km if applicable
    if (maintenance.dueKm && currentKm) {
        kmUntil = maintenance.dueKm - currentKm;
        // Non notificare per km in anticipo di più di 1000
        if (kmUntil <= 1000 && kmUntil >= 0) {
            isDue = true;
            // Se c'è già una notifica per data, la unisce, altrimenti usa solo i km
            reason = reason ? `${reason} e ${kmUntil.toLocaleString()} km` : `Mancano ${kmUntil.toLocaleString()} km`;
        } else if (kmUntil < 0) {
            isDue = true;
            reason = reason ? `${reason} e superato di ${Math.abs(kmUntil).toLocaleString()} km` : `Superato di ${Math.abs(kmUntil).toLocaleString()} km`;
        }
    }

    return { isDue, daysUntil, kmUntil, reason };
}

function checkAllMaintenances(vehicles, maintenances) {
    const alerts = [];

    vehicles.forEach(vehicle => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);

        vehicleMaintenances.forEach(maintenance => {
            // Skip completed maintenances
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

function requestNotificationPermission() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Permesso per le notifiche concesso.');
                    showBrowserNotification('Notifiche Abilitate', 'Riceverai avvisi per le manutenzioni in scadenza.');
                } else {
                    console.log('Permesso per le notifiche negato.');
                }
            });
        }
        return Notification.permission === 'granted';
    } else {
        console.log('Questo browser non supporta le notifiche desktop.');
        return false;
    }
}

function showBrowserNotification(title, body) {
    if (Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'https://tse1.mm.bing.net/th/id/OIP.kQpL0TADFnsvlZ6ujg16xQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', // Usa l'icona del tuo progetto
            badge: 'https://tse1.mm.bing.net/th/id/OIP.kQpL0TADFnsvlZ6ujg16xQHaHa?rs=1&pid=ImgDetMain&o=7&rm=3'
        });
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT');
}

// Theme management (Mantenuto)
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

// State management
let vehicles = [];
let maintenances = [];
let alerts = [];
let notifiedAlerts = new Set();
let currentVehicle = null;
let currentMaintenance = null;

// DOM References (Mantenute)
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

// Buttons
const btnAddVehicleEl = document.getElementById('btnAddVehicle');
const btnAddVehicleEmptyEl = document.getElementById('btnAddVehicleEmpty');

// Load data (Aggiornata per usare async/await)
async function loadData() {
    // Le funzioni di accesso al DB ora sono async
    vehicles = await getVehicles();
    maintenances = await getMaintenances();
    alerts = checkAllMaintenances(vehicles, maintenances);

    renderStats();
    renderAlerts();
    renderVehicles();
}

function renderStats() {
    totalVehiclesEl.textContent = vehicles.length;
    totalMaintenancesEl.textContent = maintenances.length;
    activeAlertsEl.textContent = alerts.length;

    // Aggiorna le etichette per singolare/plurale
    totalVehiclesLabelEl.textContent = vehicles.length === 1 ? 'Veicolo Totale' : 'Veicoli Totali';
    totalMaintenancesLabelEl.textContent = maintenances.length === 1 ? 'Manutenzione' : 'Manutenzioni';
    activeAlertsLabelEl.textContent = alerts.length === 1 ? 'Scadenza Attiva' : 'Scadenze Attive';

    // Update alerts icon
    if (alerts.length > 0) {
        alertsIconEl.className = 'stat-icon stat-icon-red pulse-animation'; // Aggiunge l'animazione se definita in CSS
        alertsIconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        alertsIconEl.className = 'stat-icon stat-icon-gray';
        alertsIconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    }
}

/**
 * Renderizza gli avvisi di manutenzione in scadenza nell'interfaccia.
 */
function renderAlerts() {
    if (alerts.length === 0) {
        alertsSectionEl.style.display = 'none';
        return;
    }

    alertsSectionEl.style.display = 'block';
    alertsContainerEl.innerHTML = ''; // Pulisce il contenitore

    // Ordina gli alert per data di scadenza (più vicina prima)
    alerts.sort((a, b) => {
        // Prioritizza gli alert che sono già in scadenza (negativi)
        if (a.daysUntil < 0 && b.daysUntil >= 0) return -1;
        if (a.daysUntil >= 0 && b.daysUntil < 0) return 1;
        // Altrimenti, ordina per giorni mancanti (crescente)
        return a.daysUntil - b.daysUntil;
    });

    alerts.forEach(alert => {
        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message warning';
        alertMessage.onclick = () => handleViewDetails(alert.vehicle.id); // Rende l'alert cliccabile

        const formattedDate = new Date(alert.maintenance.dueDate).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

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
        emptyStateEl.style.display = 'none'; // Rimosso il blocco del fix precedente che era sbagliato, mantenendo la logica originale se c'è
        return;
    }

    emptyStateEl.style.display = 'none';

    vehicles.forEach((vehicle, index) => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);
        const maintenanceText = vehicleMaintenances.length === 1 ? 'manutenzione' : 'manutenzioni';

        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'vehicle-card';

        // LOGICA AGGIORNATA PER PULSANTI DETTAGLI/ELIMINA NELL'HEADER (ICONI TOUCH FRIENDLY)
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

// Event handlers
async function handleDeleteVehicle(vehicleId) { // RESA ASYNC
    showConfirmDialog(
        'Conferma Eliminazione Veicolo',
        'Sei sicuro di voler eliminare questo veicolo? Verranno eliminate anche tutte le manutenzioni associate.',
        async () => { 
            const success = await deleteVehicle(vehicleId); // Chiamata async all'API
            if (success) {
                 await loadData(); // Ricarica dati
                // Chiude il modale dei dettagli se aperto
                dialogVehicleDetailsEl.classList.remove('show');
                currentVehicle = null;
            }
        }
    );
}

// Funzioni di supporto per Dialog (Mantenute)
function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').innerHTML = message; // Usa innerHTML per supportare il grassetto
    dialogConfirmEl.classList.add('show');

    // Clona e sostituisce il listener per evitare problemi di async/multiple calls
    const oldBtn = document.getElementById('btnConfirmAction');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    newBtn.style.display = 'inline-flex'; // Assicura che sia visibile
    document.getElementById('btnCancelConfirm').textContent = 'Annulla';

    newBtn.onclick = () => {
        onConfirm();
        dialogConfirmEl.classList.remove('show');
    };
}

function showAlertDialog(title, message) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    document.getElementById('btnConfirmAction').style.display = 'none'; // Nasconde il pulsante di conferma
    document.getElementById('btnCancelConfirm').textContent = 'OK'; // Rinomina Annulla in OK
    dialogConfirmEl.classList.add('show');
}


function handleViewDetails(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicleId);

    // Set dialog info
    document.getElementById('detailsVehicleName').textContent = `${vehicle.brand} ${vehicle.model}`;
    document.getElementById('detailsVehicleInfo').textContent = `${vehicle.plate} - Anno ${vehicle.year}`;
    document.getElementById('updateKm').value = vehicle.currentKm || 0;

    // Render maintenances
    const maintenancesListEl = document.getElementById('maintenancesList');
    if (vehicleMaintenances.length === 0) {
        maintenancesListEl.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem 0;">Nessuna manutenzione aggiunta per questo veicolo.</p>';
        document.getElementById('maintenanceCount').textContent = '(0)'; // FIX: Aggiunto fallback per maintenanceCount
    } else {
        const completedCount = vehicleMaintenances.filter(m => m.completed).length;
        document.getElementById('maintenanceCount').textContent = `(${vehicleMaintenances.length} - ${completedCount} completate)`;
        
        // Ordina le manutenzioni: In scadenza, in arrivo, completate, passate
        vehicleMaintenances.sort((a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            if (a.completed && b.completed) {
                return new Date(b.completedAt) - new Date(a.completedAt); // Più recenti in alto
            }
            
            // Per le non completate, ordina per data di scadenza
            const checkA = checkMaintenanceDue(a, vehicle.currentKm);
            const checkB = checkMaintenanceDue(b, vehicle.currentKm);
            
            // Alert in scadenza/scaduti hanno priorità (negativi/vicini a zero)
            return checkA.daysUntil - checkB.daysUntil;
        });
        
        maintenancesListEl.innerHTML = '';
        vehicleMaintenances.forEach(maintenance => {
            const maintenanceItem = document.createElement('div');
            let isOverdue = false;
            let kmText = '';
            let dateText = formatDate(maintenance.dueDate);
            let statusClass = maintenance.completed ? 'maintenance-completed' : '';

            if (!maintenance.completed) {
                const check = checkMaintenanceDue(maintenance, vehicle.currentKm);
                
                // Imposta la classe di stato
                if (check.daysUntil < 0) {
                    statusClass = 'maintenance-overdue';
                    dateText = `${dateText} (Scaduto)`;
                    isOverdue = true;
                } else if (check.daysUntil <= maintenance.notifyDaysBefore) {
                    statusClass = 'maintenance-due-soon';
                    dateText = `${dateText} (${check.reason.split('e')[0].trim()})`;
                }
                
                // Aggiunge la distanza in Km se rilevante
                if (maintenance.dueKm) {
                    kmText = maintenance.dueKm.toLocaleString() + ' km';
                    if (check.kmUntil !== null) {
                        const kmStatusClass = check.kmUntil < 0 ? 'text-overdue' : (check.kmUntil <= 1000 ? 'text-due-soon' : 'text-normal');
                        const kmStatusText = check.kmUntil < 0 
                            ? ` (${Math.abs(check.kmUntil).toLocaleString()} km superati)`
                            : (check.kmUntil <= 1000 
                                ? ` (Mancano ${check.kmUntil.toLocaleString()} km)` 
                                : '');
                        kmText = `${kmText}<span class="${kmStatusClass}" style="font-weight: 500">${kmStatusText}</span>`;
                    }
                }
            } else {
                statusClass = 'maintenance-completed';
                // Mostra la data di scadenza originale e la data di completamento
                dateText = `${formatDate(maintenance.dueDate)} (Scad.)`; 
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
                    ${maintenance.notes ? `<p class="maintenance-notes" style="color: var(--text-secondary)">${maintenance.notes}</p>` : ''}
                    ${maintenance.completed && maintenance.completedAt ? `
                        <p class="maintenance-completed-date">Completata il ${formatDate(maintenance.completedAt)}</p>
                    ` : ''}
                </div>
                <div class="maintenance-actions">
                    <button class="btn-icon ${maintenance.completed ? 'btn-success' : 'btn-secondary'}" 
                            onclick="event.stopPropagation(); handleToggleComplete('${maintenance.id}', ${!maintenance.completed})" 
                            aria-label="${maintenance.completed ? 'Segna come non completata' : 'Segna come completata'}">
                        <i class="fas ${maintenance.completed ? 'fa-check-square' : 'fa-square'}"></i>
                    </button>
                    <button class="btn-icon btn-secondary" 
                            onclick="event.stopPropagation(); handleEditMaintenance('${maintenance.id}')" 
                            aria-label="Modifica Manutenzione">
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

function handleAddMaintenance(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    currentVehicle = vehicle;
    document.getElementById('maintenanceVehicleInfo').textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`;
    // Reset form
    formAddMaintenanceEl.reset();
    document.getElementById('notifyDaysBefore').value = '7';
    // ATTENZIONE: Rimosso blocco data minima (permettere date passate)
    // ESEMPIO: document.getElementById('dueDate').min = new Date().toISOString().split('T')[0];
    dialogAddMaintenanceEl.classList.add('show');
}

function handleEditVehicle(vehicleId) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;

    currentVehicle = vehicle;
    document.getElementById('dialogAddVehicleTitle').textContent = 'Modifica Veicolo';
    document.getElementById('brand').value = vehicle.brand;
    document.getElementById('model').value = vehicle.model;
    document.getElementById('plate').value = vehicle.plate;
    document.getElementById('year').value = vehicle.year;
    document.getElementById('currentKm').value = vehicle.currentKm || 0; // Pre-popola con 0 se è null

    // Chiude il dialog dei dettagli se era aperto
    dialogVehicleDetailsEl.classList.remove('show');
    dialogAddVehicleEl.classList.add('show');
}

function handleEditMaintenance(maintenanceId) {
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance) return;
    currentMaintenance = maintenance;

    // Populate form
    document.getElementById('editType').value = maintenance.type;
    // La data deve essere nel formato YYYY-MM-DD per l'input type="date"
    document.getElementById('editDueDate').value = maintenance.dueDate ? new Date(maintenance.dueDate).toISOString().split('T')[0] : '';
    document.getElementById('editDueKm').value = maintenance.dueKm || '';
    document.getElementById('editNotifyDaysBefore').value = maintenance.notifyDaysBefore || 7;
    document.getElementById('editNotes').value = maintenance.notes || '';
    
    // NUOVO: Popola lo stato di completamento
    document.getElementById('editCompleted').checked = maintenance.completed;

    // ATTENZIONE: Rimosso blocco data minima (permettere date passate)
    // ESEMPIO: document.getElementById('editDueDate').min = new Date().toISOString().split('T')[0];

    // Chiude il dialog dei dettagli se era aperto
    dialogVehicleDetailsEl.classList.remove('show');
    dialogEditMaintenanceEl.classList.add('show');
}

async function handleDeleteMaintenance(maintenanceId) { // RESA ASYNC
    showConfirmDialog(
        'Conferma Eliminazione Manutenzione',
        'Sei sicuro di voler eliminare questa manutenzione?',
        async () => { 
            const success = await deleteMaintenance(maintenanceId); // Chiamata async all'API
            if (success) {
                await loadData(); // Ricarica dati
                if (currentVehicle) {
                    // Riapri i dettagli del veicolo per mostrare la lista aggiornata
                    handleViewDetails(currentVehicle.id);
                }
            }
        }
    );
}

// Funzione per gestire il cambio di stato di completamento (sostituisce handleMarkComplete)
async function handleToggleComplete(maintenanceId, newCompletedStatus) {
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance) return;

    // Rimosso il dialog di conferma per rendere l'aggiornamento immediato ("non elimina ma ok")
    const updatedMaintenance = {
        ...maintenance,
        completed: newCompletedStatus,
        // Aggiorna completedAt solo se è segnata come completata O se non era mai stata completata prima
        completedAt: newCompletedStatus ? (maintenance.completedAt || new Date().toISOString()) : null
    };

    const savedMaintenance = await saveMaintenance(updatedMaintenance);

    if (savedMaintenance) {
        await loadData();
        // Se siamo nella vista dettagli, ricaricala
        if (currentVehicle && currentVehicle.id === savedMaintenance.vehicleId) {
            handleViewDetails(currentVehicle.id);
        }
    }
}


// Funzione per aggiornare i Km
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

    // Crea un oggetto veicolo aggiornato
    const updatedVehicle = {
        ...currentVehicle,
        currentKm: newKm,
        // Questi campi sono inclusi per la chiamata PUT del backend, anche se non modificati
        brand: currentVehicle.brand,
        model: currentVehicle.model,
        plate: currentVehicle.plate,
        year: currentVehicle.year
    };

    const savedVehicle = await saveVehicle(updatedVehicle);

    if (savedVehicle) {
        // Aggiorna lo stato in memoria e l'UI
        currentVehicle = savedVehicle;
        await loadData();
        handleViewDetails(currentVehicle.id); // Ricarica la vista dettagli con i nuovi dati
    }
}


// Funzione per notificare
function checkMaintenancesAndNotify() {
    // Chiamiamo loadData per ricaricare gli alert dal DB
    loadData().then(() => {
        if (Notification.permission !== 'granted') return;

        const newNotifiedAlerts = new Set();
        alerts.forEach(alert => {
            const alertId = `${alert.vehicle.id}-${alert.maintenance.id}`;

            // Solo se non è stato notificato prima
            if (!notifiedAlerts.has(alertId)) {
                showBrowserNotification(
                    `❗ ${alert.vehicle.brand} ${alert.vehicle.model}`,
                    `${alert.maintenance.type} - ${alert.reason}`
                );
                newNotifiedAlerts.add(alertId); // Aggiungiamo l'ID al set per non notificarlo di nuovo
            }
        });
        notifiedAlerts = newNotifiedAlerts;
    });
}


// Handlers per la chiusura dei dialog
function setupDialogCloseHandlers() {
    // Buttons (Mantenuti e aggiornati per async)
    btnAddVehicleEl.addEventListener('click', () => {
        currentVehicle = null;
        formAddVehicleEl.reset();
        document.getElementById('dialogAddVehicleTitle').textContent = 'Aggiungi Nuovo Veicolo';
        // Imposta l'anno di default a quello corrente
        document.getElementById('year').value = new Date().getFullYear(); 
        dialogAddVehicleEl.classList.add('show');
    });

    btnAddVehicleEmptyEl.addEventListener('click', () => {
        currentVehicle = null;
        formAddVehicleEl.reset();
        document.getElementById('dialogAddVehicleTitle').textContent = 'Aggiungi Nuovo Veicolo';
        document.getElementById('year').value = new Date().getFullYear(); 
        dialogAddVehicleEl.classList.add('show');
    });

    document.getElementById('btnCancelAddVehicle').addEventListener('click', () => {
        const wasEditing = !!currentVehicle;
        const vehicleIdToRestore = wasEditing ? currentVehicle.id : null;
        dialogAddVehicleEl.classList.remove('show');
        currentVehicle = null;

        if (wasEditing && vehicleIdToRestore) {
            setTimeout(() => {
                handleViewDetails(vehicleIdToRestore);
            }, 100);
        }
    });

    document.getElementById('btnCancelAddMaintenance').addEventListener('click', () => {
        dialogAddMaintenanceEl.classList.remove('show');
        if (currentVehicle) {
            setTimeout(() => {
                handleViewDetails(currentVehicle.id);
            }, 100);
        }
    });

    document.getElementById('btnCancelEditMaintenance').addEventListener('click', () => {
        dialogEditMaintenanceEl.classList.remove('show');
        if (currentVehicle) {
            setTimeout(() => {
                handleViewDetails(currentVehicle.id);
            }, 100);
        }
    });

    document.getElementById('btnCancelConfirm').addEventListener('click', () => {
        dialogConfirmEl.classList.remove('show');
    });

    document.getElementById('btnCloseDetails').addEventListener('click', () => {
        dialogVehicleDetailsEl.classList.remove('show');
        currentVehicle = null;
    });

    document.getElementById('btnEditVehicleFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        dialogVehicleDetailsEl.classList.remove('show');
        setTimeout(() => {
            handleEditVehicle(currentVehicle.id);
        }, 200);
    });

    document.getElementById('btnAddMaintenanceFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        dialogVehicleDetailsEl.classList.remove('show');
        setTimeout(() => {
            handleAddMaintenance(currentVehicle.id);
        }, 200);
    });

    document.getElementById('btnUpdateKm').addEventListener('click', handleUpdateKm);

    // Form submissions (Aggiornate per async/await)
    formAddVehicleEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vehicle = {
            id: currentVehicle ? currentVehicle.id : null, // Se in modifica, altrimenti null
            brand: document.getElementById('brand').value.trim(),
            model: document.getElementById('model').value.trim(),
            plate: document.getElementById('plate').value.trim().toUpperCase(),
            year: parseInt(document.getElementById('year').value),
            currentKm: document.getElementById('currentKm').value ? parseInt(document.getElementById('currentKm').value) : 0,
        };

        if (!vehicle.brand || !vehicle.model || !vehicle.plate || isNaN(vehicle.year)) {
            showAlertDialog('Errore', 'Compila tutti i campi obbligatori (Marca, Modello, Targa, Anno).');
            return;
        }

        const wasEditing = !!currentVehicle;

        const savedVehicle = await saveVehicle(vehicle);

        if (!savedVehicle) return;

        currentVehicle = savedVehicle;
        await loadData();
        dialogAddVehicleEl.classList.remove('show');

        // Se in modifica, riapre il modale dei dettagli con i dati aggiornati
        if (wasEditing && savedVehicle.id) {
             setTimeout(() => {
                handleViewDetails(savedVehicle.id);
            }, 100);
        }
    });

    formAddMaintenanceEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vehicleId = currentVehicle ? currentVehicle.id : null;

        if (!vehicleId) {
             showAlertDialog('Errore', 'Veicolo non selezionato per la manutenzione.');
             return;
        }

        const dueDate = document.getElementById('dueDate').value;
        if (!dueDate) {
             showAlertDialog('Errore', 'La data di scadenza è obbligatoria.');
             return;
        }

        const maintenance = {
            vehicleId: vehicleId,
            type: document.getElementById('type').value.trim(),
            dueDate: dueDate,
            dueKm: document.getElementById('dueKm').value ? parseInt(document.getElementById('dueKm').value) : null,
            notifyDaysBefore: parseInt(document.getElementById('notifyDaysBefore').value) || 7,
            notes: document.getElementById('notes').value.trim(),
            completed: false
        };
        
        if (!maintenance.type) {
             showAlertDialog('Errore', 'Il tipo di manutenzione è obbligatorio.');
             return;
        }


        const savedMaintenance = await saveMaintenance(maintenance);

        if (!savedMaintenance) return;

        await loadData();
        dialogAddMaintenanceEl.classList.remove('show');

        // Riapri i dettagli del veicolo per mostrare la lista aggiornata
        setTimeout(() => {
            handleViewDetails(vehicleId);
        }, 100);
    });

    formEditMaintenanceEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dueDate = document.getElementById('editDueDate').value;
        if (!dueDate) {
             showAlertDialog('Errore', 'La data di scadenza è obbligatoria.');
             return;
        }
        
        // NUOVO: Legge lo stato di completamento dal checkbox
        const isCompleted = document.getElementById('editCompleted').checked;


        const maintenance = {
            ...currentMaintenance, // Mantiene l'id e vehicleId
            type: document.getElementById('editType').value.trim(),
            dueDate: dueDate,
            dueKm: document.getElementById('editDueKm').value ? parseInt(document.getElementById('editDueKm').value) : null,
            notifyDaysBefore: parseInt(document.getElementById('editNotifyDaysBefore').value) || 7,
            notes: document.getElementById('editNotes').value.trim(),
            
            // NUOVO: Imposta lo stato di completamento e la data di completamento
            completed: isCompleted,
            completedAt: isCompleted 
                ? (currentMaintenance.completedAt || new Date().toISOString()) 
                : null
        };

        if (!maintenance.type) {
             showAlertDialog('Errore', 'Il tipo di manutenzione è obbligatorio.');
             return;
        }

        const savedMaintenance = await saveMaintenance(maintenance);

        if (!savedMaintenance) return;

        await loadData();
        dialogEditMaintenanceEl.classList.remove('show');

        // Riapri i dettagli del veicolo per mostrare la lista aggiornata
        if (currentVehicle) {
            setTimeout(() => {
                handleViewDetails(currentVehicle.id);
            }, 100);
        }
    });
}

// Initialize app
setupDialogCloseHandlers();
requestNotificationPermission();

// Theme init
const initialTheme = getInitialTheme();
setTheme(initialTheme);

// Theme toggle handler
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const current = localStorage.getItem(THEME_KEY) || initialTheme;
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    });
}

// Inizializza la prima volta
loadData();

// Check every 5 minutes 
setInterval(checkMaintenancesAndNotify, 5 * 60 * 1000);

async function loadVehicles() {
    try {
        const response = await fetch('/api/vehicles');
        const vehicles = await response.json();
        
        const vehicleListContainer = document.getElementById('vehicle-list');
        const emptyStateMessage = document.getElementById('empty-state'); // Assumendo esista un div per lo stato vuoto
        
        if (vehicles.length === 0) {
            // 1. Nascondi la lista (se visibile)
            vehicleListContainer.innerHTML = '';
            
            // 2. Mostra lo stato vuoto con il messaggio descrittivo e il pulsante
            if (emptyStateMessage) {
                 emptyStateMessage.style.display = 'block';
                 // Aggiungi il tuo HTML/Descrizione/Pulsante qui, se non è già nell'HTML
                 // Esempio: emptyStateMessage.innerHTML = '<h2>Nessun Veicolo</h2><p>Aggiungi il tuo primo veicolo per iniziare.</p><button onclick="openAddVehicleModal()">Aggiungi Veicolo</button>';
            }
            
        } else {
            // 1. Nascondi lo stato vuoto (se visibile)
            if (emptyStateMessage) {
                emptyStateMessage.style.display = 'none';
            }
            
            // 2. Popola la lista con i veicoli
            renderVehicles(vehicles); // Funzione che disegna i veicoli
        }
        
    } catch (error) {
        console.error("Errore nel caricamento dei veicoli:", error);
    }
}