import { create2048Board, createMemoryDeck, move2048, snakeStep, spawn2048Tile } from './game-logic.js';

const homeView = document.querySelector('#home-view');
const gameView = document.querySelector('#game-view');
const gameStage = document.querySelector('#game-stage');
const scoreRow = document.querySelector('#score-row');
const toast = document.querySelector('#toast');
const installButton = document.querySelector('#install-button');
const bestKeys = { memory: 'vk998-best-memory', '2048': 'vk998-best-2048', snake: 'vk998-best-snake' };
let activeGame = null;
let gameTimer = null;
let toastTimer = null;
let installPrompt = null;
let memoryState = null;
let puzzleState = null;
let snakeState = null;

function readBest(game) {
  const score = Number(localStorage.getItem(bestKeys[game]) || 0);
  return Number.isFinite(score) ? score : 0;
}

function saveBest(game, score) {
  const previous = readBest(game);
  if (game === 'memory' ? (!previous || score < previous) : score > previous) localStorage.setItem(bestKeys[game], String(score));
  updateHomeBests();
}

function updateHomeBests() {
  for (const game of Object.keys(bestKeys)) {
    const node = document.querySelector(`#${CSS.escape(game)}-best-home`);
    if (!node) continue;
    const best = readBest(game);
    node.textContent = best ? (game === 'memory' ? `${best} moves` : best.toLocaleString()) : '—';
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

function setScoreBoxes(items) {
  scoreRow.innerHTML = items.map(({ label, value, id }) => `<div class="score-box"><span class="score-label">${label}</span><span class="score-value"${id ? ` id="${id}"` : ''}>${value}</span></div>`).join('');
}

function clearGameTimer() {
  if (gameTimer) clearInterval(gameTimer);
  gameTimer = null;
}

function showHome() {
  clearGameTimer();
  activeGame = null;
  gameView.hidden = true;
  homeView.hidden = false;
  updateHomeBests();
}

function openGame(game) {
  clearGameTimer();
  activeGame = game;
  homeView.hidden = true;
  gameView.hidden = false;
  const config = {
    memory: ['Memory Match', 'Find all 6 pairs.', '✿'],
    '2048': ['2048', 'Slide tiles together. Can you reach 2048?', '2048'],
    snake: ['Snake', 'Snack on the fruit. Stay on the board.', '〰'],
  }[game];
  document.querySelector('#game-title').textContent = config[0];
  document.querySelector('#game-subtitle').textContent = config[1];
  document.querySelector('#game-badge').textContent = config[2];
  document.querySelector('#game-hint').textContent = '';
  document.querySelector('#game-category').textContent = `${game === '2048' ? 'NUMBER' : game.toUpperCase()} GAME`;
  if (game === 'memory') startMemory();
  if (game === '2048') start2048();
  if (game === 'snake') startSnake();
}

function startMemory() {
  memoryState = { deck: createMemoryDeck(), flipped: [], matched: new Set(), moves: 0, locked: false };
  setScoreBoxes([{ label: 'MOVES', value: '0', id: 'memory-moves' }, { label: 'PAIRS FOUND', value: '0 / 6', id: 'memory-pairs' }, { label: 'BEST', value: readBest('memory') || '—' }]);
  gameStage.innerHTML = '<div class="memory-board" id="memory-board"></div><div class="game-actions"><button class="action-button" id="restart-memory">↻ &nbsp; New game</button></div>';
  const board = document.querySelector('#memory-board');
  memoryState.deck.forEach((card) => {
    const tile = document.createElement('button');
    tile.className = 'memory-card-tile';
    tile.dataset.id = String(card.id);
    tile.setAttribute('aria-label', 'Hidden card');
    tile.innerHTML = '<span aria-hidden="true">?</span>';
    tile.addEventListener('click', () => flipMemoryCard(card.id, tile));
    board.append(tile);
  });
  document.querySelector('#restart-memory').addEventListener('click', startMemory);
  document.querySelector('#game-hint').textContent = 'Tap two cards to reveal the matching pair.';
}

function flipMemoryCard(id, tile) {
  if (memoryState.locked || memoryState.flipped.includes(id) || memoryState.matched.has(id)) return;
  const card = memoryState.deck[id];
  tile.classList.add('flipped');
  tile.setAttribute('aria-label', card.symbol);
  tile.innerHTML = `<span aria-hidden="true">${card.symbol}</span>`;
  memoryState.flipped.push(id);
  if (memoryState.flipped.length < 2) return;
  memoryState.moves += 1;
  document.querySelector('#memory-moves').textContent = String(memoryState.moves);
  const [firstId, secondId] = memoryState.flipped;
  if (memoryState.deck[firstId].symbol === memoryState.deck[secondId].symbol) {
    memoryState.matched.add(firstId);
    memoryState.matched.add(secondId);
    for (const cardId of [firstId, secondId]) {
      const matchedTile = document.querySelector(`[data-id="${cardId}"]`);
      matchedTile.classList.add('matched');
      matchedTile.disabled = true;
    }
    document.querySelector('#memory-pairs').textContent = `${memoryState.matched.size / 2} / 6`;
    memoryState.flipped = [];
    if (memoryState.matched.size === memoryState.deck.length) {
      saveBest('memory', memoryState.moves);
      const best = readBest('memory');
      document.querySelector('#memory-pairs').textContent = '6 / 6';
      document.querySelector('#game-hint').textContent = `Lovely! All pairs in ${memoryState.moves} moves${memoryState.moves === best ? ' — a new best!' : '.'}`;
    }
    return;
  }
  memoryState.locked = true;
  setTimeout(() => {
    for (const cardId of [firstId, secondId]) {
      const hiddenTile = document.querySelector(`[data-id="${cardId}"]`);
      if (hiddenTile) {
        hiddenTile.classList.remove('flipped');
        hiddenTile.setAttribute('aria-label', 'Hidden card');
        hiddenTile.innerHTML = '<span aria-hidden="true">?</span>';
      }
    }
    memoryState.flipped = [];
    memoryState.locked = false;
  }, 750);
}

function start2048() {
  puzzleState = { board: create2048Board(), score: 0, over: false };
  setScoreBoxes([{ label: 'SCORE', value: '0', id: 'puzzle-score' }, { label: 'BEST', value: readBest('2048').toLocaleString(), id: 'puzzle-best' }]);
  gameStage.innerHTML = '<div class="board-2048" id="board-2048" role="grid" aria-label="2048 game board"></div><div class="control-row" aria-label="Move tiles"><button class="control-button" data-direction="up" aria-label="Move up">↑</button></div><div class="control-row"><button class="control-button" data-direction="left" aria-label="Move left">←</button><button class="control-button" data-direction="down" aria-label="Move down">↓</button><button class="control-button" data-direction="right" aria-label="Move right">→</button></div><div class="game-actions"><button class="action-button" id="restart-2048">↻ &nbsp; New game</button></div>';
  document.querySelectorAll('#game-stage [data-direction]').forEach((button) => button.addEventListener('click', () => movePuzzle(button.dataset.direction)));
  document.querySelector('#restart-2048').addEventListener('click', start2048);
  const board = document.querySelector('#board-2048');
  attachSwipe(board, movePuzzle);
  render2048();
  document.querySelector('#game-hint').textContent = 'Use arrow keys, swipe, or tap the arrows to move.';
}

function render2048() {
  const board = document.querySelector('#board-2048');
  if (!board || !puzzleState) return;
  board.innerHTML = puzzleState.board.map((value) => `<div class="tile-2048" role="gridcell" data-value="${value || ''}" aria-label="${value || 'empty'}">${value || ''}</div>`).join('');
  document.querySelector('#puzzle-score').textContent = puzzleState.score.toLocaleString();
  document.querySelector('#puzzle-best').textContent = readBest('2048').toLocaleString();
}

function movePuzzle(direction) {
  if (!puzzleState || puzzleState.over) return;
  const result = move2048(puzzleState.board, direction);
  if (!result.changed) return;
  puzzleState.board = result.board;
  puzzleState.score += result.gained;
  spawn2048Tile(puzzleState.board);
  saveBest('2048', puzzleState.score);
  render2048();
  if (puzzleState.board.includes(2048)) {
    puzzleState.over = true;
    document.querySelector('#game-hint').textContent = '2048! You did it. Start a new game for another round.';
  } else if (!canMove2048(puzzleState.board)) {
    puzzleState.over = true;
    document.querySelector('#game-hint').textContent = 'No moves left — tap New game for another round.';
  }
}

function canMove2048(board) {
  if (board.includes(0)) return true;
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
    const index = row * 4 + col;
    if (col < 3 && board[index] === board[index + 1]) return true;
    if (row < 3 && board[index] === board[index + 4]) return true;
  }
  return false;
}

function startSnake() {
  snakeState = { snake: [[8, 8], [7, 8], [6, 8]], direction: 'right', queued: 'right', food: [12, 8], score: 0, over: false };
  setScoreBoxes([{ label: 'SCORE', value: '0', id: 'snake-score' }, { label: 'BEST', value: readBest('snake').toLocaleString(), id: 'snake-best' }]);
  gameStage.innerHTML = '<div class="snake-canvas-wrap"><canvas class="snake-canvas" id="snake-canvas" width="384" height="384" aria-label="Snake game board"></canvas></div><div class="control-row"><button class="control-button" data-direction="up" aria-label="Move up">↑</button></div><div class="control-row"><button class="control-button" data-direction="left" aria-label="Move left">←</button><button class="control-button" data-direction="down" aria-label="Move down">↓</button><button class="control-button" data-direction="right" aria-label="Move right">→</button></div><div class="game-actions"><button class="action-button" id="restart-snake">↻ &nbsp; New game</button></div>';
  document.querySelectorAll('#game-stage [data-direction]').forEach((button) => button.addEventListener('click', () => queueSnakeDirection(button.dataset.direction)));
  document.querySelector('#restart-snake').addEventListener('click', () => { clearGameTimer(); startSnake(); });
  attachSwipe(document.querySelector('#snake-canvas'), (direction) => queueSnakeDirection(direction));
  renderSnake();
  document.querySelector('#game-hint').textContent = 'Swipe, use arrow keys, or tap the arrows to steer.';
  gameTimer = setInterval(tickSnake, 145);
}

function queueSnakeDirection(direction) {
  const reverse = { up: 'down', down: 'up', left: 'right', right: 'left' };
  if (snakeState && direction !== reverse[snakeState.direction]) snakeState.queued = direction;
}

function tickSnake() {
  if (!snakeState || snakeState.over) return;
  snakeState.direction = snakeState.queued;
  const result = snakeStep(snakeState.snake, snakeState.direction, 16, snakeState.food);
  if (result.collision) {
    snakeState.over = true;
    clearGameTimer();
    document.querySelector('#game-hint').textContent = `Bonk! Score: ${snakeState.score}. Tap New game to try again.`;
    return;
  }
  snakeState.snake = result.snake;
  if (result.ate) {
    snakeState.score += 1;
    const occupied = new Set(snakeState.snake.map(([x, y]) => `${x},${y}`));
    const free = [];
    for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) if (!occupied.has(`${x},${y}`)) free.push([x, y]);
    snakeState.food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    saveBest('snake', snakeState.score);
    document.querySelector('#snake-score').textContent = String(snakeState.score);
    document.querySelector('#snake-best').textContent = readBest('snake').toLocaleString();
  }
  renderSnake();
}

