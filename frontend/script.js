// script.js - LOGICA FRONTEND COMPLETA CON API FUNZIONANTI

// ===================================
// GESTIONE TIPI MANUTENZIONE DA JSON
// ===================================

let maintenanceTypes = [];

async function loadMaintenanceTypes() {
    try {
        const response = await fetch('maintenance_types.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (Array.isArray(data.types)) {
            maintenanceTypes = data.types.sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
            return maintenanceTypes;
        } else {
            console.error("Il formato del file maintenance_types.json non è corretto.");
            return [];
        }
    } catch (error) {
        console.error("Errore nel recupero tipi manutenzione:", error);
        maintenanceTypes = ["Altro", "Controllo", "Collaudo"].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
        return maintenanceTypes;
    }
}

function populateMaintenanceTypeSelect(elementId, selectedValue = null) {
    const selectEl = document.getElementById(elementId);
    if (!selectEl) return;

    selectEl.innerHTML = '<option value="" disabled selected>Seleziona tipo</option>';

    maintenanceTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        if (selectedValue === type) {
            option.selected = true;
            selectEl.querySelector('option[disabled]').selected = false;
        }
        selectEl.appendChild(option);
    });
}


// ===================================
// GESTIONE API - CORRETTA E FUNZIONANTE
// ===================================

async function getVehicles() {
    try {
        const response = await fetch('http://localhost:3000/api/vehicles');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero dei veicoli:", error);
        showAlertDialog('Errore', 'Impossibile connettere al server. Assicurati che sia in esecuzione su http://localhost:3000');
        return [];
    }
}

async function saveVehicle(vehicle) {
    const method = vehicle.id ? 'PUT' : 'POST';
    const url = vehicle.id ? `http://localhost:3000/api/vehicles/${vehicle.id}` : 'http://localhost:3000/api/vehicles';

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
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
            const errorMsg = responseData.error || `HTTP error! status: ${response.status}`;
            throw new Error(errorMsg);
        }
        return responseData;
    } catch (error) {
        console.error(`Errore nel salvataggio del veicolo (${method}):`, error);
        showAlertDialog('Errore', `Impossibile salvare il veicolo: ${error.message}`);
        return null;
    }
}

async function deleteVehicle(vehicleId) {
    try {
        const response = await fetch(`http://localhost:3000/api/vehicles/${vehicleId}`, { method: 'DELETE' });
        if (response.status === 404) throw new Error("Veicolo non trovato.");
        if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione del veicolo:", error);
        showAlertDialog('Errore', `Impossibile eliminare il veicolo: ${error.message}`);
        return false;
    }
}

async function getMaintenances() {
    try {
        const response = await fetch('http://localhost:3000/api/maintenances');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Errore nel recupero delle manutenzioni:", error);
        return [];
    }
}

async function saveMaintenance(maintenance) {
    const method = maintenance.id ? 'PUT' : 'POST';
    const url = maintenance.id ? `http://localhost:3000/api/maintenances/${maintenance.id}` : `http://localhost:3000/api/vehicles/${maintenance.vehicleId}/maintenances`;

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
    
    if (maintenance.id) {
        delete bodyData.vehicleId;
        
        const updateBody = {
            type: bodyData.type,
            dueDate: bodyData.dueDate,
            dueKm: bodyData.dueKm,
            notifyDaysBefore: bodyData.notifyDaysBefore,
            notes: bodyData.notes,
            completed: bodyData.completed,
            completedAt: bodyData.completedAt
        };
        
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateBody)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Errore nel salvataggio della manutenzione (${method}):`, error);
            showAlertDialog('Errore', `Impossibile salvare la manutenzione: ${error.message}`);
            return null;
        }

    } else {
        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });
            const responseData = await response.json().catch(() => ({}));
            if (!response.ok) {
                const errorMsg = responseData.error || `HTTP error! status: ${response.status}`;
                throw new Error(errorMsg);
            }
            return responseData;
        } catch (error) {
            console.error(`Errore nella creazione della manutenzione (${method}):`, error);
            showAlertDialog('Errore', `Impossibile creare la manutenzione: ${error.message}`);
            return null;
        }
    }
}

async function deleteMaintenance(maintenanceId) {
    try {
        const response = await fetch(`http://localhost:3000/api/maintenances/${maintenanceId}`, { method: 'DELETE' });
        if (response.status === 404) throw new Error("Manutenzione non trovata.");
        if (!response.ok && response.status !== 204) throw new Error(`HTTP error! status: ${response.status}`);
        return true;
    } catch (error) {
        console.error("Errore nell'eliminazione della manutenzione:", error);
        showAlertDialog('Errore', `Impossibile eliminare la manutenzione: ${error.message}`);
        return false;
    }
}


