/**
 * 五子棋游戏 - 纯前端HTML5版
 * 使用localStorage保存游戏状态
 */

// 游戏常量
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DEFAULT_BOARD_SIZE = 15;

// 游戏状态
let boardSize = DEFAULT_BOARD_SIZE;
let gameState = {
    board: [], // 棋盘状态
    currentTurn: BLACK, // 当前回合，黑方先行
    status: 'playing', // 游戏状态：playing, finished
    winner: null, // 获胜者
    moveHistory: [], // 落子历史
    blackPlayer: '玩家1',
    whitePlayer: '玩家2',
    lastMove: null, // 最后一步落子位置
    gameId: generateGameId() // 唯一游戏ID
};

// DOM 元素
let canvas, ctx;
let blackPlayerElement, whitePlayerElement;
let blackTurnIndicator, whiteTurnIndicator;
let statusElement;
let resultModal, resultMessage;
let settingsPanel;
let historyList;

// 游戏配置
let cellSize = 30; // 单元格大小
let pieceRadius = 13; // 棋子半径

// 初始化函数
function init() {
    // 获取DOM元素
    canvas = document.getElementById('gomoku-canvas');
    ctx = canvas.getContext('2d');
    blackPlayerElement = document.getElementById('black-player');
    whitePlayerElement = document.getElementById('white-player');
    blackTurnIndicator = document.getElementById('black-turn');
    whiteTurnIndicator = document.getElementById('white-turn');
    statusElement = document.getElementById('status');
    resultModal = document.getElementById('result-modal');
    resultMessage = document.getElementById('result-message');
    settingsPanel = document.getElementById('settings-panel');
    historyList = document.getElementById('history-list');
    
    // 设置画布大小
    resizeCanvas();
    
    // 加载游戏或显示设置面板
    if (loadGameFromStorage()) {
        drawBoard();
        updateGameInfo();
    } else {
        showSettings();
    }
    
    // 添加事件监听
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', resizeCanvas);
    
    // 按钮事件监听
    document.getElementById('new-game-btn').addEventListener('click', showSettings);
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    document.getElementById('pass-btn').addEventListener('click', forfeitGame);
    document.getElementById('start-game-btn').addEventListener('click', startNewGame);
    document.getElementById('new-game-modal-btn').addEventListener('click', showSettings);
    document.getElementById('share-btn').addEventListener('click', toggleQRCode);
    document.getElementById('help-btn').addEventListener('click', showHelp);
    document.getElementById('close-help-btn').addEventListener('click', hideHelp);
    
    // 定期保存游戏状态
    setInterval(saveGameToStorage, 5000);
}

// 调整画布大小
function resizeCanvas() {
    const container = canvas.parentElement;
    const size = Math.min(container.clientWidth, 500);
    
    cellSize = Math.floor(size / (boardSize + 1));
    pieceRadius = Math.floor(cellSize * 0.4);
    
    canvas.width = (boardSize + 1) * cellSize;
    canvas.height = (boardSize + 1) * cellSize;
    
    // 如果游戏已初始化，重绘棋盘
    if (gameState.board.length > 0) {
        drawBoard();
    }
}

// 创建新游戏
function startNewGame() {
    // 获取设置的参数
    const player1Name = document.getElementById('player1-name').value || '玩家1';
    const player2Name = document.getElementById('player2-name').value || '玩家2';
    boardSize = parseInt(document.getElementById('board-size').value) || DEFAULT_BOARD_SIZE;
    
    // 创建空棋盘
    gameState.board = Array(boardSize).fill().map(() => Array(boardSize).fill(EMPTY));
    gameState.currentTurn = BLACK;
    gameState.status = 'playing';
    gameState.winner = null;
    gameState.moveHistory = [];
    gameState.blackPlayer = player1Name;
    gameState.whitePlayer = player2Name;
    gameState.lastMove = null;
    gameState.gameId = generateGameId();
    
    // 更新界面
    resizeCanvas();
    drawBoard();
    updateGameInfo();
    
    // 隐藏设置面板
    hideSettings();
    
    // 保存游戏状态
    saveGameToStorage();
    
    // 更新历史记录
    updateHistoryList();
}

