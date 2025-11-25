const SIZE = 4;
const board = [];
const tiles = new Map();
let score = 0;
let previousState = null;
let gameOver = false;
const cellSize = 100;
const gap = 10;
const gameBoard = document.getElementById('game-board');
const scoreElement = document.getElementById('score');

// Инициализация доски
function initBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < SIZE * SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.style.left = `${(i % SIZE) * (cellSize + gap)}px`;
        cell.style.top = `${Math.floor(i / SIZE) * (cellSize + gap)}px`;
        gameBoard.appendChild(cell);
    }
    for (let row = 0; row < SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < SIZE; col++) {
            board[row][col] = 0;
        }
    }
}

// Создание плитки
function createTile(value, row, col) {
    const tile = document.createElement('div');
    tile.classList.add('tile', `tile-${value}`);
    tile.textContent = value;
    tile.style.width = `${cellSize}px`;
    tile.style.height = `${cellSize}px`;
    tile.style.left = `${col * (cellSize + gap)}px`;
    tile.style.top = `${row * (cellSize + gap)}px`;
    gameBoard.appendChild(tile);
    tiles.set(`${row}-${col}`, tile);
    return tile;
}

// Обновление позиции плитки
function updateTilePosition(tile, row, col) {
    tile.style.left = `${col * (cellSize + gap)}px`;
    tile.style.top = `${row * (cellSize + gap)}px`;
}

// Удаление плитки
function removeTile(row, col) {
    const key = `${row}-${col}`;
    const tile = tiles.get(key);
    if (tile) {
        gameBoard.removeChild(tile);
        tiles.delete(key);
    }
}

// Слияние плиток
function mergeTiles(row, col, newRow, newCol) {
    const key = `${newRow}-${newCol}`;
    if (tiles.has(key)) {
        const tile = tiles.get(`${row}-${col}`);
        const targetTile = tiles.get(key);
        board[newRow][newCol] *= 2;
        board[row][col] = 0;
        score += board[newRow][newCol];
        scoreElement.textContent = score;
        removeTile(newRow, newCol);
        removeTile(row, col);
        createTile(board[newRow][newCol], newRow, newCol);
    }
}

// Перемещение плиток
function moveTiles(direction) {
    savePreviousState();
    let moved = false;
    if (direction === 'left') {
        for (let row = 0; row < SIZE; row++) {
            let pos = 0;
            for (let col = 0; col < SIZE; col++) {
                if (board[row][col] !== 0) {
                    if (pos > 0 && board[row][pos - 1] === board[row][col] && !tiles.has(`${row}-${pos - 1}`)) {
                        mergeTiles(row, col, row, pos - 1);
                        moved = true;
                    } else if (col !== pos) {
                        board[row][pos] = board[row][col];
                        board[row][col] = 0;
                        const tile = tiles.get(`${row}-${col}`);
                        if (tile) {
                            updateTilePosition(tile, row, pos);
                            tiles.set(`${row}-${pos}`, tile);
                            tiles.delete(`${row}-${col}`);
                        }
                        moved = true;
                    } else {
                        pos++;
                    }
                }
            }
        }
    } else if (direction === 'right') {
        for (let row = 0; row < SIZE; row++) {
            let pos = SIZE - 1;
            for (let col = SIZE - 1; col >= 0; col--) {
                if (board[row][col] !== 0) {
                    if (pos < SIZE - 1 && board[row][pos + 1] === board[row][col] && !tiles.has(`${row}-${pos + 1}`)) {
                        mergeTiles(row, col, row, pos + 1);
                        moved = true;
                    } else if (col !== pos) {
                        board[row][pos] = board[row][col];
                        board[row][col] = 0;
                        const tile = tiles.get(`${row}-${col}`);
                        if (tile) {
                            updateTilePosition(tile, row, pos);
                            tiles.set(`${row}-${pos}`, tile);
                            tiles.delete(`${row}-${col}`);
                        }
                        moved = true;
                    } else {
                        pos--;
                    }
                }
            }
        }
    } else if (direction === 'up') {
        for (let col = 0; col < SIZE; col++) {
            let pos = 0;
            for (let row = 0; row < SIZE; row++) {
                if (board[row][col] !== 0) {
                    if (pos > 0 && board[pos - 1][col] === board[row][col] && !tiles.has(`${pos - 1}-${col}`)) {
                        mergeTiles(row, col, pos - 1, col);
                        moved = true;
                    } else if (row !== pos) {
                        board[pos][col] = board[row][col];
                        board[row][col] = 0;
                        const tile = tiles.get(`${row}-${col}`);
                        if (tile) {
                            updateTilePosition(tile, pos, col);
                            tiles.set(`${pos}-${col}`, tile);
                            tiles.delete(`${row}-${col}`);
                        }
                        moved = true;
                    } else {
                        pos++;
                    }
                }
            }
        }
    } else if (direction === 'down') {
        for (let col = 0; col < SIZE; col++) {
            let pos = SIZE - 1;
            for (let row = SIZE - 1; row >= 0; row--) {
                if (board[row][col] !== 0) {
                    if (pos < SIZE - 1 && board[pos + 1][col] === board[row][col] && !tiles.has(`${pos + 1}-${col}`)) {
                        mergeTiles(row, col, pos + 1, col);
                        moved = true;
                    } else if (row !== pos) {
                        board[pos][col] = board[row][col];
                        board[row][col] = 0;
                        const tile = tiles.get(`${row}-${col}`);
                        if (tile) {
                            updateTilePosition(tile, pos, col);
                            tiles.set(`${pos}-${col}`, tile);
                            tiles.delete(`${row}-${col}`);
                        }
                        moved = true;
                    } else {
                        pos--;
                    }
                }
            }
        }
    }
    if (moved) {
        addRandomTiles(1);
        saveGameState();
        checkGameOver();
    }
    return moved;
}