// ===================================
// GESTIONE STATO GLOBALE
// ===================================

let vehicles = [];
let maintenances = [];
let alerts = [];
let currentVehicle = null;
let currentMaintenance = null;

function getVehicleById(id) {
    return vehicles.find(v => v.id === id);
}

function formatDate(dateString) {
    if (!dateString) return 'N/D';
    return new Date(dateString).toLocaleDateString('it-IT');
}

function checkMaintenanceDue(maintenance, currentKm) {
    const now = new Date();
    const dueDate = maintenance.dueDate ? new Date(maintenance.dueDate + 'T00:00:00') : null;
    const dueKm = maintenance.dueKm;
    const notifyDaysBefore = maintenance.notifyDaysBefore || 7;

    let isDue = false;
    let reason = '';
    let kmUntil = null;
    let daysUntil = Infinity;

    if (dueDate) {
        daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
            isDue = true;
            const daysOverdue = Math.abs(daysUntil);
            reason = `Scaduto da ${daysOverdue} ${daysOverdue === 1 ? 'giorno' : 'giorni'}`;
        } else if (daysUntil <= notifyDaysBefore) {
            isDue = true;
            reason = `Scadenza tra ${daysUntil} ${daysUntil === 1 ? 'giorno' : 'giorni'}`;
        }
    }

    if (dueKm !== null && dueKm !== undefined && currentKm !== null && currentKm !== undefined) {
        kmUntil = dueKm - currentKm;
        if (kmUntil < 0) {
            isDue = true;
            const kmOverdue = Math.abs(kmUntil);
            const kmText = `Superato di ${kmOverdue.toLocaleString('it-IT')} km`;
            reason = reason ? `${reason} e ${kmText}` : kmText;
        } else if (kmUntil <= 3000) {
            isDue = true;
            const kmText = `Mancano ${kmUntil.toLocaleString('it-IT')} km`;
            reason = reason ? `${reason} / ${kmText}` : kmText;
        }
    }

    if (daysUntil < 0 && kmUntil < 0) {
        reason = `SCADUTO per data e km`;
    } else if (daysUntil < 0) {
        reason = `SCADUTO per data (${formatDate(maintenance.dueDate)})`;
    } else if (kmUntil < 0) {
        reason = `SCADUTO per km (${dueKm.toLocaleString('it-IT')} km)`;
    } else if (daysUntil <= notifyDaysBefore && kmUntil <= 3000) {
        reason = `Prossima Scadenza (Data e Km)`;
    } else if (daysUntil <= notifyDaysBefore) {
        reason = `Scadenza Imminente (Data)`;
    } else if (kmUntil <= 3000) {
        reason = `Scadenza Imminente (Km)`;
    }
    
    let status = 'none';
    if (daysUntil < 0 || kmUntil < 0) {
        status = 'overdue';
    } else if (isDue) {
        status = 'imminent';
    }

    return { isDue, daysUntil, kmUntil, reason, status };
}

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

    alerts.sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (a.status !== 'overdue' && b.status === 'overdue') return 1;
        
        const aValue = a.daysUntil < a.kmUntil / 50 ? a.daysUntil : a.kmUntil / 50;
        const bValue = b.daysUntil < b.kmUntil / 50 ? b.daysUntil : b.kmUntil / 50; 
        
        return aValue - bValue;
    });

    return alerts;
}


// ===================================
// GESTIONE TEMA CHIARO/SCURO
// ===================================

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
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
}


// ===================================
// GESTIONE MODALI CON ESC KEY E OVERLAY
// ===================================

class ModalManager {
    constructor() {
        this.activeModals = [];
        this.setupEscKeyListener();
    }

    setupEscKeyListener() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.length > 0) {
                const lastModal = this.activeModals[this.activeModals.length - 1];
                const closeBtn = lastModal.querySelector('.modal-close');
                if (closeBtn) closeBtn.click();
            }
        });
    }

    open(modalElement) {
        if (!this.activeModals.includes(modalElement)) {
            this.activeModals.push(modalElement);
        }
        modalElement.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    close(modalElement) {
        modalElement.classList.remove('show');
        this.activeModals = this.activeModals.filter(m => m !== modalElement);
        if (this.activeModals.length === 0) {
            document.body.style.overflow = 'auto';
        }
    }
}

