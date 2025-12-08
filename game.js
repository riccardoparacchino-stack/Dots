// Level Configuration
const LEVELS = [
    { level: 1,  timeStart: 0,   enemies: 4, speed: 2.5, trackers: 0, directionChange: false, speedBurst: false },
    { level: 2,  timeStart: 8,   enemies: 4, speed: 3.2, trackers: 0, directionChange: false, speedBurst: false },
    { level: 3,  timeStart: 18,  enemies: 5, speed: 3.5, trackers: 0, directionChange: false, speedBurst: false },
    { level: 4,  timeStart: 30,  enemies: 5, speed: 4.0, trackers: 0, directionChange: true,  speedBurst: false },
    { level: 5,  timeStart: 45,  enemies: 6, speed: 4.2, trackers: 1, directionChange: true,  speedBurst: false },
    { level: 6,  timeStart: 60,  enemies: 6, speed: 4.5, trackers: 2, directionChange: true,  speedBurst: false },
    { level: 7,  timeStart: 80,  enemies: 7, speed: 4.8, trackers: 2, directionChange: true,  speedBurst: false },
    { level: 8,  timeStart: 100, enemies: 7, speed: 5.2, trackers: 2, directionChange: true,  speedBurst: true  },
    { level: 9,  timeStart: 125, enemies: 8, speed: 5.5, trackers: 3, directionChange: true,  speedBurst: true  },
    { level: 10, timeStart: 155, enemies: 8, speed: 6.0, trackers: 4, directionChange: true,  speedBurst: true  }
];

// Game State
const game = {
    isRunning: false,
    isCountingDown: false,
    startTime: 0,
    elapsedTime: 0,
    animationId: null,
    currentLevel: 1,
    lastDirectionChangeTime: 0,
    lastSpeedBurstTime: 0,
    playerName: 'Player'
};

// DOM Elements
const gameArea = document.getElementById('game-area');
const player = document.getElementById('player');
const enemiesContainer = document.getElementById('enemies-container');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');
const gameOverModal = document.getElementById('game-over-modal');
const survivalTime = document.getElementById('survival-time');
const finalLevel = document.getElementById('final-level');
const restartBtn = document.getElementById('restart-btn');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const levelIndicator = document.getElementById('level-indicator');
const levelText = document.getElementById('level-text');
const levelUpNotification = document.getElementById('level-up-notification');
const levelUpText = document.getElementById('level-up-text');
const startScreen = document.getElementById('start-screen');
const playerNameInput = document.getElementById('player-name');
const startBtn = document.getElementById('start-btn');
const playerNameDisplay = document.getElementById('player-name-display');

// Game dimensions (will be updated on resize)
let gameWidth = 0;
let gameHeight = 0;

// Player state
const playerState = {
    x: 0,
    y: 0,
    radius: 20,
    speed: 5
};

// Enemy states and elements
let enemyElements = [];
let enemyStates = [];
let enemyRadius = 25; // Will be calculated from CSS

// Input state
const input = {
    dx: 0,
    dy: 0
};

// Device detection
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// Joystick state
const joystick = {
    active: false,
    baseX: 0,
    baseY: 0,
    maxDistance: 35
};

// Get current level config
function getCurrentLevelConfig() {
    return LEVELS[game.currentLevel - 1] || LEVELS[LEVELS.length - 1];
}

// Initialize game dimensions
function updateDimensions() {
    const rect = gameArea.getBoundingClientRect();
    gameWidth = rect.width;
    gameHeight = rect.height;
    
    // Update player radius based on actual element size
    playerState.radius = player.offsetWidth / 2;
    
    // Update enemy radius if enemies exist
    if (enemyElements.length > 0) {
        enemyRadius = enemyElements[0].offsetWidth / 2;
    }
}

// Create enemy DOM element
function createEnemyElement(index, isTracker = false) {
    const enemy = document.createElement('div');
    enemy.id = `enemy-${index}`;
    enemy.className = 'dot enemy-dot' + (isTracker ? ' tracker' : '');
    enemiesContainer.appendChild(enemy);
    return enemy;
}

// Clear all enemies
function clearEnemies() {
    enemiesContainer.innerHTML = '';
    enemyElements = [];
    enemyStates = [];
}

