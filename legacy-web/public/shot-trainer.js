// shot-trainer.js

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('shotTrainerPage')) {
        initializeShotTrainer();
    }
});

let canvas, ctx;
let currentTool = 'line';
let drawing = false;
let startPos = {};
let lines = [];

function initializeShotTrainer() {
    canvas = document.getElementById('shotCanvas');
    const poolTable = document.getElementById('poolTable');
    canvas.width = poolTable.offsetWidth;
    canvas.height = poolTable.offsetHeight;
    ctx = canvas.getContext('2d');

    createBalls(true); // Initial rack
    setupEventListeners();
    
    // Check for a shot in the URL on load
    loadShotFromURL();
}

function setupEventListeners() {
    // Tool buttons
    document.getElementById('resetBallsBtn').addEventListener('click', () => createBalls(true));
    document.getElementById('saveShotBtn').addEventListener('click', saveShotToURL);
    document.getElementById('loadShotBtn').addEventListener('click', () => {
        const url = prompt("Paste the shot URL to load:");
        if (url) {
            try {
                const hash = new URL(url).hash;
                if (hash) {
                    window.location.hash = hash;
                    loadShotFromURL();
                }
            } catch (e) {
                alert("Invalid URL");
            }
        }
    });

    // Drawing controls
    const arrowBtns = document.querySelectorAll('.arrow-btn');
    arrowBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = btn.dataset.tool;
            arrowBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            canvas.style.pointerEvents = 'auto'; // Enable drawing on canvas
        });
    });
    document.getElementById('clearLinesBtn').addEventListener('click', clearCanvas);

    // English selector
    setupEnglishSelector();

    // Canvas drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
}

function createBalls(rack = false) {
    const poolTable = document.getElementById('poolTable');
    poolTable.innerHTML = '<canvas id="shotCanvas"></canvas>'; // Clear old balls, keep canvas
    
    const ballColors = {
        'C': '#fff', '1': '#ffcc00', '2': '#0000ff', '3': '#ff0000', '4': '#800080',
        '5': '#ff8c00', '6': '#008000', '7': '#8b4513', '8': '#000000', '9': '#ffcc00',
        '10': '#0000ff', '11': '#ff0000', '12': '#800080', '13': '#ff8c00', '14': '#008000', '15': '#8b4513'
    };
    const ballNumbers = ['C', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'];

    if (rack) {
        // Racked positions
        const headSpotX = 75; // %
        const headSpotY = 50; // %
        const ballDiameter = 2.25;
        let positions = [
            { x: 25, y: 50 } // Cue ball
        ];
        
        let row = 0;
        let col = 0;
        let rackOrder = ['1', '9', '2', '10', '8', '3', '11', '4', '12', '5', '13', '6', '14', '7', '15'];
        let ballIndex = 0;

        for (let i = 0; i < 5; i++) { // 5 rows in a rack
            for (let j = 0; j <= i; j++) {
                let x = headSpotX + (i * ballDiameter * 0.866);
                let y = headSpotY + (j * ballDiameter) - (i * ballDiameter / 2);
                positions.push({ x, y, num: rackOrder[ballIndex++] });
            }
        }
        
        ballNumbers.forEach((num, i) => {
            const ball = createBallElement(num, ballColors[num]);
            const pos = positions[i];
            ball.dataset.num = pos.num || 'C';
            ball.style.left = `${pos.x}%`;
            ball.style.top = `${pos.y}%`;
            poolTable.appendChild(ball);
        });

    } else {
        // Just line them up
        ballNumbers.forEach((num, i) => {
            const ball = createBallElement(num, ballColors[num]);
            ball.style.left = `${5 + (i * 3)}%`;
            ball.style.top = '5%';
            poolTable.appendChild(ball);
        });
    }

    // Re-initialize canvas after clearing
    canvas = document.getElementById('shotCanvas');
    canvas.width = poolTable.offsetWidth;
    canvas.height = poolTable.offsetHeight;
    ctx = canvas.getContext('2d');
}

function createBallElement(num, color) {
    const ball = document.createElement('div');
    ball.className = 'pool-ball';
    ball.id = `ball-${num}`;
    ball.style.backgroundColor = color;
    if (num !== 'C') {
        const isStriped = parseInt(num) > 8;
        if (isStriped) {
             ball.innerHTML = `<span style="background: white; color: black; border-radius: 5px; padding: 0 4px;">${num}</span>`;
        } else {
            ball.textContent = num;
        }
    }
    makeDraggable(ball);
    return ball;
}

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        element.style.cursor = 'grabbing';
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        const table = element.parentElement;
        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;
        if (newLeft > table.offsetWidth - element.offsetWidth) newLeft = table.offsetWidth - element.offsetWidth;
        if (newTop > table.offsetHeight - element.offsetHeight) newTop = table.offsetHeight - element.offsetHeight;

        element.style.top = `${newTop}px`;
        element.style.left = `${newLeft}px`;
    }

    function closeDragElement() {
        element.style.cursor = 'grab';
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// ... rest of the functions ...
function setupEnglishSelector() {
    const cueBallView = document.getElementById('cueBallView');
    const englishDot = document.getElementById('englishDot');

    cueBallView.addEventListener('click', function(e) {
        const rect = cueBallView.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Constrain to circle
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        if (distance <= centerX) {
            englishDot.style.left = `${x}px`;
            englishDot.style.top = `${y}px`;
        }
    });
}

function startDrawing(e) {
    if (e.target === canvas) {
        drawing = true;
        startPos = { x: e.offsetX, y: e.offsetY };
    }
}

function draw(e) {
    if (!drawing) return;
    redrawCanvas(); // Clear and draw existing lines
    
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    const currentPos = { x: e.offsetX, y: e.offsetY };
    
    if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
    } else if (currentTool === 'curve') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.quadraticCurveTo(startPos.x, currentPos.y, currentPos.x, currentPos.y);
        ctx.stroke();
    }
}