const modalManager = new ModalManager();


// ===================================
// GESTIONE UI E RENDERING
// ===================================

const totalVehiclesEl = document.getElementById('totalVehicles');
const totalMaintenancesEl = document.getElementById('totalMaintenances');
const completedMaintenancesEl = document.getElementById('completedMaintenances');
const activeAlertsEl = document.getElementById('activeAlerts');
const totalVehiclesLabelEl = document.getElementById('totalVehiclesLabel');
const totalMaintenancesLabelEl = document.getElementById('totalMaintenancesLabel');
const activeAlertsLabelEl = document.getElementById('activeAlertsLabel');
const alertsIconEl = document.getElementById('alertsIcon');
const alertsSectionEl = document.getElementById('alertsSection');
const alertsContainerEl = document.getElementById('alertsContainer');
const vehiclesContainerEl = document.getElementById('vehiclesContainer');
const emptyStateEl = document.getElementById('emptyState');

const dialogAddVehicleEl = document.getElementById('dialogAddVehicle');
const dialogAddMaintenanceEl = document.getElementById('dialogAddMaintenance');
const dialogVehicleDetailsEl = document.getElementById('dialogVehicleDetails');
const dialogEditMaintenanceEl = document.getElementById('dialogEditMaintenance');
const dialogConfirmEl = document.getElementById('dialogConfirm');
const dialogAlertEl = document.getElementById('dialogAlert');

const formAddVehicleEl = document.getElementById('formAddVehicle');
const formAddMaintenanceEl = document.getElementById('formAddMaintenance');
const formEditMaintenanceEl = document.getElementById('formEditMaintenance');
const formUpdateKmEl = document.getElementById('formUpdateKm');


function renderStats() {
    const completedCount = maintenances.filter(m => m.completed).length;
    
    totalVehiclesEl.textContent = vehicles.length;
    totalMaintenancesEl.textContent = maintenances.length;
    completedMaintenancesEl.textContent = completedCount;
    activeAlertsEl.textContent = alerts.length;
    
    totalVehiclesLabelEl.textContent = vehicles.length === 1 ? 'Veicolo' : 'Veicoli';
    totalMaintenancesLabelEl.textContent = maintenances.length === 1 ? 'Manutenzione Totale' : 'Manutenzioni Totali';
    activeAlertsLabelEl.textContent = alerts.length === 1 ? 'Scadenza Attiva' : 'Scadenze Attive';
    
    if (alerts.length > 0) {
        alertsIconEl.className = 'stat-icon stat-icon-red pulse-animation';
        alertsIconEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
    } else {
        alertsIconEl.className = 'stat-icon';
        alertsIconEl.innerHTML = '<i class="fas fa-calendar-check"></i>';
    }
}

function renderAlerts() {
    alertsContainerEl.innerHTML = '';

    if (alerts.length > 0) {
        alertsSectionEl.style.display = 'block';
        
        alerts.forEach(alert => {
            const isOverdue = alert.status === 'overdue';
            const alertCard = document.createElement('div');
            alertCard.className = 'alert-card';
            alertCard.onclick = () => handleViewDetails(alert.vehicle.id);

            alertCard.innerHTML = `
                <div class="alert-icon">
                    <i class="fas fa-${isOverdue ? 'hourglass-end' : 'exclamation-triangle'}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.maintenance.type} - ${alert.vehicle.brand} ${alert.vehicle.model}</h4>
                    <p>Scadenza per: ${alert.reason}</p>
                </div>
                <div class="alert-action">
                    <button class="btn-icon btn-primary" onclick="event.stopPropagation(); handleViewDetails('${alert.vehicle.id}')" aria-label="Vai ai dettagli">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            `;
            alertsContainerEl.appendChild(alertCard);
        });

    } else {
        alertsSectionEl.style.display = 'none';
    }
}

