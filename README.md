# System Zarządzania Samochodami

## Opis
Aplikacja CRUD do zarządzania samochodami.

## Technologie
- **Backend**: Node.js + Express + MySQL
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Baza danych**: MySQL

## Instrukcja uruchomienia

### 1. Uruchomienie Backend
```bash
cd C:\xampp\htdocs\project\backend
npm install express mysql2 cors
node server.js
```

Serwer uruchomi się na [http://localhost:3000](http://localhost:3000)

### 2. Uruchomienie Frontend
Otwórz plik frontend/index.html w przeglądarce

### 3. Konfiguracja bazy danych
Uruchom XAMPP (Apache + MySQL)

Utwórz bazę danych cars_db

Wykonaj SQL do utworzenia tabeli:
```sql
CREATE TABLE cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  brand VARCHAR(100),
  model VARCHAR(100),
  year INT,
  price DECIMAL(10,2),
  registrationDate DATE,
  mileage INT NOT NULL,
  fuelType VARCHAR(50) NOT NULL
);
```

## Endpointy API
- `GET /cars` - pobierz wszystkie samochody
- `POST /cars` - dodaj nowy samochód
- `PUT /cars/:id` - zaktualizuj samochód
- `DELETE /cars/:id` - usuń samochód



## Struktura projektu

project/
├── backend/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── index.html
│   └── app.js
└── README.md


# Car Management System 🚗

System zarządzania flotą samochodów z pełną autentykacją i walidacją danych.

## 🌐 Adresy środowisk

- **Produkcja**: https://projekt-zespo-owy-online.onrender.com

## 🚀 Funkcjonalności

- ✅ Rejestracja i logowanie użytkowników
- ✅ Pełny CRUD dla samochodów
- ✅ Walidacja danych po stronie UI i backendu
- ✅ Statystyki publiczne dostępne bez logowania
- ✅ Autoryzacja JWT tokenów

## 🧪 Testowanie

### Uruchomienie testów lokalnie:
```bash
npm test

## Autor
[Roman Drohomyretskyi 66719]


Text do testowania PR



