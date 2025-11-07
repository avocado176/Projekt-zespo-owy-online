require('dotenv').config(); // DODAJ NA SAMYM POCZĄTKU

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Połączenie z PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cars_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false }
});

// Middleware autoryzacji
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Access denied. Token required.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        timestamp: new Date().toISOString(),
        status: 403,
        error: 'Forbidden',
        message: 'Invalid token.'
      });
    }
    req.user = user;
    next();
  });
}

// Funkcja walidacji samochodu
function validateCar(carData) {
  const errors = [];

  // Walidacja marki
  if (!carData.brand || carData.brand.trim().length === 0) {
    errors.push({ 
      field: 'brand', 
      code: 'REQUIRED', 
      message: 'Marka jest wymagana' 
    });
  } else if (carData.brand.length < 2 || carData.brand.length > 50) {
    errors.push({ 
      field: 'brand', 
      code: 'INVALID_LENGTH', 
      message: 'Marka musi mieć od 2 do 50 znaków' 
    });
  }

  // Walidacja modelu
  if (!carData.model || carData.model.trim().length === 0) {
    errors.push({ 
      field: 'model', 
      code: 'REQUIRED', 
      message: 'Model jest wymagany' 
    });
  } else if (carData.model.length < 1 || carData.model.length > 50) {
    errors.push({ 
      field: 'model', 
      code: 'INVALID_LENGTH', 
      message: 'Model musi mieć od 1 do 50 znaków' 
    });
  }

  // Walidacja roku
  if (!carData.year) {
    errors.push({ 
      field: 'year', 
      code: 'REQUIRED', 
      message: 'Rok jest wymagany' 
    });
  } else if (carData.year < 1900 || carData.year > new Date().getFullYear() + 1) {
    errors.push({ 
      field: 'year', 
      code: 'INVALID_YEAR', 
      message: `Rok musi być między 1900 a ${new Date().getFullYear() + 1}` 
    });
  }

  // Walidacja ceny
  if (carData.price && carData.price < 0) {
    errors.push({ 
      field: 'price', 
      code: 'INVALID_PRICE', 
      message: 'Cena nie może być ujemna' 
    });
  }

  // Walidacja przebiegu
  if (!carData.mileage && carData.mileage !== 0) {
    errors.push({ 
      field: 'mileage', 
      code: 'REQUIRED', 
      message: 'Przebieg jest wymagany' 
    });
  } else if (carData.mileage < 0) {
    errors.push({ 
      field: 'mileage', 
      code: 'INVALID_MILEAGE', 
      message: 'Przebieg nie może być ujemny' 
    });
  }

  // Walidacja typu paliwa
  if (!carData.fuelType || carData.fuelType.trim().length === 0) {
    errors.push({ 
      field: 'fuelType', 
      code: 'REQUIRED', 
      message: 'Rodzaj paliwa jest wymagany' 
    });
  }

  // Walidacja daty rejestracji
  if (carData.registrationDate) {
    const registrationDate = new Date(carData.registrationDate);
    const today = new Date();
    if (registrationDate > today) {
      errors.push({ 
        field: 'registrationDate', 
        code: 'FUTURE_DATE', 
        message: 'Data rejestracji nie może być z przyszłości' 
      });
    }
  }

  return errors;
}

// Funkcja walidacji użytkownika
function validateUser(userData) {
  const errors = [];

  // Walidacja nazwy użytkownika
  if (!userData.username || userData.username.trim().length === 0) {
    errors.push({ 
      field: 'username', 
      code: 'REQUIRED', 
      message: 'Nazwa użytkownika jest wymagana' 
    });
  } else if (userData.username.length < 3 || userData.username.length > 50) {
    errors.push({ 
      field: 'username', 
      code: 'INVALID_LENGTH', 
      message: 'Nazwa użytkownika musi mieć od 3 do 50 znaków' 
    });
  }

  // Walidacja email
  if (!userData.email || userData.email.trim().length === 0) {
    errors.push({ 
      field: 'email', 
      code: 'REQUIRED', 
      message: 'Email jest wymagany' 
    });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      errors.push({ 
        field: 'email', 
        code: 'INVALID_FORMAT', 
        message: 'Niepoprawny format email' 
      });
    }
  }

  // Walidacja hasła
  if (!userData.password || userData.password.length === 0) {
    errors.push({ 
      field: 'password', 
      code: 'REQUIRED', 
      message: 'Hasło jest wymagane' 
    });
  } else if (userData.password.length < 6) {
    errors.push({ 
      field: 'password', 
      code: 'INVALID_LENGTH', 
      message: 'Hasło musi mieć co najmniej 6 znaków' 
    });
  }

  return errors;
}