function renderVehicles() {
    vehiclesContainerEl.innerHTML = '';
    
    if (vehicles.length === 0) {
        emptyStateEl.style.display = 'block';
        vehiclesContainerEl.style.display = 'none';
        return;
    }

    emptyStateEl.style.display = 'none';
    vehiclesContainerEl.style.display = 'grid';

    vehicles.sort((a, b) => {
        const aAlerts = alerts.filter(alert => alert.vehicle.id === a.id).length;
        const bAlerts = alerts.filter(alert => alert.vehicle.id === b.id).length;
        
        if (aAlerts > 0 && bAlerts === 0) return -1;
        if (aAlerts === 0 && bAlerts > 0) return 1;
        
        return parseInt(b.id) - parseInt(a.id); 
    });

    vehicles.forEach(vehicle => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);
        const nextMaintenance = vehicleMaintenances
            .filter(m => !m.completed)
            .map(m => checkMaintenanceDue(m, vehicle.currentKm))
            .sort((a, b) => {
                const aValue = a.daysUntil < a.kmUntil / 50 ? a.daysUntil : a.kmUntil / 50; 
                const bValue = b.daysUntil < b.kmUntil / 50 ? b.daysUntil : b.kmUntil / 50; 
                return aValue - bValue;
            })[0];
            
        const nextMaintenanceText = nextMaintenance && nextMaintenance.isDue 
            ? `<span style="color: ${nextMaintenance.status === 'overdue' ? 'var(--danger)' : 'var(--warning)'}; font-weight: 600;">${nextMaintenance.reason}</span>` 
            : 'Nessuna scadenza imminente';
            
        const maintenanceText = vehicleMaintenances.length === 1 ? 'manutenzione' : 'manutenzioni';
        const carIcon = vehicle.model.toLowerCase().includes('moto') || vehicle.model.toLowerCase().includes('scooter') ? 'fa-motorcycle' : 'fa-car';
        
        const vehicleCard = document.createElement('div');
        vehicleCard.className = 'vehicle-card';
        vehicleCard.innerHTML = `
            <div class="vehicle-header">
                <h3><i class="fas ${carIcon}" style="margin-right: 8px;"></i> ${vehicle.brand} ${vehicle.model}</h3>
                <p>Targa: ${vehicle.plate}</p>
                <div class="vehicle-actions-top">
                    <button class="btn-icon" onclick="event.stopPropagation(); handleEditVehicle('${vehicle.id}')" aria-label="Modifica Veicolo">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="event.stopPropagation(); handleDeleteVehicle('${vehicle.id}')" aria-label="Elimina Veicolo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="vehicle-body">
                <div class="vehicle-info">
                    <div class="info-item">
                        <i class="fas fa-calendar-alt"></i> 
                        <span>Anno: ${vehicle.year || 'N/D'}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-cogs"></i> 
                        <span>Prossima Scadenza: ${nextMaintenanceText}</span>
                    </div>
                </div>
                
                <div class="vehicle-card-footer">
                    <div class="vehicle-card-info-item">
                        <i class="fas fa-tachometer-alt"></i> 
                        <span>${(vehicle.currentKm || 0).toLocaleString('it-IT')} km</span>
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
                        <i class="fas fa-plus"></i> Manutenzione
                    </button>
                </div>
            </div>
        `;
        vehiclesContainerEl.appendChild(vehicleCard);
    });
}

async function loadData() {
    [vehicles, maintenances] = await Promise.all([getVehicles(), getMaintenances()]);
    alerts = checkAllMaintenances(vehicles, maintenances);
    renderStats();
    renderAlerts();
    renderVehicles();
}


// ===================================
// GESTIONE EVENTI - VEICOLI
// ===================================

function handleAddVehicle() {
    currentVehicle = null;
    formAddVehicleEl.reset();
    document.getElementById('dialogAddVehicleTitle').textContent = 'Aggiungi Nuovo Veicolo';
    modalManager.open(dialogAddVehicleEl);
}

function handleEditVehicle(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;

    currentVehicle = vehicle;
    document.getElementById('dialogAddVehicleTitle').textContent = `Modifica Veicolo: ${vehicle.brand} ${vehicle.model}`;

    document.getElementById('brand').value = vehicle.brand;
    document.getElementById('model').value = vehicle.model;
    document.getElementById('plate').value = vehicle.plate;
    document.getElementById('year').value = vehicle.year;
    document.getElementById('currentKm').value = vehicle.currentKm;

    modalManager.open(dialogAddVehicleEl);
}

