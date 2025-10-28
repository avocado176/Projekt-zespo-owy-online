const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Połączenie z PostgreSQL (Render.com dostarcza DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cars_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicjalizacja bazy danych
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Sprawdź czy tabela cars istnieje
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'cars'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Utwórz tabelę jeśli nie istnieje
      await client.query(`
        CREATE TABLE cars (
          id SERIAL PRIMARY KEY,
          brand VARCHAR(100) NOT NULL,
          model VARCHAR(100) NOT NULL,
          year INTEGER NOT NULL,
          price DECIMAL(10,2),
          registrationDate DATE,
          mileage INTEGER NOT NULL,
          fuelType VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabela cars utworzona pomyślnie!');
    }
    
    client.release();
    console.log('✅ Połączono z PostgreSQL!');
  } catch (err) {
    console.error('❌ Błąd inicjalizacji bazy danych:', err);
  }
}

// Trasa dla frontendu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Pobierz wszystkie samochody
app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd pobierania samochodów:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Pobierz jeden samochód po ID
app.get('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Samochód nie znaleziony' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Błąd pobierania samochodu:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Dodaj nowy samochód
app.post('/api/cars', async (req, res) => {
  try {
    const { brand, model, year, price, registrationDate, mileage, fuelType } = req.body;
    
    // Walidacja
    if (!brand || !model || !year || !mileage || !fuelType) {
      return res.status(400).json({ 
        error: 'Marka, model, rok, przebieg i typ paliwa są wymagane' 
      });
    }

    const result = await pool.query(
      `INSERT INTO cars (brand, model, year, price, registrationDate, mileage, fuelType) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [brand, model, year, price, registrationDate, mileage, fuelType]
    );

    res.status(201).json({
      message: 'Samochód dodano pomyślnie!',
      car: result.rows[0]
    });
  } catch (err) {
    console.error('Błąd dodawania samochodu:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Zaktualizuj samochód
app.put('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, year, price, registrationDate, mileage, fuelType } = req.body;

    const result = await pool.query(
      `UPDATE cars 
       SET brand=$1, model=$2, year=$3, price=$4, registrationDate=$5, mileage=$6, fuelType=$7 
       WHERE id=$8 
       RETURNING *`,
      [brand, model, year, price, registrationDate, mileage, fuelType, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Samochód nie znaleziony' });
    }

    res.json({ 
      message: 'Samochód zaktualizowano pomyślnie!',
      car: result.rows[0]
    });
  } catch (err) {
    console.error('Błąd aktualizacji samochodu:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Usuń samochód
app.delete('/api/cars/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cars WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Samochód nie znaleziony' });
    }

    res.json({ 
      message: 'Samochód usunięto pomyślnie!',
      car: result.rows[0]
    });
  } catch (err) {
    console.error('Błąd usuwania samochodu:', err);
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

// Inicjalizacja i start serwera
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
    console.log(`📊 Środowisko: ${process.env.NODE_ENV || 'development'}`);
  });
});