// Initialize enemy positions (diamond pattern for first 4)
function initEnemyPositions(count, levelConfig) {
    clearEnemies();
    
    // Base positions for first 4 enemies (diamond pattern as shown in image)
    const basePositions = [
        { x: gameWidth * 0.2, y: gameHeight * 0.12 },   // Top-left
        { x: gameWidth * 0.8, y: gameHeight * 0.12 },   // Top-right
        { x: gameWidth * 0.2, y: gameHeight * 0.55 },   // Bottom-left
        { x: gameWidth * 0.8, y: gameHeight * 0.55 }    // Bottom-right
    ];
    
    // Additional spawn positions for enemies 5-8
    const additionalPositions = [
        { x: gameWidth * 0.5, y: gameHeight * 0.08 },   // Top-center
        { x: gameWidth * 0.5, y: gameHeight * 0.65 },   // Bottom-center
        { x: gameWidth * 0.1, y: gameHeight * 0.35 },   // Left-center
        { x: gameWidth * 0.9, y: gameHeight * 0.35 }    // Right-center
    ];
    
    const speed = levelConfig.speed;
    
    for (let i = 0; i < count; i++) {
        // Determine if this enemy is a tracker
        const isTracker = i < levelConfig.trackers;
        
        // Create DOM element
        const element = createEnemyElement(i + 1, isTracker);
        enemyElements.push(element);
        
        // Get position
        let pos;
        if (i < 4) {
            pos = basePositions[i];
        } else {
            pos = additionalPositions[i - 4];
        }
        
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        
        enemyStates.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            isTracker: isTracker,
            baseSpeed: speed,
            isBursting: false,
            burstEndTime: 0
        });
    }
    
    // Calculate enemy radius from first element after it's rendered
    requestAnimationFrame(() => {
        if (enemyElements.length > 0) {
            enemyRadius = enemyElements[0].offsetWidth / 2;
        }
    });
}

// Spawn additional enemy mid-game
function spawnEnemy(levelConfig) {
    const index = enemyStates.length;
    const isTracker = index < levelConfig.trackers;
    
    // Create DOM element
    const element = createEnemyElement(index + 1, isTracker);
    enemyElements.push(element);
    
    // Spawn at random edge
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = levelConfig.speed;
    const radius = enemyRadius;
    
    switch(edge) {
        case 0: // Top
            x = Math.random() * gameWidth;
            y = radius;
            vx = (Math.random() - 0.5) * speed;
            vy = speed;
            break;
        case 1: // Right
            x = gameWidth - radius;
            y = Math.random() * gameHeight;
            vx = -speed;
            vy = (Math.random() - 0.5) * speed;
            break;
        case 2: // Bottom
            x = Math.random() * gameWidth;
            y = gameHeight - radius;
            vx = (Math.random() - 0.5) * speed;
            vy = -speed;
            break;
        case 3: // Left
            x = radius;
            y = Math.random() * gameHeight;
            vx = speed;
            vy = (Math.random() - 0.5) * speed;
            break;
    }
    
    enemyStates.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        isTracker: isTracker,
        baseSpeed: speed,
        isBursting: false,
        burstEndTime: 0
    });
}

// Initialize player position
function initPlayerPosition() {
    playerState.x = gameWidth / 2;
    playerState.y = gameHeight * 0.35; // Slightly above center as shown in image
}

// Update dot positions on screen
function updateDotPositions() {
    player.style.left = playerState.x + 'px';
    player.style.top = playerState.y + 'px';
    
    for (let i = 0; i < enemyElements.length; i++) {
        if (enemyStates[i]) {
            enemyElements[i].style.left = enemyStates[i].x + 'px';
            enemyElements[i].style.top = enemyStates[i].y + 'px';
        }
    }
}

// Update enemy speeds when level changes
function updateEnemySpeeds(newSpeed) {
    for (let i = 0; i < enemyStates.length; i++) {
        const enemy = enemyStates[i];
        const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        if (currentSpeed > 0) {
            const ratio = newSpeed / currentSpeed;
            enemy.vx *= ratio;
            enemy.vy *= ratio;
        }
        enemy.baseSpeed = newSpeed;
    }
}

// Update tracker status
function updateTrackers(trackerCount) {
    for (let i = 0; i < enemyStates.length; i++) {
        const shouldBeTracker = i < trackerCount;
        enemyStates[i].isTracker = shouldBeTracker;
        
        if (shouldBeTracker) {
            enemyElements[i].classList.add('tracker');
        } else {
            enemyElements[i].classList.remove('tracker');
        }
    }
}