async function handleSaveVehicle(event) {
    event.preventDefault();
    
    const isEditing = currentVehicle !== null;
    const vehicleId = isEditing ? currentVehicle.id : null;
    
    const plateInput = document.getElementById('plate').value.trim();
    if (vehicles.filter(v => v.plate === plateInput && v.id !== vehicleId).length > 0) {
        showAlertDialog('Errore', `La targa '${plateInput}' è già registrata.`);
        return;
    }

    const vehicleData = {
        id: vehicleId,
        brand: document.getElementById('brand').value.trim(),
        model: document.getElementById('model').value.trim(),
        plate: plateInput,
        year: document.getElementById('year').value,
        currentKm: document.getElementById('currentKm').value
    };
    
    const savedVehicle = await saveVehicle(vehicleData);

    if (savedVehicle) {
        modalManager.close(dialogAddVehicleEl);
        await loadData();
    }
}

async function handleDeleteVehicle(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    
    showConfirmDialog(
        'Conferma Eliminazione Veicolo',
        `Sei sicuro di voler eliminare ${vehicle.brand} ${vehicle.model} (Targa: ${vehicle.plate})? Tutte le manutenzioni associate saranno perse.`,
        async () => {
            const success = await deleteVehicle(vehicleId);
            if (success) {
                if (currentVehicle && currentVehicle.id === vehicleId) {
                    modalManager.close(dialogVehicleDetailsEl);
                    currentVehicle = null;
                }
                await loadData();
            }
        }
    );
}


// ===================================
// GESTIONE EVENTI - MANUTENZIONI
// ===================================

function handleAddMaintenance(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;

    currentVehicle = vehicle;
    currentMaintenance = null;
    
    formAddMaintenanceEl.reset();
    
    populateMaintenanceTypeSelect('type');
    document.getElementById('maintenanceVehicleInfo').textContent = `${vehicle.brand} ${vehicle.model} - ${vehicle.plate}`;
    
    modalManager.open(dialogAddMaintenanceEl);
}

function handleEditMaintenance(maintenanceId) {
    const maintenance = maintenances.find(m => m.id === maintenanceId);
    if (!maintenance || !currentVehicle) return;

    currentMaintenance = maintenance;
    
    document.getElementById('dialogEditMaintenanceTitle').textContent = `Modifica Manutenzione: ${maintenance.type}`;
    document.getElementById('editMaintenanceVehicleInfo').textContent = `${currentVehicle.brand} ${currentVehicle.model} - ${currentVehicle.plate}`;

    populateMaintenanceTypeSelect('editType', maintenance.type);
    document.getElementById('editDueDate').value = maintenance.dueDate || '';
    document.getElementById('editDueKm').value = maintenance.dueKm || '';
    document.getElementById('editNotifyDaysBefore').value = maintenance.notifyDaysBefore || '7';
    document.getElementById('editNotes').value = maintenance.notes || '';
    document.getElementById('editCompleted').checked = maintenance.completed;
    
    modalManager.open(dialogEditMaintenanceEl);
}

async function handleSaveMaintenance(event) {
    event.preventDefault();
    
    if (!currentVehicle) return;
    
    const dueDate = document.getElementById('dueDate').value;
    const dueKm = document.getElementById('dueKm').value;

    if (!dueDate && !dueKm) {
        showAlertDialog('Errore', 'Devi specificare almeno una data di scadenza o un chilometraggio di scadenza.');
        return;
    }
    
    const isCompleted = document.getElementById('addCompleted').checked;
    
    const maintenance = {
        vehicleId: currentVehicle.id,
        type: document.getElementById('type').value.trim(),
        dueDate: dueDate,
        dueKm: document.getElementById('dueKm').value ? parseInt(document.getElementById('dueKm').value) : null,
        notifyDaysBefore: parseInt(document.getElementById('notifyDaysBefore').value) || 7,
        notes: document.getElementById('notes').value.trim(),
        completed: isCompleted,
        completedAt: isCompleted ? new Date().toISOString() : null
    };

    if (!maintenance.type) {
        showAlertDialog('Errore', 'Il tipo di manutenzione è obbligatorio.');
        return;
    }

    const savedMaintenance = await saveMaintenance(maintenance);

    if (savedMaintenance) {
        modalManager.close(dialogAddMaintenanceEl);
        await loadData();
        handleViewDetails(currentVehicle.id);
    }
}

