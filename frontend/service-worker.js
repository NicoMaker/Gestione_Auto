// service-worker.js - VERSIONE CORRETTA CON LOGICA CONDIZIONALE
// Service Worker per gestire le notifiche push in background

const CACHE_NAME = 'autotrack-v1';
const API_URL = 'http://localhost:3000';

// ===================================
// INSTALLAZIONE E ATTIVAZIONE
// ===================================

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        clients.claim().then(() => {
            console.log('[Service Worker] Claimed all clients');
        })
    );
});

// ===================================
// GESTIONE MESSAGGI DAL CLIENT
// ===================================

self.addEventListener('message', (event) => {
    console.log('[Service Worker] Received message:', event.data);
    
    if (event.data && event.data.type === 'CHECK_MAINTENANCES') {
        console.log('[Service Worker] Starting maintenance check...');
        checkMaintenancesAndNotify();
    }
});

// ===================================
// FUNZIONE PRINCIPALE: CONTROLLO MANUTENZIONI
// ===================================

async function checkMaintenancesAndNotify() {
    try {
        console.log('[Service Worker] Fetching data from API...');
        
        const [vehiclesRes, maintenancesRes] = await Promise.all([
            fetch(`${API_URL}/api/vehicles`),
            fetch(`${API_URL}/api/maintenances`)
        ]);

        if (!vehiclesRes.ok || !maintenancesRes.ok) {
            console.error('[Service Worker] API Error:', {
                vehicles: vehiclesRes.status,
                maintenances: maintenancesRes.status
            });
            return;
        }

        const vehicles = await vehiclesRes.json();
        const maintenances = await maintenancesRes.json();

        console.log(`[Service Worker] Loaded ${vehicles.length} vehicles and ${maintenances.length} maintenances`);

        const sentToday = await getSentNotificationsToday();
        console.log(`[Service Worker] Already sent ${sentToday.length} notifications today`);

        let notificationsSent = 0;

        for (const vehicle of vehicles) {
            const vehicleMaintenances = maintenances.filter(
                m => m.vehicleId === vehicle.id && !m.completed
            );

            console.log(`[Service Worker] Checking ${vehicleMaintenances.length} maintenances for vehicle ${vehicle.brand} ${vehicle.model}`);

            for (const maintenance of vehicleMaintenances) {
                const check = checkMaintenanceDue(maintenance, vehicle.currentKm);
                
                const notificationId = `${maintenance.id}-${new Date().toDateString()}`;
                
                if (check.shouldNotify && !sentToday.includes(notificationId)) {
                    console.log(`[Service Worker] ✅ Sending notification for: ${maintenance.type} - ${vehicle.brand} ${vehicle.model}`);
                    console.log(`[Service Worker] Reason: ${check.reason}`);
                    
                    await sendNotification({
                        vehicle,
                        maintenance,
                        ...check
                    });
                    
                    await markNotificationAsSent(notificationId);
                    notificationsSent++;
                } else if (sentToday.includes(notificationId)) {
                    console.log(`[Service Worker] ⏭️ Skipping (already sent today): ${maintenance.type}`);
                } else {
                    console.log(`[Service Worker] ⏭️ Skipping (not due): ${maintenance.type} - Days: ${check.daysUntil}, Km: ${check.kmUntil}`);
                }
            }
        }

        console.log(`[Service Worker] ✅ Check complete. Sent ${notificationsSent} new notifications.`);

    } catch (error) {
        console.error('[Service Worker] ❌ Error in checkMaintenancesAndNotify:', error);
    }
}