// Inicjalizacja bazy danych - POPRAWIONA WERSJA
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Utwórz tabelę cars jeśli nie istnieje
    await client.query(`
      CREATE TABLE IF NOT EXISTS cars (
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
    console.log('✅ Tabela cars utworzona/sprawdzona pomyślnie!');

    // Utwórz tabelę users jeśli nie istnieje
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela users utworzona/sprawdzona pomyślnie!');
    
    client.release();
    console.log('✅ Połączono z PostgreSQL!');
  } catch (err) {
    console.error('❌ Błąd inicjalizacji bazy danych:', err);
  }
}

// PUBLIC ROUTES - dostępne bez logowania

// Strona główna - PUBLIC
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Car Management System API'
  });
});

// Publiczna strona informacyjna - PUBLIC
app.get('/public/info', (req, res) => {
  res.json({ 
    message: 'Witaj w Car Management System!',
    description: 'System do zarządzania flotą samochodów',
    version: '1.0.0',
    features: ['Dodawanie samochodów', 'Edytowanie danych', 'Przeglądanie listy']
  });
});

// Publiczna statystyka - PUBLIC
app.get('/api/public/stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total_cars FROM cars');
    res.json({
      total_cars: parseInt(result.rows[0].total_cars),
      message: 'Public statistics'
    });
  } catch (err) {
    console.error('Błąd pobierania statystyk:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Rejestracja użytkownika - PUBLIC - POPRAWIONA WERSJA
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Walidacja danych
    const validationErrors = validateUser({ username, email, password });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        fieldErrors: validationErrors
      });
    }

    // Sprawdź czy użytkownik już istnieje
    const userExists = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({
        timestamp: new Date().toISOString(),
        status: 409,
        error: 'Conflict',
        message: 'User already exists'
      });
    }

    // Hashowanie hasła
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Zapisz użytkownika
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Błąd rejestracji:', err.message);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Registration error'
    });
  }
});

// Logowanie użytkownika - PUBLIC
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Username and password are required'
      });
    }

    // Znajdź użytkownika
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        status: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    // Sprawdź hasło
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        status: 401,
        error: 'Unauthorized', 
        message: 'Invalid credentials'
      });
    }

    // Generuj token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Błąd logowania:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// PROTECTED ROUTES - wymagają logowania

// Pobierz wszystkie samochody - PROTECTED
app.get('/api/cars', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Błąd pobierania samochodów:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Pobierz jeden samochód po ID - PROTECTED
app.get('/api/cars/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: 'Samochód nie znaleziony'
      });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Błąd pobierania samochodu:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Dodaj nowy samochód - PROTECTED
app.post('/api/cars', authenticateToken, async (req, res) => {
  try {
    const { brand, model, year, price, registrationDate, mileage, fuelType } = req.body;
    
    // Walidacja danych
    const validationErrors = validateCar({ brand, model, year, price, registrationDate, mileage, fuelType });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        fieldErrors: validationErrors
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
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Zaktualizuj samochód - PROTECTED
app.put('/api/cars/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, year, price, registrationDate, mileage, fuelType } = req.body;

    // Walidacja danych
    const validationErrors = validateCar({ brand, model, year, price, registrationDate, mileage, fuelType });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        fieldErrors: validationErrors
      });
    }

    const result = await pool.query(
      `UPDATE cars 
       SET brand=$1, model=$2, year=$3, price=$4, registrationDate=$5, mileage=$6, fuelType=$7 
       WHERE id=$8 
       RETURNING *`,
      [brand, model, year, price, registrationDate, mileage, fuelType, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: 'Samochód nie znaleziony'
      });
    }

    res.json({ 
      message: 'Samochód zaktualizowano pomyślnie!',
      car: result.rows[0]
    });
  } catch (err) {
    console.error('Błąd aktualizacji samochodu:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Usuń samochód - PROTECTED
app.delete('/api/cars/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM cars WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: 'Samochód nie znaleziony'
      });
    }

    res.json({ 
      message: 'Samochód usunięto pomyślnie!',
      car: result.rows[0]
    });
  } catch (err) {
    console.error('Błąd usuwania samochodu:', err);
    res.status(500).json({ 
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Błąd serwera'
    });
  }
});

// Inicjalizacja i start serwera
const PORT = process.env.PORT || 3000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
    console.log(`📊 Środowisko: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Authentication: ENABLED`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  });
});