// Move enemies and handle bouncing
function updateEnemies() {
    const levelConfig = getCurrentLevelConfig();
    const now = Date.now();
    
    for (let i = 0; i < enemyStates.length; i++) {
        const enemy = enemyStates[i];
        
        // Handle speed burst
        if (enemy.isBursting && now > enemy.burstEndTime) {
            enemy.isBursting = false;
            enemyElements[i].classList.remove('bursting');
            // Return to base speed
            const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
            if (currentSpeed > 0) {
                const ratio = enemy.baseSpeed / currentSpeed;
                enemy.vx *= ratio;
                enemy.vy *= ratio;
            }
        }
        
        // Tracker behavior - slowly home toward player
        if (enemy.isTracker) {
            const dx = playerState.x - enemy.x;
            const dy = playerState.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Gradually adjust velocity toward player
                const trackingStrength = 0.02;
                const targetVx = (dx / dist) * enemy.baseSpeed;
                const targetVy = (dy / dist) * enemy.baseSpeed;
                
                enemy.vx += (targetVx - enemy.vx) * trackingStrength;
                enemy.vy += (targetVy - enemy.vy) * trackingStrength;
                
                // Normalize to maintain speed
                const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
                const desiredSpeed = enemy.isBursting ? enemy.baseSpeed * 1.8 : enemy.baseSpeed;
                if (currentSpeed > 0) {
                    enemy.vx = (enemy.vx / currentSpeed) * desiredSpeed;
                    enemy.vy = (enemy.vy / currentSpeed) * desiredSpeed;
                }
            }
        }
        
        // Move
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        
        // Bounce off walls
        if (enemy.x - enemyRadius < 0) {
            enemy.x = enemyRadius;
            enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x + enemyRadius > gameWidth) {
            enemy.x = gameWidth - enemyRadius;
            enemy.vx = -Math.abs(enemy.vx);
        }
        
        if (enemy.y - enemyRadius < 0) {
            enemy.y = enemyRadius;
            enemy.vy = Math.abs(enemy.vy);
        } else if (enemy.y + enemyRadius > gameHeight) {
            enemy.y = gameHeight - enemyRadius;
            enemy.vy = -Math.abs(enemy.vy);
        }
    }
    
    // Random direction changes (level 4+)
    if (levelConfig.directionChange && now - game.lastDirectionChangeTime > 2000) {
        // 30% chance every 2 seconds
        if (Math.random() < 0.3) {
            const randomEnemy = Math.floor(Math.random() * enemyStates.length);
            const enemy = enemyStates[randomEnemy];
            
            // Random new direction
            const angle = Math.random() * Math.PI * 2;
            const speed = enemy.isBursting ? enemy.baseSpeed * 1.8 : enemy.baseSpeed;
            enemy.vx = Math.cos(angle) * speed;
            enemy.vy = Math.sin(angle) * speed;
        }
        game.lastDirectionChangeTime = now;
    }
    
    // Speed bursts (level 8+)
    if (levelConfig.speedBurst && now - game.lastSpeedBurstTime > 3000) {
        // 25% chance every 3 seconds
        if (Math.random() < 0.25) {
            const randomEnemy = Math.floor(Math.random() * enemyStates.length);
            const enemy = enemyStates[randomEnemy];
            
            if (!enemy.isBursting) {
                enemy.isBursting = true;
                enemy.burstEndTime = now + 800; // Burst lasts 0.8 seconds
                enemyElements[randomEnemy].classList.add('bursting');
                
                // Increase speed
                const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
                if (currentSpeed > 0) {
                    const ratio = (enemy.baseSpeed * 1.8) / currentSpeed;
                    enemy.vx *= ratio;
                    enemy.vy *= ratio;
                }
            }
        }
        game.lastSpeedBurstTime = now;
    }
}

// Update player position based on input
function updatePlayer() {
    // Normalize input if diagonal
    let dx = input.dx;
    let dy = input.dy;
    
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 1) {
        dx /= magnitude;
        dy /= magnitude;
    }
    
    // Move player
    playerState.x += dx * playerState.speed;
    playerState.y += dy * playerState.speed;
    
    // Clamp to bounds
    playerState.x = Math.max(playerState.radius, Math.min(gameWidth - playerState.radius, playerState.x));
    playerState.y = Math.max(playerState.radius, Math.min(gameHeight - playerState.radius, playerState.y));
}

