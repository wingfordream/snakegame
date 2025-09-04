// 游戏配置
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const GRID_COUNT = CANVAS_SIZE / GRID_SIZE;

// 游戏状态
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    autoMode: false,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0,
    gameSpeed: 150
};

// 游戏循环变量
let gameInterval = null;

// 蛇的初始状态
let snake = {
    body: [{x: 10, y: 10}],
    direction: {x: 0, y: 0},
    nextDirection: {x: 0, y: 0}
};

// 食物位置
let food = {x: 15, y: 15};

// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const autoBtn = document.getElementById('autoBtn');
const speedSelect = document.getElementById('speedSelect');

// 初始化游戏
function initGame() {
    // 重置蛇的状态
    snake.body = [{x: 10, y: 10}];
    snake.direction = {x: 0, y: 0};
    snake.nextDirection = {x: 0, y: 0};
    
    // 重置游戏状态
    gameState.running = false;
    gameState.paused = false;
    gameState.gameOver = false;
    gameState.autoMode = false;
    gameState.score = 0;
    
    // 生成新食物
    generateFood();
    
    // 更新显示
    updateScore();
    updateButtons();
    
    // 绘制初始状态
    draw();
}

// 生成食物
function generateFood() {
    do {
        food.x = Math.floor(Math.random() * GRID_COUNT);
        food.y = Math.floor(Math.random() * GRID_COUNT);
    } while (isSnakePosition(food.x, food.y));
}

// 检查位置是否被蛇占据
function isSnakePosition(x, y) {
    return snake.body.some(segment => segment.x === x && segment.y === y);
}

// 自动寻路算法 - 简单的方向判断
// 使用BFS寻找到目标的路径
function findPathBFS(start, target) {
    const queue = [{pos: start, path: []}];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    
    const directions = [
        {x: 0, y: -1}, // 上
        {x: 1, y: 0},  // 右
        {x: 0, y: 1},  // 下
        {x: -1, y: 0}  // 左
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
    
    return null; // 没有找到路径
}

// 计算某个方向的可达空间大小
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
    
    // 首先尝试使用BFS寻找到食物的路径
    const pathToFood = findPathBFS(head, food);
    
    if (pathToFood && pathToFood.length > 0) {
        const nextMove = pathToFood[0];
        
        // 检查这个移动是否安全（不会反向）
        if (!(nextMove.x === -currentDir.x && nextMove.y === -currentDir.y)) {
            // 额外检查：确保移动后仍有足够的生存空间
            const nextPos = {x: head.x + nextMove.x, y: head.y + nextMove.y};
            const spaceAfterMove = calculateReachableSpace(nextPos);
            
            // 如果移动后的可达空间足够大（至少是蛇身长度的1.5倍），则执行移动
            if (spaceAfterMove >= snake.body.length * 1.5) {
                return nextMove;
            }
        }
    }
    
    // 如果没有安全路径到食物，选择能提供最大生存空间的方向
    const directions = [
        {x: 0, y: -1}, // 上
        {x: 1, y: 0},  // 右
        {x: 0, y: 1},  // 下
        {x: -1, y: 0}  // 左
    ];
    
    let bestDirection = null;
    let maxSpace = -1;
    
    for (let dir of directions) {
        // 不能反向移动
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
    
    // 如果找到了最佳方向，返回它
    if (bestDirection) {
        return bestDirection;
    }
    
    // 最后的备选方案：找任何一个不会立即碰撞的方向
    for (let dir of directions) {
        if (dir.x === -currentDir.x && dir.y === -currentDir.y) continue;
        
        const testPos = {x: head.x + dir.x, y: head.y + dir.y};
        if (!checkCollision(testPos)) {
            return dir;
        }
    }
    
    // 如果所有方向都会碰撞，返回当前方向（游戏即将结束）
    return currentDir;
}

// 切换自动模式
function toggleAutoMode() {
    gameState.autoMode = !gameState.autoMode;
    updateButtons();
}

// 移动蛇
function moveSnake() {
    if (!gameState.running || gameState.paused) return;
    
    // 在自动模式下使用自动寻路
    if (gameState.autoMode) {
        snake.nextDirection = getAutoDirection();
    }
    
    // 更新方向
    snake.direction = {...snake.nextDirection};
    
    // 如果没有方向，不移动
    if (snake.direction.x === 0 && snake.direction.y === 0) return;
    
    // 计算新的头部位置
    const head = {...snake.body[0]};
    head.x += snake.direction.x;
    head.y += snake.direction.y;
    
    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }
    
    // 添加新头部
    snake.body.unshift(head);
    
    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        // 增加分数
        gameState.score += 10;
        updateScore();
        
        // 生成新食物
        generateFood();
    } else {
        // 移除尾部
        snake.body.pop();
    }
}