// Добавление случайной плитки
function addRandomTiles(count) {
    const emptyCells = [];
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }
    for (let i = 0; i < count && emptyCells.length > 0; i++) {
        const index = Math.floor(Math.random() * emptyCells.length);
        const { row, col } = emptyCells.splice(index, 1)[0];
        const value = Math.random() < 0.9 ? 2 : 4;
        board[row][col] = value;
        createTile(value, row, col);
    }
}

// Проверка на конец игры
function checkGameOver() {
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === 0) return;
            if (col < SIZE - 1 && board[row][col] === board[row][col + 1]) return;
            if (row < SIZE - 1 && board[row][col] === board[row + 1][col]) return;
        }
    }
    gameOver = true;
    gameOverModal.style.display = 'flex';
}

// Сохранение предыдущего состояния
function savePreviousState() {
    previousState = {
        board: board.map(row => row.slice()),
        score: score,
        tiles: new Map(tiles)
    };
}

// Отмена хода
function undo() {
    if (previousState && !gameOver) {
        board.splice(0, board.length, ...previousState.board.map(row => row.slice()));
        score = previousState.score;
        scoreElement.textContent = score;
        tiles.clear();
        previousState.tiles.forEach((tile, key) => {
            tiles.set(key, tile);
            gameBoard.appendChild(tile);
        });
        previousState = null;
    }
}

// Обновление плиток
function refreshTiles() {
    tiles.forEach((tile) => gameBoard.removeChild(tile));
    tiles.clear();
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] !== 0) {
                createTile(board[row][col], row, col);
            }
        }
    }
}

// Начало новой игры
function startNewGame() {
    initBoard();
    score = 0;
    scoreElement.textContent = 0;
    gameOver = false;
    previousState = null;
    addRandomTiles(2);
    saveGameState();
    gameOverModal.style.display = 'none';
}

// Сохранение состояния игры
function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify({ board, score }));
}

// Загрузка состояния игры
function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const { board: savedBoard, score: savedScore } = JSON.parse(savedState);
        board.splice(0, board.length, ...savedBoard.map(row => row.slice()));
        score = savedScore;
        scoreElement.textContent = score;
        refreshTiles();
    } else {
        addRandomTiles(2);
    }
}

// Инициализация
initBoard();
loadGameState();
