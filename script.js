const SIZE = 8;
const GAME_TIME = 60;
const DRAG_THRESHOLD = 26;

const TILE_TYPES = ["red", "blue", "green", "yellow", "purple"];

const TILE_VIEW = {
  red: {
    emoji: "🍓",
    label: "딸기",
  },
  blue: {
    emoji: "💧",
    label: "물방울",
  },
  green: {
    emoji: "🍀",
    label: "클로버",
  },
  yellow: {
    emoji: "⭐",
    label: "별",
  },
  purple: {
    emoji: "🍇",
    label: "포도",
  },
  rainbow: {
    emoji: "🌈",
    label: "무지개",
  },
};

const SPECIAL_ICON = {
  horizontal: "↔️",
  vertical: "↕️",
  bomb: "💣",
  rainbow: "🌈",
};

const SPECIAL_LABEL = {
  horizontal: "가로 라인",
  vertical: "세로 라인",
  bomb: "폭탄",
  rainbow: "무지개",
};

const boardElement = document.getElementById("board");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const bestScoreElement = document.getElementById("bestScore");
const startButton = document.getElementById("startButton");
const messageBox = document.getElementById("messageBox");

let board = [];
let selectedCell = null;
let draggingCell = null;
let dragState = null;
let clearingKeys = new Set();

let score = 0;
let combo = 0;
let remainTime = GAME_TIME;
let bestScore = Number(localStorage.getItem("match3BestScore") || 0);

let timerId = null;
let isPlaying = false;
let isResolving = false;

bestScoreElement.textContent = bestScore.toLocaleString();

if (startButton) {
  startButton.addEventListener("click", showHowToPlay);
}

boardElement.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", handlePointerUp);
window.addEventListener("pointercancel", resetDragState);

createBoard();
render();
updateStatus();

function showHowToPlay() {
  messageBox.innerHTML = `
    <div class="message-content how-to-content">
      <p class="message-eyebrow">How to Play</p>
      <strong>플레이 방법</strong>

      <ul class="how-to-list">
        <li>인접한 블록을 드래그해서 서로 위치를 바꿉니다.</li>
        <li>같은 색 블록이 3개 이상 연결되면 제거되고 점수를 얻습니다.</li>
        <li>4개 일직선 매치 시 라인 블록이 생성됩니다.</li>
        <li>L자, T자, +자 매치 시 폭탄 블록이 생성됩니다.</li>
        <li>5개 이상 일직선 매치 시 무지개 블록이 생성됩니다.</li>
        <li>무지개와 무지개를 교환하면 필드 전체 블록이 제거됩니다.</li>
      </ul>

      <p class="how-to-note">
        설명창을 닫고 게임을 시작하면 60초 제한 시간이 흐르기 시작합니다.
      </p>

      <button id="confirmStartButton" class="primary-button" type="button">
        확인하고 시작
      </button>
    </div>
  `;

  messageBox.classList.remove("hidden");

  const confirmStartButton = document.getElementById("confirmStartButton");

  if (confirmStartButton) {
    confirmStartButton.addEventListener("click", startGame);
  }
}

