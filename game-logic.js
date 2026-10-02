export function create2048Board(random = Math.random) {
  const board = Array(16).fill(0);
  spawn2048Tile(board, random);
  spawn2048Tile(board, random);
  return board;
}

export function spawn2048Tile(board, random = Math.random) {
  const empty = [];
  board.forEach((value, index) => { if (!value) empty.push(index); });
  if (!empty.length) return false;
  const index = empty[Math.floor(random() * empty.length)];
  board[index] = random() < 0.9 ? 2 : 4;
  return true;
}

export function move2048(board, direction) {
  const next = board.slice();
  let gained = 0;
  const lines = [];
  for (let line = 0; line < 4; line += 1) {
    const indexes = [];
    for (let cell = 0; cell < 4; cell += 1) {
      if (direction === 'left' || direction === 'right') {
        indexes.push(line * 4 + (direction === 'left' ? cell : 3 - cell));
      } else {
        indexes.push((direction === 'up' ? cell : 3 - cell) * 4 + line);
      }
    }
    lines.push(indexes);
  }
  for (const indexes of lines) {
    const values = indexes.map((index) => board[index]).filter(Boolean);
    const merged = [];
    for (let index = 0; index < values.length; index += 1) {
      if (values[index] === values[index + 1]) {
        const doubled = values[index] * 2;
        merged.push(doubled);
        gained += doubled;
        index += 1;
      } else {
        merged.push(values[index]);
      }
    }
    indexes.forEach((index, cell) => { next[index] = merged[cell] || 0; });
  }
  return { board: next, gained, changed: next.some((value, index) => value !== board[index]) };
}

export function snakeStep(snake, direction, width = 16, food = null) {
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  if (!delta) return { snake, ate: false, collision: false };
  const head = [snake[0][0] + delta[0], snake[0][1] + delta[1]];
  const ate = Boolean(food && head[0] === food[0] && head[1] === food[1]);
  const body = ate ? snake : snake.slice(0, -1);
  const collision = head[0] < 0 || head[1] < 0 || head[0] >= width || head[1] >= width || body.some(([x, y]) => x === head[0] && y === head[1]);
  return { snake: collision ? snake : [head, ...body], ate, collision };
}

export function createMemoryDeck(random = Math.random) {
  const symbols = ['✿', '☀', '☾', '♫', '✦', '🍒'];
  const deck = [...symbols, ...symbols].map((symbol, id) => ({ id, symbol }));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}
