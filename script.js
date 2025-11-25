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
const newGameButton = document.getElementById('new-game');
const undoButton = document.getElementById('undo');
const gameOverModal = document.getElementById('game-over');
const playerNameInput = document.getElementById('player-name');
const saveScoreButton = document.getElementById('save-score');
const restartButton = document.getElementById('restart');
const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
const closeLeaderboardButton = document.getElementById('close-leaderboard');
const showLeaderboardButton = document.getElementById('show-leaderboard');
const upButton = document.getElementById('up');
const leftButton = document.getElementById('left');
const downButton = document.getElementById('down');
const rightButton = document.getElementById('right');

function initBoard() {
    gameBoard.innerHTML = '';
    tiles.clear();
    
    // Создаем фон игрового поля
    for (let i = 0; i < SIZE * SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.style.left = `${(i % SIZE) * (cellSize + gap)}px`;
        cell.style.top = `${Math.floor(i / SIZE) * (cellSize + gap)}px`;
        gameBoard.appendChild(cell);
    }
    
    // Инициализируем игровую доску
    for (let row = 0; row < SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < SIZE; col++) {
            board[row][col] = 0;
        }
    }
}

function createTile(value, row, col) {
    const tile = document.createElement('div');
    tile.classList.add('tile', `tile-${value}`);
    tile.textContent = value;
    tile.style.width = `${cellSize}px`;
    tile.style.height = `${cellSize}px`;
    tile.style.left = `${col * (cellSize + gap)}px`;
    tile.style.top = `${row * (cellSize + gap)}px`;
    tile.style.transform = 'scale(0)';
    gameBoard.appendChild(tile);
    
    // Анимация появления
    setTimeout(() => {
        tile.style.transform = 'scale(1)';
        tile.style.transition = 'transform 0.15s ease';
    }, 10);
    
    tiles.set(`${row}-${col}`, tile);
    return tile;
}

function updateTilePosition(tile, newRow, newCol) {
    tile.style.left = `${newCol * (cellSize + gap)}px`;
    tile.style.top = `${newRow * (cellSize + gap)}px`;
    tile.style.transition = 'left 0.15s ease, top 0.15s ease';
}

function removeTile(row, col) {
    const tile = tiles.get(`${row}-${col}`);
    if (tile) {
        gameBoard.removeChild(tile);
        tiles.delete(`${row}-${col}`);
    }
}