function renderSnake() {
  const canvas = document.querySelector('#snake-canvas');
  if (!canvas || !snakeState) return;
  const context = canvas.getContext('2d');
  const cell = canvas.width / 16;
  context.fillStyle = '#202129';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#292a33';
  context.lineWidth = 1;
  for (let index = 1; index < 16; index += 1) {
    context.beginPath(); context.moveTo(index * cell, 0); context.lineTo(index * cell, canvas.height); context.stroke();
    context.beginPath(); context.moveTo(0, index * cell); context.lineTo(canvas.width, index * cell); context.stroke();
  }
  if (snakeState.food) {
    context.fillStyle = '#f5a7c6';
    context.beginPath(); context.arc((snakeState.food[0] + .5) * cell, (snakeState.food[1] + .5) * cell, cell * .31, 0, Math.PI * 2); context.fill();
  }
  snakeState.snake.forEach(([x, y], index) => {
    context.fillStyle = index ? '#8fcb63' : '#c1f58b';
    const radius = cell * .28;
    context.beginPath(); context.roundRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4, radius); context.fill();
  });
}

function attachSwipe(element, onDirection) {
  if (!element) return;
  let start = null;
  element.addEventListener('pointerdown', (event) => { start = [event.clientX, event.clientY]; });
  element.addEventListener('pointerup', (event) => {
    if (!start) return;
    const dx = event.clientX - start[0];
    const dy = event.clientY - start[1];
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });
  element.addEventListener('pointercancel', () => { start = null; });
}

document.querySelectorAll('[data-game]').forEach((button) => button.addEventListener('click', () => openGame(button.dataset.game)));
document.querySelector('#home-button').addEventListener('click', showHome);
document.querySelector('#back-button').addEventListener('click', showHome);
document.addEventListener('keydown', (event) => {
  if (!activeGame) return;
  const direction = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key];
  if (!direction) return;
  event.preventDefault();
  if (activeGame === '2048') movePuzzle(direction);
  if (activeGame === 'snake') queueSnakeDirection(direction);
});
document.addEventListener('visibilitychange', () => {
  if (activeGame === 'snake' && document.hidden) clearGameTimer();
  else if (activeGame === 'snake' && !document.hidden && !snakeState.over && !gameTimer) gameTimer = setInterval(tickSnake, 145);
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => {
  installButton.hidden = true;
  showToast('Vk998 is ready on your home screen ✨');
});
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => showToast('Offline mode could not start.')));
updateHomeBests();
