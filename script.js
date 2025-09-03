// 游戏配置
const GRID_SIZE = 20;
const CANVAS_SIZE = 400;
const GRID_COUNT = CANVAS_SIZE / GRID_SIZE;

// 游戏状态
let gameState = {
    running: false,
    paused: false,
    gameOver: false,
    score: 0,
    highScore: localStorage.getItem('snakeHighScore') || 0
};

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

// 移动蛇
function moveSnake() {
    if (!gameState.running || gameState.paused) return;
    
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
}

// 开始/继续游戏
function startGame() {
    if (gameState.paused) {
        gameState.paused = false;
    } else if (gameState.gameOver) {
        // 游戏结束后重新开始
        initGame();
        gameState.running = true;
        snake.nextDirection = {x: 1, y: 0};
    } else {
        gameState.running = true;
        // 如果蛇没有方向，设置默认方向
        if (snake.direction.x === 0 && snake.direction.y === 0) {
            snake.nextDirection = {x: 1, y: 0};
        }
    }
    updateButtons();
}

// 暂停游戏
function pauseGame() {
    if (gameState.running) {
        gameState.paused = true;
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
                resetGame();
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
            if (currentDir.y !== 1) {
                snake.nextDirection = {x: 0, y: -1};
            }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (currentDir.y !== -1) {
                snake.nextDirection = {x: 0, y: 1};
            }
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (currentDir.x !== 1) {
                snake.nextDirection = {x: -1, y: 0};
            }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (currentDir.x !== -1) {
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

// 事件监听器
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
document.addEventListener('keydown', handleKeyPress);

// 初始化游戏
initGame();

// 启动游戏循环
setInterval(gameLoop, 150); // 每150毫秒更新一次