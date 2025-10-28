// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

let currentEditingId = null;

// Załaduj wszystkie samochody
async function loadCars() {
    try {
        const response = await fetch(`${API_URL}/cars`);
        if (!response.ok) throw new Error('Błąd sieci');
        const cars = await response.json();
        displayCars(cars);
    } catch (error) {
        console.error('Błąd ładowania:', error);
        showError('Nie udało się załadować listy samochodów: ' + error.message);
    }
}

// Wyświetl samochody w interfejsie
function displayCars(cars) {
    const carsList = document.getElementById('carsList');
    
    if (cars.length === 0) {
        carsList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">Brak samochodów w bazie danych</p>';
        return;
    }

    carsList.innerHTML = cars.map(car => `
        <div class="car-card">
            <h3>${car.brand} ${car.model}</h3>
            <p><strong>Rok:</strong> ${car.year}</p>
            <p><strong>Cena:</strong> $${car.price || 'Nie podano'}</p>
            <p><strong>Rejestracja:</strong> ${car.registrationdate ? new Date(car.registrationdate).toLocaleDateString('pl-PL') : 'Nie podano'}</p>
            <p><strong>Przebieg:</strong> ${car.mileage} km</p>
            <p><strong>Rodzaj paliwa:</strong> ${car.fueltype}</p>
            <p><strong>ID:</strong> ${car.id}</p>
            <div class="button-group">
                <button class="edit-btn" onclick="editCar(${car.id})">✏️ Edytuj</button>
                <button class="delete-btn" onclick="deleteCar(${car.id})">🗑️ Usuń</button>
            </div>
        </div>
    `).join('');
}

// Edytuj samochód
async function editCar(carId) {
    try {
        const response = await fetch(`${API_URL}/cars/${carId}`);
        if (!response.ok) throw new Error('Błąd ładowania danych samochodu');
        
        const car = await response.json();
        
        // Wypełnij formularz danymi samochodu
        document.getElementById('brand').value = car.brand;
        document.getElementById('model').value = car.model;
        document.getElementById('year').value = car.year;
        document.getElementById('price').value = car.price || '';
        document.getElementById('registrationDate').value = car.registrationdate || '';
        document.getElementById('mileage').value = car.mileage;
        document.getElementById('fuelType').value = car.fueltype;
        
        // Zmień tryb formularza na edycję
        currentEditingId = carId;
        document.querySelector('button[type="submit"]').textContent = '💾 Zaktualizuj samochód';
        document.querySelector('h2').textContent = 'Edytuj samochód';
        
        // Przewiń do formularza
        document.getElementById('brand').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Błąd edycji:', error);
        showError('Nie udało się załadować danych samochodu: ' + error.message);
    }
}

// Zresetuj formularz
function resetForm() {
    document.getElementById('carForm').reset();
    currentEditingId = null;
    document.querySelector('button[type="submit"]').textContent = '➕ Dodaj samochód';
    document.querySelector('h2').textContent = 'Dodaj nowy samochód';
}

// Dodaj nowy samochód lub zaktualizuj istniejący
document.getElementById('carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const carData = {
        brand: document.getElementById('brand').value.trim(),
        model: document.getElementById('model').value.trim(),
        year: parseInt(document.getElementById('year').value),
        price: document.getElementById('price').value ? parseFloat(document.getElementById('price').value) : null,
        registrationDate: document.getElementById('registrationDate').value || null,
        mileage: parseInt(document.getElementById('mileage').value),
        fuelType: document.getElementById('fuelType').value.trim()
    };

    // Walidacja
    if (!carData.brand || !carData.model || !carData.year || !carData.mileage || !carData.fuelType) {
        showError('Proszę wypełnić obowiązkowe pola: marka, model, rok, przebieg, typ paliwa');
        return;
    }

    try {
        let response;
        
        if (currentEditingId) {
            // Tryb edycji - PUT
            response = await fetch(`${API_URL}/cars/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(carData)
            });
        } else {
            // Tryb dodawania - POST
            response = await fetch(`${API_URL}/cars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(carData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Błąd serwera');
        }

        const result = await response.json();
        console.log(currentEditingId ? 'Samochód zaktualizowany:' : 'Samochód dodany:', result);
        
        // Reset formularza
        resetForm();
        
        // Odśwież listę
        loadCars();
        
        showSuccess(currentEditingId ? 'Samochód pomyślnie zaktualizowany!' : 'Samochód pomyślnie dodany!');
        
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd podczas zapisywania samochodu: ' + error.message);
    }
});

// Usuń samochód
async function deleteCar(carId) {
    if (!confirm('Czy na pewno chcesz usunąć ten samochód?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/cars/${carId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Błąd serwera');
        }

        const result = await response.json();
        console.log('Samochód usunięty:', result);
        
        // Odśwież listę
        loadCars();
        
        showSuccess('Samochód pomyślnie usunięty!');
        
    } catch (error) {
        console.error('Błąd usuwania:', error);
        showError('Błąd podczas usuwania samochodu: ' + error.message);
    }
}

// Funkcje dla komunikatów
function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Załaduj samochody przy starcie
document.addEventListener('DOMContentLoaded', function() {
    loadCars();
    console.log('Car Management System załadowany');
    console.log('API URL:', API_URL);
});