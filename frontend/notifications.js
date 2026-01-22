// notifications.js
// Gestione delle notifiche push per AutoTrack - VERSIONE COMPLETA

class NotificationManager {
    constructor() {
        this.registration = null;
        this.checkInterval = null;
        // Controlla ogni 30 minuti (puoi modificare)
        this.CHECK_INTERVAL_MS = 30 * 60 * 1000;
    }

    // Inizializza il sistema di notifiche
    async initialize() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker non supportato in questo browser');
            return false;
        }

        if (!('Notification' in window)) {
            console.warn('Notifiche non supportate in questo browser');
            return false;
        }

        try {
            // Registra il service worker
            this.registration = await navigator.serviceWorker.register('/service-worker.js');
            console.log('✅ Service Worker registrato con successo');

            // Attendi che il service worker sia attivo
            await navigator.serviceWorker.ready;

            // Controlla se ci sono permessi
            await this.checkPermissionStatus();

            return true;
        } catch (error) {
            console.error('❌ Errore nella registrazione del Service Worker:', error);
            return false;
        }
    }

    // Controlla lo stato dei permessi
    async checkPermissionStatus() {
        if (!('Notification' in window)) return 'unsupported';
        
        const permission = Notification.permission;
        
        // Se i permessi sono già garantiti, avvia il controllo periodico
        if (permission === 'granted') {
            this.startPeriodicCheck();
        }
        
        return permission;
    }

    // Richiedi permessi per le notifiche
    async requestPermission() {
        if (!('Notification' in window)) {
            return { 
                success: false, 
                message: 'Le notifiche non sono supportate dal tuo browser.' 
            };
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Permessi notifiche concessi');
                this.startPeriodicCheck();
                
                // Invia una notifica di test
                await this.sendTestNotification();
                
                return { 
                    success: true, 
                    message: 'Notifiche attivate! Riceverai avvisi quando le manutenzioni sono in scadenza (entro i giorni di preavviso impostati).' 
                };
            } else if (permission === 'denied') {
                console.log('❌ Permessi notifiche negati');
                return { 
                    success: false, 
                    message: 'Permesso negato. Puoi attivare le notifiche manualmente dalle impostazioni del browser (icona lucchetto nella barra degli indirizzi).' 
                };
            } else {
                console.log('⚠️ Permessi notifiche non concessi');
                return { 
                    success: false, 
                    message: 'Permesso non concesso. Riprova più tardi.' 
                };
            }
        } catch (error) {
            console.error('❌ Errore nella richiesta dei permessi:', error);
            return { 
                success: false, 
                message: 'Errore nella richiesta dei permessi per le notifiche.' 
            };
        }
    }

    // Invia una notifica di test
    async sendTestNotification() {
        if (Notification.permission !== 'granted') return;

        try {
            if (this.registration) {
                await this.registration.showNotification('🚗 AutoTrack - Notifiche Attive', {
                    body: 'Perfetto! Ti avviseremo quando le tue manutenzioni sono in scadenza.',
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'test-notification',
                    requireInteraction: false,
                    vibrate: [200, 100, 200],
                    silent: false
                });
                console.log('✅ Notifica di test inviata');
            }
        } catch (error) {
            console.error('❌ Errore nell\'invio della notifica di test:', error);
        }
    }

    // Avvia il controllo periodico delle manutenzioni
    startPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        // Controllo immediato
        this.checkMaintenances();

        // Controllo periodico
        this.checkInterval = setInterval(() => {
            console.log('🔔 Controllo periodico manutenzioni in corso...');
            this.checkMaintenances();
        }, this.CHECK_INTERVAL_MS);

        const minutes = this.CHECK_INTERVAL_MS / 60000;
        console.log(`✅ Controllo periodico avviato (ogni ${minutes} minuti)`);
    }

    // Ferma il controllo periodico
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('⏹️ Controllo periodico fermato');
        }
    }

    // Controlla le manutenzioni e invia notifiche
    async checkMaintenances() {
        if (Notification.permission !== 'granted') {
            console.log('⚠️ Permessi notifiche non concessi, salto il controllo');
            return;
        }

        try {
            // Invia messaggio al service worker per controllare
            if (this.registration && this.registration.active) {
                this.registration.active.postMessage({
                    type: 'CHECK_MAINTENANCES'
                });
                console.log('📤 Messaggio inviato al Service Worker per controllo manutenzioni');
            } else {
                console.warn('⚠️ Service Worker non attivo');
            }
        } catch (error) {
            console.error('❌ Errore nel controllo delle manutenzioni:', error);
        }
    }

    // Ottieni lo stato delle notifiche
    getNotificationStatus() {
        if (!('Notification' in window)) {
            return {
                supported: false,
                permission: 'unsupported',
                enabled: false,
                checkInterval: null
            };
        }

        const permission = Notification.permission;
        
        return {
            supported: true,
            permission: permission,
            enabled: permission === 'granted' && this.checkInterval !== null,
            checkInterval: this.CHECK_INTERVAL_MS / 60000 + ' minuti'
        };
    }

    // Disattiva le notifiche
    disable() {
        this.stopPeriodicCheck();
        console.log('🔕 Notifiche disattivate (i permessi del browser rimangono)');
    }

    // Test manuale - Forza un controllo immediato
    async testNow() {
        console.log('🧪 Test manuale notifiche...');
        await this.checkMaintenances();
    }
}

// Esporta un'istanza singleton
const notificationManager = new NotificationManager();

// Inizializza automaticamente quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        notificationManager.initialize();
    });
} else {
    notificationManager.initialize();
}

// Rendi disponibile globalmente per debug
window.notificationManager = notificationManager;

console.log('📱 NotificationManager caricato e pronto');