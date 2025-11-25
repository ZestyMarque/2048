document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game-board');
    const scoreDisplay = document.getElementById('score');
    const undoBtn = document.getElementById('undo-btn');
    const restartBtn = document.getElementById('restart-btn');
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const gameOverModal = document.getElementById('game-over-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const finalScoreEl = document.getElementById('final-score');
    const nameInputSection = document.getElementById('name-input-section');
    const savedMessage = document.getElementById('saved-message');
    const playerNameInput = document.getElementById('player-name');
    const saveScoreBtn = document.getElementById('save-score-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard');

    const ROWS = 4, COLS = 4;
    let tiles = [];
    let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    let score = 0;
    let previousState = null;
    let canUndo = true;
    let gameOver = false;

    // Создание плиток
    function createTile(value, row, col) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        const span = document.createElement('span');
        tile.appendChild(span);
        updateTileValue(tile, value);
        tile.style.gridRow = row + 1;
        tile.style.gridColumn = col + 1;
        grid.appendChild(tile);
        return tile;
    }

    function updateTileValue(tile, value) {
        const span = tile.querySelector('span');
        if (value === 0) {
            span.textContent = '';
            tile.className = 'tile';
        } else {
            span.textContent = value;
            tile.className = `tile tile-${value}`;
        }
    }

    function initBoard() {
        grid.innerHTML = '';
        tiles = [];
        board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
        score = 0;
        scoreDisplay.textContent = score;
        gameOver = false;
        canUndo = true;
        updateUndoButton();

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                tiles.push(createTile(0, r, c));
            }
        }

        addRandomTile();
        addRandomTile();
        saveState();
    }

    function saveState() {
        previousState = {
            board: board.map(row => [...row]),
            score: score
        };
    }

    function undo() {
        if (!previousState || !canUndo || gameOver) return;
        board = previousState.board.map(row => [...row]);
        score = previousState.score;
        scoreDisplay.textContent = score;
        render();
        canUndo = false;
        updateUndoButton();
    }

    function updateUndoButton() {
        undoBtn.disabled = !canUndo || gameOver;
    }

    function addRandomTile() {
        const empty = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] === 0) empty.push({r, c});
            }
        }
        if (empty.length === 0) return false;

        const {r, c} = empty[Math.floor(Math.random() * empty.length)];
        board[r][c] = Math.random() < 0.9 ? 2 : 4;
        const tile = tiles[r * COLS + c];
        updateTileValue(tile, board[r][c]);
        tile.classList.add('tile-new');
        setTimeout(() => tile.classList.remove('tile-new'), 300);
        return true;
    }

    function move(direction) {
        if (gameOver) return;
        saveState();
        canUndo = true;
        updateUndoButton();

        let moved = false;
        let addScore = 0;

        const traverse = {
            left: () => { for (let r = 0; r < ROWS; r++) moved |= slide(board[r], addScore); },
            right: () => { for (let r = 0; r < ROWS; r++) { board[r].reverse(); moved |= slide(board[r], addScore); board[r].reverse(); } },
            up: () => { for (let c = 0; c < COLS; c++) { const col = board.map(row => row[c]); moved |= slide(col, addScore); for (let r = 0; r < ROWS; r++) board[r][c] = col[r]; } },
            down: () => { for (let c = 0; c < COLS; c++) { const col = board.map(row => row[c]); col.reverse(); moved |= slide(col, addScore); col.reverse(); for (let r = 0; r < ROWS; r++) board[r][c] = col[r]; } }
        };

        traverse[direction]();
        if (moved) {
            score += addScore;
            scoreDisplay.textContent = score;
            addRandomTile();
            render();
            checkGameOver();
        }
    }

    function slide(line, scoreRef) {
        let moved = false;
        const filtered = line.filter(val => val);
        const missing = COLS - filtered.length;
        const zeros = Array(missing).fill(0);
        const newLine = direction === 'right' || direction === 'down' ? zeros.concat(filtered) : filtered.concat(zeros);

        for (let i = 0; i < COLS - 1; i++) {
            if (newLine[i] && newLine[i] === newLine[i + 1]) {
                newLine[i] *= 2;
                newLine[i + 1] = 0;
                scoreRef += newLine[i];
                moved = true;
            }
        }

        const final = newLine.filter(val => val);
        const finalMissing = COLS - final.length;
        const result = direction === 'right' || direction === 'down' ? Array(finalMissing).fill(0).concat(final) : final.concat(Array(finalMissing).fill(0));

        if (JSON.stringify(line) !== JSON.stringify(result)) {
            Object.assign(line, result);
            moved = true;
        }
        return moved;
    }

    function render() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tile = tiles[r * COLS + c];
                const value = board[r][c];
                updateTileValue(tile, value);
                if (value !== 0) {
                    tile.classList.add('tile-appear');
                }
            }
        }
    }

    function checkGameOver() {
        let hasEmpty = board.flat().includes(0);
        if (hasEmpty) return;

        const directions = ['left', 'right', 'up', 'down'];
        for (const dir of directions) {
            const temp = board.map(row => [...row]);
            move(dir);
            if (JSON.stringify(temp) !== JSON.stringify(board)) {
                board = temp;
                return;
            }
        }

        gameOver = true;
        finalScoreEl.textContent = score;
        gameOverModal.classList.remove('hidden');
    }

    function saveScore() {
        const name = playerNameInput.value.trim() || "Аноним";
        const record = { name, score, date: new Date().toLocaleDateString('ru-RU') };
        let leaderboard = JSON.parse(localStorage.getItem('2048-leaderboard') || '[]');
        leaderboard.push(record);
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem('2048-leaderboard', JSON.stringify(leaderboard));
        nameInputSection.classList.add('hidden');
        savedMessage.classList.remove('hidden');
        updateLeaderboard();
    }

    function updateLeaderboard() {
        const tbody = document.querySelector('#leaderboard-table tbody');
        tbody.innerHTML = '';
        const leaderboard = JSON.parse(localStorage.getItem('2048-leaderboard') || '[]');
        leaderboard.forEach((entry, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i + 1}</td><td>${entry.name}</td><td>${entry.score}</td><td>${entry.date}</td>`;
            tbody.appendChild(tr);
        });
    }

    // Управление
    document.addEventListener('keydown', e => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            move(e.key.replace('Arrow', '').toLowerCase());
        }
    });

    document.querySelectorAll('#mobile-controls button').forEach(btn => {
        btn.addEventListener('click', () => move(btn.dataset.dir));
    });

    // Свайпы
    let touchStartX = 0, touchStartY = 0;
    grid.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    grid.addEventListener('touchend', e => {
        if (!touchStartX || !touchStartY) return;
        const x = e.changedTouches[0].clientX;
        const y = e.changedTouches[0].clientY;
        const dx = x - touchStartX;
        const dy = y - touchStartY;
        if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
            if (Math.abs(dx) > Math.abs(dy)) {
                move(dx > 0 ? 'right' : 'left');
            } else {
                move(dy > 0 ? 'down' : 'up');
            }
        }
        touchStartX = touchStartY = 0;
    });

    // Кнопки
    restartBtn.addEventListener('click', initBoard);
    undoBtn.addEventListener('click', undo);
    playAgainBtn.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        nameInputSection.classList.remove('hidden');
        savedMessage.classList.add('hidden');
        playerNameInput.value = '';
        initBoard();
    });
    saveScoreBtn.addEventListener('click', saveScore);
    leaderboardBtn.addEventListener('click', () => {
        updateLeaderboard();
        leaderboardModal.classList.remove('hidden');
    });
    closeLeaderboardBtn.addEventListener('click', () => {
        leaderboardModal.classList.add('hidden');
    });

    // Старт
    initBoard();
    updateLeaderboard();
});