// 绘制棋盘
function drawBoard() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制棋盘背景
    ctx.fillStyle = '#DEB887'; // 木色背景
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 1;
    
    // 绘制横线
    for (let i = 0; i < boardSize; i++) {
        ctx.beginPath();
        ctx.moveTo(cellSize, (i + 1) * cellSize);
        ctx.lineTo(boardSize * cellSize, (i + 1) * cellSize);
        ctx.stroke();
    }
    
    // 绘制纵线
    for (let i = 0; i < boardSize; i++) {
        ctx.beginPath();
        ctx.moveTo((i + 1) * cellSize, cellSize);
        ctx.lineTo((i + 1) * cellSize, boardSize * cellSize);
        ctx.stroke();
    }
    
    // 绘制天元和星位
    if (boardSize === 15 || boardSize === 19) {
        const stars = boardSize === 19 ? [3, 9, 15] : [3, 7, 11];
        
        stars.forEach(x => {
            stars.forEach(y => {
                ctx.beginPath();
                ctx.arc((x + 1) * cellSize, (y + 1) * cellSize, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#000';
                ctx.fill();
            });
        });
    }
    
    // 绘制棋子
    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            if (gameState.board[y][x] === BLACK) {
                drawPiece(x, y, 'black');
            } else if (gameState.board[y][x] === WHITE) {
                drawPiece(x, y, 'white');
            }
        }
    }
    
    // 绘制最后一步落子的标记
    if (gameState.lastMove) {
        const { x, y } = gameState.lastMove;
        ctx.beginPath();
        ctx.arc((x + 1) * cellSize, (y + 1) * cellSize, pieceRadius / 2, 0, Math.PI * 2);
        ctx.fillStyle = gameState.board[y][x] === BLACK ? '#fff' : '#000';
        ctx.fill();
    }
}

// 绘制棋子
function drawPiece(x, y, color) {
    ctx.beginPath();
    ctx.arc((x + 1) * cellSize, (y + 1) * cellSize, pieceRadius, 0, Math.PI * 2);
    
    if (color === 'black') {
        // 黑棋
        ctx.fillStyle = '#000';
    } else {
        // 白棋
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    ctx.fill();
}

// 处理画布点击
function handleCanvasClick(event) {
    // 如果游戏已结束，忽略点击
    if (gameState.status === 'finished') return;
    
    // 获取点击位置对应的棋盘坐标
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    
    // 转换为棋盘坐标
    const x = Math.round(canvasX / cellSize - 1);
    const y = Math.round(canvasY / cellSize - 1);
    
    // 检查坐标是否有效
    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return;
    
    // 检查该位置是否已有棋子
    if (gameState.board[y][x] !== EMPTY) return;
    
    // 落子
    gameState.board[y][x] = gameState.currentTurn;
    gameState.lastMove = { x, y };
    gameState.moveHistory.push({ x, y, color: gameState.currentTurn });
    
    // 检查是否获胜
    if (checkWin(x, y)) {
        gameState.status = 'finished';
        gameState.winner = gameState.currentTurn;
        showResult();
    } else {
        // 切换回合
        gameState.currentTurn = gameState.currentTurn === BLACK ? WHITE : BLACK;
    }
    
    // 更新界面
    drawBoard();
    updateGameInfo();
    
    // 保存游戏状态
    saveGameToStorage();
}

// 检查是否获胜
function checkWin(x, y) {
    const color = gameState.board[y][x];
    const directions = [
        [1, 0],   // 水平
        [0, 1],   // 垂直
        [1, 1],   // 右下对角线
        [1, -1]   // 右上对角线
    ];
    
    for (const [dx, dy] of directions) {
        let count = 1;
        
        // 向一个方向查找
        for (let i = 1; i <= 4; i++) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;
            if (gameState.board[ny][nx] !== color) break;
            
            count++;
        }
        
        // 向相反方向查找
        for (let i = 1; i <= 4; i++) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) break;
            if (gameState.board[ny][nx] !== color) break;
            
            count++;
        }
        
        // 如果有5个连续的同色棋子，获胜
        if (count >= 5) return true;
    }
    
    return false;
}

// 更新游戏信息显示
function updateGameInfo() {
    blackPlayerElement.textContent = gameState.blackPlayer;
    whitePlayerElement.textContent = gameState.whitePlayer;
    
    // 更新回合指示器
    blackTurnIndicator.className = gameState.currentTurn === BLACK ? 'turn-indicator active' : 'turn-indicator';
    whiteTurnIndicator.className = gameState.currentTurn === WHITE ? 'turn-indicator active' : 'turn-indicator';
    
    // 更新状态文本
    if (gameState.status === 'playing') {
        statusElement.textContent = gameState.currentTurn === BLACK ? 
            '黑方回合' : '白方回合';
    } else {
        statusElement.textContent = gameState.winner === BLACK ? 
            '黑方获胜！' : '白方获胜！';
    }
    
    // 更新悔棋按钮状态
    document.getElementById('undo-btn').disabled = gameState.moveHistory.length === 0;
}