// Check collision between player and enemies
function checkCollision() {
    for (let i = 0; i < enemyStates.length; i++) {
        const enemy = enemyStates[i];
        const dx = playerState.x - enemy.x;
        const dy = playerState.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = playerState.radius + enemyRadius;
        
        if (distance < minDistance * 0.85) { // Slightly forgiving collision
            return true;
        }
    }
    return false;
}

// Check and handle level progression
function checkLevelProgression() {
    const currentConfig = getCurrentLevelConfig();
    const nextLevel = game.currentLevel + 1;
    
    if (nextLevel <= LEVELS.length) {
        const nextConfig = LEVELS[nextLevel - 1];
        
        if (game.elapsedTime >= nextConfig.timeStart) {
            // Level up!
            game.currentLevel = nextLevel;
            
            // Update UI
            levelText.textContent = 'Level ' + nextLevel;
            
            // Show level up notification
            showLevelUpNotification(nextLevel);
            
            // Spawn new enemies if needed
            while (enemyStates.length < nextConfig.enemies) {
                spawnEnemy(nextConfig);
            }
            
            // Update speeds
            updateEnemySpeeds(nextConfig.speed);
            
            // Update trackers
            updateTrackers(nextConfig.trackers);
        }
    }
}

// Show level up notification
function showLevelUpNotification(level) {
    levelUpText.textContent = 'Level ' + level;
    levelUpNotification.classList.remove('hidden');
    
    // Flash effect on game area
    gameArea.classList.add('level-up-flash');
    
    // Hide after animation
    setTimeout(() => {
        levelUpNotification.classList.add('hidden');
        gameArea.classList.remove('level-up-flash');
    }, 1500);
}

// Game loop
function gameLoop(timestamp) {
    if (!game.isRunning) return;
    
    // Update elapsed time
    game.elapsedTime = (Date.now() - game.startTime) / 1000;
    
    // Check level progression
    checkLevelProgression();
    
    // Update game objects
    updatePlayer();
    updateEnemies();
    updateDotPositions();
    
    // Check for collision
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    game.animationId = requestAnimationFrame(gameLoop);
}

// Start countdown
function startCountdown() {
    game.isCountingDown = true;
    countdownOverlay.classList.remove('hidden');
    let count = 4;
    
    function tick() {
        if (count > 0) {
            countdownText.textContent = count;
            // Re-trigger animation
            countdownText.style.animation = 'none';
            countdownText.offsetHeight; // Trigger reflow
            countdownText.style.animation = 'pulse 0.5s ease-in-out';
            count--;
            setTimeout(tick, 1000);
        } else {
            countdownText.textContent = 'GO!';
            countdownText.style.animation = 'none';
            countdownText.offsetHeight;
            countdownText.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                countdownOverlay.classList.add('hidden');
                game.isCountingDown = false;
                startGame();
            }, 500);
        }
    }
    
    tick();
}

// Start the game
function startGame() {
    game.isRunning = true;
    game.startTime = Date.now();
    game.elapsedTime = 0;
    game.currentLevel = 1;
    game.lastDirectionChangeTime = Date.now();
    game.lastSpeedBurstTime = Date.now();
    
    // Update level indicator
    levelText.textContent = 'Level 1';
    
    game.animationId = requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    game.isRunning = false;
    if (game.animationId) {
        cancelAnimationFrame(game.animationId);
    }
    
    // Show game over modal with stats
    playerNameDisplay.textContent = game.playerName;
    survivalTime.textContent = game.elapsedTime.toFixed(2);
    finalLevel.textContent = game.currentLevel;
    gameOverModal.classList.remove('hidden');
}

// Reset and restart game
function resetGame() {
    game.isRunning = false;
    game.isCountingDown = false;
    game.elapsedTime = 0;
    game.currentLevel = 1;
    
    if (game.animationId) {
        cancelAnimationFrame(game.animationId);
    }
    
    // Reset input
    input.dx = 0;
    input.dy = 0;
    
    // Reset joystick
    joystickKnob.style.transform = 'translate(0, 0)';
    
    // Hide modal and notifications
    gameOverModal.classList.add('hidden');
    levelUpNotification.classList.add('hidden');
    
    // Reset level indicator
    levelText.textContent = 'Level 1';
    
    // Reinitialize positions
    updateDimensions();
    initPlayerPosition();
    initEnemyPositions(LEVELS[0].enemies, LEVELS[0]);
    updateDotPositions();
    
    // Start countdown
    startCountdown();
}

