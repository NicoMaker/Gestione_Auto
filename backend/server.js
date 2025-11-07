// server.js
const express = require("express");
const path = require("path");
const { getDB } = require("./database"); // Importa la funzione di connessione al DB

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json()); // Per parsare il body delle richieste JSON
// Serve i file statici (index.html, script.js, styles.css) dalla radice del progetto
app.use(express.static(path.join(__dirname, "../frontend")));

// Funzione per mappare i risultati del DB al formato frontend (ID da numerico a stringa)
const mapVehicleToFrontend = (vehicle) => ({
  ...vehicle, // Converte l'ID da numero (DB) a stringa (vecchia logica frontend)
  id: vehicle.id.toString(),
  currentKm: vehicle.currentKm || 0,
});

const mapMaintenanceToFrontend = (maintenance) => ({
  ...maintenance,
  id: maintenance.id.toString(),
  vehicleId: maintenance.vehicleId.toString(),
  completed: Boolean(maintenance.completed),
});

// ===================================
// API Endpoints per i VEICOLI (CRUD)
// ===================================

// GET /api/vehicles - Ottieni tutti i veicoli
app.get("/api/vehicles", async (req, res) => {
  try {
    const db = await getDB();
    const vehicles = await db.all("SELECT * FROM vehicles");
    res.json(vehicles.map(mapVehicleToFrontend));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero dei veicoli." });
  }
});

// POST /api/vehicles - Crea un nuovo veicolo
app.post("/api/vehicles", async (req, res) => {
  const { brand, model, plate, year, currentKm } = req.body;
  const createdAt = new Date().toISOString();
  try {
    const db = await getDB();
    const result = await db.run(
      "INSERT INTO vehicles (brand, model, plate, year, currentKm, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [brand, model, plate.toUpperCase(), year, currentKm || 0, createdAt]
    );
    const newVehicle = await db.get(
      "SELECT * FROM vehicles WHERE id = ?",
      result.lastID
    );
    res.status(201).json(mapVehicleToFrontend(newVehicle));
  } catch (err) {
    console.error(err);
    if (err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "Targa già esistente." });
    } else {
      res.status(500).json({ error: "Errore nella creazione del veicolo." });
    }
  }
});

// PUT /api/vehicles/:id - Aggiorna un veicolo (incluse modifiche/km)
app.put("/api/vehicles/:id", async (req, res) => {
  const { id } = req.params;
  const { brand, model, plate, year, currentKm } = req.body;
  try {
    const db = await getDB();
    const result = await db.run(
      "UPDATE vehicles SET brand = ?, model = ?, plate = ?, year = ?, currentKm = ? WHERE id = ?",
      [brand, model, plate.toUpperCase(), year, currentKm, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Veicolo non trovato." });
    }

    const updatedVehicle = await db.get(
      "SELECT * FROM vehicles WHERE id = ?",
      id
    );
    res.json(mapVehicleToFrontend(updatedVehicle));
  } catch (err) {
    console.error(err);
    if (err.message.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "Targa già esistente." });
    } else {
      res.status(500).json({ error: "Errore nell'aggiornamento del veicolo." });
    }
  }
});

// DELETE /api/vehicles/:id - Elimina un veicolo E le sue manutenzioni associate
app.delete("/api/vehicles/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB(); // 1. Elimina tutte le manutenzioni associate al veicolo (ottima mossa!)

    await db.run("DELETE FROM maintenances WHERE vehicleId = ?", id); // 2. Elimina il veicolo

    const result = await db.run("DELETE FROM vehicles WHERE id = ?", id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Veicolo non trovato." });
    }

    res.status(204).send(); // No Content
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error:
          "Errore nell'eliminazione del veicolo e/o delle manutenzioni associate.",
      });
  }
});

// =========================================
// API Endpoints per le MANUTENZIONI GLOBALI (CRUD)
// =========================================

// GET /api/maintenances - Ottieni tutte le manutenzioni
app.get("/api/maintenances", async (req, res) => {
  try {
    const db = await getDB();
    const maintenances = await db.all("SELECT * FROM maintenances");
    res.json(maintenances.map(mapMaintenanceToFrontend));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Errore nel recupero delle manutenzioni." });
  }
});

// POST /api/maintenances - Aggiungi una nuova manutenzione (DEPRECATO: usa l'endpoint specifico del veicolo)
// Mantenuto per compatibilità, ma è meglio usare il percorso nidificato.
app.post("/api/maintenances", async (req, res) => {
  // vehicleId DEVE essere un intero per il DB, gli altri campi parzialmente facoltativi
  const {
    vehicleId,
    type,
    dueDate,
    dueKm,
    notifyDaysBefore,
    notes,
    completed,
  } = req.body;
  const createdAt = new Date().toISOString();
  const completedVal = completed ? 1 : 0;
  const dueKmVal = dueKm ? parseInt(dueKm) : null;
  const notifyDaysBeforeVal = notifyDaysBefore ? parseInt(notifyDaysBefore) : 7;

  try {
    const db = await getDB(); // Verifica che il vehicleId esista
    const vehicle = await db.get(
      "SELECT id FROM vehicles WHERE id = ?",
      parseInt(vehicleId)
    );
    if (!vehicle) {
      return res
        .status(404)
        .json({
          error: "Veicolo non trovato. Impossibile associare la manutenzione.",
        });
    }

    const result = await db.run(
      "INSERT INTO maintenances (vehicleId, type, dueDate, dueKm, notifyDaysBefore, notes, completed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        parseInt(vehicleId),
        type,
        dueDate,
        dueKmVal,
        notifyDaysBeforeVal,
        notes,
        completedVal,
        createdAt,
      ]
    );
    const newMaintenance = await db.get(
      "SELECT * FROM maintenances WHERE id = ?",
      result.lastID
    );
    res.status(201).json(mapMaintenanceToFrontend(newMaintenance));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Errore nella creazione della manutenzione." });
  }
});