// 显示结果弹窗
function showResult() {
    resultMessage.textContent = gameState.winner === BLACK ? 
        `${gameState.blackPlayer} 获胜！` : `${gameState.whitePlayer} 获胜！`;
    resultModal.style.display = 'flex';
    
    // 更新历史记录
    addHistoryRecord();
}

// 认输
function forfeitGame() {
    if (gameState.status === 'finished') return;
    
    if (confirm('确定要认输吗？')) {
        gameState.status = 'finished';
        gameState.winner = gameState.currentTurn === BLACK ? WHITE : BLACK;
        showResult();
        drawBoard();
        updateGameInfo();
        saveGameToStorage();
    }
}

// 悔棋
function undoMove() {
    if (gameState.moveHistory.length === 0) return;
    
    // 取出最后一步
    const lastMove = gameState.moveHistory.pop();
    
    // 恢复棋盘状态
    gameState.board[lastMove.y][lastMove.x] = EMPTY;
    
    // 恢复回合
    gameState.currentTurn = lastMove.color;
    
    // 更新最后一步标记
    if (gameState.moveHistory.length > 0) {
        const previousMove = gameState.moveHistory[gameState.moveHistory.length - 1];
        gameState.lastMove = { x: previousMove.x, y: previousMove.y };
    } else {
        gameState.lastMove = null;
    }
    
    // 如果游戏已结束，恢复为进行中
    gameState.status = 'playing';
    gameState.winner = null;
    
    // 更新界面
    drawBoard();
    updateGameInfo();
    
    // 隐藏结果弹窗
    resultModal.style.display = 'none';
    
    // 保存游戏状态
    saveGameToStorage();
}

// 显示设置面板
function showSettings() {
    // 填充当前设置
    document.getElementById('player1-name').value = gameState.blackPlayer || '玩家1';
    document.getElementById('player2-name').value = gameState.whitePlayer || '玩家2';
    
    // 根据当前棋盘大小选择选项
    const sizeSelect = document.getElementById('board-size');
    for (let i = 0; i < sizeSelect.options.length; i++) {
        if (parseInt(sizeSelect.options[i].value) === boardSize) {
            sizeSelect.selectedIndex = i;
            break;
        }
    }
    
    // 显示设置面板
    settingsPanel.style.display = 'block';
    
    // 隐藏结果弹窗
    resultModal.style.display = 'none';
}

// 隐藏设置面板
function hideSettings() {
    settingsPanel.style.display = 'none';
}

// 保存游戏到localStorage
function saveGameToStorage() {
    try {
        // 保存当前游戏
        localStorage.setItem('gomoku_current_game', JSON.stringify(gameState));
        
        // 保存历史记录
        if (gameState.status === 'finished' && !localStorage.getItem(`gomoku_history_${gameState.gameId}`)) {
            addHistoryRecord();
        }
    } catch (e) {
        console.error('保存游戏失败:', e);
    }
}

// 从localStorage加载游戏
function loadGameFromStorage() {
    try {
        const savedGame = localStorage.getItem('gomoku_current_game');
        if (savedGame) {
            const parsed = JSON.parse(savedGame);
            
            // 验证数据完整性
            if (parsed.board && Array.isArray(parsed.board) && parsed.currentTurn) {
                gameState = parsed;
                boardSize = gameState.board.length;
                
                updateHistoryList();
                return true;
            }
        }
        return false;
    } catch (e) {
        console.error('加载游戏失败:', e);
        return false;
    }
}

// 添加历史记录
function addHistoryRecord() {
    if (gameState.status !== 'finished') return;
    
    const historyRecord = {
        gameId: gameState.gameId,
        date: new Date().toISOString(),
        blackPlayer: gameState.blackPlayer,
        whitePlayer: gameState.whitePlayer,
        winner: gameState.winner,
        moves: gameState.moveHistory.length
    };
    
    try {
        localStorage.setItem(`gomoku_history_${gameState.gameId}`, JSON.stringify(historyRecord));
        
        // 更新历史记录列表
        updateHistoryList();
    } catch (e) {
        console.error('保存历史记录失败:', e);
    }
}