function moveTiles(direction) {
    if (gameOver) return false;
    
    savePreviousState();
    let moved = false;
    let moveScore = 0;
    const mergedTiles = new Set();

    // Функция для обработки одной строки/столбца
    function processLine(line) {
        const nonZero = line.filter(cell => cell.value !== 0);
        const result = [];
        let i = 0;
        
        while (i < nonZero.length) {
            if (i < nonZero.length - 1 && nonZero[i].value === nonZero[i + 1].value) {
                // Слияние плиток
                const newValue = nonZero[i].value * 2;
                result.push({
                    value: newValue,
                    from: [nonZero[i], nonZero[i + 1]],
                    merged: true
                });
                moveScore += newValue;
                i += 2;
            } else {
                // Простое перемещение
                result.push({
                    value: nonZero[i].value,
                    from: [nonZero[i]],
                    merged: false
                });
                i += 1;
            }
        }
        
        // Заполняем оставшиеся позиции нулями
        while (result.length < SIZE) {
            result.push({ value: 0, from: [], merged: false });
        }
        
        return result;
    }

    // Подготовка данных для движения
    const movements = [];
    
    if (direction === 'left') {
        for (let row = 0; row < SIZE; row++) {
            const line = [];
            for (let col = 0; col < SIZE; col++) {
                line.push({ value: board[row][col], row, col });
            }
            movements[row] = processLine(line);
        }
    } else if (direction === 'right') {
        for (let row = 0; row < SIZE; row++) {
            const line = [];
            for (let col = SIZE - 1; col >= 0; col--) {
                line.push({ value: board[row][col], row, col });
            }
            movements[row] = processLine(line).reverse();
        }
    } else if (direction === 'up') {
        for (let col = 0; col < SIZE; col++) {
            const line = [];
            for (let row = 0; row < SIZE; row++) {
                line.push({ value: board[row][col], row, col });
            }
            movements[col] = processLine(line);
        }
    } else if (direction === 'down') {
        for (let col = 0; col < SIZE; col++) {
            const line = [];
            for (let row = SIZE - 1; row >= 0; row--) {
                line.push({ value: board[row][col], row, col });
            }
            movements[col] = processLine(line).reverse();
        }
    }

    // Обновляем доску и анимируем движение
    const newBoard = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
    
    if (direction === 'left' || direction === 'right') {
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                newBoard[row][col] = movements[row][col].value;
                
                if (movements[row][col].from.length > 0 && !movements[row][col].merged) {
                    // Простое перемещение
                    const from = movements[row][col].from[0];
                    if (from.row !== row || from.col !== col) {
                        const tile = tiles.get(`${from.row}-${from.col}`);
                        if (tile) {
                            updateTilePosition(tile, row, col);
                            tiles.set(`${row}-${col}`, tile);
                            tiles.delete(`${from.row}-${from.col}`);
                            moved = true;
                        }
                    }
                }
            }
        }
    } else {
        // up или down
        for (let col = 0; col < SIZE; col++) {
            for (let row = 0; row < SIZE; row++) {
                newBoard[row][col] = movements[col][row].value;
                
                if (movements[col][row].from.length > 0 && !movements[col][row].merged) {
                    // Простое перемещение
                    const from = movements[col][row].from[0];
                    if (from.row !== row || from.col !== col) {
                        const tile = tiles.get(`${from.row}-${from.col}`);
                        if (tile) {
                            updateTilePosition(tile, row, col);
                            tiles.set(`${row}-${col}`, tile);
                            tiles.delete(`${from.row}-${from.col}`);
                            moved = true;
                        }
                    }
                }
            }
        }
    }

    // Обрабатываем слияния
    setTimeout(() => {
        tiles.forEach((tile, key) => {
            const [row, col] = key.split('-').map(Number);
            if (board[row][col] !== 0 && newBoard[row][col] === 0) {
                // Плитка была слита - удаляем
                removeTile(row, col);
            }
        });

        // Создаем новые плитки для слитых
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                if (direction === 'left' || direction === 'right') {
                    if (movements[row][col].merged && movements[row][col].value !== 0) {
                        removeTile(movements[row][col].from[0].row, movements[row][col].from[0].col);
                        removeTile(movements[row][col].from[1].row, movements[row][col].from[1].col);
                        createTile(movements[row][col].value, row, col);
                        moved = true;
                    }
                } else {
                    if (movements[col][row].merged && movements[col][row].value !== 0) {
                        removeTile(movements[col][row].from[0].row, movements[col][row].from[0].col);
                        removeTile(movements[col][row].from[1].row, movements[col][row].from[1].col);
                        createTile(movements[col][row].value, row, col);
                        moved = true;
                    }
                }
            }
        }

        // Обновляем основную доску
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                board[row][col] = newBoard[row][col];
            }
        }

        if (moved) {
            score += moveScore;
            scoreElement.textContent = score;
            addRandomTile();
            saveGameState();
            checkGameOver();
        }
    }, 150);

    return moved;
}

function addRandomTile() {
    const emptyCells = [];
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }
    
    if (emptyCells.length > 0) {
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const value = Math.random() < 0.9 ? 2 : 4;
        board[row][col] = value;
        createTile(value, row, col);
    }
}

function checkGameOver() {
    // Проверяем есть ли пустые клетки
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] === 0) return false;
        }
    }
    
    // Проверяем возможные слияния
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            const current = board[row][col];
            // Проверка справа
            if (col < SIZE - 1 && board[row][col + 1] === current) return false;
            // Проверка снизу
            if (row < SIZE - 1 && board[row + 1][col] === current) return false;
        }
    }
    
    gameOver = true;
    gameOverModal.style.display = 'flex';
    document.querySelector('.controls').style.display = 'none';
    return true;
}

function savePreviousState() {
    previousState = {
        board: JSON.parse(JSON.stringify(board)),
        score: score
    };
}

