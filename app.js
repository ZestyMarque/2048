const size = 4;
let grid = [];
let previousGrid = null;
let score = 0;

const gridElement = document.getElementById("grid");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");

init();

function init() {
  loadGame();
  drawGrid();
  updateScore();
  drawLeaders();
  document.addEventListener("keydown", handleMove);
  document.getElementById("restart").addEventListener("click", newGame);
  document.getElementById("undo").addEventListener("click", undo);
}

function newGame() {
  grid = Array.from({ length: size }, () => Array(size).fill(0));
  score = 0;
  addRandomTiles(randomInt(1, 3));
  saveGame();
  drawGrid();
  updateScore();
}

function addRandomTiles(count) {
  for (let i = 0; i < count; i++) {
    let empty = [];
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (grid[r][c] === 0) empty.push({ r, c });

    if (empty.length === 0) return;

    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }
}

function drawGrid() {
  gridElement.textContent = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (grid[r][c] !== 0) {
        cell.textContent = grid[r][c];
        cell.classList.add("v" + grid[r][c]);
      }
      gridElement.appendChild(cell);
    }
  }
}

function handleMove(e) {
  const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
  if (!keys.includes(e.key)) return;

  previousGrid = JSON.parse(JSON.stringify(grid));
  let moved = false;

  if (e.key === "ArrowLeft") moved = moveLeft();
  if (e.key === "ArrowRight") moved = moveRight();
  if (e.key === "ArrowUp") moved = moveUp();
  if (e.key === "ArrowDown") moved = moveDown();

  if (moved) {
    addRandomTiles(randomInt(1, 2));
    saveGame();
    drawGrid();
    updateScore();
    if (isGameOver()) finishGame();
  }
}

function moveLeft() {
  let moved = false;
  for (let r = 0; r < size; r++) {
    let row = grid[r].filter(v => v !== 0);
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] === row[i + 1]) {
        row[i] *= 2;
        score += row[i];
        row[i + 1] = 0;
      }
    }
    row = row.filter(v => v !== 0);
    while (row.length < size) row.push(0);
    if (row.join() !== grid[r].join()) moved = true;
    grid[r] = row;
  }
  return moved;
}

function moveRight() {
  grid.forEach(row => row.reverse());
  const moved = moveLeft();
  grid.forEach(row => row.reverse());
  return moved;
}

function moveUp() {
  rotateLeft();
  const moved = moveLeft();
  rotateRight();
  return moved;
}

function moveDown() {
  rotateLeft();
  const moved = moveRight();
  rotateRight();
  return moved;
}

function rotateLeft() {
  grid = grid[0].map((_, i) => grid.map(r => r[i])).reverse();
}

function rotateRight() {
  grid = grid[0].map((_, i) => grid.map(r => r[r.length - 1 - i]));
}

function undo() {
  if (!previousGrid) return;
  grid = JSON.parse(JSON.stringify(previousGrid));
  previousGrid = null;
  drawGrid();
  saveGame();
}

function isGameOver() {
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
  return true;
}

function finishGame() {
  const name = prompt("Игра окончена! Введите имя:");
  if (!name) return;
  const leaders = JSON.parse(localStorage.getItem("leaders")) || [];
  leaders.push({ name, score, date: new Date().toLocaleDateString() });
  leaders.sort((a, b) => b.score - a.score);
  localStorage.setItem("leaders", JSON.stringify(leaders.slice(0, 10)));
  drawLeaders();
}

function drawLeaders() {
  const body = document.querySelector("#leaders tbody");
  body.textContent = "";
  const leaders = JSON.parse(localStorage.getItem("leaders")) || [];
  leaders.forEach(l => {
    const tr = document.createElement("tr");
    ["name", "score", "date"].forEach(k => {
      const td = document.createElement("td");
      td.textContent = l[k];
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function saveGame() {
  localStorage.setItem("grid", JSON.stringify(grid));
  localStorage.setItem("score", score);
  bestElement.textContent = Math.max(score, Number(localStorage.getItem("best") || 0));
  localStorage.setItem("best", bestElement.textContent);
}

function loadGame() {
  const saved = localStorage.getItem("grid");
  if (saved) {
    grid = JSON.parse(saved);
    score = Number(localStorage.getItem("score"));
  } else newGame();
}

function updateScore() {
  scoreElement.textContent = score;
  bestElement.textContent = localStorage.getItem("best") || 0;
}

function randomInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
