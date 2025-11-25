/* ==============================
   2048 — ЛОГИКА ИГРЫ
   ============================== */

const gridSize = 4;
let grid = [];
let score = 0;

// Undo
let prevGrid = null;
let prevScore = 0;

// DOM элементы
const gridContainer = document.getElementById("grid");
const scoreElement = document.getElementById("score");
const messageElement = document.getElementById("message");
const undoButton = document.getElementById("undo-btn");

// Leaderboard
const leaderboardPanel = document.getElementById("leaderboard");
const leaderboardList = document.getElementById("leaderboard-list");

// Кнопки управления
const btnUp = document.getElementById("btn-up");
const btnDown = document.getElementById("btn-down");
const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");

/* ==============================
   СОЗДАНИЕ ИГРОВОГО ПОЛЯ
   ============================== */

function buildGrid() {
    while (gridContainer.firstChild) {
        gridContainer.removeChild(gridContainer.firstChild);
    }

    for (let i = 0; i < gridSize; i++) {
        const row = [];
        for (let j = 0; j < gridSize; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            gridContainer.appendChild(tile);
            row.push({
                value: 0,
                element: tile
            });
        }
        grid.push(row);
    }
}

/* ==============================
   РЕНДЕРИНГ
   ============================== */

function updateTiles() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            const tile = grid[i][j];
            tile.element.textContent = tile.value !== 0 ? String(tile.value) : "";
            tile.element.className = `tile value-${tile.value}`;
        }
    }
    scoreElement.textContent = score;
}

/* ==============================
   СОХРАНЕНИЕ / ЗАГРУЗКА
   ============================== */

function saveGame() {
    const data = grid.map(row => row.map(cell => cell.value));
    localStorage.setItem("2048-grid", JSON.stringify(data));
    localStorage.setItem("2048-score", String(score));
}

function loadGame() {
    const savedGrid = localStorage.getItem("2048-grid");
    const savedScore = localStorage.getItem("2048-score");

    if (!savedGrid) return false;

    const values = JSON.parse(savedGrid);

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            grid[i][j].value = values[i][j];
        }
    }

    score = Number(savedScore);
    updateTiles();
    return true;
}

/* ==============================
   ЛИДЕРБОРД
   ============================== */

function loadLeaderboard() {
    const data = JSON.parse(localStorage.getItem("2048-leaderboard") || "[]");
    leaderboardList.innerHTML = "";

    data.forEach((entry, i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${entry.name}: ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

function saveToLeaderboard(finalScore) {
    const name = prompt("Введите ваше имя:");

    if (!name) return;

    const data = JSON.parse(localStorage.getItem("2048-leaderboard") || "[]");
    data.push({ name, score: finalScore });

    data.sort((a, b) => b.score - a.score);

    if (data.length > 10) data.length = 10;

    localStorage.setItem("2048-leaderboard", JSON.stringify(data));
    loadLeaderboard();
}

/* ==============================
   ИГРОВАЯ ЛОГИКА
   ============================== */

function addRandomTile() {
    const empty = [];

    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j].value === 0) empty.push(grid[i][j]);
        }
    }

    if (empty.length === 0) return;

    const tile = empty[Math.floor(Math.random() * empty.length)];
    tile.value = Math.random() < 0.9 ? 2 : 4;
}

function backupState() {
    prevGrid = grid.map(row => row.map(cell => cell.value));
    prevScore = score;
}

function restoreState() {
    if (!prevGrid) return;
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            grid[i][j].value = prevGrid[i][j];
        }
    }
    score = prevScore;
    updateTiles();
}

function compress(row) {
    const result = row.filter(v => v !== 0);
    while (result.length < gridSize) result.push(0);
    return result;
}

function merge(row) {
    for (let i = 0; i < gridSize - 1; i++) {
        if (row[i] !== 0 && row[i] === row[i + 1]) {
            row[i] *= 2;
            score += row[i];
            row[i + 1] = 0;
        }
    }
    return row;
}

function rotateGrid(times) {
    while (times-- > 0) {
        const newGrid = [];
        for (let j = 0; j < gridSize; j++) {
            const row = [];
            for (let i = gridSize - 1; i >= 0; i--) {
                row.push(grid[i][j].value);
            }
            newGrid.push(row);
        }
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                grid[i][j].value = newGrid[i][j];
            }
        }
    }
}

function move(direction) {
    backupState();

    if (direction === "left") rotateGrid(0);
    if (direction === "up") rotateGrid(1);
    if (direction === "right") rotateGrid(2);
    if (direction === "down") rotateGrid(3);

    let moved = false;

    for (let i = 0; i < gridSize; i++) {
        let row = grid[i].map(cell => cell.value);
        const compressed = compress(row);
        const merged = merge(compressed);
        const final = compress(merged);

        if (row.toString() !== final.toString()) moved = true;

        for (let j = 0; j < gridSize; j++) {
            grid[i][j].value = final[j];
        }
    }

    if (direction === "up") rotateGrid(3);
    if (direction === "right") rotateGrid(2);
    if (direction === "down") rotateGrid(1);

    if (moved) {
        addRandomTile();
        updateTiles();
        saveGame();
    }

    checkGameOver();
}

function checkGameOver() {
    for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
            if (grid[i][j].value === 0) return;
            if (i < gridSize - 1 && grid[i][j].value === grid[i + 1][j].value) return;
            if (j < gridSize - 1 && grid[i][j].value === grid[i][j + 1].value) return;
        }
    }
    messageElement.textContent = "Игра окончена!";
    saveToLeaderboard(score);
}

/* ==============================
   СОБЫТИЯ
   ============================== */

document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") move("up");
    if (e.key === "ArrowDown") move("down");
    if (e.key === "ArrowLeft") move("left");
    if (e.key === "ArrowRight") move("right");
});

undoButton.addEventListener("click", restoreState);

btnUp.addEventListener("click", () => move("up"));
btnDown.addEventListener("click", () => move("down"));
btnLeft.addEventListener("click", () => move("left"));
btnRight.addEventListener("click", () => move("right"));

/* ==============================
   Свайпы
   ============================== */

let startX, startY;

gridContainer.addEventListener("touchstart", e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
});

gridContainer.addEventListener("touchend", e => {
    const t = e.changedTouches[0];

    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) move("right");
        if (dx < -30) move("left");
    } else {
        if (dy > 30) move("down");
        if (dy < -30) move("up");
    }
});

/* ==============================
   СТАРТ ИГРЫ
   ============================== */

function start() {
    buildGrid();
    if (!loadGame()) {
        addRandomTile();
        addRandomTile();
        updateTiles();
    }
    loadLeaderboard();
}

start();