function startGame() {
  stopTimer();

  score = 0;
  combo = 0;
  remainTime = GAME_TIME;
  selectedCell = null;
  draggingCell = null;
  dragState = null;
  clearingKeys = new Set();

  isPlaying = true;
  isResolving = false;

  messageBox.classList.add("hidden");

  createBoard();
  render();
  updateStatus();

  timerId = setInterval(() => {
    remainTime -= 1;
    updateStatus();

    if (remainTime <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  isPlaying = false;
  isResolving = false;
  selectedCell = null;
  draggingCell = null;
  dragState = null;

  stopTimer();

  const isNewBest = score > bestScore;

  if (isNewBest) {
    bestScore = score;
    localStorage.setItem("match3BestScore", String(bestScore));
  }

  updateStatus();
  render();

  messageBox.innerHTML = `
    <div class="message-content">
      <strong>게임 종료</strong>
      <p class="result-label">최종 점수</p>
      <div class="final-score">${score.toLocaleString()}<span>점</span></div>

      <p class="result-sub">
        ${
          isNewBest
            ? `새로운 최고 점수: ${bestScore.toLocaleString()}점`
            : `최고 점수: ${bestScore.toLocaleString()}점`
        }
      </p>

      <button id="resultRestartButton" class="result-button" type="button">
        다시 시작
      </button>
    </div>
  `;

  messageBox.classList.remove("hidden");

  const resultRestartButton = document.getElementById("resultRestartButton");

  if (resultRestartButton) {
    resultRestartButton.addEventListener("click", startGame);
  }
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateStatus() {
  scoreElement.textContent = score.toLocaleString();
  timerElement.textContent = remainTime;
  bestScoreElement.textContent = bestScore.toLocaleString();
}

function createBoard() {
  board = [];

  for (let row = 0; row < SIZE; row += 1) {
    const currentRow = [];

    for (let col = 0; col < SIZE; col += 1) {
      currentRow.push(createInitialTile(currentRow, board, row, col));
    }

    board.push(currentRow);
  }
}

function createInitialTile(currentRow, createdRows, row, col) {
  let tile = createRandomNormalTile();
  let safeCount = 0;

  while (
    createsImmediateMatch(tile, currentRow, createdRows, row, col) &&
    safeCount < 50
  ) {
    tile = createRandomNormalTile();
    safeCount += 1;
  }

  return tile;
}

function createsImmediateMatch(tile, currentRow, createdRows, row, col) {
  const leftOne = currentRow[col - 1];
  const leftTwo = currentRow[col - 2];

  const upOne = createdRows[row - 1]?.[col];
  const upTwo = createdRows[row - 2]?.[col];

  const hasHorizontalMatch =
    leftOne?.type === tile.type && leftTwo?.type === tile.type;

  const hasVerticalMatch =
    upOne?.type === tile.type && upTwo?.type === tile.type;

  return hasHorizontalMatch || hasVerticalMatch;
}

function createRandomNormalTile() {
  const type = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];

  return {
    type,
    special: null,
  };
}

function createSpecialTile(sourceType, special) {
  if (special === "rainbow") {
    return {
      type: "rainbow",
      special: "rainbow",
    };
  }

  return {
    type: sourceType,
    special,
  };
}

function render() {
  boardElement.innerHTML = "";

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = board[row][col];
      const cell = document.createElement("button");
      const key = createKey(row, col);

      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      if (!isPlaying || isResolving) {
        cell.classList.add("disabled");
      }

      const isSelected =
        selectedCell?.row === row && selectedCell?.col === col;

      const isDragging =
        draggingCell?.row === row && draggingCell?.col === col;

      if (isSelected || isDragging) {
        cell.classList.add("selected");
      }

      if (clearingKeys.has(key)) {
        cell.classList.add("clearing");
      }

      if (tile) {
        cell.classList.add(`type-${tile.type}`);

        cell.setAttribute(
          "aria-label",
          `${row + 1}행 ${col + 1}열 ${getTileLabel(tile)}`
        );

        cell.innerHTML = `
          <span class="tile-icon">${getTileIcon(tile)}</span>
        `;
      }

      boardElement.appendChild(cell);
    }
  }
}

function getTileIcon(tile) {
  if (!tile) return "";

  if (tile.special === "horizontal") {
    return SPECIAL_ICON.horizontal;
  }

  if (tile.special === "vertical") {
    return SPECIAL_ICON.vertical;
  }

  if (tile.special === "bomb") {
    return SPECIAL_ICON.bomb;
  }

  if (tile.special === "rainbow") {
    return SPECIAL_ICON.rainbow;
  }

  return TILE_VIEW[tile.type].emoji;
}

function getTileLabel(tile) {
  if (!tile) return "빈 칸";

  if (tile.special && tile.special !== "rainbow") {
    return `${TILE_VIEW[tile.type].label} ${SPECIAL_LABEL[tile.special]} 타일`;
  }

  if (tile.special === "rainbow") {
    return "무지개 타일";
  }

  return `${TILE_VIEW[tile.type].label} 타일`;
}

function handlePointerDown(event) {
  if (!isPlaying || isResolving) return;

  const cellElement = event.target.closest(".cell");

  if (!cellElement || !boardElement.contains(cellElement)) {
    return;
  }

  event.preventDefault();

  const row = Number(cellElement.dataset.row);
  const col = Number(cellElement.dataset.col);

  dragState = {
    row,
    col,
    startX: event.clientX,
    startY: event.clientY,
  };

  draggingCell = { row, col };
  selectedCell = null;

  render();
}

function handlePointerMove(event) {
  if (!dragState || !isPlaying || isResolving) return;

  const diffX = event.clientX - dragState.startX;
  const diffY = event.clientY - dragState.startY;

  if (Math.max(Math.abs(diffX), Math.abs(diffY)) < DRAG_THRESHOLD) {
    return;
  }

  let targetRow = dragState.row;
  let targetCol = dragState.col;

  if (Math.abs(diffX) > Math.abs(diffY)) {
    targetCol += diffX > 0 ? 1 : -1;
  } else {
    targetRow += diffY > 0 ? 1 : -1;
  }

  if (!isInsideBoard(targetRow, targetCol)) {
    resetDragState();
    render();
    return;
  }

  const from = {
    row: dragState.row,
    col: dragState.col,
  };

  resetDragState();
  selectedCell = null;

  void trySwap(from.row, from.col, targetRow, targetCol);
}

function handlePointerUp(event) {
  if (!dragState || !isPlaying || isResolving) return;

  event.preventDefault();

  const start = {
    row: dragState.row,
    col: dragState.col,
  };

  const end = getCellFromEvent(event);

  resetDragState();

  if (end && isAdjacent(start.row, start.col, end.row, end.col)) {
    selectedCell = null;
    void trySwap(start.row, start.col, end.row, end.col);
    return;
  }

  void handleTapCell(start.row, start.col);
}

async function handleTapCell(row, col) {
  if (!isPlaying || isResolving) return;

  if (!selectedCell) {
    selectedCell = { row, col };
    render();
    return;
  }

  if (selectedCell.row === row && selectedCell.col === col) {
    selectedCell = null;
    render();
    return;
  }

  if (!isAdjacent(selectedCell.row, selectedCell.col, row, col)) {
    selectedCell = { row, col };
    render();
    return;
  }

  const from = selectedCell;
  selectedCell = null;

  await trySwap(from.row, from.col, row, col);
}

function resetDragState() {
  dragState = null;
  draggingCell = null;
}

function getCellFromEvent(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const cellElement = element?.closest(".cell");

  if (!cellElement || !boardElement.contains(cellElement)) {
    return null;
  }

  return {
    row: Number(cellElement.dataset.row),
    col: Number(cellElement.dataset.col),
  };
}

function isAdjacent(rowA, colA, rowB, colB) {
  const distance = Math.abs(rowA - rowB) + Math.abs(colA - colB);
  return distance === 1;
}

async function trySwap(rowA, colA, rowB, colB) {
  if (isResolving) return;

  isResolving = true;

  swapTiles(rowA, colA, rowB, colB);
  render();
  await wait(120);

  const tileAAfterSwap = board[rowB][colB];
  const tileBAfterSwap = board[rowA][colA];

  const matches = findMatches();

  if (matches.hasMatches) {
    await resolveBoard(matches, [createKey(rowA, colA), createKey(rowB, colB)]);

    isResolving = false;
    render();
    return;
  }

  const hasSpecialMove =
    Boolean(tileAAfterSwap?.special) || Boolean(tileBAfterSwap?.special);

  if (hasSpecialMove) {
    const removeKeys = new Set();

    triggerManualSpecial({
      tile: tileAAfterSwap,
      row: rowB,
      col: colB,
      targetTile: tileBAfterSwap,
      removeKeys,
    });

    triggerManualSpecial({
      tile: tileBAfterSwap,
      row: rowA,
      col: colA,
      targetTile: tileAAfterSwap,
      removeKeys,
    });

    expandSpecialEffects(removeKeys, new Set());

    if (removeKeys.size > 0) {
      await clearAndCollapse(removeKeys, 1);
      await resolveBoard();
    }

    isResolving = false;
    render();
    return;
  }

  await wait(120);
  swapTiles(rowA, colA, rowB, colB);

  isResolving = false;
  render();
}

function swapTiles(rowA, colA, rowB, colB) {
  const temp = board[rowA][colA];

  board[rowA][colA] = board[rowB][colB];
  board[rowB][colB] = temp;
}

async function resolveBoard(initialMatches = null, preferredKeys = []) {
  let currentMatches = initialMatches || findMatches();
  let localCombo = 0;

  while (currentMatches.hasMatches && isPlaying) {
    localCombo += 1;
    combo = localCombo;

    const matchedSpecialEffects = collectMatchedSpecialEffects(
      currentMatches.matchedKeys
    );

    const specialMap = selectSpecials(currentMatches, preferredKeys);
    const protectedKeys = new Set(Object.keys(specialMap));
    const removeKeys = new Set(currentMatches.matchedKeys);

    for (const [key, tile] of Object.entries(specialMap)) {
      const { row, col } = parseKey(key);

      board[row][col] = tile;
      removeKeys.delete(key);
    }

    triggerStoredSpecialEffects(
      matchedSpecialEffects,
      removeKeys,
      protectedKeys
    );

    expandSpecialEffects(removeKeys, protectedKeys);

    for (const key of protectedKeys) {
      removeKeys.delete(key);
    }

    await clearAndCollapse(removeKeys, localCombo);

    render();
    await wait(120);

    preferredKeys = [];
    currentMatches = findMatches();
  }

  combo = 0;
}

function collectMatchedSpecialEffects(matchedKeys) {
  const effects = [];

  for (const key of matchedKeys) {
    const { row, col } = parseKey(key);
    const tile = board[row][col];

    if (!tile?.special) continue;
    if (tile.special === "rainbow") continue;

    effects.push({
      special: tile.special,
      row,
      col,
    });
  }

  return effects;
}

function triggerStoredSpecialEffects(effects, removeKeys, protectedKeys) {
  for (const effect of effects) {
    const { special, row, col } = effect;

    if (special === "horizontal") {
      for (let currentCol = 0; currentCol < SIZE; currentCol += 1) {
        removeKeys.add(createKey(row, currentCol));
      }
    }

    if (special === "vertical") {
      for (let currentRow = 0; currentRow < SIZE; currentRow += 1) {
        removeKeys.add(createKey(currentRow, col));
      }
    }

    if (special === "bomb") {
      addBombRange(row, col, removeKeys);
    }
  }

  for (const key of protectedKeys) {
    removeKeys.delete(key);
  }
}

async function clearAndCollapse(removeKeys, comboMultiplier) {
  if (removeKeys.size <= 0) return;

  clearingKeys = new Set(removeKeys);
  render();
  await wait(180);

  for (const key of removeKeys) {
    const { row, col } = parseKey(key);

    if (board[row]?.[col]) {
      board[row][col] = null;
    }
  }

  score += removeKeys.size * 10 * comboMultiplier;
  updateStatus();

  clearingKeys = new Set();

  collapseBoard();
  render();
  await wait(180);
}

function collapseBoard() {
  for (let col = 0; col < SIZE; col += 1) {
    const stack = [];

    for (let row = SIZE - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        stack.push(board[row][col]);
      }
    }

    for (let row = SIZE - 1; row >= 0; row -= 1) {
      board[row][col] = stack.shift() || createRandomNormalTile();
    }
  }
}

