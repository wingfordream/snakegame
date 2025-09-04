// Game configuration
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const GRID_COUNT = CANVAS_SIZE / GRID_SIZE;

// Game state
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    autoMode: true,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    gameSpeed: 25
};

// Game loop variable
let gameInterval = null;

// Screen recording variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
// GIF recording variables removed - only WebM supported

// Snake initial state
let snake = {
    body: [{x: 10, y: 10}],
    direction: {x: 0, y: 0},
    nextDirection: {x: 0, y: 0}
};

// Food position
let food = {x: 15, y: 15};

// Get DOM elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const autoBtn = document.getElementById('autoBtn');
const speedSelect = document.getElementById('speedSelect');
const autoRecordCheckbox = document.getElementById('autoRecordCheckbox');
const recordBtn = document.getElementById('recordBtn');
// Format selector removed - only WebM supported

// Initialize game
function initGame() {
    // Reset snake state
    snake.body = [{x: 10, y: 10}];
    snake.direction = {x: 0, y: 0};
    snake.nextDirection = {x: 0, y: 0};
    
    // Reset game state
    gameState.running = false;
    gameState.paused = false;
    gameState.gameOver = false;
    // Keep autoMode as true (default enabled)
    gameState.autoMode = true;
    gameState.score = 0;
    
    // Set speed selector to ULTRA (25ms)
    speedSelect.value = '25';
    
    // Generate new food
    generateFood();
    
    // Update display
    updateScore();
    updateButtons();
    
    // Draw initial state
    draw();
}

// Start screen recording
function startRecording() {
    if (isRecording) return;
    
    isRecording = true;
    startWebmRecording();
}