async function handleEditSaveMaintenance(event) {
    event.preventDefault();
    
    if (!currentMaintenance || !currentVehicle) return;
    
    const dueDate = document.getElementById('editDueDate').value;
    const dueKm = document.getElementById('editDueKm').value;

    if (!dueDate && !dueKm) {
        showAlertDialog('Errore', 'Devi specificare almeno una data di scadenza o un chilometraggio di scadenza.');
        return;
    }
    
    const isCompleted = document.getElementById('editCompleted').checked;

    const maintenance = {
        ...currentMaintenance,
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
        modalManager.close(dialogEditMaintenanceEl);
        await loadData();
        handleViewDetails(currentVehicle.id);
    }
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


// ===================================
// GESTIONE EVENTI - DETTAGLI VEICOLO
// ===================================

function handleViewDetails(vehicleId) {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return;
    
    currentVehicle = vehicle;
    const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicleId);

    document.getElementById('detailsVehicleName').textContent = `${vehicle.brand} ${vehicle.model}`;
    document.getElementById('detailsVehicleInfo').textContent = `${vehicle.plate} - Anno ${vehicle.year || 'N/D'}`;
    document.getElementById('updateKm').value = vehicle.currentKm || 0;

    const maintenancesListEl = document.getElementById('maintenancesList');
    maintenancesListEl.innerHTML = '';
    const noMaintenanceStateEl = document.getElementById('noMaintenanceState');
    
    if (vehicleMaintenances.length === 0) {
        noMaintenanceStateEl.style.display = 'block';
        maintenancesListEl.style.display = 'none';
    } else {
        noMaintenanceStateEl.style.display = 'none';
        maintenancesListEl.style.display = 'flex';
        
        vehicleMaintenances.sort((a, b) => {
            const aCheck = checkMaintenanceDue(a, vehicle.currentKm);
            const bCheck = checkMaintenanceDue(b, vehicle.currentKm);
            
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            if (a.completed && b.completed) {
                return new Date(b.completedAt) - new Date(a.completedAt);
            }
            
            if (aCheck.status === 'overdue' && bCheck.status !== 'overdue') return -1;
            if (aCheck.status !== 'overdue' && bCheck.status === 'overdue') return 1;
            if (aCheck.status === 'imminent' && bCheck.status === 'none') return -1;
            if (aCheck.status === 'none' && bCheck.status === 'imminent') return 1;

            const aValue = aCheck.daysUntil < aCheck.kmUntil / 50 ? aCheck.daysUntil : aCheck.kmUntil / 50; 
            const bValue = bCheck.daysUntil < bCheck.kmUntil / 50 ? bCheck.daysUntil : bCheck.kmUntil / 50; 
            
            return aValue - bValue;
        });
        
        vehicleMaintenances.forEach(maintenance => {
            const check = checkMaintenanceDue(maintenance, vehicle.currentKm);
            const statusClass = maintenance.completed ? 'completed' : (check.status === 'overdue' ? 'overdue' : (check.status === 'imminent' ? 'imminent' : ''));
            
            const kmText = maintenance.dueKm ? `${maintenance.dueKm.toLocaleString('it-IT')} km` : 'N/D';
            const dateText = maintenance.dueDate ? formatDate(maintenance.dueDate) : 'N/D';
            
            const completionText = maintenance.completed ? `Completata il: ${formatDate(maintenance.completedAt)}` : (check.isDue ? `<span style="color: ${check.status === 'overdue' ? 'var(--danger)' : 'var(--warning)'}; font-weight: 600;">${check.reason}</span>` : `Notifica: ${maintenance.notifyDaysBefore} gg prima`);

            const maintenanceItem = document.createElement('div');
            maintenanceItem.className = `maintenance-item ${statusClass}`;
            maintenanceItem.onclick = () => handleEditMaintenance(maintenance.id);
            maintenanceItem.innerHTML = `
                <div class="maintenance-header">
                    <div class="maintenance-title">${maintenance.type}</div>
                    <div class="maintenance-date">${completionText}</div>
                </div>
                
                <div class="maintenance-details-row">
                    <div class="maintenance-detail-item">
                        <i class="fas fa-calendar-alt"></i> 
                        <span>Data Scadenza: ${dateText}</span>
                    </div>
                    <div class="maintenance-detail-item">
                        <i class="fas fa-tachometer-alt"></i> 
                        <span>Km Scadenza: ${kmText}</span>
                    </div>
                </div>
                
                ${maintenance.notes ? `<p class="maintenance-notes" style="color: var(--text-secondary)">Note: ${maintenance.notes}</p>` : ''}

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

    modalManager.open(dialogVehicleDetailsEl);
}

async function handleUpdateKm(event) {
    event.preventDefault();
    if (!currentVehicle) return;
    
    const newKm = parseInt(document.getElementById('updateKm').value);
    
    if (isNaN(newKm) || newKm < 0) {
        showAlertDialog('Errore', 'Il chilometraggio deve essere un numero positivo.');
        return;
    }
    
    if (newKm < (currentVehicle.currentKm || 0)) {
        showAlertDialog('Errore', 'Il nuovo chilometraggio non può essere inferiore a quello attuale.');
        return;
    }
    
    const updatedVehicle = {
        ...currentVehicle,
        currentKm: newKm
    };

    const savedVehicle = await saveVehicle(updatedVehicle);

    if (savedVehicle) {
        await loadData();
        handleViewDetails(currentVehicle.id); 
    }
}


// ===================================
// FUNZIONI DI SUPPORTO DIALOGS
// ===================================

function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;
    
    const oldBtn = document.getElementById('btnConfirmAction');
    const newBtn = oldBtn.cloneNode(true);
    oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    
    newBtn.addEventListener('click', () => {
        onConfirm();
        modalManager.close(dialogConfirmEl);
    }, { once: true });
    
    modalManager.open(dialogConfirmEl);
}

function showAlertDialog(title, message) {
    document.getElementById('alertDialogTitle').textContent = title;
    document.getElementById('alertDialogMessage').textContent = message;
    modalManager.open(dialogAlertEl);
}


// ===================================
// INIZIALIZZAZIONE APP
// ===================================

const initApp = async () => {
    setTheme(getInitialTheme());
    document.getElementById('themeToggle').addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });

    await loadMaintenanceTypes();
    await loadData(); 
    
    document.getElementById('btnAddVehicle').addEventListener('click', handleAddVehicle);
    document.getElementById('btnAddVehicleEmpty').addEventListener('click', handleAddVehicle);
    
    formAddVehicleEl.addEventListener('submit', handleSaveVehicle);
    formAddMaintenanceEl.addEventListener('submit', handleSaveMaintenance);
    formEditMaintenanceEl.addEventListener('submit', handleEditSaveMaintenance);
    formUpdateKmEl.addEventListener('submit', handleUpdateKm);
    
    document.getElementById('btnCancelAddVehicle').addEventListener('click', () => modalManager.close(dialogAddVehicleEl));
    document.getElementById('btnCancelVehicle').addEventListener('click', () => modalManager.close(dialogAddVehicleEl));
    document.getElementById('btnCancelMaintenance').addEventListener('click', () => modalManager.close(dialogAddMaintenanceEl));
    document.getElementById('btnCancelAddMaintenance').addEventListener('click', () => modalManager.close(dialogAddMaintenanceEl));
    document.getElementById('btnCancelEditMaintenance').addEventListener('click', () => modalManager.close(dialogEditMaintenanceEl));
    document.getElementById('btnCloseDetails').addEventListener('click', () => { 
        modalManager.close(dialogVehicleDetailsEl); 
        currentVehicle = null; 
    });
    
    document.getElementById('btnCloseConfirm').addEventListener('click', () => modalManager.close(dialogConfirmEl));
    document.getElementById('btnCancelConfirm').addEventListener('click', () => modalManager.close(dialogConfirmEl));
    document.getElementById('btnCloseAlert').addEventListener('click', () => modalManager.close(dialogAlertEl));
    document.getElementById('btnCloseAlertAction').addEventListener('click', () => modalManager.close(dialogAlertEl));

    document.getElementById('btnEditVehicleFromDetails').addEventListener('click', () => { 
        if (!currentVehicle) return; 
        modalManager.close(dialogVehicleDetailsEl); 
        setTimeout(() => handleEditVehicle(currentVehicle.id), 300);
    });
    
    document.getElementById('btnDeleteVehicleFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        modalManager.close(dialogVehicleDetailsEl);
        handleDeleteVehicle(currentVehicle.id); 
    });
    
    document.getElementById('btnAddMaintenanceFromDetails').addEventListener('click', () => {
        if (!currentVehicle) return;
        modalManager.close(dialogVehicleDetailsEl);
        setTimeout(() => handleAddMaintenance(currentVehicle.id), 300);
    });
};

document.addEventListener('DOMContentLoaded', initApp);