// 更新历史记录列表
function updateHistoryList() {
    historyList.innerHTML = '';
    
    // 获取所有历史记录
    const records = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('gomoku_history_')) {
            try {
                const record = JSON.parse(localStorage.getItem(key));
                record.key = key;
                records.push(record);
            } catch (e) {
                console.error('解析历史记录失败:', e);
            }
        }
    }
    
    // 按日期排序
    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 限制显示最近10条
    const recentRecords = records.slice(0, 10);
    
    // 添加到列表
    for (const record of recentRecords) {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const winnerName = record.winner === BLACK ? record.blackPlayer : record.whitePlayer;
        const date = new Date(record.date).toLocaleString();
        
        item.innerHTML = `
            <div>${record.blackPlayer} vs ${record.whitePlayer}</div>
            <div>获胜者: ${winnerName}</div>
            <div>${date}</div>
        `;
        
        historyList.appendChild(item);
    }
}

// 显示/隐藏二维码
function toggleQRCode() {
    const qrcodeContainer = document.getElementById('qrcode-container');
    
    if (qrcodeContainer.style.display === 'none') {
        // 显示二维码
        qrcodeContainer.style.display = 'block';
        
        // 生成二维码
        const qrcodeElement = document.getElementById('qrcode');
        qrcodeElement.innerHTML = '';
        
        // 创建分享URL
        const gameData = {
            id: gameState.gameId,
            board: gameState.board,
            currentTurn: gameState.currentTurn,
            blackPlayer: gameState.blackPlayer,
            whitePlayer: gameState.whitePlayer,
            moveHistory: gameState.moveHistory,
            lastMove: gameState.lastMove
        };
        
        // 压缩数据
        const compressedData = compressGameData(gameData);
        
        // 创建URL，使用URL哈希部分携带游戏数据
        const shareUrl = `${window.location.origin}${window.location.pathname}#${compressedData}`;
        
        // 生成二维码
        if (window.QRCode) {
            new QRCode(qrcodeElement, {
                text: shareUrl,
                width: 128,
                height: 128
            });
        } else {
            qrcodeElement.textContent = '二维码库加载失败';
        }
    } else {
        // 隐藏二维码
        qrcodeContainer.style.display = 'none';
    }
}

// 压缩游戏数据
function compressGameData(gameData) {
    // 简单的数据压缩（实际可以用更复杂的压缩算法）
    const jsonString = JSON.stringify(gameData);
    try {
        // 使用内置的btoa进行base64编码
        return btoa(encodeURIComponent(jsonString));
    } catch (e) {
        console.error('压缩游戏数据失败:', e);
        return '';
    }
}

// 解压游戏数据
function decompressGameData(compressed) {
    try {
        // 解码base64
        const jsonString = decodeURIComponent(atob(compressed));
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('解压游戏数据失败:', e);
        return null;
    }
}

// 显示帮助
function showHelp() {
    document.getElementById('help-modal').style.display = 'flex';
}

// 隐藏帮助
function hideHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

// 生成游戏ID
function generateGameId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 检查URL哈希是否包含游戏数据
function checkShareUrl() {
    if (window.location.hash) {
        try {
            const hashData = window.location.hash.substring(1);
            const gameData = decompressGameData(hashData);
            
            if (gameData && gameData.board) {
                // 加载分享的游戏数据
                gameState.board = gameData.board;
                gameState.currentTurn = gameData.currentTurn;
                gameState.blackPlayer = gameData.blackPlayer;
                gameState.whitePlayer = gameData.whitePlayer;
                gameState.moveHistory = gameData.moveHistory;
                gameState.lastMove = gameData.lastMove;
                gameState.status = 'playing'; // 分享的游戏总是可以继续
                gameState.winner = null;
                gameState.gameId = gameData.id || generateGameId();
                
                boardSize = gameState.board.length;
                
                // 更新界面
                resizeCanvas();
                drawBoard();
                updateGameInfo();
                
                // 清除URL哈希，避免刷新重复加载
                window.location.hash = '';
                
                return true;
            }
        } catch (e) {
            console.error('解析共享URL失败:', e);
        }
    }
    return false;
}

// 页面加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    // 先检查是否有分享URL
    if (!checkShareUrl()) {
        // 没有分享数据，正常初始化
        init();
    }
});