function startWebmRecording() {
    try {
        const stream = canvas.captureStream(30); // 30 FPS
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            const blob = new Blob(recordedChunks, {
                type: 'video/webm'
            });
            
            // Download WebM directly
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `snake-game-${new Date().getTime()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        
        mediaRecorder.start();
        console.log('WebM recording started');
    } catch (error) {
        console.error('Error starting WebM recording:', error);
        isRecording = false;
    }
}

// Stop screen recording
function stopRecording() {
    if (!isRecording) return;
    
    stopWebmRecording();
    
    isRecording = false;
    console.log('Recording stopped');
}

function stopWebmRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Generate food
function generateFood() {
    do {
        food.x = Math.floor(Math.random() * GRID_COUNT);
        food.y = Math.floor(Math.random() * GRID_COUNT);
    } while (isSnakePosition(food.x, food.y));
}

// Check if position is occupied by snake
function isSnakePosition(x, y) {
    return snake.body.some(segment => segment.x === x && segment.y === y);
}

// Auto pathfinding algorithm - simple direction judgment
// Use BFS to find path to target
function findPathBFS(start, target) {
    const queue = [{pos: start, path: []}];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    
    const directions = [
        {x: 0, y: -1}, // Up
        {x: 1, y: 0},  // Right
        {x: 0, y: 1},  // Down
        {x: -1, y: 0}  // Left
    ];
    
    while (queue.length > 0) {
        const {pos, path} = queue.shift();
        
        if (pos.x === target.x && pos.y === target.y) {
            return path;
        }
        
        for (let dir of directions) {
            const newPos = {x: pos.x + dir.x, y: pos.y + dir.y};
            const key = `${newPos.x},${newPos.y}`;
            
            if (!visited.has(key) && !checkCollision(newPos)) {
                visited.add(key);
                queue.push({pos: newPos, path: [...path, dir]});
            }
        }
    }
    
    return null; // No path found
}

// Calculate reachable space size in a direction
function calculateReachableSpace(startPos) {
    const visited = new Set();
    const queue = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);
    
    const directions = [
        {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}
    ];
    
    while (queue.length > 0) {
        const pos = queue.shift();
        
        for (let dir of directions) {
            const newPos = {x: pos.x + dir.x, y: pos.y + dir.y};
            const key = `${newPos.x},${newPos.y}`;
            
            if (!visited.has(key) && !checkCollision(newPos)) {
                visited.add(key);
                queue.push(newPos);
            }
        }
    }
    
    return visited.size;
}

// A* pathfinding algorithm
function findPathAStar(start, target) {
    const openSet = [{pos: start, g: 0, h: manhattanDistance(start, target), f: manhattanDistance(start, target), parent: null}];
    const closedSet = new Set();
    const directions = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];
    
    while (openSet.length > 0) {
        // Find node with lowest f score
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        const currentKey = `${current.pos.x},${current.pos.y}`;
        
        if (closedSet.has(currentKey)) continue;
        closedSet.add(currentKey);
        
        // Reached target
        if (current.pos.x === target.x && current.pos.y === target.y) {
            const path = [];
            let node = current;
            while (node.parent) {
                const dir = {x: node.pos.x - node.parent.pos.x, y: node.pos.y - node.parent.pos.y};
                path.unshift(dir);
                node = node.parent;
            }
            return path;
        }
        
        // Explore neighbors
        for (let dir of directions) {
            const newPos = {x: current.pos.x + dir.x, y: current.pos.y + dir.y};
            const newKey = `${newPos.x},${newPos.y}`;
            
            if (closedSet.has(newKey) || checkCollision(newPos)) continue;
            
            const g = current.g + 1;
            const h = manhattanDistance(newPos, target);
            const f = g + h;
            
            // Check if this path is better
            const existing = openSet.find(node => node.pos.x === newPos.x && node.pos.y === newPos.y);
            if (!existing || g < existing.g) {
                if (existing) {
                    existing.g = g;
                    existing.f = f;
                    existing.parent = current;
                } else {
                    openSet.push({pos: newPos, g, h, f, parent: current});
                }
            }
        }
    }
    
    return null; // No path found
}

// Manhattan distance heuristic
function manhattanDistance(pos1, pos2) {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

// Simulate eating food and check survival space
function simulateEatAndCheckSurvival(path) {
    if (!path || path.length === 0) return false;
    
    // Simulate snake movement along the path
    const simulatedSnake = {
        body: [...snake.body.map(segment => ({...segment}))],
        direction: {...snake.direction}
    };
    
    // Move snake along the path
    for (let move of path) {
        const head = simulatedSnake.body[0];
        const newHead = {x: head.x + move.x, y: head.y + move.y};
        
        simulatedSnake.body.unshift(newHead);
        // Don't remove tail when eating food (snake grows)
        if (newHead.x !== food.x || newHead.y !== food.y) {
            simulatedSnake.body.pop();
        }
    }
    
    // Check survival space after eating
    const newHead = simulatedSnake.body[0];
    const survivalSpace = calculateReachableSpaceWithSnake(newHead, simulatedSnake.body);
    
    // Need enough space for the grown snake
    return survivalSpace >= simulatedSnake.body.length * 1.2;
}

// Calculate reachable space considering a specific snake body
function calculateReachableSpaceWithSnake(startPos, snakeBody) {
    const visited = new Set();
    const queue = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);
    
    const directions = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];
    
    while (queue.length > 0) {
        const pos = queue.shift();
        
        for (let dir of directions) {
            const newPos = {x: pos.x + dir.x, y: pos.y + dir.y};
            const key = `${newPos.x},${newPos.y}`;
            
            if (!visited.has(key) && !checkCollisionWithSnake(newPos, snakeBody)) {
                visited.add(key);
                queue.push(newPos);
            }
        }
    }
    
    return visited.size;
}

// Check collision with specific snake body
function checkCollisionWithSnake(pos, snakeBody) {
    // Check boundaries
    if (pos.x < 0 || pos.x >= GRID_COUNT || pos.y < 0 || pos.y >= GRID_COUNT) {
        return true;
    }
    
    // Check snake body collision
    return snakeBody.some(segment => segment.x === pos.x && segment.y === pos.y);
}

// Hamiltonian Cycle strategy - follow a predetermined safe path
function getHamiltonianDirection() {
    const head = snake.body[0];
    const directions = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];
    
    // Simple Hamiltonian-like pattern: try to follow edges and create cycles
    // Priority: Right -> Down -> Left -> Up (clockwise)
    const priorityDirs = [{x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 0, y: -1}];
    
    for (let dir of priorityDirs) {
        // Skip reverse direction
        if (dir.x === -snake.direction.x && dir.y === -snake.direction.y) continue;
        
        const testPos = {x: head.x + dir.x, y: head.y + dir.y};
        if (!checkCollision(testPos)) {
            const space = calculateReachableSpace(testPos);
            // Only choose if it maintains good survival space
            if (space >= snake.body.length * 1.5) {
                return dir;
            }
        }
    }
    
    // Fallback to any safe direction
    for (let dir of directions) {
        if (dir.x === -snake.direction.x && dir.y === -snake.direction.y) continue;
        
        const testPos = {x: head.x + dir.x, y: head.y + dir.y};
        if (!checkCollision(testPos)) {
            return dir;
        }
    }
    
    return snake.direction;
}

function getAutoDirection() {
    const head = snake.body[0];
    const currentDir = snake.direction;
    
    // Step 1: Use A* to find optimal path to food
    const pathToFood = findPathAStar(head, food);
    
    if (pathToFood && pathToFood.length > 0) {
        const nextMove = pathToFood[0];
        
        // Check if this move is safe (not reverse)
        if (!(nextMove.x === -currentDir.x && nextMove.y === -currentDir.y)) {
            // Step 2: Use BFS to simulate eating food and check survival
            if (simulateEatAndCheckSurvival(pathToFood)) {
                return nextMove;
            }
        }
    }
    
    // Step 3: If no safe path to food, use Hamiltonian Cycle strategy
    const hamiltonianMove = getHamiltonianDirection();
    if (hamiltonianMove) {
        return hamiltonianMove;
    }
    
    // Final fallback: choose direction with maximum survival space
    const directions = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];
    let bestDirection = null;
    let maxSpace = -1;
    
    for (let dir of directions) {
        if (dir.x === -currentDir.x && dir.y === -currentDir.y) continue;
        
        const testPos = {x: head.x + dir.x, y: head.y + dir.y};
        if (!checkCollision(testPos)) {
            const space = calculateReachableSpace(testPos);
            if (space > maxSpace) {
                maxSpace = space;
                bestDirection = dir;
            }
        }
    }
    
    return bestDirection || currentDir;
}

// Toggle auto mode
function toggleAutoMode() {
    gameState.autoMode = !gameState.autoMode;
    updateButtons();
}

// Move snake
function moveSnake() {
    if (!gameState.running || gameState.paused) return;
    
    // Use auto pathfinding in auto mode
    if (gameState.autoMode) {
        snake.nextDirection = getAutoDirection();
    }
    
    // Update direction
    snake.direction = {...snake.nextDirection};
    
    // If no direction, don't move
    if (snake.direction.x === 0 && snake.direction.y === 0) return;
    
    // Calculate new head position
    const head = {...snake.body[0]};
    head.x += snake.direction.x;
    head.y += snake.direction.y;
    
    // Check collision
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // Add new head
    snake.body.unshift(head);
    
    // Check if food is eaten
    if (head.x === food.x && head.y === food.y) {
        // Increase score
        gameState.score += 10;
        updateScore();
        
        // Generate new food
        generateFood();
    } else {
        // Remove tail
        snake.body.pop();
    }
}

// Check collision
function checkCollision(head) {
    // Check wall collision
    if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
        return true;
    }
    
    // Check self collision
    return snake.body.some(segment => segment.x === head.x && segment.y === head.y);
}

// Game over
function gameOver() {
    gameState.running = false;
    gameState.paused = false;
    gameState.gameOver = true;
    stopGameLoop();
    
    // Stop recording when game ends (both auto and manual)
    if (isRecording) {
        stopRecording();
    }
    
    // Update high score
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('snakeHighScore', gameState.highScore);
        updateScore();
    }
    
    updateButtons();
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Draw snake
    ctx.fillStyle = '#48bb78';
    snake.body.forEach((segment, index) => {
        if (index === 0) {
            // Snake head with different color
            ctx.fillStyle = '#38a169';
        } else {
            ctx.fillStyle = '#48bb78';
        }
        
        ctx.fillRect(
            segment.x * GRID_SIZE + 1,
            segment.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
    });
    
    // Draw food
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(
        food.x * GRID_SIZE + 2,
        food.y * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
    );
    
    // Draw grid lines (optional)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
        ctx.stroke();
    }
    
    // If game over, show game over message
    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30);
        
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        
        if (gameState.score === gameState.highScore && gameState.score > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('🎉 NEW RECORD! 🎉', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 25);
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Click "RESET" button to continue', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 50);
    }
}

// Update score display
function updateScore() {
    scoreElement.textContent = gameState.score;
    highScoreElement.textContent = gameState.highScore;
}

// Update button state
function updateButtons() {
    if (gameState.running && !gameState.paused) {
        startBtn.textContent = 'PAUSE';
        startBtn.disabled = false;
    } else if (gameState.paused) {
        startBtn.textContent = 'RESUME';
        startBtn.disabled = false;
    } else if (gameState.gameOver) {
        startBtn.textContent = 'RESTART';
        startBtn.disabled = false;
    } else {
        startBtn.textContent = 'START';
        startBtn.disabled = false;
    }
    
    // Update auto button state
    if (gameState.autoMode) {
        autoBtn.textContent = 'MANUAL';
        autoBtn.style.backgroundColor = '#4CAF50';
    } else {
        autoBtn.textContent = 'AUTO';
        autoBtn.style.backgroundColor = '';
    }
    
    // Update record button
    if (isRecording) {
        recordBtn.textContent = 'STOP RECORD';
        recordBtn.style.backgroundColor = '#ff6b6b';
    } else {
        recordBtn.textContent = 'START RECORD';
        recordBtn.style.backgroundColor = '#4ecdc4';
    }
}

// Start/resume game
function startGame() {
    if (gameState.paused) {
        gameState.paused = false;
        startGameLoop();
    } else if (gameState.gameOver) {
        // Save auto mode state
        const wasAutoMode = gameState.autoMode;
        // Restart after game over
        initGame();
        // Restore auto mode state
        gameState.autoMode = wasAutoMode;
        gameState.running = true;
        snake.nextDirection = {x: 1, y: 0};
        startGameLoop();
        // Start recording if auto record is enabled
        if (autoRecordCheckbox.checked) {
            startRecording();
        }
    } else {
        gameState.running = true;
        // If snake has no direction, set default direction
        if (snake.direction.x === 0 && snake.direction.y === 0) {
            snake.nextDirection = {x: 1, y: 0};
        }
        startGameLoop();
        // Start recording if auto record is enabled
        if (autoRecordCheckbox.checked) {
            startRecording();
        }
    }
    updateButtons();
}

// Toggle start/pause game
function toggleStartPause() {
    if (gameState.running && !gameState.paused) {
        // Currently running, so pause
        gameState.paused = true;
        stopGameLoop();
        updateButtons();
    } else {
        // Not running or paused, so start/resume
        startGame();
    }
}

// Pause game
function pauseGame() {
    if (gameState.running) {
        gameState.paused = true;
        stopGameLoop();
        updateButtons();
    }
}



// Keyboard control
function handleKeyPress(event) {
    const key = event.key;
    
    // Prevent default behavior of arrow keys and space key (prevent page scrolling)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        event.preventDefault();
    }
    
    // If game is not running or paused, only handle space key
    if (!gameState.running || gameState.paused) {
        if (key === ' ') {
            if (gameState.paused) {
                startGame();
            } else if (gameState.gameOver) {
                // In game over state, space key restarts game
                startGame();
            }
        }
        return;
    }
    
    const currentDir = snake.direction;
    
    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!gameState.autoMode && currentDir.y !== 1) {
                snake.nextDirection = {x: 0, y: -1};
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (!gameState.autoMode && currentDir.y !== -1) {
                snake.nextDirection = {x: 0, y: 1};
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (!gameState.autoMode && currentDir.x !== 1) {
                snake.nextDirection = {x: -1, y: 0};
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (!gameState.autoMode && currentDir.x !== -1) {
                snake.nextDirection = {x: 1, y: 0};
            }
            break;
        case ' ':
            if (gameState.gameOver) {
                startGame();
            } else if (gameState.paused) {
                startGame();
            } else {
                pauseGame();
            }
            break;
    }
}

// Game loop
function gameLoop() {
    moveSnake();
    draw();
}

// Start game loop
function startGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, gameState.gameSpeed);
}

// Stop game loop
function stopGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

// Speed change handling
function handleSpeedChange() {
    gameState.gameSpeed = parseInt(speedSelect.value);
    if (gameState.running && !gameState.paused) {
        startGameLoop(); // Restart game loop to apply new speed
    }
}

// Reset game
function resetGame() {
    // Stop game loop
    stopGameLoop();
    
    // Stop recording if active
    if (isRecording) {
        stopRecording();
    }
    
    // Save auto mode state
    const wasAutoMode = gameState.autoMode;
    
    // Reset game state (keep auto mode state)
    gameState.running = false;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.autoMode = wasAutoMode;
    gameState.score = 0;
    
    // Reset snake state
    snake.body = [{x: 10, y: 10}];
    snake.direction = {x: 0, y: 0};
    snake.nextDirection = {x: 0, y: 0};
    
    // Generate new food
    generateFood();
    
    // Update display
    updateScore();
    updateButtons();
    draw();
}

// Toggle manual recording
function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
    updateButtons();
}

// Event listeners
startBtn.addEventListener('click', toggleStartPause);
resetBtn.addEventListener('click', resetGame);
autoBtn.addEventListener('click', toggleAutoMode);
recordBtn.addEventListener('click', toggleRecording);
speedSelect.addEventListener('change', handleSpeedChange);
document.addEventListener('keydown', handleKeyPress);

// Initialize game
initGame();

// Initial draw
draw();