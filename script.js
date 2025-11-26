// Константы
const GRID_SIZE = 4;
const INITIAL_TILES = 2; // 2-3 тайла в начале
const NEW_TILES_PER_MOVE = 2; // 1-2 новых тайла после хода

// Элементы DOM
const grid = document.getElementById('grid');
const scoreEl = document.getElementById('score');
const newGameBtn = document.getElementById('new-game');
const undoBtn = document.getElementById('undo');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const gameOverModal = document.getElementById('game-over-modal');
const leaderboardModal = document.getElementById('leaderboard-modal');
const nameInput = document.getElementById('name-input');
const saveScoreBtn = document.getElementById('save-score');
const restartBtn = document.getElementById('restart');
const closeLeaderboardBtn = document.getElementById('close-leaderboard');
const gameOverMessage = document.getElementById('game-over-message');
const leaderboardTable = document.getElementById('leaderboard-table').querySelector('tbody');

// Состояние игры
let gridState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
let score = 0;
let history = []; // Для отмены хода
let gameOver = false;

// Инициализация сетки
function initGrid() {
    grid.innerHTML = '';
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        grid.appendChild(cell);
    }
}

// Добавление тайла
function addTile(value = null, position = null) {
    if (!value) value = Math.random() < 0.9 ? 2 : 4;
    if (!position) {
        const emptyCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (!gridState[r][c]) emptyCells.push([r, c]);
            }
        }
        if (emptyCells.length === 0) return;
        position = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    const [r, c] = position;
    gridState[r][c] = value;
    renderTile(r, c, value);
}

// Рендер тайла
function renderTile(r, c, value) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-value', value);
    tile.textContent = value;
    tile.style.left = `${c * (100 + 10) + 10}px`;
    tile.style.top = `${r * (100 + 10) + 10}px`;
    grid.appendChild(tile);
}

// Обновление отображения
function updateDisplay() {
    // Удалить старые тайлы
    document.querySelectorAll('.tile').forEach(t => t.remove());
    // Рендерить новые
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (gridState[r][c]) renderTile(r, c, gridState[r][c]);
        }
    }
    scoreEl.textContent = score;
    saveGameState();
}

// Сохранение состояния
function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify({ gridState, score, history }));
}

// Загрузка состояния
function loadGameState() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        const { gridState: savedGrid, score: savedScore, history: savedHistory } = JSON.parse(saved);
        gridState = savedGrid;
        score = savedScore;
        history = savedHistory;
        updateDisplay();
    } else {
        startNewGame();
    }
}

// Начало новой игры
function startNewGame() {
    gridState = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    score = 0;
    history = [];
    gameOver = false;
    undoBtn.disabled = false;
    for (let i = 0; i < INITIAL_TILES; i++) addTile();
    updateDisplay();
}

// Движение
function move(direction) {
    if (gameOver) return;
    const prevState = JSON.parse(JSON.stringify(gridState));
    const prevScore = score;
    let moved = false;
    let points = 0;

    function slideRow(row) {
        const filtered = row.filter(v => v !== null);
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                points += filtered[i];
                filtered[i + 1] = null;
                i++;
            }
        }
        const newRow = filtered.filter(v => v !== null);
        while (newRow.length < GRID_SIZE) newRow.push(null);
        return newRow;
    }

    if (direction === 'left') {
        for (let r = 0; r < GRID_SIZE; r++) {
            const newRow = slideRow(gridState[r]);
            if (JSON.stringify(gridState[r]) !== JSON.stringify(newRow)) moved = true;
            gridState[r] = newRow;
        }
    } else if (direction === 'right') {
        for (let r = 0; r < GRID_SIZE; r++) {
            const reversed = gridState[r].slice().reverse();
            const newRow = slideRow(reversed).reverse();
            if (JSON.stringify(gridState[r]) !== JSON.stringify(newRow)) moved = true;
            gridState[r] = newRow;
        }
    } else if (direction === 'up') {
        for (let c = 0; c < GRID_SIZE; c++) {
            const col = gridState.map(row => row[c]);
            const newCol = slideRow(col);
            if (JSON.stringify(col) !== JSON.stringify(newCol)) moved = true;
            for (let r = 0; r < GRID_SIZE; r++) gridState[r][c] = newCol[r];
        }
    } else if (direction === 'down') {
        for (let c = 0; c < GRID_SIZE; c++) {
            const col = gridState.map(row => row[c]).reverse();
            const newCol = slideRow(col).reverse();
            if (JSON.stringify(gridState.map(row => row[c])) !== JSON.stringify(newCol)) moved = true;
            for (let r = 0; r < GRID_SIZE; r++) gridState[r][c] = newCol[r];
        }
    }

    if (moved) {
        score += points;
        history.push({ gridState: prevState, score: prevScore });
        for (let i = 0; i < NEW_TILES_PER_MOVE; i++) addTile();
        updateDisplay();
        if (isGameOver()) {
            gameOver = true;
            undoBtn.disabled = true;
            gameOverModal.classList.add('show');
        }
    }
}

// Проверка окончания игры
function isGameOver() {
    // Есть пустые клетки?
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (!gridState[r][c]) return false;
        }
    }
    // Есть ли возможные слияния?
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            const val = gridState[r][c];
            if ((c < GRID_SIZE - 1 && gridState[r][c + 1] === val) ||
                (r < GRID_SIZE - 1 && gridState[r + 1][c] === val)) {
                return false;
            }
        }
    }
    return true;
}

// Отмена хода
function undoMove() {
    if (history.length > 0 && !gameOver) {
        const prev = history.pop();
        gridState = prev.gridState;
        score = prev.score;
        updateDisplay();
    }
}

// Лидерборд
function loadLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboardTable.innerHTML = '';
    leaderboard.slice(0, 10).forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${entry.name}</td><td>${entry.score}</td><td>${entry.date}</td>`;
        leaderboardTable.appendChild(row);
    });
}

function saveScore() {
    const name = nameInput.value.trim();
    if (!name) return;
    const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    leaderboard.push({ name, score, date: new Date().toLocaleDateString() });
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    nameInput.style.display = 'none';
    saveScoreBtn.style.display = 'none';
    gameOverMessage.textContent = 'Ваш рекорд сохранён!';
}

// Управление
// Клавиатура
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') move('left');
    else if (e.key === 'ArrowRight') move('right');
    else if (e.key === 'ArrowUp') move('up');
    else if (e.key === 'ArrowDown') move('down');
});

// Свайпы (для мобильных)
let startX, startY;
grid.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});
grid.addEventListener('touchend', (e) => {
    if (!startX || !startY) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - startX;
    const diffY = endY - startY;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50) move('right');
        else if (diffX < -50) move('left');
    } else {
        if (diffY > 50) move('down');
        else if (diffY < -50) move('up');
    }
    startX = startY = null;
});

// Кнопки
newGameBtn.addEventListener('click', startNewGame);
undoBtn.addEventListener('click', undoMove);
leaderboardBtn.addEventListener('click', () => {
    loadLeaderboard();
    leaderboardModal.classList.add('show');
});
closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.classList.remove('show'));
saveScoreBtn.addEventListener('click', saveScore);
restartBtn.addEventListener('click', () => {
    gameOverModal.classList.remove('show');
    startNewGame();
});

// Инициализация
initGrid();
loadGameState();