// PUT /api/maintenances/:id - Aggiorna una manutenzione (inclusa la marcatura come completata)
app.put("/api/maintenances/:id", async (req, res) => {
  const { id } = req.params;
  const {
    type,
    dueDate,
    dueKm,
    notifyDaysBefore,
    notes,
    completed,
    completedAt,
  } = req.body; // I valori devono essere preparati per il DB (numeri/booleani)
  const completedVal = completed ? 1 : 0;
  const dueKmVal = dueKm ? parseInt(dueKm) : null; // Se la manutenzione è completata, usa la data fornita, altrimenti metti null
  const completedAtVal = completed
    ? completedAt || new Date().toISOString()
    : null;
  const notifyDaysBeforeVal = notifyDaysBefore ? parseInt(notifyDaysBefore) : 7;

  try {
    const db = await getDB();
    const result = await db.run(
      "UPDATE maintenances SET type = ?, dueDate = ?, dueKm = ?, notifyDaysBefore = ?, notes = ?, completed = ?, completedAt = ? WHERE id = ?",
      [
        type,
        dueDate,
        dueKmVal,
        notifyDaysBeforeVal,
        notes,
        completedVal,
        completedAtVal,
        id,
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: "Manutenzione non trovata." });
    }

    const updatedMaintenance = await db.get(
      "SELECT * FROM maintenances WHERE id = ?",
      id
    );
    res.json(mapMaintenanceToFrontend(updatedMaintenance));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Errore nell'aggiornamento della manutenzione." });
  }
});

// DELETE /api/maintenances/:id - Elimina una manutenzione
app.delete("/api/maintenances/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB();
    const result = await db.run("DELETE FROM maintenances WHERE id = ?", id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Manutenzione non trovata." });
    }

    res.status(204).send(); // No Content
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Errore nell'eliminazione della manutenzione." });
  }
});

// ==========================================================
// NUOVI API Endpoints per le MANUTENZIONI per SINGOLO VEICOLO
// (RESTful Nidificato)
// ==========================================================

// GET /api/vehicles/:vehicleId/maintenances - Ottieni le manutenzioni di un veicolo
app.get("/api/vehicles/:vehicleId/maintenances", async (req, res) => {
  const { vehicleId } = req.params;
  try {
    const db = await getDB();
    const maintenances = await db.all(
      "SELECT * FROM maintenances WHERE vehicleId = ?",
      vehicleId
    );

    if (maintenances.length === 0) {
      // Qui, potremmo voler controllare se il veicolo esiste. Per semplicità, restituiamo un array vuoto se non ci sono manutenzioni, il che è standard per GET su collezioni vuote.
      const vehicleCheck = await db.get(
        "SELECT id FROM vehicles WHERE id = ?",
        vehicleId
      );
      if (!vehicleCheck) {
        return res.status(404).json({ error: "Veicolo non trovato." });
      }
    }
    res.json(maintenances.map(mapMaintenanceToFrontend));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        error: `Errore nel recupero delle manutenzioni per il veicolo ${vehicleId}.`,
      });
  }
});

// POST /api/vehicles/:vehicleId/maintenances - Aggiungi una nuova manutenzione per quel veicolo
app.post("/api/vehicles/:vehicleId/maintenances", async (req, res) => {
  const { vehicleId } = req.params; // vehicleId è preso da req.params, non da req.body
  const { type, dueDate, dueKm, notifyDaysBefore, notes, completed } = req.body;
  const createdAt = new Date().toISOString();
  const completedVal = completed ? 1 : 0;
  const dueKmVal = dueKm ? parseInt(dueKm) : null;
  const notifyDaysBeforeVal = notifyDaysBefore ? parseInt(notifyDaysBefore) : 7;

  try {
    const db = await getDB(); // 1. Verifica che il vehicleId esista
    const vehicle = await db.get(
      "SELECT id FROM vehicles WHERE id = ?",
      vehicleId
    );
    if (!vehicle) {
      return res
        .status(404)
        .json({
          error: "Veicolo non trovato. Impossibile associare la manutenzione.",
        });
    } // 2. Inserisci la manutenzione

    const result = await db.run(
      "INSERT INTO maintenances (vehicleId, type, dueDate, dueKm, notifyDaysBefore, notes, completed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        parseInt(vehicleId),
        type,
        dueDate,
        dueKmVal,
        notifyDaysBeforeVal,
        notes,
        completedVal,
        createdAt,
      ]
    );
    const newMaintenance = await db.get(
      "SELECT * FROM maintenances WHERE id = ?",
      result.lastID
    );
    res.status(201).json(mapMaintenanceToFrontend(newMaintenance));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Errore nella creazione della manutenzione." });
  }
});

// Nota: PUT e DELETE per le manutenzioni individuali (/api/maintenances/:id) rimangono validi e generici, poiché l'ID della manutenzione è unico.

// Avvia il server
app.listen(PORT, async () => {
  // Inizializza il DB prima di accettare richieste
  try {
    await getDB();
    console.log(`Server in ascolto su http://localhost:${PORT}`); // Conferma che l'index viene servito alla radice 127.0.0.1:3000
    console.log(`Apri http://127.0.0.1:${PORT} nel tuo browser per iniziare.`);
  } catch (error) {
    console.error("ERRORE CRITICO ALL'AVVIO:", error.message);
    process.exit(1); // Esci se il DB non si avvia
  }
});
