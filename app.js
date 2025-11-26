class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.gameOver = false;
        this.canUndo = false;
        this.previousState = null; // для undo

        // DOM-элементы
        this.container = document.getElementById('game-container');
        this.scoreElement = document.getElementById('score');
        this.undoButton = document.getElementById('undo-btn');
        this.newGameButton = document.getElementById('new-game-btn');

        this.setupBoard();
        this.startNewGame();
        this.bindEvents();
        this.loadFromLocalStorage();
    }

    createEmptyGrid() {
        return Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    }

    setupBoard() {
        // Создаём 16 ячеек фона
        this.container.innerHTML = '';
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                this.container.appendChild(cell);
            }
        }
    }

    // Сохраняем состояние перед ходом
    savePreviousState() {
        this.previousState = {
            grid: this.grid.map(row => row.slice()),
            score: this.score
        };
        this.canUndo = true;
    }

    // Отмена хода
    undo() {
        if (!this.canUndo || this.gameOver || !this.previousState) return;

        this.grid = this.previousState.grid.map(row => row.slice());
        this.score = this.previousState.score;
        this.gameOver = false;
        this.canUndo = false;

        this.render();
        this.saveToLocalStorage();
    }

    // Добавление случайной плитки (2 или 4)
    addRandomTile() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }

        if (emptyCells.length === 0) return false;

        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.grid[row][col] = Math.random() < 0.9 ? 2 : 4;
        return true;
    }

    // Основная функция движения
    move(direction) {
        if (this.gameOver) return;

        this.savePreviousState();

        let hasMoved = false;
        let addedScore = 0;

        // Поворачиваем сетку, чтобы всегда двигать влево
        let tempGrid = this.copyGrid(this.grid);

        if (direction === 'up')    tempGrid = this.rotateClockwise(tempGrid, 3);
        if (direction === 'down')  tempGrid = this.rotateClockwise(tempGrid, 1);
        if (direction === 'right') tempGrid = this.rotateClockwise(tempGrid, 2);

        // Двигаем влево
        for (let i = 0; i < this.size; i++) {
            const { newRow, score: rowScore, moved: rowMoved } = this.slideAndMerge(tempGrid[i]);
            tempGrid[i] = newRow;
            addedScore += rowScore;
            if (rowMoved) hasMoved = true;
        }

        // Поворачиваем обратно
        if (direction === 'up')    tempGrid = this.rotateClockwise(tempGrid, 1);
        if (direction === 'down')  tempGrid = this.rotateClockwise(tempGrid, 3);
        if (direction === 'right') tempGrid = this.rotateClockwise(tempGrid, 2);

        if (!hasMoved) {
            this.canUndo = false; // ход не состоялся — откатывать нечего
            return;
        }

        this.grid = tempGrid;
        this.score += addedScore;

        // Добавляем новую плитку
        this.addRandomTile();

        this.render();

        // Проверяем конец игры
        if (this.isGameOver()) {
            this.gameOver = true;
            setTimeout(() => this.showGameOver(), 300);
        }

        this.saveToLocalStorage();
    }

    // Сдвиг и слияние одной строки влево
    slideAndMerge(row) {
        // Убираем нули
        let filtered = row.filter(val => val !== 0);
        let score = 0;
        let moved = false;

        // Слияние
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                score += filtered[i];
                filtered.splice(i + 1, 1);
                moved = true;
                i--; // проверяем следующую пару
            }
        }

        // Дополняем нулями
        while (filtered.length < this.size) {
            filtered.push(0);
        }

        // Проверяем, изменилась ли строка
        const originalWithoutZeroes = row.filter(v => v !== 0);
        if (originalWithoutZeroes.join() !== filtered.slice(0, originalWithoutZeroes.length).join()) {
            moved = true;
        }

        return { newRow: filtered, score, moved };
    }

    // Поворот матрицы по часовой (количество раз)
    rotateClockwise(grid, times = 1) {
        let result = this.copyGrid(grid);
        for (let t = 0; t < times; t++) {
            const n = result.length;
            const rotated = this.createEmptyGrid();
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    rotated[j][n - 1 - i] = result[i][j];
                }
            }
            result = rotated;
        }
        return result;
    }

    copyGrid(grid) {
        return grid.map(row => row.slice());
    }

    // Проверка на конец игры
    isGameOver() {
        // Есть пустые клетки?
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === 0) return false;
            }
        }

        // Есть ли возможные слияния?
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const val = this.grid[i][j];
                if (i < 3 && this.grid[i + 1][j] === val) return false;
                if (j < 3 && this.grid[i][j + 1] === val) return false;
            }
        }

        return true;
    }

    // Отрисовка поля
    render() {
        // Удаляем все плитки
        document.querySelectorAll('.tile').forEach(tile => tile.remove());

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const value = this.grid[i][j];
                if (value === 0) continue;

                const tile = document.createElement('div');
                tile.className = `tile tile-${value}`;
                tile.textContent = value;

                // Позиция с учётом отступов (116px = 106px плитка + 10px отступ)
                tile.style.transform = `translate(${j * 116}px, ${i * 116}px)`;

                // Анимация появления
                tile.classList.add('tile-new');
                setTimeout(() => tile.classList.remove('tile-new'), 50);

                this.container.appendChild(tile);
            }
        }

        this.scoreElement.textContent = this.score;
        this.undoButton.disabled = !this.canUndo || this.gameOver;
    }

    // Новая игра
    startNewGame() {
        this.grid = this.createEmptyGrid();
        this.score = 0;
        this.gameOver = false;
        this.canUndo = false;
        this.previousState = null;

        document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));

        this.addRandomTile();
        this.addRandomTile();
        this.render();
        this.saveToLocalStorage();
    }

    showGameOver() {
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over-overlay').classList.remove('hidden');
    }

    // Сохранение рекорда
    saveRecord() {
        const name = document.getElementById('player-name').value.trim() || 'Аноним';
        const record = {
            name,
            score: this.score,
            date: new Date().toLocaleDateString('ru-RU')
        };

        let leaders = JSON.parse(localStorage.getItem('2048_leaders') || '[]');
        leaders.push(record);
        leaders.sort((a, b) => b.score - a.score);
        leaders = leaders.slice(0, 10);

        localStorage.setItem('2048_leaders', JSON.stringify(leaders));

        document.getElementById('name-input-container').classList.add('hidden');
        document.getElementById('saved-message').classList.remove('hidden');

        this.updateLeaderboard();
    }

    updateLeaderboard() {
        const tbody = document.querySelector('#leaders-table tbody');
        tbody.innerHTML = '';
        const leaders = JSON.parse(localStorage.getItem('2048_leaders') || '[]');

        leaders.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.score}</td>
                <td>${entry.date}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Сохранение и загрузка игры
    saveToLocalStorage() {
        const saveData = {
            grid: this.grid,
            score: this.score,
            canUndo: this.canUndo,
            previousState: this.previousState
        };
        localStorage.setItem('2048_current_game', JSON.stringify(saveData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('2048_current_game');
        if (!saved) return;

        try {
            const data = JSON.parse(saved);
            this.grid = data.grid || this.createEmptyGrid();
            this.score = data.score || 0;
            this.canUndo = data.canUndo || false;
            this.previousState = data.previousState;

            this.render();
        } catch (e) {
            console.log('Ошибка загрузки сохранения');
        }
    }

    // Управление
    bindEvents() {
        // Клавиатура
        document.addEventListener('keydown', e => {
            const keyMap = {
                ArrowUp: 'up',
                ArrowDown: 'down',
                ArrowLeft: 'left',
                ArrowRight: 'right',
                w: 'up', s: 'down', a: 'left', d: 'right',
                W: 'up', S: 'down', A: 'left', D: 'right'
            };

            if (keyMap[e.key]) {
                e.preventDefault();
                this.move(keyMap[e.key]);
            }
        });

        // Свайпы
        let touchStart = null;
        this.container.addEventListener('touchstart', e => {
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        this.container.addEventListener('touchend', e => {
            if (!touchStart) return;
            const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
            const dx = touchEnd.x - touchStart.x;
            const dy = touchEnd.y - touchStart.y;

            if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.move(dx > 0 ? 'right' : 'left');
                } else {
                    this.move(dy > 0 ? 'down' : 'up');
                }
            }
            touchStart = null;
        });

        // Кнопки
        this.newGameButton.onclick = () => this.startNewGame();
        this.undoButton.onclick = () => this.undo();
        document.getElementById('save-score').onclick = () => this.saveRecord();
        document.getElementById('restart-after-gameover').onclick = () => this.startNewGame();
        document.getElementById('leaderboard-btn').onclick = () => {
            this.updateLeaderboard();
            document.getElementById('leaderboard-overlay').classList.remove('hidden');
        };
        document.getElementById('close-leaderboard').onclick = () => {
            document.getElementById('leaderboard-overlay').classList.add('hidden');
        };

        // Мобильные кнопки
        document.querySelectorAll('#mobile-controls button').forEach(btn => {
            btn.addEventListener('click', () => this.move(btn.dataset.dir));
        });
    }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