// ===================================
// LOGICA DI CONTROLLO SCADENZE - CORRETTA
// ===================================

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

    // ===== CASO 1: SOLO DATA (nessun km impostato) =====
    if (dueDate && !dueKm) {
        daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 0) {
            // SCADUTO PER DATA
            shouldNotify = true;
            const daysOverdue = Math.abs(daysUntil);
            reason = `SCADUTO da ${daysOverdue} ${daysOverdue === 1 ? 'giorno' : 'giorni'}`;
            status = 'overdue';
        } else if (daysUntil <= notifyDaysBefore) {
            // IN SCADENZA entro i giorni impostati
            shouldNotify = true;
            reason = daysUntil === 0 
                ? '🚨 SCADE OGGI!' 
                : `Scade tra ${daysUntil} ${daysUntil === 1 ? 'giorno' : 'giorni'}`;
            status = 'imminent';
        }
        
        console.log(`[Service Worker] 📅 Only Date Check: ${maintenance.type} - Days until: ${daysUntil}, Notify: ${shouldNotify}`);
    }
    
    // ===== CASO 2: SOLO KM (nessuna data impostata) =====
    else if (!dueDate && dueKm && currentKm !== null && currentKm !== undefined) {
        kmUntil = dueKm - currentKm;
        
        if (kmUntil < 0) {
            // KM SUPERATO
            shouldNotify = true;
            const kmOverdue = Math.abs(kmUntil);
            reason = `KM superato di ${kmOverdue.toLocaleString('it-IT')} km`;
            status = 'overdue';
        } else if (kmUntil <= 3000) {
            // VICINO AL KM (entro 3000 km)
            shouldNotify = true;
            reason = `Mancano ${kmUntil.toLocaleString('it-IT')} km`;
            status = 'imminent';
        }
        
        console.log(`[Service Worker] 🚗 Only KM Check: ${maintenance.type} - KM until: ${kmUntil}, Notify: ${shouldNotify}`);
    }
    
    // ===== CASO 3: SIA DATA CHE KM (entrambi impostati) =====
    else if (dueDate && dueKm && currentKm !== null && currentKm !== undefined) {
        daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        kmUntil = dueKm - currentKm;
        
        let dateNotify = false;
        let kmNotify = false;
        let dateReason = '';
        let kmReason = '';
        
        // Controlla DATA
        if (daysUntil < 0) {
            dateNotify = true;
            const daysOverdue = Math.abs(daysUntil);
            dateReason = `SCADUTO da ${daysOverdue} ${daysOverdue === 1 ? 'giorno' : 'giorni'}`;
            status = 'overdue';
        } else if (daysUntil <= notifyDaysBefore) {
            dateNotify = true;
            dateReason = daysUntil === 0 ? 'SCADE OGGI' : `Scade tra ${daysUntil} ${daysUntil === 1 ? 'giorno' : 'giorni'}`;
            if (status !== 'overdue') status = 'imminent';
        }
        
        // Controlla KM
        if (kmUntil < 0) {
            kmNotify = true;
            const kmOverdue = Math.abs(kmUntil);
            kmReason = `KM superato di ${kmOverdue.toLocaleString('it-IT')} km`;
            status = 'overdue';
        } else if (kmUntil <= 3000) {
            kmNotify = true;
            kmReason = `Mancano ${kmUntil.toLocaleString('it-IT')} km`;
            if (status !== 'overdue') status = 'imminent';
        }
        
        // Notifica se ALMENO UNO dei due è in scadenza
        shouldNotify = dateNotify || kmNotify;
        
        // Combina i motivi
        if (dateNotify && kmNotify) {
            reason = `${dateReason} | ${kmReason}`;
        } else if (dateNotify) {
            reason = dateReason;
        } else if (kmNotify) {
            reason = kmReason;
        }
        
        console.log(`[Service Worker] 📅🚗 Both Checks: ${maintenance.type} - Days: ${daysUntil}, KM: ${kmUntil}, Notify: ${shouldNotify}`);
    }
    
    // ===== CASO 4: NESSUN CRITERIO IMPOSTATO =====
    else {
        console.log(`[Service Worker] ⚠️ No criteria set for: ${maintenance.type}`);
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

// ===================================
// GESTIONE NOTIFICHE INVIATE
// ===================================

async function getSentNotificationsToday() {
    try {
        const cache = await caches.open('notifications-cache');
        const response = await cache.match('sent-today');
        
        if (response) {
            const data = await response.json();
            const today = new Date().toDateString();
            
            if (data.date === today) {
                return data.notifications || [];
            }
        }
    } catch (error) {
        console.error('[Service Worker] Error getting sent notifications:', error);
    }
    return [];
}

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
        console.log(`[Service Worker] ✅ Marked as sent: ${notificationId}`);
    } catch (error) {
        console.error('[Service Worker] Error marking notification:', error);
    }
}

// ===================================
// INVIO NOTIFICA
// ===================================

async function sendNotification(alert) {
    const { vehicle, maintenance, reason, status } = alert;
    
    const title = status === 'overdue' 
        ? '⚠️ Manutenzione SCADUTA!' 
        : '🔔 Manutenzione in Scadenza';
    
    const body = `${maintenance.type}\n${vehicle.brand} ${vehicle.model} (${vehicle.plate})\n\n${reason}`;
    
    const notificationOptions = {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `maintenance-${maintenance.id}`,
        requireInteraction: status === 'overdue',
        vibrate: [200, 100, 200],
        data: {
            vehicleId: vehicle.id,
            maintenanceId: maintenance.id,
            url: '/'
        },
        actions: status === 'overdue' ? [
            { action: 'view', title: 'Vedi Dettagli', icon: '/favicon.ico' },
            { action: 'dismiss', title: 'Chiudi', icon: '/favicon.ico' }
        ] : []
    };

    try {
        await self.registration.showNotification(title, notificationOptions);
        console.log(`[Service Worker] ✅ Notification sent: ${title}`);
    } catch (error) {
        console.error('[Service Worker] ❌ Error sending notification:', error);
    }
}

// ===================================
// GESTIONE CLICK NOTIFICA
// ===================================

self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification clicked:', event.action);
    
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    console.log('[Service Worker] Focusing existing window');
                    return client.focus();
                }
            }
            
            if (clients.openWindow) {
                console.log('[Service Worker] Opening new window');
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

// ===================================
// GESTIONE CHIUSURA NOTIFICA
// ===================================

self.addEventListener('notificationclose', (event) => {
    console.log('[Service Worker] Notification closed:', event.notification.tag);
});

console.log('[Service Worker] Script loaded and ready');