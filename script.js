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
    for (let i = 0; i < SIZE * SIZE; i++) {
        const cell = document.createElement('div');
        cell.classList.add('tile');
        cell.style.width = `${cellSize}px`;
        cell.style.height = `${cellSize}px`;
        cell.style.left = `${(i % SIZE) * (cellSize + gap)}px`;
        cell.style.top = `${Math.floor(i / SIZE) * (cellSize + gap)}px`;
        cell.style.backgroundColor = '#cdc1b4';
        cell.style.transform = 'none';
        cell.textContent = '';
        gameBoard.appendChild(cell);
    }
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
    gameBoard.appendChild(tile);
    tiles.set(`${row}-${col}`, tile);
    return tile;
}

function updateTilePosition(row, col) {
    const tile = tiles.get(`${row}-${col}`);
    if (tile) {
        tile.style.left = `${col * (cellSize + gap)}px`;
        tile.style.top = `${row * (cellSize + gap)}px`;
    }
}

function removeTile(row, col) {
    const tile = tiles.get(`${row}-${col}`);
    if (tile) {
        gameBoard.removeChild(tile);
        tiles.delete(`${row}-${col}`);
    }
}

function moveTiles(direction) {
    savePreviousState();
    let moved = false;
    let moveScore = 0;
    const merges = new Set();

    function merge(row, col, newRow, newCol) {
        const key = `${newRow}-${newCol}`;
        if (merges.has(key)) return 0;
        board[newRow][newCol] *= 2;
        board[row][col] = 0;
        moveScore += board[newRow][newCol];
        merges.add(key);
        const tile = tiles.get(`${row}-${col}`);
        tile.classList.add('merged');
        tile.style.left = `${newCol * (cellSize + gap)}px`;
        tile.style.top = `${newRow * (cellSize + gap)}px`;
        setTimeout(() => {
            removeTile(row, col);
            removeTile(newRow, newCol);
            createTile(board[newRow][newCol], newRow, newCol);
            tile.classList.remove('merged');
        }, 100);
        return board[newRow][newCol];
    }

    if (direction === 'left') {
        for (let row = 0; row < SIZE; row++) {
            let pos = 0;
            for (let col = 0; col < SIZE; col++) {
                if (board[row][col] !== 0) {
                    if (pos > 0 && board[row][pos - 1] === board[row][col]) {
                        merge(row, col, row, pos - 1);
                        moved = true;
                    } else {
                        if (col !== pos) {
                            board[row][pos] = board[row][col];
                            board[row][col] = 0;
                            updateTilePosition(row, pos);
                            tiles.set(`${row}-${pos}`, tiles.get(`${row}-${col}`));
                            tiles.delete(`${row}-${col}`);
                            moved = true;
                        }
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
                    if (pos < SIZE - 1 && board[row][pos + 1] === board[row][col]) {
                        merge(row, col, row, pos + 1);
                        moved = true;
                    } else {
                        if (col !== pos) {
                            board[row][pos] = board[row][col];
                            board[row][col] = 0;
                            updateTilePosition(row, pos);
                            tiles.set(`${row}-${pos}`, tiles.get(`${row}-${col}`));
                            tiles.delete(`${row}-${col}`);
                            moved = true;
                        }
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
                    if (pos > 0 && board[pos - 1][col] === board[row][col]) {
                        merge(row, col, pos - 1, col);
                        moved = true;
                    } else {
                        if (row !== pos) {
                            board[pos][col] = board[row][col];
                            board[row][col] = 0;
                            updateTilePosition(pos, col);
                            tiles.set(`${pos}-${col}`, tiles.get(`${row}-${col}`));
                            tiles.delete(`${row}-${col}`);
                            moved = true;
                        }
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
                    if (pos < SIZE - 1 && board[pos + 1][col] === board[row][col]) {
                        merge(row, col, pos + 1, col);
                        moved = true;
                    } else {
                        if (row !== pos) {
                            board[pos][col] = board[row][col];
                            board[row][col] = 0;
                            updateTilePosition(pos, col);
                            tiles.set(`${pos}-${col}`, tiles.get(`${row}-${col}`));
                            tiles.delete(`${row}-${col}`);
                            moved = true;
                        }
                        pos--;
                    }
                }
            }
        }
    }

    if (moved) {
        score += moveScore;
        scoreElement.textContent = score;
        addRandomTiles(Math.floor(Math.random() * 2) + 1);
        saveGameState();
        checkGameOver();
    }
    return moved;
}

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
    document.querySelector('.controls').style.display = 'none';
}

function savePreviousState() {
    previousState = {
        board: board.map(row => row.slice()),
        score: score
    };
}

function undo() {
    if (previousState && !gameOver) {
        board.splice(0, board.length, ...previousState.board.map(row => row.slice()));
        score = previousState.score;
        scoreElement.textContent = score;
        refreshTiles();
        previousState = null;
    }
}

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

function startNewGame() {
    initBoard();
    score = 0;
    scoreElement.textContent = 0;
    gameOver = false;
    previousState = null;
    addRandomTiles(Math.floor(Math.random() * 3) + 1);
    saveGameState();
    gameOverModal.style.display = 'none';
    if (window.innerWidth <= 600) {
        document.querySelector('.controls').style.display = 'flex';
    }
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify({ board, score }));
}

function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const { board: savedBoard, score: savedScore } = JSON.parse(savedState);
        board.splice(0, board.length, ...savedBoard.map(row => row.slice()));
        score = savedScore;
        scoreElement.textContent = score;
        refreshTiles();
    } else {
        addRandomTiles(Math.floor(Math.random() * 3) + 1);
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

initBoard();
loadGameState();
if (window.innerWidth <= 600) {
    document.querySelector('.controls').classList.add('mobile-only');
    if (!gameOver) {
        document.querySelector('.controls').style.display = 'flex';
    }
}