// Keyboard controls
const keysPressed = {};

function handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        keysPressed[e.key] = true;
        updateInputFromKeys();
    }
}

function handleKeyUp(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keysPressed[e.key] = false;
        updateInputFromKeys();
    }
}

function updateInputFromKeys() {
    input.dx = 0;
    input.dy = 0;
    
    if (keysPressed['ArrowLeft']) input.dx -= 1;
    if (keysPressed['ArrowRight']) input.dx += 1;
    if (keysPressed['ArrowUp']) input.dy -= 1;
    if (keysPressed['ArrowDown']) input.dy += 1;
}

// Mouse controls (desktop only)
function handleMouseMove(e) {
    if (!game.isRunning || isTouchDevice) return;
    
    const rect = gameArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate direction to mouse
    const dx = mouseX - playerState.x;
    const dy = mouseY - playerState.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5) { // Dead zone
        input.dx = dx / distance;
        input.dy = dy / distance;
        
        // Scale by distance (closer = slower)
        const speedScale = Math.min(distance / 100, 1);
        input.dx *= speedScale;
        input.dy *= speedScale;
    } else {
        input.dx = 0;
        input.dy = 0;
    }
}

function handleMouseLeave() {
    if (!isTouchDevice) {
        input.dx = 0;
        input.dy = 0;
    }
}

// Joystick controls (touch)
function handleJoystickStart(e) {
    e.preventDefault();
    joystick.active = true;
    
    const rect = joystickBase.getBoundingClientRect();
    joystick.baseX = rect.left + rect.width / 2;
    joystick.baseY = rect.top + rect.height / 2;
    
    handleJoystickMove(e);
}

function handleJoystickMove(e) {
    if (!joystick.active) return;
    e.preventDefault();
    
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joystick.baseX;
    const dy = touch.clientY - joystick.baseY;
    
    // Clamp to max distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, joystick.maxDistance);
    
    let knobX = dx;
    let knobY = dy;
    
    if (distance > joystick.maxDistance) {
        knobX = (dx / distance) * joystick.maxDistance;
        knobY = (dy / distance) * joystick.maxDistance;
    }
    
    // Update knob position
    joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    
    // Update input (normalized -1 to 1)
    input.dx = knobX / joystick.maxDistance;
    input.dy = knobY / joystick.maxDistance;
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystick.active = false;
    
    // Reset knob position
    joystickKnob.style.transform = 'translate(0, 0)';
    
    // Reset input
    input.dx = 0;
    input.dy = 0;
}

// Event listeners
function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Mouse (desktop)
    if (!isTouchDevice) {
        gameArea.addEventListener('mousemove', handleMouseMove);
        gameArea.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // Touch joystick
    joystickBase.addEventListener('touchstart', handleJoystickStart, { passive: false });
    document.addEventListener('touchmove', handleJoystickMove, { passive: false });
    document.addEventListener('touchend', handleJoystickEnd, { passive: false });
    document.addEventListener('touchcancel', handleJoystickEnd, { passive: false });
    
    // Start button
    startBtn.addEventListener('click', handleStartGame);
    startBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleStartGame();
    });
    
    // Enter key to start game
    playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleStartGame();
        }
    });
    
    // Restart button
    restartBtn.addEventListener('click', resetGame);
    restartBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        resetGame();
    });
    
    // Window resize
    window.addEventListener('resize', () => {
        updateDimensions();
        if (!game.isRunning && !game.isCountingDown) {
            initPlayerPosition();
            initEnemyPositions(LEVELS[0].enemies, LEVELS[0]);
            updateDotPositions();
        }
    });
}

// Handle start game from start screen
function handleStartGame() {
    // Get player name
    const name = playerNameInput.value.trim();
    game.playerName = name || 'Player';
    
    // Hide start screen
    startScreen.classList.add('hidden');
    
    // Initialize game positions
    updateDimensions();
    initPlayerPosition();
    initEnemyPositions(LEVELS[0].enemies, LEVELS[0]);
    updateDotPositions();
    
    // Start countdown
    setTimeout(startCountdown, 300);
}

// Initialize game
function init() {
    setupEventListeners();
    
    // Focus on name input
    setTimeout(() => {
        playerNameInput.focus();
    }, 100);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