function undo() {
    if (previousState && !gameOver) {
        // Восстанавливаем состояние доски
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                board[row][col] = previousState.board[row][col];
            }
        }
        score = previousState.score;
        scoreElement.textContent = score;
        
        // Обновляем отображение
        refreshTiles();
        previousState = null;
    }
}

function refreshTiles() {
    // Удаляем все плитки
    tiles.forEach((tile) => {
        if (tile.parentNode === gameBoard) {
            gameBoard.removeChild(tile);
        }
    });
    tiles.clear();
    
    // Создаем новые плитки согласно состоянию доски
    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
            if (board[row][col] !== 0) {
                createTile(board[row][col], row, col);
            }
        }
    }
}

function startNewGame() {
    initBoard();
    score = 0;
    scoreElement.textContent = '0';
    gameOver = false;
    previousState = null;
    
    // Добавляем 2 начальные плитки
    addRandomTile();
    addRandomTile();
    
    saveGameState();
    gameOverModal.style.display = 'none';
    
    if (window.innerWidth <= 600) {
        document.querySelector('.controls').style.display = 'flex';
    }
}

function saveGameState() {
    const gameState = {
        board: board,
        score: score
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const { board: savedBoard, score: savedScore } = JSON.parse(savedState);
        
        // Восстанавливаем состояние доски
        for (let row = 0; row < SIZE; row++) {
            for (let col = 0; col < SIZE; col++) {
                board[row][col] = savedBoard[row][col];
            }
        }
        score = savedScore;
        scoreElement.textContent = score;
        
        // Обновляем отображение
        refreshTiles();
    } else {
        // Если нет сохраненной игры, начинаем новую
        addRandomTile();
        addRandomTile();
    }
}

function saveScore() {
    const name = playerNameInput.value.trim();
    if (name) {
        const date = new Date().toLocaleString();
        let leaders = JSON.parse(localStorage.getItem('leaders') || '[]');
        leaders.push({ name, score, date });
        leaders.sort((a, b) => b.score - a.score);
        leaders = leaders.slice(0, 10);
        localStorage.setItem('leaders', JSON.stringify(leaders));
        playerNameInput.style.display = 'none';
        saveScoreButton.style.display = 'none';
        document.querySelector('#game-over p').textContent = 'Ваш рекорд сохранен!';
    }
}

function showLeaderboard() {
    leaderboardTableBody.innerHTML = '';
    const leaders = JSON.parse(localStorage.getItem('leaders') || '[]');
    leaders.forEach(leader => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.textContent = leader.name;
        const tdScore = document.createElement('td');
        tdScore.textContent = leader.score;
        const tdDate = document.createElement('td');
        tdDate.textContent = leader.date;
        tr.appendChild(tdName);
        tr.appendChild(tdScore);
        tr.appendChild(tdDate);
        leaderboardTableBody.appendChild(tr);
    });
    leaderboardModal.style.display = 'flex';
    document.querySelector('.controls').style.display = 'none';
}

// Инициализация событий
newGameButton.addEventListener('click', startNewGame);
undoButton.addEventListener('click', undo);
saveScoreButton.addEventListener('click', saveScore);
restartButton.addEventListener('click', startNewGame);
closeLeaderboardButton.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
    if (window.innerWidth <= 600 && !gameOver) {
        document.querySelector('.controls').style.display = 'flex';
    }
});
showLeaderboardButton.addEventListener('click', showLeaderboard);

upButton.addEventListener('click', () => moveTiles('up'));
leftButton.addEventListener('click', () => moveTiles('left'));
downButton.addEventListener('click', () => moveTiles('down'));
rightButton.addEventListener('click', () => moveTiles('right'));

document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    if (e.key === 'ArrowUp') moveTiles('up');
    else if (e.key === 'ArrowLeft') moveTiles('left');
    else if (e.key === 'ArrowDown') moveTiles('down');
    else if (e.key === 'ArrowRight') moveTiles('right');
});

// Инициализация игры
initBoard();
loadGameState();

// Адаптивность для мобильных устройств
if (window.innerWidth <= 600) {
    document.querySelector('.controls').classList.add('mobile-only');
    if (!gameOver) {
        document.querySelector('.controls').style.display = 'flex';
    }
}
