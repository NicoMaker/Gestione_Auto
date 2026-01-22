// service-worker.js
// Service Worker per gestire le notifiche push in background

const CACHE_NAME = 'autotrack-v1';
const API_URL = 'http://localhost:3000';

// Installa il service worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

// Attiva il service worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(clients.claim());
});

// Gestisce i messaggi dal client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CHECK_MAINTENANCES') {
        checkMaintenancesAndNotify();
    }
});

// Controlla le manutenzioni e invia notifiche
async function checkMaintenancesAndNotify() {
    try {
        const [vehiclesRes, maintenancesRes] = await Promise.all([
            fetch(`${API_URL}/api/vehicles`),
            fetch(`${API_URL}/api/maintenances`)
        ]);

        if (!vehiclesRes.ok || !maintenancesRes.ok) {
            console.error('[Service Worker] Errore nel recupero dei dati');
            return;
        }

        const vehicles = await vehiclesRes.json();
        const maintenances = await maintenancesRes.json();

        // Ottieni la lista delle notifiche già inviate oggi
        const sentToday = await getSentNotificationsToday();

        // Controlla ogni veicolo
        for (const vehicle of vehicles) {
            const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id && !m.completed);

            for (const maintenance of vehicleMaintenances) {
                const check = checkMaintenanceDue(maintenance, vehicle.currentKm);
                
                // Crea un ID univoco per questa notifica
                const notificationId = `${maintenance.id}-${new Date().toDateString()}`;
                
                // Invia notifica solo se:
                // 1. È in scadenza secondo i parametri impostati
                // 2. Non è stata già inviata oggi
                if (check.shouldNotify && !sentToday.includes(notificationId)) {
                    await sendNotification({
                        vehicle,
                        maintenance,
                        ...check
                    });
                    
                    // Salva che abbiamo inviato questa notifica
                    await markNotificationAsSent(notificationId);
                }
            }
        }
    } catch (error) {
        console.error('[Service Worker] Errore nel controllo manutenzioni:', error);
    }
}

// Ottieni le notifiche già inviate oggi
async function getSentNotificationsToday() {
    try {
        const cache = await caches.open('notifications-cache');
        const response = await cache.match('sent-today');
        if (response) {
            const data = await response.json();
            const today = new Date().toDateString();
            
            // Controlla se i dati sono di oggi
            if (data.date === today) {
                return data.notifications || [];
            }
        }
    } catch (error) {
        console.error('[Service Worker] Errore nel recupero notifiche inviate:', error);
    }
    return [];
}

// Segna una notifica come inviata
async function markNotificationAsSent(notificationId) {
    try {
        const cache = await caches.open('notifications-cache');
        const sent = await getSentNotificationsToday();
        sent.push(notificationId);
        
        const data = {
            date: new Date().toDateString(),
            notifications: sent
        };
        
        await cache.put('sent-today', new Response(JSON.stringify(data)));
    } catch (error) {
        console.error('[Service Worker] Errore nel salvataggio notifica:', error);
    }
}

// Funzione per controllare le manutenzioni (basata sui giorni/km di preavviso)
function checkMaintenanceDue(maintenance, currentKm) {
    const now = new Date();
    const dueDate = maintenance.dueDate ? new Date(maintenance.dueDate + 'T00:00:00') : null;
    const dueKm = maintenance.dueKm;
    const notifyDaysBefore = maintenance.notifyDaysBefore || 7;

    let shouldNotify = false;
    let reason = '';
    let kmUntil = null;
    let daysUntil = Infinity;
    let status = 'none';

    // CONTROLLO DATA
    if (dueDate) {
        daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 0) {
            // SCADUTO
            shouldNotify = true;
            const daysOverdue = Math.abs(daysUntil);
            reason = `SCADUTO da ${daysOverdue} ${daysOverdue === 1 ? 'giorno' : 'giorni'}`;
            status = 'overdue';
        } else if (daysUntil <= notifyDaysBefore) {
            // IN SCADENZA entro i giorni di preavviso impostati
            shouldNotify = true;
            reason = daysUntil === 0 
                ? 'SCADE OGGI!' 
                : `Scade tra ${daysUntil} ${daysUntil === 1 ? 'giorno' : 'giorni'}`;
            status = 'imminent';
        }
    }

    // CONTROLLO KM
    if (dueKm !== null && dueKm !== undefined && currentKm !== null && currentKm !== undefined) {
        kmUntil = dueKm - currentKm;
        
        if (kmUntil < 0) {
            // SUPERATO IL KM
            shouldNotify = true;
            const kmOverdue = Math.abs(kmUntil);
            const kmText = `KM superato di ${kmOverdue.toLocaleString('it-IT')} km`;
            reason = reason ? `${reason} | ${kmText}` : kmText;
            status = 'overdue';
        } else if (kmUntil <= 3000) {
            // VICINO AL KM DI SCADENZA (entro 3000 km)
            shouldNotify = true;
            const kmText = `Mancano ${kmUntil.toLocaleString('it-IT')} km`;
            reason = reason ? `${reason} | ${kmText}` : kmText;
            if (status !== 'overdue') status = 'imminent';
        }
    }

    return { 
        shouldNotify, 
        daysUntil, 
        kmUntil, 
        reason, 
        status,
        notifyDaysBefore 
    };
}

function checkAllMaintenances(vehicles, maintenances) {
    const alerts = [];

    vehicles.forEach(vehicle => {
        const vehicleMaintenances = maintenances.filter(m => m.vehicleId === vehicle.id);

        vehicleMaintenances.forEach(maintenance => {
            if (maintenance.completed) return;

            const check = checkMaintenanceDue(maintenance, vehicle.currentKm);

            if (check.shouldNotify) {
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

// Invia una notifica
async function sendNotification(alert) {
    const { vehicle, maintenance, reason, status } = alert;
    
    const title = status === 'overdue' ? '⚠️ Manutenzione Scaduta!' : '🔔 Manutenzione in Scadenza';
    const body = `${maintenance.type} - ${vehicle.brand} ${vehicle.model}\n${reason}`;
    const icon = '/favicon.ico'; // Assicurati di avere un'icona nella root
    const badge = '/badge.png'; // Icona piccola per Android
    
    const notificationOptions = {
        body: body,
        icon: icon,
        badge: badge,
        tag: `maintenance-${maintenance.id}`,
        requireInteraction: status === 'overdue',
        vibrate: [200, 100, 200],
        data: {
            vehicleId: vehicle.id,
            maintenanceId: maintenance.id,
            url: '/'
        }
    };

    try {
        await self.registration.showNotification(title, notificationOptions);
    } catch (error) {
        console.error('[Service Worker] Errore nell\'invio della notifica:', error);
    }
}

// Gestisce il click sulla notifica
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se c'è già una finestra aperta, la focalizza
            for (const client of clientList) {
                if ('focus' in client) {
                    return client.focus();
                }
            }
            // Altrimenti apre una nuova finestra
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});