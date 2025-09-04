// Game configuration
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const GRID_COUNT = CANVAS_SIZE / GRID_SIZE;

// Game state
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    autoMode: false,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    gameSpeed: 150
};

// Game loop variable
let gameInterval = null;

// Screen recording variables
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let gifFrames = [];
let gifRecordingInterval = null;

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
const formatSelect = document.getElementById('formatSelect');

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
    gameState.autoMode = false;
    gameState.score = 0;
    
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
    
    const format = formatSelect.value;
    isRecording = true;
    
    if (format === 'gif') {
        startGifRecording();
    } else {
        startWebmRecording();
    }
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

function startGifRecording() {
    try {
        gifFrames = [];
        
        // Capture frames every 100ms (10 FPS for GIF)
        gifRecordingInterval = setInterval(() => {
            if (isRecording) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                gifFrames.push({
                    data: imageData,
                    delay: 100
                });
            }
        }, 100);
        
        console.log('GIF recording started');
    } catch (error) {
        console.error('Error starting GIF recording:', error);
        isRecording = false;
    }
}

// Stop screen recording
function stopRecording() {
    if (!isRecording) return;
    
    const format = formatSelect.value;
    
    if (format === 'gif') {
        stopGifRecording();
    } else {
        stopWebmRecording();
    }
    
    isRecording = false;
    console.log('Recording stopped');
}

function stopWebmRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

function stopGifRecording() {
    if (gifRecordingInterval) {
        clearInterval(gifRecordingInterval);
        gifRecordingInterval = null;
    }
    
    if (gifFrames.length > 0) {
        generateGif();
    }
}

function generateGif() {
    console.log('Generating GIF with', gifFrames.length, 'frames');
    
    if (gifFrames.length === 0) {
        console.error('No frames to generate GIF');
        return;
    }
    
    try {
        // Check if omggif is loaded
        if (typeof GifWriter === 'undefined') {
            console.error('omggif library not loaded');
            return;
        }
        
        const width = canvas.width;
        const height = canvas.height;
        const delay = 10; // 100ms delay between frames
        
        // Create GIF buffer
        const buf = new Uint8Array(width * height * gifFrames.length * 5); // Rough estimate
        const gif = new GifWriter(buf, width, height, { loop: 0 });
        
        console.log('Processing frames for GIF...');
        
        // Process each frame
        gifFrames.forEach((frame, index) => {
            console.log(`Processing frame ${index + 1}/${gifFrames.length}`);
            
            // Convert RGBA to indexed color palette
            const imageData = frame.data;
            const pixels = new Uint8Array(width * height);
            const palette = [];
            const colorMap = new Map();
            
            // Simple color quantization - reduce to 256 colors max
            for (let i = 0; i < imageData.data.length; i += 4) {
                const r = Math.floor(imageData.data[i] / 8) * 8;
                const g = Math.floor(imageData.data[i + 1] / 8) * 8;
                const b = Math.floor(imageData.data[i + 2] / 8) * 8;
                const colorKey = `${r},${g},${b}`;
                
                let colorIndex;
                if (colorMap.has(colorKey)) {
                    colorIndex = colorMap.get(colorKey);
                } else if (palette.length < 256) {
                    colorIndex = palette.length;
                    palette.push([r, g, b]);
                    colorMap.set(colorKey, colorIndex);
                } else {
                    // Find closest color if palette is full
                    colorIndex = 0;
                    let minDist = Infinity;
                    for (let j = 0; j < palette.length; j++) {
                        const dist = Math.abs(r - palette[j][0]) + Math.abs(g - palette[j][1]) + Math.abs(b - palette[j][2]);
                        if (dist < minDist) {
                            minDist = dist;
                            colorIndex = j;
                        }
                    }
                }
                
                pixels[i / 4] = colorIndex;
            }
            
            // Ensure palette length is power of 2 and between 2-256
             let paletteSize = 2;
             while (paletteSize < palette.length && paletteSize < 256) {
                 paletteSize *= 2;
             }
             
             // Pad palette to the required power of 2 size
             while (palette.length < paletteSize) {
                 palette.push([0, 0, 0]);
             }
            
            // Add frame to GIF
            gif.addFrame(0, 0, width, height, pixels, {
                palette: palette.flat(),
                delay: delay
            });
        });
        
        // Get the actual GIF data
        const gifData = buf.slice(0, gif.end());
        
        // Create and download the GIF
        const blob = new Blob([gifData], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `snake-game-${new Date().getTime()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('GIF generated and downloaded successfully');
        
    } catch (error) {
        console.error('Error generating GIF:', error);
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

function getAutoDirection() {
    const head = snake.body[0];
    const currentDir = snake.direction;
    
    // First try to find path to food using BFS
    const pathToFood = findPathBFS(head, food);
    
    if (pathToFood && pathToFood.length > 0) {
        const nextMove = pathToFood[0];
        
        // Check if this move is safe (not reverse)
        if (!(nextMove.x === -currentDir.x && nextMove.y === -currentDir.y)) {
            // Additional check: ensure enough survival space after move
            const nextPos = {x: head.x + nextMove.x, y: head.y + nextMove.y};
            const spaceAfterMove = calculateReachableSpace(nextPos);
            
            // If reachable space after move is large enough (at least 1.5x snake length), execute move
            if (spaceAfterMove >= snake.body.length * 1.5) {
                return nextMove;
            }
        }
    }
    
    // If no safe path to food, choose direction with maximum survival space
    const directions = [
        {x: 0, y: -1}, // Up
        {x: 1, y: 0},  // Right
        {x: 0, y: 1},  // Down
        {x: -1, y: 0}  // Left
    ];
    
    let bestDirection = null;
    let maxSpace = -1;
    
    for (let dir of directions) {
        // Cannot move in reverse
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
    
    // If best direction found, return it
    if (bestDirection) {
        return bestDirection;
    }
    
    // Last resort: find any direction that won't immediately collide
    for (let dir of directions) {
        if (dir.x === -currentDir.x && dir.y === -currentDir.y) continue;
        
        const testPos = {x: head.x + dir.x, y: head.y + dir.y};
        if (!checkCollision(testPos)) {
            return dir;
        }
    }
    
    // If all directions will collide, return current direction (game about to end)
    return currentDir;
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