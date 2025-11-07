// database.js
const { Database } = require('sqlite-async'); 
const path = require('path'); // Necessario per gestire i percorsi dei file

// DEFINIZIONE DEL PERCORSO: Crea una cartella 'db' nella radice del progetto
// e salva lì il file 'gestione_auto.db'
const DB_FOLDER = 'db';
const DB_FILE = path.join(__dirname, DB_FOLDER, 'gestione_auto.db');

/**
 * Inizializza il database SQLite e crea le tabelle.
 */
async function initializeDB() {
    try {
        // 1. Assicurati che la cartella 'db' esista
        const fs = require('fs/promises'); // Usiamo fs/promises per mkdir
        const dbFolderPath = path.join(__dirname, DB_FOLDER);
        // { recursive: true } assicura che non fallisca se la cartella esiste già
        await fs.mkdir(dbFolderPath, { recursive: true });
        
        // 2. Connessione al database (che ora sarà creato in ./db/gestione_auto.db)
        const db = await Database.open(DB_FILE); 

        // Tabella VEICOLI
        await db.run(`
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand TEXT NOT NULL,
                model TEXT NOT NULL,
                plate TEXT UNIQUE NOT NULL,
                year INTEGER,
                currentKm INTEGER DEFAULT 0,
                createdAt TEXT NOT NULL
            )
        `);

        // Tabella MANUTENZIONI
        await db.run(`
            CREATE TABLE IF NOT EXISTS maintenances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicleId INTEGER NOT NULL,
                type TEXT NOT NULL,
                dueDate TEXT NOT NULL,
                dueKm INTEGER,
                notifyDaysBefore INTEGER DEFAULT 7,
                notes TEXT,
                completed INTEGER DEFAULT 0,
                completedAt TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
            )
        `);
        // L'opzione 'ON DELETE CASCADE' qui è fondamentale!
        // Significa che eliminando un veicolo, le manutenzioni associate vengono rimosse automaticamente dal DB.

        console.log(`Database (gestione_auto.db) creato o già esistente nella cartella /${DB_FOLDER}.`);
        return db;

    } catch (error) {
        console.error('Errore durante l\'inizializzazione del database:', error);
        throw error;
    }
}

// Funzione helper per ottenere l'istanza del DB (Singleton Pattern)
let dbInstance = null;
async function getDB() {
    if (!dbInstance) {
        dbInstance = await initializeDB();
    }
    return dbInstance;
}

module.exports = {
    getDB
};