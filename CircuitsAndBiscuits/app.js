
const API_BASE_URL = 'https://crm.skch.cz/ajax0/procedure.php';
const CMD_GET_USERS = 'getPeopleList';
const CMD_GET_DRINKS = 'getTypesList';
const CMD_SAVE = 'saveDrinks'; 

let usersData = []; 
let drinksCounts = {}; 


const usersContainer = document.getElementById('users-container');
const drinksContainer = document.getElementById('drinks-container');
const odeslatBtn = document.getElementById('odeslat-btn');
const statusMsg = document.getElementById('status-msg');

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    await fetchUsers(); 
    await fetchDrinks(); 
    
    const savedUserId = restoreUserPreference();
    if (savedUserId) {
        selectUser(savedUserId);
    }
    
    odeslatBtn.addEventListener('click',submitData);
}

// API 

async function fetchUsers() {
    try {
        const res = await fetch(`${API_BASE_URL}?cmd=${CMD_GET_USERS}`);
        if (!res.ok) throw new Error('Chyba serveru');

        const data = await res.json();
        usersData = data.map((name, index) => ({ id: (index + 1).toString(), name: name }));
        renderUsers();
    } catch (error) {
        console.warn("API zablokováno (pravděpodobně CORS). Načítám záložní uživatele.");
        // Záložní data, pokud API selže
        const fallbackData = ["Masopust Lukáš", "Molič Jan", "Adamek Daniel", "Weber David"];
        usersData = fallbackData.map((name, index) => ({ id: (index + 1).toString(), name: name }));
        renderUsers();
    }
}

function renderUsers() {
    usersContainer.innerHTML = ''; 

    usersData.forEach(user => {
        const item = document.createElement('label');
        item.className = 'user-item';
        item.htmlFor = `user-${user.id}`;

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'user-selection';
        input.id = `user-${user.id}`;
        input.value = user.id;
        input.addEventListener('change', (e) => saveUserPreference(e.target.value));

        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.name;
        
        item.appendChild(input);
        item.appendChild(nameSpan);
        usersContainer.appendChild(item);
    });
}


// Stáhne seznam nápojů, inicializuje počítadla a vykreslí je
async function fetchDrinks() {
    try {
        const res = await fetch(`${API_BASE_URL}?cmd=${CMD_GET_DRINKS}`);
        if (!res.ok) throw new Error('Chyba serveru');

        const data = await res.json();
        data.forEach(drinkType => { drinksCounts[drinkType] = 0; });
        renderDrinks();
    } catch (error) {
        console.warn("API zablokováno (pravděpodobně CORS). Načítám záložní nápoje.");
        // Záložní data, pokud API selže
        const fallbackDrinks = ["Mléko", "Espresso", "Coffe", "Long", "Doppio+"];
        fallbackDrinks.forEach(drinkType => { drinksCounts[drinkType] = 0; });
        renderDrinks();
    }
}

function renderDrinks() {
    drinksContainer.innerHTML = ''; 

    Object.keys(drinksCounts).forEach(drinkType => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'drink-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'drink-name';
        nameSpan.textContent = drinkType;

        const counterDiv = document.createElement('div');
        counterDiv.className = 'counter';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'counter-btn minus-btn';
        minusBtn.textContent = '-';
        minusBtn.onclick = () => updateDrinkCount(drinkType, -1);
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'drink-value';
        valueSpan.id = `val-${drinkType}`;
        valueSpan.textContent = drinksCounts[drinkType];
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'counter-btn plus-btn';
        plusBtn.textContent = '+';
        plusBtn.onclick = () => updateDrinkCount(drinkType, 1);
        
        counterDiv.appendChild(minusBtn);
        counterDiv.appendChild(valueSpan);
        counterDiv.appendChild(plusBtn);

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(counterDiv);

        drinksContainer.appendChild(itemDiv);
    });
}

function updateDrinkCount(drinkType, change) {
    const newValue = drinksCounts[drinkType] + change;
    if (newValue >= 0) { 
        drinksCounts[drinkType] = newValue;
        document.getElementById(`val-${drinkType}`).textContent = newValue;
    }
}

// Pamatovani Uživatele (Cookies + Local Storage)

const SAVE_USER_KEY = 'vypitoApp_lastUserId';

function saveUserPreference(userId) {
    if (!userId) return;
    
    localStorage.setItem(SAVE_USER_KEY, userId);
    
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = `${SAVE_USER_KEY}=${userId};${expires};path=/`;
}

function restoreUserPreference() {
    let savedId = localStorage.getItem(SAVE_USER_KEY);

    if (!savedId) {
        const nameCookie = SAVE_USER_KEY + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameCookie) === 0) {
                savedId = c.substring(nameCookie.length, c.length);
                break;
            }
        }
    }
    return savedId;
}

function selectUser(userId) {
    const radioBtn = document.getElementById(`user-${userId}`);
    if (radioBtn) {
        radioBtn.checked = true;
    }
}

async function submitData() {
    const selectedUserBtn = document.querySelector('input[name="user-selection"]:checked');
    if (!selectedUserBtn) {
        showStatus('Nejdříve vyberte uživatele.', 'error');
        return;
    }
    const selectedUserId = selectedUserBtn.value;
    
    const payload = {
        user: selectedUserId,
        drinks: Object.keys(drinksCounts).map(type => {
            return {
                type: type,
                value: drinksCounts[type]
            };
        })
    };
    
    try {
        console.log("Odesílám JSON:", JSON.stringify(payload, null, 2));

        odeslatBtn.disabled = true;
        odeslatBtn.textContent = 'Odesílám...';
        showStatus(''); // Vyčisti status

        const response = await fetch(`${API_BASE_URL}?cmd=${CMD_SAVE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showStatus('Úspěšně odesláno!', 'success');
            resetCounters();
        } else {
            throw new Error('Chyba serveru při ukládání.');
        }
    } catch (error) {
        console.error("Chyba:", error);
        showStatus('Při odesílání došlo k chybě.', 'error');
    } finally {
        odeslatBtn.disabled = false;
        odeslatBtn.textContent = 'Odeslat';
    }
}
function showStatus(text, type) {
    statusMsg.textContent = text;
    statusMsg.className = `status-msg status-${type}`;
    if (text) {
        setTimeout(() => { statusMsg.textContent = ''; statusMsg.className = 'status-msg'; }, 3000);
    }
}
function resetCounters() {
    Object.keys(drinksCounts).forEach(key => {
        drinksCounts[key] = 0;
    });
    renderDrinks(); // Překresli s nulami
}