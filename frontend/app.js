// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : '/api';

let currentEditingId = null;
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Funkcje walidacji frontend
function validateCarForm(carData) {
    const errors = {};

    // Walidacja marki
    if (!carData.brand || carData.brand.trim().length === 0) {
        errors.brand = 'Marka jest wymagana';
    } else if (carData.brand.length < 2 || carData.brand.length > 50) {
        errors.brand = 'Marka musi mieć od 2 do 50 znaków';
    }

    // Walidacja modelu
    if (!carData.model || carData.model.trim().length === 0) {
        errors.model = 'Model jest wymagany';
    } else if (carData.model.length < 1 || carData.model.length > 50) {
        errors.model = 'Model musi mieć od 1 do 50 znaków';
    }

    // Walidacja roku
    if (!carData.year) {
        errors.year = 'Rok jest wymagany';
    } else if (carData.year < 1900 || carData.year > new Date().getFullYear() + 1) {
        errors.year = `Rok musi być między 1900 a ${new Date().getFullYear() + 1}`;
    }

    // Walidacja ceny
    if (carData.price && carData.price < 0) {
        errors.price = 'Cena nie może być ujemna';
    }

    // Walidacja przebiegu
    if (!carData.mileage && carData.mileage !== 0) {
        errors.mileage = 'Przebieg jest wymagany';
    } else if (carData.mileage < 0) {
        errors.mileage = 'Przebieg nie może być ujemny';
    }

    // Walidacja typu paliwa
    if (!carData.fuelType || carData.fuelType.trim().length === 0) {
        errors.fuelType = 'Rodzaj paliwa jest wymagany';
    }

    // Walidacja daty rejestracji
    if (carData.registrationDate) {
        const registrationDate = new Date(carData.registrationDate);
        const today = new Date();
        if (registrationDate > today) {
            errors.registrationDate = 'Data rejestracji nie może być z przyszłości';
        }
    }

    return errors;
}

// Funkcja wyświetlania błędów
function displayFormErrors(errors) {
    // Ukryj wszystkie istniejące błędy i resetuj style
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });

    // Pokaż nowe błędy i styluj inputy
    Object.keys(errors).forEach(field => {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);
        
        if (errorElement) {
            errorElement.textContent = errors[field];
            errorElement.style.display = 'block';
        }
        
        if (inputElement) {
            inputElement.classList.add('error');
        }
    });

    return Object.keys(errors).length === 0;
}

// Funkcja ukrywania błędów
function clearFormErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

// Załaduj publiczne statystyki
async function loadPublicStats() {
    try {
        const response = await fetch(`${API_URL}/public/stats`);
        if (!response.ok) throw new Error('Błąd sieci');
        const stats = await response.json();
        displayPublicStats(stats);
    } catch (error) {
        console.error('Błąd ładowania statystyk:', error);
        document.getElementById('publicStats').innerHTML = '<p style="color: #666; text-align: center;">Nie udało się załadować statystyk</p>';
    }
}

// Wyświetl publiczne statystyki
function displayPublicStats(stats) {
    const publicStats = document.getElementById('publicStats');
    publicStats.innerHTML = `
        <div class="stats-card">
            <h3>📊 Statystyki systemu</h3>
            <p><strong>Liczba samochodów w systemie:</strong> ${stats.total_cars}</p>
            <p style="color: #d1cfcfff; font-size: 14px; margin-top: 10px;">Zaloguj się aby zarządzać samochodami</p>
        </div>
    `;
}

// Authentication functions
async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
        }

        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showSuccess('Login successful!');
        checkAuthState();
        return true;
    } catch (error) {
        showError('Login failed: ' + error.message);
        return false;
    }
}

async function registerUser(username, email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
        }

        showSuccess('Registration successful! Please login.');
        showLoginForm();
        return true;
    } catch (error) {
        showError('Registration failed: ' + error.message);
        return false;
    }
}

function logoutUser() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    showSuccess('Logged out successfully!');
    checkAuthState();
}

function checkAuthState() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showAppContent();
    } else {
        showAuthForms();
        loadPublicStats(); // Ładuj statystyki gdy użytkownik nie jest zalogowany
    }
}

function showAuthForms() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appContent').style.display = 'none';
    document.getElementById('publicStats').style.display = 'block'; // Pokazuj statystyki
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    loadPublicStats(); // Ładuj statystyki przy pokazywaniu form
}

