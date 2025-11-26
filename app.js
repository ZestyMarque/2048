class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.history = [];

        this.container = document.getElementById('game-container');
        this.scoreEl = document.getElementById('score');
        this.undoBtn = document.getElementById('undo-btn');

        this.initBoard();
        this.newGame(); // начнёт игру
        this.bindEvents();
        this.loadSavedGame();
        this.updateLeaderboard();
        this.setupMobileControls();
    }

    initBoard() {
        this.container.innerHTML = '';
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            this.container.appendChild(cell);
        }
    }

    // Поворот матрицы по часовой на 90°
    rotateMatrix(matrix) {
        const n = matrix.length;
        const rotated = Array(n).fill().map(() => Array(n).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                rotated[j][n - 1 - i] = matrix[i][j];
            }
        }
        return rotated;
    }

    // Движение влево + подсчёт очков + возврат новых плиток для анимации
    slideLeft(row) {
        let arr = row.filter(v => v !== 0);
        let points = 0;
        const merged = [];

        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] === arr[i + 1]) {
                arr[i] *= 2;
                points += arr[i];
                merged.push(true);
                arr.splice(i + 1, 1);
                i--;
            } else {
                merged.push(false);
            }
        }
        while (merged.length < 4) merged.push(false);

        while (arr.length < 4) arr.push(0);
        return { arr, points, merged };
    }

    move(direction) {
        if (this.gameOver) return;

        let rotated = 0;
        let grid = this.grid.map(row => row.slice());

        // Поворачиваем сетку так, чтобы движение было влево
        if (direction === 'right') { grid = this.rotateMatrix(grid); grid = this.rotateMatrix(grid); rotated = 2; }
        else if (direction === 'down') { grid = this.rotateMatrix(grid); rotated = 1; }
        else if (direction === 'up') { grid = this.rotateMatrix(grid); grid = this.rotateMatrix(grid); grid = this.rotateMatrix(grid); rotated = 3; }

        let moved = false;
        let totalPoints = 0;
        const mergePositions = [];

        for (let i = 0; i < this.size; i++) {
            const result = this.slideLeft(grid[i]);
            if (grid[i].join() !== result.arr.join()) moved = true;
            grid[i] = result.arr;
            totalPoints += result.points;
            if (result.points > 0) {
                // Запоминаем, где было слияние
                for (let j = 0; j < this.size; j++) {
                    if (result.merged[j]) mergePositions.push({row: i, col: j});
                }
            }
        }

        // Возвращаем поворот
        for (let i = 0; i < rotated; i++) {
            grid = this.rotateMatrix(grid);
        }

        if (!moved) return;

        this.saveState();
        this.grid = grid;
        this.score += totalPoints;

        // Анимация: сначала двигаем, потом добавляем новые
        this.render(true, mergePositions);

        // Новая плитка
        setTimeout(() => {
            this.addRandomTile();
            this.render();
            if (this.isGameOver()) this.showGameOver();
        }, 160);
    }

    addRandomTile() {
        const empty = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) empty.push({i, j});
            }
        }
        if (empty.length === 0) return;
        const pos = empty[Math.floor(Math.random() * empty.length)];
        this.grid[pos.i][pos.j] = Math.random() < 0.9 ? 2 : 4;
    }

    render(withMovement = false, mergePositions = []) {
        // Удаляем старые плитки
        document.querySelectorAll('.tile').forEach(t => t.remove());

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const value = this.grid[i][j];
                if (value === 0) continue;

                const tile = document.createElement('div');
                tile.className = `tile tile-${value} tile-position-${i}-${j}`;
                tile.textContent = value;

                // Позиционирование
                tile.style.transform = `translate(${j * 116}px, ${i * 116}px)`;

                // Анимация появления
                if (!withMovement) {
                    tile.classList.add('new');
                }

                // Анимация слияния
                const isMerge = mergePositions.some(p => p.row === i && p.col === j);
                if (isMerge) tile.classList.add('merged');

                this.container.appendChild(tile);
            }
        }

        this.scoreEl.textContent = this.score;
        this.undoBtn.disabled = this.history.length === 0 || this.gameOver;
    }

    isGameOver() {
        if (this.grid.flat().includes(0)) return false;
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const v = this.grid[i][j];
                if (i < 3 && this.grid[i+1][j] === v) return false;
                if (j < 3 && this.grid[i][j+1] === v) return false;
            }
        }
        return true;
    }

    saveState() {
        this.history.push({
            grid: this.grid.map(r => r.slice()),
            score: this.score
        });
        if (this.history.length > 50) this.history.shift();
        this.saveToStorage();
    }

    undo() {
        if (this.gameOver || this.history.length === 0) return;
        const prev = this.history.pop();
        this.grid = prev.grid;
        this.score = prev.score;
        this.gameOver = false;
        this.render();
        this.saveToStorage();
    }

    newGame() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(0));
        this.score = 0;
        this.gameOver = false;
        this.history = [];
        document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden'));
        this.addRandomTile();
        this.addRandomTile();
        this.render();
        this.saveToStorage();
    }

    showGameOver() {
        this.gameOver = true;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    saveScore() {
        const name = document.getElementById('player-name').value.trim() || 'Аноним';
        const leaders = JSON.parse(localStorage.getItem('2048_leaders') || '[]');
        leaders.push({ name, score: this.score, date: new Date().toLocaleDateString('ru-RU') });
        leaders.sort((a,b) => b.score - a.score);
        localStorage.setItem('2048_leaders', JSON.stringify(leaders.slice(0,10)));
        document.getElementById('name-input-container').classList.add('hidden');
        document.getElementById('saved-message').classList.remove('hidden');
        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const tbody = document.querySelector('#leaders-table tbody');
        tbody.innerHTML = '';
        const leaders = JSON.parse(localStorage.getItem('2048_leaders') || '[]');
        leaders.forEach((l, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i+1}</td><td>${l.name}</td><td>${l.score}</td><td>${l.date}</td>`;
            tbody.appendChild(tr);
        });
    }

    saveToStorage() {
        localStorage.setItem('2048_save', JSON.stringify({
            grid: this.grid,
            score: this.score
        }));
    }

    loadSavedGame() {
        const saved = localStorage.getItem('2048_save');
        if (saved) {
            const data = JSON.parse(saved);
            this.grid = data.grid;
            this.score = data.score;
            this.render();
        }
    }

    setupMobileControls() {
        if ('ontouchstart' in window || window.innerWidth <= 768) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }
    }

    bindEvents() {
        document.addEventListener('keydown', e => {
            const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
            if (map[e.key]) {
                e.preventDefault();
                this.move(map[e.key]);
            }
        });

        // Свайпы
        let startX, startY;
        this.container.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        this.container.addEventListener('touchend', e => {
            if (!startX || !startY) return;
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.move(dx > 0 ? 'right' : 'left');
            } else {
                this.move(dy > 0 ? 'down' : 'up');
            }
            startX = startY = null;
        });

        document.getElementById('new-game-btn').onclick = () => this.newGame();
        document.getElementById('undo-btn').onclick = () => this.undo();
        document.getElementById('save-score').onclick = () => this.saveScore();
        document.getElementById('restart-after-gameover').onclick = () => this.newGame();
        document.getElementById('leaderboard-btn').onclick = () => {
            this.updateLeaderboard();
            document.getElementById('leaderboard-overlay').classList.remove('hidden');
        };
        document.getElementById('close-leaderboard').onclick = () => {
            document.getElementById('leaderboard-overlay').classList.add('hidden');
        };

        document.querySelectorAll('#mobile-controls button').forEach(btn => {
            btn.onclick = () => this.move(btn.dataset.dir);
        });
    }
}

// Запуск
new Game2048();