function findMatches() {
  const horizontalRuns = [];
  const verticalRuns = [];
  const matchedKeys = new Set();

  for (let row = 0; row < SIZE; row += 1) {
    let col = 0;

    while (col < SIZE) {
      const tile = board[row][col];
      const type = getMatchableType(tile);
      let endCol = col + 1;

      while (
        endCol < SIZE &&
        getMatchableType(board[row][endCol]) === type &&
        type !== null
      ) {
        endCol += 1;
      }

      const length = endCol - col;

      if (type !== null && length >= 3) {
        const cells = [];

        for (let currentCol = col; currentCol < endCol; currentCol += 1) {
          const key = createKey(row, currentCol);

          cells.push(key);
          matchedKeys.add(key);
        }

        horizontalRuns.push({
          type,
          row,
          start: col,
          end: endCol - 1,
          length,
          cells,
          orientation: "horizontal",
        });
      }

      col = endCol;
    }
  }

  for (let col = 0; col < SIZE; col += 1) {
    let row = 0;

    while (row < SIZE) {
      const tile = board[row][col];
      const type = getMatchableType(tile);
      let endRow = row + 1;

      while (
        endRow < SIZE &&
        getMatchableType(board[endRow][col]) === type &&
        type !== null
      ) {
        endRow += 1;
      }

      const length = endRow - row;

      if (type !== null && length >= 3) {
        const cells = [];

        for (let currentRow = row; currentRow < endRow; currentRow += 1) {
          const key = createKey(currentRow, col);

          cells.push(key);
          matchedKeys.add(key);
        }

        verticalRuns.push({
          type,
          col,
          start: row,
          end: endRow - 1,
          length,
          cells,
          orientation: "vertical",
        });
      }

      row = endRow;
    }
  }

  return {
    hasMatches: matchedKeys.size > 0,
    horizontalRuns,
    verticalRuns,
    matchedKeys: Array.from(matchedKeys),
  };
}