// 检查碰撞
function checkCollision(head) {
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
        return true;
    }
    
    // 检查自身碰撞
    return snake.body.some(segment => segment.x === head.x && segment.y === head.y);
}

// 游戏结束
function gameOver() {
    gameState.running = false;
    gameState.paused = false;
    gameState.gameOver = true;
    stopGameLoop();
    
    // 更新最高分
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('snakeHighScore', gameState.highScore);
        updateScore();
    }
    
    updateButtons();
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // 绘制蛇
    ctx.fillStyle = '#48bb78';
    snake.body.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头用不同颜色
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
    
    // 绘制食物
    ctx.fillStyle = '#e53e3e';
    ctx.fillRect(
        food.x * GRID_SIZE + 2,
        food.y * GRID_SIZE + 2,
        GRID_SIZE - 4,
        GRID_SIZE - 4
    );
    
    // 绘制网格线（可选）
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
    
    // 如果游戏结束，显示游戏结束信息
    if (gameState.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束!', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 30);
        
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`最终得分: ${gameState.score}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
        
        if (gameState.score === gameState.highScore && gameState.score > 0) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('🎉 新纪录! 🎉', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 25);
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('点击"重新开始"按钮继续游戏', CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 50);
    }
}

// 更新分数显示
function updateScore() {
    scoreElement.textContent = gameState.score;
    highScoreElement.textContent = gameState.highScore;
}

// 更新按钮状态
function updateButtons() {
    if (gameState.running && !gameState.paused) {
        startBtn.textContent = '游戏中';
        startBtn.disabled = true;
        pauseBtn.textContent = '暂停';
        pauseBtn.disabled = false;
    } else if (gameState.paused) {
        startBtn.textContent = '继续';
        startBtn.disabled = false;
        pauseBtn.textContent = '已暂停';
        pauseBtn.disabled = true;
    } else if (gameState.gameOver) {
        startBtn.textContent = '重新开始';
        startBtn.disabled = false;
        pauseBtn.textContent = '暂停';
        pauseBtn.disabled = true;
    } else {
        startBtn.textContent = '开始游戏';
        startBtn.disabled = false;
        pauseBtn.textContent = '暂停';
        pauseBtn.disabled = true;
    }
    
    // 更新自动按钮状态
    if (gameState.autoMode) {
        autoBtn.textContent = '手动模式';
        autoBtn.style.backgroundColor = '#4CAF50';
    } else {
        autoBtn.textContent = '自动模式';
        autoBtn.style.backgroundColor = '';
    }
}

// 开始/继续游戏
function startGame() {
    if (gameState.paused) {
        gameState.paused = false;
        startGameLoop();
    } else if (gameState.gameOver) {
        // 游戏结束后重新开始
        initGame();
        gameState.running = true;
        snake.nextDirection = {x: 1, y: 0};
        startGameLoop();
    } else {
        gameState.running = true;
        // 如果蛇没有方向，设置默认方向
        if (snake.direction.x === 0 && snake.direction.y === 0) {
            snake.nextDirection = {x: 1, y: 0};
        }
        startGameLoop();
    }
    updateButtons();
}

// 暂停游戏
function pauseGame() {
    if (gameState.running) {
        gameState.paused = true;
        stopGameLoop();
        updateButtons();
    }
}



// 键盘控制
function handleKeyPress(event) {
    const key = event.key;
    
    // 阻止方向键和空格键的默认行为（防止页面滚动）
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
        event.preventDefault();
    }
    
    // 如果游戏未运行或暂停，只处理空格键
    if (!gameState.running || gameState.paused) {
        if (key === ' ') {
            if (gameState.paused) {
                startGame();
            } else if (gameState.gameOver) {
                // 游戏结束状态下，空格键重新开始游戏
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

// 游戏循环
function gameLoop() {
    moveSnake();
    draw();
}

// 启动游戏循环
function startGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(gameLoop, gameState.gameSpeed);
}

// 停止游戏循环
function stopGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

// 速度变更处理
function handleSpeedChange() {
    gameState.gameSpeed = parseInt(speedSelect.value);
    if (gameState.running && !gameState.paused) {
        startGameLoop(); // 重新启动游戏循环以应用新速度
    }
}

// 事件监听器
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
autoBtn.addEventListener('click', toggleAutoMode);
speedSelect.addEventListener('change', handleSpeedChange);
document.addEventListener('keydown', handleKeyPress);

// 初始化游戏
initGame();

// 初始绘制
draw();