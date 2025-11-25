// script.js — полный игровой движок 2048, соответствующий требованиям
document.addEventListener('DOMContentLoaded', () => {
  const SIZE = 4;
  const CELLS = SIZE * SIZE;

  const gridEl = document.getElementById('grid');
  const scoreEl = document.getElementById('score');
  const undoBtn = document.getElementById('undoBtn');
  const restartBtn = document.getElementById('restartBtn');
  const leaderBtn = document.getElementById('leaderBtn');
  const mobileControls = document.getElementById('mobileControls');
  const upBtn = document.getElementById('upBtn');
  const downBtn = document.getElementById('downBtn');
  const leftBtn = document.getElementById('leftBtn');
  const rightBtn = document.getElementById('rightBtn');

  const gameOverModal = document.getElementById('gameOverModal');
  const leaderModal = document.getElementById('leaderModal');
  const modalMessage = document.getElementById('modalMessage');
  const playerName = document.getElementById('playerName');
  const saveScoreBtn = document.getElementById('saveScoreBtn');
  const modalRestartBtn = document.getElementById('modalRestartBtn');
  const submitArea = document.getElementById('submitArea');
  const savedMessage = document.getElementById('savedMessage');
  const leaderTableBody = document.querySelector('#leaderTable tbody');
  const closeLeader = document.getElementById('closeLeader');

  // DOM: background cells (visual grid) will be static; tiles rendered absolutely
  const tilePool = []; // absolute positioned tiles
  const bgCells = []; // background placeholders (static)

  // game state
  let board = new Array(CELLS).fill(0);
  let score = 0;
  let undoState = null; // { board: [], score: number, playing: bool }
  let playing = true; // if false, no moves permitted
  let animTimer = null;

  // storage keys
  const STORAGE_GAME = 'lab2048_game_v1';
  const STORAGE_LEADERS = 'lab2048_leaders_v1';

  // small helpers
  const idx = (r, c) => r * SIZE + c;
  const rc = i => [Math.floor(i / SIZE), i % SIZE];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- persistence ----------
  function saveGameToStorage() {
    try {
      localStorage.setItem(STORAGE_GAME, JSON.stringify({ board, score, playing }));
    } catch (e) { /* ignore storage errors */ }
  }
  function loadGameFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_GAME);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.board) && typeof parsed.score === 'number') {
        board = parsed.board.slice(0, CELLS).concat(new Array(Math.max(0, CELLS - parsed.board.length)).fill(0));
        score = parsed.score;
        playing = !!parsed.playing;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function loadLeaders() {
    try {
      const raw = localStorage.getItem(STORAGE_LEADERS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) { return []; }
  }
  function saveLeaders(list) {
    try { localStorage.setItem(STORAGE_LEADERS, JSON.stringify(list)); } catch (e) {}
  }
  function addLeader(name, points) {
    const list = loadLeaders();
    list.push({ name: name || '---', points: points, date: new Date().toISOString() });
    list.sort((a, b) => b.points - a.points);
    const top = list.slice(0, 10);
    saveLeaders(top);
  }

  // ---------- rendering ----------
  function createGrid() {
    // create background cells (static)
    for (let i = 0; i < CELLS; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('data-index', i);
      cell.textContent = ''; // don't put numbers inside background
      gridEl.appendChild(cell);
      bgCells.push(cell);
    }

    // create absolute-positioned tiles (one per cell for simplicity)
    for (let i = 0; i < CELLS; i++) {
      const tile = document.createElement('div');
      tile.className = 'tile hidden';
      tile.dataset.index = i;
      tile.style.position = 'absolute';
      tile.style.transition = 'transform .12s ease, left .12s ease, top .12s ease, opacity .12s ease';
      gridEl.appendChild(tile);
      tilePool.push(tile);
    }
  }

  function tileClassFor(val) {
    if (val === 0) return 'hidden';
    if (val <= 2048) return 'v' + val;
    return 'v2048';
  }

  // calculate position in px using percent + gaps: to remain responsive, position via calc in CSS
  // here we set left/top using CSS calc strings similar to what HTML used
  function render() {
    scoreEl.textContent = String(score);

    // hide all tiles then show those with values
    for (let i = 0; i < tilePool.length; i++) {
      const tile = tilePool[i];
      tile.className = 'tile hidden';
      tile.textContent = '';
      tile.style.left = '';
      tile.style.top = '';
      tile.style.opacity = '0';
    }

    for (let i = 0; i < CELLS; i++) {
      const val = board[i];
      if (!val) continue;
      const [r, c] = rc(i);
      const tile = tilePool[i]; // 1-to-1 mapping keeps it simple
      tile.textContent = String(val);
      tile.className = 'tile ' + tileClassFor(val);
      // position tile: we use percent position so it adapts
      tile.style.left = `calc(${c} * (100% / ${SIZE}) + ${ (c+1) * 12 }px)`;
      tile.style.top = `calc(${r} * (100% / ${SIZE}) + ${ (r+1) * 12 }px)`;
      tile.style.opacity = '1';
    }

    // hide/show mobile controls depending on modals
    const modalsShown = gameOverModal.classList.contains('show') || leaderModal.classList.contains('show');
    mobileControls.style.display = modalsShown ? 'none' : '';
  }

  // small animation helpers: add temporary classes on newly spawned or merged tiles
  function markNewTiles(indices) {
    indices.forEach(i => {
      const t = tilePool[i];
      if (!t) return;
      t.classList.add('new');
      setTimeout(() => t.classList.remove('new'), 200);
    });
  }
  function markMergedTiles(indices) {
    indices.forEach(i => {
      const t = tilePool[i];
      if (!t) return;
      t.classList.add('merged');
      setTimeout(() => t.classList.remove('merged'), 200);
    });
  }

  // ---------- game logic ----------
  function randomEmptyIndices() {
    const empties = [];
    for (let i = 0; i < CELLS; i++) if (board[i] === 0) empties.push(i);
    return empties;
  }

  // spawnCount defaults to 1, can be 1 or 2. valuePick: 90% 2, 10% 4 (typical)
  function spawnNew(spawnCount = 1) {
    const empties = randomEmptyIndices();
    if (empties.length === 0) return [];
    const places = shuffle(empties).slice(0, Math.min(spawnCount, empties.length));
    const newIndices = [];
    for (const p of places) {
      const v = Math.random() < 0.1 ? 4 : 2;
      board[p] = v;
      newIndices.push(p);
    }
    return newIndices;
  }

  // start fresh game
  function newGame() {
    board = new Array(CELLS).fill(0);
    score = 0;
    playing = true;
    undoState = null;
    // spawn 1..3 initial tiles
    const initial = Math.floor(Math.random() * 3) + 1; // 1..3
    spawnNew(initial);
    saveGameToStorage();
    render();
  }

  // push current state to undo (only one level)
  function pushUndo() {
    undoState = { board: board.slice(), score, playing };
  }
  function canUndo() {
    return undoState !== null && playing; // undo disallowed after game finished
  }
  function doUndo() {
    if (!canUndo()) return;
    board = undoState.board.slice();
    score = undoState.score;
    playing = undoState.playing;
    undoState = null;
    saveGameToStorage();
    render();
  }

  // helpers for compressing & merging a row/column array (length SIZE)
  // returns {newArr, gainedScore, mergedIndices} where mergedIndices are positions in original array AFTER compression
  function compressAndMergeLine(line) {
    // filter zeros
    const filtered = line.filter(v => v !== 0);
    const missing = SIZE - filtered.length;
    const zeros = Array(missing).fill(0);
    // first compress left
    let arr = filtered.concat(zeros);

    let gained = 0;
    const mergedPositions = []; // indices where result has merged tile (positions in final array)
    for (let i = 0; i < SIZE - 1; i++) {
      if (arr[i] !== 0 && arr[i] === arr[i + 1]) {
        arr[i] = arr[i] + arr[i + 1];
        arr[i + 1] = 0;
        gained += arr[i];
        mergedPositions.push(i);
      }
    }
    // compress again after merges
    const filtered2 = arr.filter(v => v !== 0);
    const zeros2 = Array(SIZE - filtered2.length).fill(0);
    const finalArr = filtered2.concat(zeros2);

    return { newArr: finalArr, gainedScore: gained, mergedPositions };
  }

  // move functions: each will return an object with info whether board changed and indices of merged tiles
  function moveLeftLogic() {
    let moved = false;
    let totalGained = 0;
    const mergedAbsolute = []; // indices in board that were result of merge
    for (let r = 0; r < SIZE; r++) {
      const line = [];
      for (let c = 0; c < SIZE; c++) line.push(board[idx(r, c)]);
      const { newArr, gainedScore, mergedPositions } = compressAndMergeLine(line);
      totalGained += gainedScore;
      for (let c = 0; c < SIZE; c++) {
        if (board[idx(r, c)] !== newArr[c]) moved = true;
        board[idx(r, c)] = newArr[c];
      }
      // mergedPositions are positions in final array -> convert to absolute indices
      mergedPositions.forEach(pos => mergedAbsolute.push(idx(r, pos)));
    }
    return { moved, gained: totalGained, merged: mergedAbsolute };
  }

  function moveRightLogic() {
    let moved = false;
    let totalGained = 0;
    const mergedAbsolute = [];
    for (let r = 0; r < SIZE; r++) {
      const line = [];
      for (let c = SIZE - 1; c >= 0; c--) line.push(board[idx(r, c)]);
      const { newArr, gainedScore, mergedPositions } = compressAndMergeLine(line);
      totalGained += gainedScore;
      // newArr is left-compressed for reversed line; we need to write it reversed back
      for (let k = 0; k < SIZE; k++) {
        const val = newArr[k];
        const c = SIZE - 1 - k;
        if (board[idx(r, c)] !== val) moved = true;
        board[idx(r, c)] = val;
      }
      // convert mergedPositions in reversed array: merged at pos k corresponds to column (SIZE-1 - k) after writing
      mergedPositions.forEach(k => mergedAbsolute.push(idx(r, SIZE - 1 - k)));
    }
    return { moved, gained: totalGained, merged: mergedAbsolute };
  }

  function moveUpLogic() {
    let moved = false;
    let totalGained = 0;
    const mergedAbsolute = [];
    for (let c = 0; c < SIZE; c++) {
      const line = [];
      for (let r = 0; r < SIZE; r++) line.push(board[idx(r, c)]);
      const { newArr, gainedScore, mergedPositions } = compressAndMergeLine(line);
      totalGained += gainedScore;
      for (let r = 0; r < SIZE; r++) {
        if (board[idx(r, c)] !== newArr[r]) moved = true;
        board[idx(r, c)] = newArr[r];
      }
      mergedPositions.forEach(pos => mergedAbsolute.push(idx(pos, c)));
    }
    return { moved, gained: totalGained, merged: mergedAbsolute };
  }

  function moveDownLogic() {
    let moved = false;
    let totalGained = 0;
    const mergedAbsolute = [];
    for (let c = 0; c < SIZE; c++) {
      const line = [];
      for (let r = SIZE - 1; r >= 0; r--) line.push(board[idx(r, c)]);
      const { newArr, gainedScore, mergedPositions } = compressAndMergeLine(line);
      totalGained += gainedScore;
      for (let k = 0; k < SIZE; k++) {
        const r = SIZE - 1 - k;
        if (board[idx(r, c)] !== newArr[k]) moved = true;
        board[idx(r, c)] = newArr[k];
      }
      mergedPositions.forEach(k => mergedAbsolute.push(idx(SIZE - 1 - k, c)));
    }
    return { moved, gained: totalGained, merged: mergedAbsolute };
  }

  function anyMovesAvailable() {
    // any empty cell?
    if (board.some(v => v === 0)) return true;
    // any possible merges horizontally or vertically?
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE - 1; c++) {
        if (board[idx(r, c)] === board[idx(r, c + 1)]) return true;
      }
    }
    for (let c = 0; c < SIZE; c++) {
      for (let r = 0; r < SIZE - 1; r++) {
        if (board[idx(r, c)] === board[idx(r + 1, c)]) return true;
      }
    }
    return false;
  }

  function checkForWin() {
    return board.some(v => v === 2048);
  }

  function checkForGameOver() {
    if (!anyMovesAvailable()) return true;
    return false;
  }

  // top-level move handler
  function performMove(direction) {
    if (!playing) return;
    // compute logic on a cloned board to detect changes; but our moveLogic mutates board - so push undo before we change
    pushUndo();

    let res;
    if (direction === 'left') res = moveLeftLogic();
    else if (direction === 'right') res = moveRightLogic();
    else if (direction === 'up') res = moveUpLogic();
    else if (direction === 'down') res = moveDownLogic();
    else return;

    if (!res.moved) {
      // restore undo because no actual change occurred
      undoState = null;
      return;
    }

    score += res.gained;
    // after successful move, spawn 1 or 2 tiles (most often 1, sometimes 2)
    const spawnCount = Math.random() < 0.15 ? 2 : 1;
    const newIndices = spawnNew(spawnCount);

    // animations: mark merged tiles as merged (they are at indices res.merged), mark new tiles as new
    markMergedTiles(res.merged);
    markNewTiles(newIndices);

    saveGameToStorage();
    render();

    if (checkForWin()) {
      // win: show modal but allow save as finishing is considered end. We'll use same modal for finish.
      playing = false;
      showGameOverModal('You WIN!');
    } else if (checkForGameOver()) {
      // lose
      playing = false;
      showGameOverModal('You LOSE!');
    }
  }

  // ---------- UI & modals ----------
  function showGameOverModal(message) {
    modalMessage.textContent = message;
    submitArea.style.display = '';
    savedMessage.classList.add('hidden');
    playerName.value = '';
    gameOverModal.classList.add('show');
    gameOverModal.style.visibility = 'visible';
    // hide mobile controls while modal shown
    mobileControls.style.display = 'none';
  }
  function hideGameOverModal() {
    gameOverModal.classList.remove('show');
    gameOverModal.style.visibility = '';
    mobileControls.style.display = '';
  }

  function showLeaderModal() {
    renderLeaders();
    leaderModal.classList.add('show');
    leaderModal.style.visibility = 'visible';
    mobileControls.style.display = 'none';
  }
  function hideLeaderModal() {
    leaderModal.classList.remove('show');
    leaderModal.style.visibility = '';
    mobileControls.style.display = '';
  }

  function renderLeaders() {
    // clear tbody
    while (leaderTableBody.firstChild) leaderTableBody.removeChild(leaderTableBody.firstChild);
    const list = loadLeaders();
    for (const item of list) {
      const tr = document.createElement('tr');
      const tdName = document.createElement('td');
      tdName.textContent = item.name;
      const tdPoints = document.createElement('td');
      tdPoints.textContent = String(item.points);
      const tdDate = document.createElement('td');
      // show readable date
      try {
        tdDate.textContent = new Date(item.date).toLocaleString();
      } catch (e) {
        tdDate.textContent = item.date;
      }
      tr.appendChild(tdName);
      tr.appendChild(tdPoints);
      tr.appendChild(tdDate);
      leaderTableBody.appendChild(tr);
    }
  }

  // ---------- input handling ----------
  function handleKey(e) {
    if (!playing) return;
    switch (e.key) {
      case 'ArrowLeft': performMove('left'); break;
      case 'ArrowRight': performMove('right'); break;
      case 'ArrowUp': performMove('up'); break;
      case 'ArrowDown': performMove('down'); break;
      case 'z': // optional: ctrl+z can be used
        if (e.ctrlKey) doUndo();
        break;
    }
  }
  document.addEventListener('keydown', handleKey);

  // mobile button handlers
  upBtn.addEventListener('click', () => performMove('up'));
  downBtn.addEventListener('click', () => performMove('down'));
  leftBtn.addEventListener('click', () => performMove('left'));
  rightBtn.addEventListener('click', () => performMove('right'));

  // undo, restart, leader buttons
  undoBtn.addEventListener('click', () => {
    doUndo();
  });
  restartBtn.addEventListener('click', () => {
    newGame();
    hideGameOverModal();
    hideLeaderModal();
  });
  leaderBtn.addEventListener('click', () => {
    showLeaderModal();
  });

  closeLeader.addEventListener('click', () => hideLeaderModal());

  // modal buttons: save score and restart
  saveScoreBtn.addEventListener('click', () => {
    const name = (playerName.value || '').trim();
    addLeader(name, score);
    savedMessage.classList.remove('hidden');
    submitArea.style.display = 'none';
    saveLeaders(loadLeaders()); // ensure top-10 saved
    renderLeaders();
  });
  modalRestartBtn.addEventListener('click', () => {
    newGame();
    hideGameOverModal();
  });

  // clicking outside modal closes it
  [gameOverModal, leaderModal].forEach(mod => {
    mod.addEventListener('click', (ev) => {
      if (ev.target === mod) {
        mod.classList.remove('show');
        mod.style.visibility = '';
        mobileControls.style.display = '';
      }
    });
  });

  // ---------- swipe support for mobile ----------
  (function addSwipe() {
    let startX = 0, startY = 0, startTime = 0;
    const threshold = 30; // minimal px for swipe
    gridEl.addEventListener('touchstart', (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });
    gridEl.addEventListener('touchend', (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const dt = Date.now() - startTime;
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) performMove('right'); else performMove('left');
      } else {
        if (dy > 0) performMove('down'); else performMove('up');
      }
    }, { passive: true });
  })();

  // ---------- initialization ----------
  createGrid();

  // try to restore saved game; if none, start new
  if (!loadGameFromStorage()) {
    newGame();
  } else {
    // if loaded, ensure score & playing reflect stored values
    scoreEl.textContent = String(score);
    render();
  }

  // periodic re-render (colors / positions) to ensure responsive layout on resize
  window.addEventListener('resize', render);

  // ensure mobile controls hidden when viewing modals
  // initial visibility
  mobileControls.style.display = leaderModal.classList.contains('show') || gameOverModal.classList.contains('show') ? 'none' : '';

  // expose newGame to console for debugging if needed (but not necessary)
  window.__lab2048 = { newGame };

  // ensure save on unload
  window.addEventListener('beforeunload', saveGameToStorage);
});