function getMatchableType(tile) {
  if (!tile) return null;

  if (tile.special === "rainbow") {
    return null;
  }

  return tile.type;
}

function selectSpecials(matches, preferredKeys) {
  const candidates = [];

  candidates.push(...createStraightCandidates(matches, preferredKeys));
  candidates.push(...createShapeCandidates(matches));

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    const aPreferred = preferredKeys.includes(a.spawnKey) ? 1 : 0;
    const bPreferred = preferredKeys.includes(b.spawnKey) ? 1 : 0;

    return bPreferred - aPreferred;
  });

  const usedKeys = new Set();
  const specialMap = {};

  for (const candidate of candidates) {
    const overlaps = candidate.cells.some((key) => usedKeys.has(key));

    if (overlaps) continue;

    const { row, col } = parseKey(candidate.spawnKey);
    const sourceType = board[row][col]?.type;

    if (!sourceType && candidate.special !== "rainbow") continue;

    for (const key of candidate.cells) {
      usedKeys.add(key);
    }

    specialMap[candidate.spawnKey] = createSpecialTile(
      sourceType,
      candidate.special
    );
  }

  return specialMap;
}

function createStraightCandidates(matches, preferredKeys) {
  const candidates = [];
  const runs = [...matches.horizontalRuns, ...matches.verticalRuns];

  for (const run of runs) {
    if (run.length >= 5) {
      candidates.push({
        special: "rainbow",
        priority: 40,
        spawnKey: pickSpawnKey(run.cells, preferredKeys),
        cells: run.cells,
      });

      continue;
    }

    if (run.length === 4) {
      const special =
        run.orientation === "horizontal" ? "vertical" : "horizontal";

      candidates.push({
        special,
        priority: 10,
        spawnKey: pickSpawnKey(run.cells, preferredKeys),
        cells: run.cells,
      });
    }
  }

  return candidates;
}