function stopDrawing(e) {
    if (!drawing) return;
    drawing = false;
    lines.push({ start: startPos, end: { x: e.offsetX, y: e.offsetY }, tool: currentTool });
    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#ffdd00';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);

    lines.forEach(line => {
        ctx.beginPath();
        if (line.tool === 'line') {
            ctx.moveTo(line.start.x, line.start.y);
            ctx.lineTo(line.end.x, line.end.y);
        } else if (line.tool === 'curve') {
            ctx.moveTo(line.start.x, line.start.y);
            ctx.quadraticCurveTo(line.start.x, line.end.y, line.end.x, line.end.y);
        }
        ctx.stroke();
    });
}

function clearCanvas() {
    lines = [];
    redrawCanvas();
    canvas.style.pointerEvents = 'none'; // Disable canvas clicks
    document.querySelectorAll('.arrow-btn').forEach(b => b.classList.remove('active'));
}

// --- SAVE/LOAD ---
function saveShotToURL() {
    const ballElements = document.querySelectorAll('.pool-ball');
    const ballPositions = Array.from(ballElements).map(b => ({
        id: b.id,
        left: b.style.left,
        top: b.style.top
    }));
    
    const englishDot = document.getElementById('englishDot');
    const englishPos = { left: englishDot.style.left, top: englishDot.style.top };

    const shotData = {
        balls: ballPositions,
        lines: lines,
        english: englishPos
    };

    const hash = btoa(JSON.stringify(shotData));
    const newUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    
    navigator.clipboard.writeText(newUrl).then(() => {
        alert("Shareable URL copied to clipboard!");
    }, () => {
        alert("Could not copy URL. You can manually copy it from the address bar.");
    });

    window.location.hash = hash;
}

function loadShotFromURL() {
    if (!window.location.hash) return;
    
    try {
        const dataStr = atob(window.location.hash.substring(1));
        const shotData = JSON.parse(dataStr);
        
        // Load ball positions
        shotData.balls.forEach(pos => {
            const ball = document.getElementById(pos.id);
            if (ball) {
                ball.style.left = pos.left;
                ball.style.top = pos.top;
            }
        });

        // Load lines
        lines = shotData.lines;
        redrawCanvas();

        // Load english
        const englishDot = document.getElementById('englishDot');
        englishDot.style.left = shotData.english.left;
        englishDot.style.top = shotData.english.top;

    } catch (e) {
        // Silently ignore invalid URL data - the app will simply start with default state
    }
}