function showAppContent() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    document.getElementById('publicStats').style.display = 'none'; // Chowaj statystyki po zalogowaniu
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.username}!`;
    loadCars();
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Modified fetch functions with authentication
async function makeAuthenticatedRequest(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401 || response.status === 403) {
        showError('Access denied. Please login again.');
        logoutUser();
        return null;
    }

    return response;
}

// Updated car functions with authentication
async function loadCars() {
    try {
        const response = await makeAuthenticatedRequest(`${API_URL}/cars`);
        if (!response) return;
        
        if (!response.ok) throw new Error('Błąd sieci');
        const cars = await response.json();
        displayCars(cars);
    } catch (error) {
        console.error('Błąd ładowania:', error);
        if (error.message.includes('401') || error.message.includes('403')) {
            showError('Please login to access cars data');
        } else {
            showError('Nie udało się załadować listy samochodów: ' + error.message);
        }
    }
}

async function editCar(carId) {
    try {
        const response = await makeAuthenticatedRequest(`${API_URL}/cars/${carId}`);
        if (!response) return;
        
        if (!response.ok) throw new Error('Błąd ładowania danych samochodu');
        
        const car = await response.json();
        
        document.getElementById('brand').value = car.brand;
        document.getElementById('model').value = car.model;
        document.getElementById('year').value = car.year;
        document.getElementById('price').value = car.price || '';
        document.getElementById('registrationDate').value = car.registrationdate || '';
        document.getElementById('mileage').value = car.mileage;
        document.getElementById('fuelType').value = car.fueltype;
        
        currentEditingId = carId;
        document.querySelector('button[type="submit"]').textContent = '💾 Zaktualizuj samochód';
        document.querySelector('h2').textContent = 'Edytuj samochód';
        
        document.getElementById('brand').scrollIntoView({ behavior: 'smooth' });
        
        clearFormErrors(); // Czyść błędy przy edycji
        
    } catch (error) {
        console.error('Błąd edycji:', error);
        showError('Nie udało się załadować danych samochodu: ' + error.message);
    }
}

// Updated form submission with authentication
document.getElementById('carForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!authToken) {
        showError('Please login to add or edit cars');
        return;
    }
    
    const carData = {
        brand: document.getElementById('brand').value.trim(),
        model: document.getElementById('model').value.trim(),
        year: document.getElementById('year').value ? parseInt(document.getElementById('year').value) : null,
        price: document.getElementById('price').value ? parseFloat(document.getElementById('price').value) : null,
        registrationDate: document.getElementById('registrationDate').value || null,
        mileage: document.getElementById('mileage').value ? parseInt(document.getElementById('mileage').value) : null,
        fuelType: document.getElementById('fuelType').value.trim()
    };

    // Frontend walidacja
    const frontendErrors = validateCarForm(carData);
    if (!displayFormErrors(frontendErrors)) {
        return; // Stop jeśli są błędy
    }

    try {
        let response;
        const url = currentEditingId ? `${API_URL}/cars/${currentEditingId}` : `${API_URL}/cars`;
        const method = currentEditingId ? 'PUT' : 'POST';
        
        response = await makeAuthenticatedRequest(url, {
            method: method,
            body: JSON.stringify(carData)
        });

        if (!response) return;

        if (!response.ok) {
            const errorData = await response.json();
            
            // Obsługa błędów z backendu
            if (errorData.fieldErrors && Array.isArray(errorData.fieldErrors)) {
                const backendErrors = {};
                errorData.fieldErrors.forEach(error => {
                    backendErrors[error.field] = error.message;
                });
                displayFormErrors(backendErrors);
                return;
            }
            
            throw new Error(errorData.error || 'Błąd serwera');
        }

        const result = await response.json();
        console.log(currentEditingId ? 'Samochód zaktualizowany:' : 'Samochód dodany:', result);
        
        resetForm();
        loadCars();
        showSuccess(currentEditingId ? 'Samochód pomyślnie zaktualizowany!' : 'Samochód pomyślnie dodany!');
        
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd podczas zapisywania samochodu: ' + error.message);
    }
});

async function deleteCar(carId) {
    if (!confirm('Czy na pewno chcesz usunąć ten samochód?')) {
        return;
    }

    try {
        const response = await makeAuthenticatedRequest(`${API_URL}/cars/${carId}`, {
            method: 'DELETE'
        });

        if (!response) return;

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Błąd serwera');
        }

        const result = await response.json();
        console.log('Samochód usunięty:', result);
        
        loadCars();
        showSuccess('Samochód pomyślnie usunięty!');
        
    } catch (error) {
        console.error('Błąd usuwania:', error);
        showError('Błąd podczas usuwania samochodu: ' + error.message);
    }
}

// Event listeners for auth forms
document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    await loginUser(username, password);
});

document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    await registerUser(username, email, password);
});

document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

document.getElementById('logoutBtn').addEventListener('click', logoutUser);

// Reset formularza
function resetForm() {
    document.getElementById('carForm').reset();
    currentEditingId = null;
    document.querySelector('button[type="submit"]').textContent = '➕ Dodaj samochód';
    document.querySelector('h2').textContent = 'Dodaj nowy samochód';
    clearFormErrors(); // Czyść błędy przy resecie
}

// Funkcje dla komunikatów
function showError(message) {
    alert('❌ ' + message);
}

function showSuccess(message) {
    alert('✅ ' + message);
}

// Załaduj przy starcie
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    console.log('Car Management System załadowany');
    console.log('API URL:', API_URL);
});

// Display cars function remains the same
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