function createShapeCandidates(matches) {
  const candidates = [];

  for (const horizontalRun of matches.horizontalRuns) {
    for (const verticalRun of matches.verticalRuns) {
      if (horizontalRun.type !== verticalRun.type) continue;

      const intersectionKey = horizontalRun.cells.find((key) =>
        verticalRun.cells.includes(key)
      );

      if (!intersectionKey) continue;

      const cells = Array.from(
        new Set([...horizontalRun.cells, ...verticalRun.cells])
      );

      candidates.push({
        special: "bomb",
        priority: 30,
        spawnKey: intersectionKey,
        cells,
      });
    }
  }

  return candidates;
}

function pickSpawnKey(cells, preferredKeys) {
  const preferred = preferredKeys.find((key) => cells.includes(key));

  if (preferred) {
    return preferred;
  }

  return cells[Math.floor(cells.length / 2)];
}

function triggerManualSpecial({ tile, row, col, targetTile, removeKeys }) {
  if (!tile?.special) return;

  const key = createKey(row, col);

  if (tile.special === "horizontal") {
    for (let currentCol = 0; currentCol < SIZE; currentCol += 1) {
      removeKeys.add(createKey(row, currentCol));
    }

    return;
  }

  if (tile.special === "vertical") {
    for (let currentRow = 0; currentRow < SIZE; currentRow += 1) {
      removeKeys.add(createKey(currentRow, col));
    }

    return;
  }

  if (tile.special === "bomb") {
    addBombRange(row, col, removeKeys);
    return;
  }

  if (tile.special === "rainbow") {
    removeKeys.add(key);

    if (!targetTile) return;

    if (targetTile.special === "rainbow") {
      addAllBoardTiles(removeKeys);
      return;
    }

    if (targetTile.special && targetTile.special !== "rainbow") {
      const randomType = getRandomNormalTypeOnBoard();
      addNormalTilesByType(randomType, removeKeys);
      return;
    }

    for (let targetRow = 0; targetRow < SIZE; targetRow += 1) {
      for (let targetCol = 0; targetCol < SIZE; targetCol += 1) {
        if (board[targetRow][targetCol]?.type === targetTile.type) {
          removeKeys.add(createKey(targetRow, targetCol));
        }
      }
    }
  }
}

function expandSpecialEffects(removeKeys, protectedKeys) {
  const activatedKeys = new Set();
  let hasNewEffect = true;

  while (hasNewEffect) {
    hasNewEffect = false;

    for (const key of Array.from(removeKeys)) {
      if (activatedKeys.has(key)) continue;
      if (protectedKeys.has(key)) continue;

      const { row, col } = parseKey(key);
      const tile = board[row][col];

      if (!tile?.special) continue;

      activatedKeys.add(key);

      const beforeSize = removeKeys.size;

      if (tile.special === "horizontal") {
        for (let currentCol = 0; currentCol < SIZE; currentCol += 1) {
          removeKeys.add(createKey(row, currentCol));
        }
      }

      if (tile.special === "vertical") {
        for (let currentRow = 0; currentRow < SIZE; currentRow += 1) {
          removeKeys.add(createKey(currentRow, col));
        }
      }

      if (tile.special === "bomb") {
        addBombRange(row, col, removeKeys);
      }

      if (removeKeys.size > beforeSize) {
        hasNewEffect = true;
      }
    }
  }
}

function isRainbowTile(tile) {
  return tile?.special === "rainbow";
}

function getRandomNormalTypeOnBoard() {
  const normalTypes = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = board[row][col];

      if (!tile) continue;
      if (tile.special) continue;
      if (!TILE_TYPES.includes(tile.type)) continue;

      normalTypes.push(tile.type);
    }
  }

  if (normalTypes.length <= 0) {
    return null;
  }

  return normalTypes[Math.floor(Math.random() * normalTypes.length)];
}

function addNormalTilesByType(type, removeKeys) {
  if (!type) return;

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = board[row][col];

      if (!tile) continue;
      if (tile.special) continue;

      if (tile.type === type) {
        removeKeys.add(createKey(row, col));
      }
    }
  }
}

function addAllBoardTiles(removeKeys) {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col]) {
        removeKeys.add(createKey(row, col));
      }
    }
  }
}

function addBombRange(row, col, removeKeys) {
  for (let targetRow = row - 1; targetRow <= row + 1; targetRow += 1) {
    for (let targetCol = col - 1; targetCol <= col + 1; targetCol += 1) {
      if (isInsideBoard(targetRow, targetCol)) {
        removeKeys.add(createKey(targetRow, targetCol));
      }
    }
  }
}

function isInsideBoard(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function createKey(row, col) {
  return `${row}-${col}`;
}

function parseKey(key) {
  const [row, col] = key.split("-").map(Number);

  return {
    row,
    col,
  };
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}