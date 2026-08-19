// ======================================================================
//  《星穹弈》 V2.0 核心逻辑
//  完整游戏引擎（含所有机制 + 新增交互升级）
// ======================================================================

// ===== 1. 数据定义 =====
const MBTI_TYPES = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP',
                    'ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'];
const GROUP_MAP = {
    'INTJ':'NT','INTP':'NT','ENTJ':'NT','ENTP':'NT',
    'INFJ':'NF','INFP':'NF','ENFJ':'NF','ENFP':'NF',
    'ISTJ':'SJ','ISFJ':'SJ','ESTJ':'SJ','ESFJ':'SJ',
    'ISTP':'SP','ISFP':'SP','ESTP':'SP','ESFP':'SP'
};
const EXCHANGE_RATE = { 'NT':2.0, 'NF':1.5, 'SJ':1.0, 'SP':3.0 };
const ZODIAC_LIST = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
const ZODIAC_SKILLS = {
    aries:{name:'烈焰冲锋',desc:'跳过障碍物'},
    taurus:{name:'磐石之盾',desc:'+1护盾'},
    gemini:{name:'双重思维',desc:'额外走1步'},
    cancer:{name:'潮汐回撤',desc:'免费撤回1步'},
    leo:{name:'王者威光',desc:'震慑路径敌方'},
    virgo:{name:'精密计算',desc:'走2次斜线'},
    libra:{name:'均衡之道',desc:'抽2张牌'},
    scorpio:{name:'暗影突袭',desc:'吞噬路径棋子'},
    sagittarius:{name:'幸运之星',desc:'返还50%下注'},
    capricorn:{name:'纪律之墙',desc:'防御+1'},
    aquarius:{name:'维度穿越',desc:'横向无限'},
    pisces:{name:'梦境迷踪',desc:'隐形1回合'}
};
const SOUL_LIST = ['guardian','pathfinder','strategist','catalyst'];
const SOUL_EFFECTS = {
    guardian:{label:'守护者',icon:'🛡️',desc:'每回合+1万'},
    pathfinder:{label:'探路者',icon:'🌪️',desc:'窥探对手手牌'},
    strategist:{label:'战略家',icon:'⚖️',desc:'初始+5万，撤回+2万'},
    catalyst:{label:'催化者',icon:'🔥',desc:'首次走棋-1万'}
};
const RHYTHMS = [
    {id:'sleep',label:'深度睡眠',icon:'🌙',mod:-0.5,retreatCost:0.5},
    {id:'morning',label:'晨间巅峰',icon:'🌅',mod:0.5,retreatCost:1},
    {id:'afternoon',label:'午后低迷',icon:'🌇',mod:-0.5,retreatCost:0.5},
    {id:'night',label:'夜间活跃',icon:'🌃',mod:0.5,retreatCost:1}
];
const MUSIC_MAP = { sleep:'冷静思考', morning:'冷静思考', afternoon:'暗流涌动', night:'迷幻电子' };

// ===== 2. 游戏状态 =====
let G = {};

function initGameState() {
    G = {
        phase: 'lobby',
        chips: 0,
        aiChips: 0,
        playerSoul: 'guardian',
        playerZodiac: 'aries',
        aiSoul: 'guardian',
        aiZodiac: 'aries',
        board: [],
        playerPos: {r:0,c:0},
        aiPos: {r:4,c:4},
        playerHand: [],
        aiHand: [],
        deck: [],
        turn: 0,
        round: 0,
        smallRound: 0,
        macroRound: 0,
        rhythmIndex: 0,
        rhythmCounter: 0,
        pot: 0,
        dealer: 'player',
        playerHeart: 0,
        aiHeart: 0,
        playerChips: 0,
        aiChips: 0,
        log: [],
        selectedCardIdx: -1,
        stepRemaining: 0,
        canMove: false,
        moveHistory: [],
        usedBoom: false,
        usedFullRetreat: false,
        musicActive: 'default',
        musicTarget: 'both',
        gameOver: false,
        winner: null,
        currentPlayer: 'player',
        waitingForMove: false,
        aiThinking: false,
        stepsSinceLastView: 0,   // 新增：用于每三步查看提醒
        drawerOpen: false,
        boomActive: 0,
        hasFullRetreat: false,
    };
}

// ===== 3. 工具函数 =====
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function log(msg, highlight = false) {
    G.log.push({msg, highlight});
    const area = document.getElementById('logArea');
    const d = document.createElement('div');
    d.textContent = msg;
    if (highlight) d.className = 'highlight-log';
    area.appendChild(d);
    area.scrollTop = area.scrollHeight;
    if (area.children.length > 50) area.removeChild(area.firstChild);
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pickRandom(arr) { return arr[rand(0, arr.length - 1)]; }

// ===== 4. 牌堆 =====
function buildDeck() {
    const deck = [];
    MBTI_TYPES.forEach(t => {
        for (let i = 0; i < 4; i++) deck.push(t);
    });
    return shuffle(deck);
}
function drawCards(hand, count) {
    while (hand.length < 5 && count > 0 && G.deck.length > 0) {
        hand.push(G.deck.pop());
        count--;
    }
    if (G.deck.length === 0 && hand.length < 5) {
        G.deck = buildDeck();
        while (hand.length < 5 && count > 0 && G.deck.length > 0) {
            hand.push(G.deck.pop());
            count--;
        }
    }
}

// ===== 5. 棋盘初始化 =====
function initBoard() {
    const b = [];
    for (let r = 0; r < 5; r++) {
        const row = [];
        for (let c = 0; c < 5; c++) {
            row.push({ type:'normal', tower:0, hasPlayer:false, hasAI:false, isKing:false });
        }
        b.push(row);
    }
    b[0][0].hasPlayer = true;
    b[0][0].isKing = true;
    G.playerPos = {r:0,c:0};
    b[4][4].hasAI = true;
    b[4][4].isKing = true;
    G.aiPos = {r:4,c:4};
    // 随机2个元素格
    const positions = [];
    for (let r=0; r<5; r++) for (let c=0; c<5; c++) {
        if ((r===0 && c===0) || (r===4 && c===4)) continue;
        positions.push({r,c});
    }
    shuffle(positions);
    const elements = ['fire','earth','wind','water'];
    for (let i=0; i<2; i++) {
        if (i >= positions.length) break;
        const p = positions[i];
        const el = elements[i % elements.length];
        b[p.r][p.c].type = `element-${el}`;
    }
    return b;
}

// ===== 6. 核心规则函数 =====
function getRhythm() {
    return RHYTHMS[G.rhythmIndex];
}
function getExchangeMod() {
    return getRhythm().mod;
}
function getRetreatCostMod() {
    return getRhythm().retreatCost;
}
function calcSteps(cardType, bet) {
    const group = GROUP_MAP[cardType];
    if (!group) return 0;
    let rate = EXCHANGE_RATE[group];
    const mod = getExchangeMod();
    rate = Math.max(0.5, rate + mod);
    let steps = Math.floor(rate * bet);
    // 组合技检测
    const hand = G.currentPlayer === 'player' ? G.playerHand : G.aiHand;
    const counts = {};
    hand.forEach(h => { counts[h] = (counts[h]||0) + 1; });
    let hasPair = false;
    for (let k in counts) { if (counts[k] >= 2) { hasPair = true; break; } }
    if (hasPair) steps += 1;

    const groups = hand.map(h => GROUP_MAP[h]);
    const groupCount = {};
    groups.forEach(g => { groupCount[g] = (groupCount[g]||0) + 1; });
    let hasSameGroup = false;
    for (let g in groupCount) { if (groupCount[g] >= 2) hasSameGroup = true; }
    // 同组效果在走棋时处理，这里只标记

    const hasAll = ['NT','NF','SJ','SP'].every(g => groups.includes(g));
    if (hasAll) {
        G.hasFullRetreat = true;
    }
    return steps;
}

function getValidMoves(r, c, steps, allowDiagonal = false) {
    const moves = [];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    if (allowDiagonal) dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    for (let d of dirs) {
        for (let s = 1; s <= steps; s++) {
            const nr = r + d[0]*s;
            const nc = c + d[1]*s;
            if (nr < 0 || nr >= 5 || nc < 0 || nc >= 5) break;
            const cell = G.board[nr][nc];
            if (cell.type === 'ruin') break;
            if (cell.isKing && cell.hasAI && G.currentPlayer === 'player') {
                moves.push({r:nr,c:nc,isKing:true});
                break;
            }
            if (cell.isKing && cell.hasPlayer && G.currentPlayer === 'ai') {
                moves.push({r:nr,c:nc,isKing:true});
                break;
            }
            if ((cell.hasPlayer || cell.hasAI) && !cell.isKing) {
                moves.push({r:nr,c:nc,isCapture:true});
                break;
            }
            if (cell.hasPlayer || cell.hasAI) break;
            moves.push({r:nr,c:nc});
        }
    }
    return moves;
}

// ===== 7. AI 决策 =====
function aiDecide() {
    if (G.aiThinking) return;
    G.aiThinking = true;
    setTimeout(() => {
        const hand = G.aiHand;
        if (hand.length === 0) {
            doPass('ai');
            G.aiThinking = false;
            return;
        }
        let bestCard = hand[0];
        let bestRate = 0;
        hand.forEach(c => {
            const g = GROUP_MAP[c];
            const rate = EXCHANGE_RATE[g] || 0;
            if (rate > bestRate) { bestRate = rate; bestCard = c; }
        });
        const chips = G.aiChips;
        let bet = Math.floor(chips * (0.1 + Math.random() * 0.2));
        bet = Math.max(1, Math.min(bet, chips));
        const steps = calcSteps(bestCard, bet);
        if (steps <= 0) {
            doPass('ai');
            G.aiThinking = false;
            return;
        }
        const group = GROUP_MAP[bestCard];
        let cost = bet;
        if (group === 'SP') cost += 2;
        if (cost > G.aiChips) {
            bet = Math.floor(G.aiChips / (EXCHANGE_RATE[group] || 1));
            if (bet < 1) { doPass('ai'); G.aiThinking = false; return; }
            const steps2 = calcSteps(bestCard, bet);
            if (steps2 <= 0) { doPass('ai'); G.aiThinking = false; return; }
            doAIMove(bestCard, bet, steps2);
        } else {
            doAIMove(bestCard, bet, steps);
        }
        G.aiThinking = false;
    }, 300);
}

function doAIMove(card, bet, steps) {
    const group = GROUP_MAP[card];
    let cost = bet;
    if (group === 'SP') cost += 2;
    G.aiChips -= cost;
    G.pot += bet;
    const idx = G.aiHand.indexOf(card);
    if (idx > -1) G.aiHand.splice(idx, 1);

    const pos = G.aiPos;
    const moves = getValidMoves(pos.r, pos.c, steps, false);
    if (moves.length === 0) {
        log('🤖 AI 无路可走，回合结束');
        endTurn('ai');
        return;
    }
    let target = null;
    for (let m of moves) { if (m.isKing) { target = m; break; } }
    if (!target) { for (let m of moves) { if (m.isCapture) { target = m; break; } } }
    if (!target) { target = moves[rand(0, moves.length - 1)]; }

    const oldR = pos.r, oldC = pos.c;
    const cell = G.board[oldR][oldC];
    cell.hasAI = false;
    cell.isKing = false;
    const newCell = G.board[target.r][target.c];
    if (newCell.hasPlayer) {
        if (newCell.isKing) {
            log('🤖 AI 吃掉了你的王！你输了...', true);
            endGame('ai');
            return;
        } else {
            log('🤖 AI 吃掉了你的棋子！');
            G.playerChips += 5;
            G.aiChips += 5;
            newCell.hasPlayer = false;
        }
    }
    newCell.hasAI = true;
    if (target.isKing) {
        newCell.isKing = true;
        log('🤖 AI 到达你的王格！你输了...', true);
        endGame('ai');
        return;
    }
    G.aiPos = {r:target.r,c:target.c};
    log(`🤖 AI 走了一步到 (${target.r+1}, ${target.c+1})`);
    renderBoard();
    renderUI();
    endTurn('ai');
}

function doPass(who) {
    if (who === 'player') {
        G.playerChips += 1;
        log('你选择弃牌过，+1万筹码');
    } else {
        G.aiChips += 1;
        log('🤖 AI 弃牌过，+1万筹码');
    }
    endTurn(who);
}

// ===== 8. 回合管理 =====
function endTurn(who) {
    G.turn++;
    G.round++;
    G.rhythmCounter++;
    if (G.rhythmCounter >= 5) {
        G.rhythmCounter = 0;
        G.rhythmIndex = (G.rhythmIndex + 1) % RHYTHMS.length;
        log(`⏰ 节律切换至 ${RHYTHMS[G.rhythmIndex].label} ${RHYTHMS[G.rhythmIndex].icon}`);
    }
    G.currentPlayer = (G.currentPlayer === 'player' ? 'ai' : 'player');
    G.selectedCardIdx = -1;
    G.stepRemaining = 0;
    G.canMove = false;
    G.moveHistory = [];
    renderUI();
    checkRoundEnd();
    if (G.gameOver) return;

    const hand = G.currentPlayer === 'player' ? G.playerHand : G.aiHand;
    drawCards(hand, 3);

    if (G.currentPlayer === 'player') {
        if (G.playerSoul === 'guardian') G.playerChips += 1;
        if (G.playerSoul === 'pathfinder' && G.aiHand.length > 0) {
            log(`🔮 你窥探到对手手牌: ${G.aiHand[0]}`);
        }
    } else {
        if (G.aiSoul === 'guardian') G.aiChips += 1;
        if (G.aiSoul === 'pathfinder') { /* AI窥探玩家手牌简化 */ }
        if (G.aiSoul === 'strategist') G.aiChips += 5;
    }
    renderUI();
    if (G.currentPlayer === 'ai' && !G.gameOver) {
        aiDecide();
    } else if (G.currentPlayer === 'player' && !G.gameOver) {
        log('🎯 轮到你了！');
        enableActions(true);
    }
}

function checkRoundEnd() {
    const pPos = G.playerPos;
    const aPos = G.aiPos;
    if (pPos.r === 4 && pPos.c === 4) {
        log('🎉 你到达了对手王格！你赢了！', true);
        endGame('player');
        return;
    }
    if (aPos.r === 0 && aPos.c === 0) {
        log('🤖 AI 到达了你的王格！你输了...', true);
        endGame('ai');
        return;
    }
    if (G.playerChips <= 0 && G.aiChips > 0) {
        log('💀 你的筹码归零，游戏结束', true);
        endGame('ai');
        return;
    }
    if (G.aiChips <= 0 && G.playerChips > 0) {
        log('🎉 对手筹码归零，你赢了！', true);
        endGame('player');
        return;
    }
    if (G.round >= 20) {
        log('⏰ 20回合结束，比较筹码...');
        if (G.playerChips > G.aiChips) {
            log('🎉 你筹码更多，赢得本小局！', true);
            endSmallRound('player');
        } else if (G.aiChips > G.playerChips) {
            log('🤖 AI 筹码更多，赢得本小局！', true);
            endSmallRound('ai');
        } else {
            log('⚖️ 筹码相同，庄家获胜');
            endSmallRound(G.dealer);
        }
    }
}

function endSmallRound(winner) {
    const pot = G.pot;
    if (winner === 'player') {
        G.playerChips += pot + 200;
        G.playerHeart = Math.min(3, G.playerHeart + 1);
        log(`🏆 你赢得底池 ${pot} 万 + 200万奖励，+1 一心`);
    } else {
        G.aiChips += pot + 200;
        G.aiHeart = Math.min(3, G.aiHeart + 1);
        log(`🤖 AI 赢得底池 ${pot} 万 + 200万奖励，+1 一心`);
    }
    G.pot = 0;
    G.smallRound++;
    if (G.smallRound >= 3) {
        G.smallRound = 0;
        G.macroRound++;
        const dealer = G.dealer;
        const heart = dealer === 'player' ? G.playerHeart : G.aiHeart;
        if (heart > 0) {
            if (dealer === 'player') {
                G.playerHeart--;
                log(`🔄 你消耗1个一心续庄，继续担任庄家`);
            } else {
                G.aiHeart--;
                log(`🔄 AI 消耗1个一心续庄`);
            }
        } else {
            log('⚔️ 进入抢庄阶段！');
            doRobDealer();
        }
    }
    resetBoardAndHands();
    renderUI();
    if (!G.gameOver) {
        log('🔄 新小局开始！');
        payBlinds();
        G.currentPlayer = 'player';
        G.round = 0;
        renderUI();
        enableActions(true);
    }
}

function doRobDealer() {
    let playerWins = 0, aiWins = 0;
    for (let i = 0; i < 3; i++) {
        const winner = Math.random() > 0.5 ? 'player' : 'ai';
        if (winner === 'player') playerWins++;
        else aiWins++;
        if (playerWins >= 2 || aiWins >= 2) break;
    }
    if (playerWins >= 2) {
        G.dealer = 'player';
        G.playerHeart = Math.min(3, G.playerHeart + 1);
        log('🎉 你赢得抢庄，获得1个一心！');
    } else {
        G.dealer = 'ai';
        G.aiHeart = Math.min(3, G.aiHeart + 1);
        log('🤖 AI 赢得抢庄，获得1个一心！');
    }
    renderUI();
}

function payBlinds() {
    if (G.dealer === 'player') {
        const small = Math.min(1, G.playerChips);
        G.playerChips -= small;
        G.pot += small;
        const big = Math.min(2, G.aiChips);
        G.aiChips -= big;
        G.pot += big;
        log(`💰 你支付小盲 ${small} 万，AI支付大盲 ${big} 万`);
    } else {
        const small = Math.min(1, G.aiChips);
        G.aiChips -= small;
        G.pot += small;
        const big = Math.min(2, G.playerChips);
        G.playerChips -= big;
        G.pot += big;
        log(`💰 AI支付小盲 ${small} 万，你支付大盲 ${big} 万`);
    }
    if (G.playerChips < 0) G.playerChips = 0;
    if (G.aiChips < 0) G.aiChips = 0;
}

function resetBoardAndHands() {
    G.board = initBoard();
    G.playerPos = {r:0,c:0};
    G.aiPos = {r:4,c:4};
    G.playerHand = [];
    G.aiHand = [];
    G.deck = buildDeck();
    drawCards(G.playerHand, 3);
    drawCards(G.aiHand, 3);
    G.round = 0;
    G.pot = 0;
    G.moveHistory = [];
    G.stepRemaining = 0;
    G.canMove = false;
    G.selectedCardIdx = -1;
    G.usedFullRetreat = false;
    G.usedBoom = false;
    G.stepsSinceLastView = 0;
    renderBoard();
    renderUI();
}

function endGame(winner) {
    G.gameOver = true;
    G.winner = winner;
    if (winner === 'player') {
        log('🏆 恭喜你获得整局胜利！', true);
    } else {
        log('💀 你输了整局游戏...', true);
    }
    enableActions(false);
    document.getElementById('btnEndTurn').textContent = '🔄 再来一局';
    document.getElementById('btnEndTurn').onclick = () => location.reload();
}

// ===== 9. 玩家操作 =====
function enableActions(enabled) {
    const btns = document.querySelectorAll('#actionBar button, #actionBar input');
    btns.forEach(b => { b.disabled = !enabled; });
    if (enabled && G.currentPlayer === 'player' && !G.gameOver) {
        document.getElementById('btnEndTurn').disabled = false;
        document.getElementById('btnPass').disabled = false;
        document.getElementById('btnSelectCard').disabled = false;
        document.getElementById('btnBet').disabled = false;
        document.getElementById('btnRetreat1').disabled = false;
        document.getElementById('btnRetreatHalf').disabled = false;
        document.getElementById('btnRetreatFull').disabled = false;
        document.getElementById('btnSkill').disabled = false;
    } else {
        document.querySelectorAll('#actionBar button').forEach(b => b.disabled = true);
    }
}

// 选牌
document.getElementById('btnSelectCard').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver) return;
    const hand = G.playerHand;
    const cards = document.querySelectorAll('#playerHand .card');
    cards.forEach((el, idx) => { el.classList.toggle('selected', idx === G.selectedCardIdx); });
    if (G.selectedCardIdx < hand.length - 1) G.selectedCardIdx++;
    else G.selectedCardIdx = 0;
    if (G.selectedCardIdx >= hand.length) G.selectedCardIdx = -1;
    if (G.selectedCardIdx >= 0) {
        log(`选中 ${hand[G.selectedCardIdx]}`);
        cards.forEach((el, idx) => { el.classList.toggle('selected', idx === G.selectedCardIdx); });
    }
});

// 下注走棋
document.getElementById('btnBet').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver) return;
    const idx = G.selectedCardIdx;
    if (idx < 0 || idx >= G.playerHand.length) {
        log('请先选牌');
        return;
    }
    const card = G.playerHand[idx];
    const betInput = document.getElementById('betAmount');
    let bet = parseInt(betInput.value) || 1;
    if (bet < 1) bet = 1;
    if (bet > G.playerChips) bet = G.playerChips;
    if (bet < 1) { log('筹码不足'); return; }
    const group = GROUP_MAP[card];
    let cost = bet;
    if (group === 'SP') cost += 2;
    if (cost > G.playerChips) {
        log(`需要 ${cost} 万筹码，但你只有 ${G.playerChips} 万`);
        return;
    }
    let steps = calcSteps(card, bet);
    if (steps <= 0) { log('步数为0，无法走棋'); return; }
    G.playerChips -= cost;
    G.pot += bet;
    G.playerHand.splice(idx, 1);
    G.selectedCardIdx = -1;
    G.stepRemaining = steps;
    G.canMove = true;
    log(`你下注 ${bet} 万，获得 ${steps} 步`);
    flashBoard(); // 视觉反馈
    renderUI();
    enableMoveMode(true);
});

// 走棋模式
let moveMode = false;
function enableMoveMode(on) {
    moveMode = on;
    if (on) {
        log('点击棋盘格子移动你的王');
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.cursor = 'pointer';
        });
    } else {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.style.cursor = 'default';
        });
    }
}

// 棋盘点击移动
document.getElementById('board').addEventListener('click', function(e) {
    if (!moveMode || G.currentPlayer !== 'player' || G.gameOver) return;
    const cell = e.target.closest('.cell');
    if (!cell) return;
    const r = parseInt(cell.dataset.row);
    const c = parseInt(cell.dataset.col);
    if (isNaN(r) || isNaN(c)) return;
    const pos = G.playerPos;
    const moves = getValidMoves(pos.r, pos.c, G.stepRemaining, false);
    const found = moves.find(m => m.r === r && m.c === c);
    if (!found) { log('无法走到该格'); return; }
    const oldCell = G.board[pos.r][pos.c];
    oldCell.hasPlayer = false;
    oldCell.isKing = false;
    const newCell = G.board[r][c];
    if (newCell.hasAI) {
        if (newCell.isKing) {
            log('🎉 你吃掉了对手的王！你赢了！', true);
            endGame('player');
            return;
        } else {
            log('你吃掉了对手的棋子！+5万');
            G.playerChips += 5;
            newCell.hasAI = false;
        }
    }
    newCell.hasPlayer = true;
    newCell.isKing = true;
    G.playerPos = {r,c};
    G.stepRemaining--;
    G.moveHistory.push({r,c});
    // 每走一步计数，触发查看提醒
    G.stepsSinceLastView++;
    if (G.stepsSinceLastView >= 3) {
        showViewBadge(true);
    }
    if (r === 4 && c === 4) {
        log('🎉 你到达了对手王格！你赢了！', true);
        endGame('player');
        return;
    }
    renderBoard();
    renderUI();
    if (G.stepRemaining <= 0) {
        log('步数用完，回合结束');
        enableMoveMode(false);
        endTurn('player');
    } else {
        log(`剩余步数: ${G.stepRemaining}`);
    }
});

// 撤回
document.getElementById('btnRetreat1').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver || G.moveHistory.length === 0) return;
    const cost = 3 * getRetreatCostMod();
    const finalCost = Math.ceil(cost);
    if (G.playerChips < finalCost) { log('筹码不足'); return; }
    const last = G.moveHistory.pop();
    G.playerChips -= finalCost;
    const cur = G.board[G.playerPos.r][G.playerPos.c];
    cur.hasPlayer = false;
    cur.isKing = false;
    G.playerPos = last;
    const newCell = G.board[last.r][last.c];
    newCell.hasPlayer = true;
    newCell.isKing = true;
    G.board[G.playerPos.r][G.playerPos.c].type = 'ruin';
    G.stepRemaining = 0;
    log(`后退1步，消耗 ${finalCost} 万`);
    shakeChipDrawer(); // 视觉反馈
    renderBoard();
    renderUI();
    enableMoveMode(false);
    endTurn('player');
});

document.getElementById('btnRetreatHalf').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver || G.moveHistory.length === 0) return;
    const cost = 8 * getRetreatCostMod();
    const finalCost = Math.ceil(cost);
    if (G.playerChips < finalCost) { log('筹码不足'); return; }
    const half = Math.floor(G.moveHistory.length / 2);
    if (half === 0) { log('无法退一半'); return; }
    G.playerChips -= finalCost;
    const newPos = G.moveHistory[G.moveHistory.length - half - 1] || G.moveHistory[0];
    const cur = G.board[G.playerPos.r][G.playerPos.c];
    cur.hasPlayer = false;
    cur.isKing = false;
    G.playerPos = newPos;
    const newCell = G.board[newPos.r][newPos.c];
    newCell.hasPlayer = true;
    newCell.isKing = true;
    const path = G.moveHistory.slice(-half);
    path.forEach(p => { G.board[p.r][p.c].type = 'ruin'; });
    G.moveHistory = G.moveHistory.slice(0, G.moveHistory.length - half);
    G.stepRemaining = 0;
    log(`退一半步数，消耗 ${finalCost} 万`);
    shakeChipDrawer();
    renderBoard();
    renderUI();
    enableMoveMode(false);
    endTurn('player');
});

document.getElementById('btnRetreatFull').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver || G.moveHistory.length === 0) return;
    const idx = G.playerHand.findIndex(c => GROUP_MAP[c] === 'NF');
    if (idx === -1) { log('需要一张NF牌进行全额撤回'); return; }
    G.playerHand.splice(idx, 1);
    const pos = G.moveHistory[0] || G.playerPos;
    const cur = G.board[G.playerPos.r][G.playerPos.c];
    cur.hasPlayer = false;
    cur.isKing = false;
    G.playerPos = pos;
    const newCell = G.board[pos.r][pos.c];
    newCell.hasPlayer = true;
    newCell.isKing = true;
    G.moveHistory.forEach(p => { G.board[p.r][p.c].type = 'ruin'; });
    G.moveHistory = [];
    G.stepRemaining = 0;
    log('全额撤回，消耗1张NF牌');
    shakeChipDrawer();
    renderBoard();
    renderUI();
    enableMoveMode(false);
    endTurn('player');
});

// 结束回合
document.getElementById('btnEndTurn').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver) return;
    enableMoveMode(false);
    endTurn('player');
});

// 弃牌过
document.getElementById('btnPass').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver) return;
    doPass('player');
});

// 技能
document.getElementById('btnSkill').addEventListener('click', function() {
    if (G.currentPlayer !== 'player' || G.gameOver) return;
    if (G.playerChips < 3) { log('需要3万筹码激活技能'); return; }
    G.playerChips -= 3;
    G.stepRemaining += 1;
    log('✦ 激活守护星技能，额外+1步');
    renderUI();
});

// 音乐切换
document.getElementById('musicSwitch').addEventListener('click', function() {
    if (G.gameOver) return;
    if (G.playerChips < 2) { log('需要2万筹码切换音乐'); return; }
    G.playerChips -= 2;
    const rhythms = RHYTHMS;
    const current = G.rhythmIndex;
    const next = (current + 1) % rhythms.length;
    G.rhythmIndex = next;
    G.musicTarget = 'ai';
    const label = MUSIC_MAP[rhythms[next].id] || '冷静思考';
    document.getElementById('musicLabel').textContent = '🎵 ' + label;
    log(`切换音乐至 ${label}，对手受影响`);
    renderUI();
});

// 炸裂时刻
document.getElementById('boomBtn').addEventListener('click', function() {
    if (G.gameOver || G.usedBoom) return;
    G.usedBoom = true;
    document.getElementById('musicLabel').textContent = '🎵 🔥 炸裂说唱';
    G.boomActive = 2;
    log('🔥 炸裂时刻！对手撤回费用翻倍');
    renderUI();
});

// ===== 10. 视觉反馈函数 =====
function flashBoard() {
    const wrapper = document.querySelector('.board-wrapper');
    wrapper.classList.add('bet-flash');
    setTimeout(() => wrapper.classList.remove('bet-flash'), 250);
}
function shakeChipDrawer() {
    const handle = document.getElementById('chipHandle');
    handle.style.transform = 'translateX(4px)';
    setTimeout(() => handle.style.transform = 'translateX(-4px)', 50);
    setTimeout(() => handle.style.transform = 'translateX(2px)', 100);
    setTimeout(() => handle.style.transform = 'translateX(0)', 150);
}
function showViewBadge(show) {
    const badge = document.getElementById('viewBadge');
    if (show) {
        badge.classList.add('show');
        const handle = document.getElementById('chipHandle');
        handle.style.borderColor = 'var(--gold)';
        handle.style.color = 'var(--gold)';
    } else {
        badge.classList.remove('show');
        const handle = document.getElementById('chipHandle');
        handle.style.borderColor = 'transparent';
        handle.style.color = '';
    }
}
// 查看筹码（点击抽屉时重置计数器）
document.getElementById('chipHandle').addEventListener('click', function() {
    // 如果当前有查看机会，点击查看后重置
    if (G.stepsSinceLastView >= 3 && !G.gameOver) {
        G.stepsSinceLastView = 0;
        showViewBadge(false);
        log('🔍 你查看了对手筹码');
        // 这里可以显示对手筹码详情（可扩展）
    }
    // 切换抽屉展开/收起
    G.drawerOpen = !G.drawerOpen;
    document.getElementById('chipContent').classList.toggle('open', G.drawerOpen);
});

// ===== 11. 渲染函数 =====
function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    const b = G.board;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = b[r][c];
            const div = document.createElement('div');
            div.className = 'cell';
            div.dataset.row = r;
            div.dataset.col = c;
            if (cell.type === 'ruin') {
                div.classList.add('ruin');
                div.textContent = '💀';
            } else if (cell.type.startsWith('element-')) {
                const el = cell.type.split('-')[1];
                div.classList.add(`element-${el}`);
                const icons = { fire:'🔥', earth:'🪨', wind:'💨', water:'🌊' };
                div.textContent = icons[el] || '✦';
            }
            if (cell.hasPlayer && cell.isKing) {
                div.classList.add('player-king');
                div.textContent = '👑';
                div.style.fontSize = '28px';
            } else if (cell.hasAI && cell.isKing) {
                div.classList.add('ai-king');
                div.textContent = '♚';
                div.style.fontSize = '28px';
            } else if (cell.hasPlayer) {
                div.textContent = '🧑';
                div.style.fontSize = '24px';
            } else if (cell.hasAI) {
                div.textContent = '🤖';
                div.style.fontSize = '24px';
            }
            if (cell.tower > 0) {
                const towerSpan = document.createElement('span');
                towerSpan.className = 'tower';
                towerSpan.textContent = `⬆${cell.tower}`;
                div.appendChild(towerSpan);
            }
            if (moveMode && G.currentPlayer === 'player') {
                const pos = G.playerPos;
                const moves = getValidMoves(pos.r, pos.c, G.stepRemaining, false);
                if (moves.some(m => m.r === r && m.c === c)) {
                    div.classList.add('highlight');
                }
            }
            boardEl.appendChild(div);
        }
    }
}

function renderUI() {
    document.getElementById('playerChips').textContent = G.playerChips + ' 万';
    document.getElementById('opponentChips').textContent = G.aiChips + ' 万';
    document.getElementById('playerHeart').textContent = '❤️' + G.playerHeart;
    document.getElementById('opponentHeart').textContent = '❤️' + G.aiHeart;
    document.getElementById('playerDealer').textContent = G.dealer === 'player' ? '✅' : '❌';
    document.getElementById('opponentDealer').textContent = G.dealer === 'ai' ? '✅' : '❌';
    document.getElementById('playerSoul').textContent = SOUL_EFFECTS[G.playerSoul].icon + ' ' + SOUL_EFFECTS[G.playerSoul].label;
    document.getElementById('playerZodiac').textContent = '♈';
    document.getElementById('turnCount').textContent = G.turn;
    document.getElementById('roundCount').textContent = G.round;
    document.getElementById('macroCount').textContent = G.macroRound;
    document.getElementById('potAmount').textContent = G.pot;
    const rhythm = getRhythm();
    document.getElementById('rhythmIcon').textContent = rhythm.icon;
    document.getElementById('rhythmLabel').textContent = rhythm.label;
    document.getElementById('rhythmMod').textContent = `(${rhythm.mod >= 0 ? '+' : ''}${rhythm.mod})`;

    const handEl = document.getElementById('playerHand');
    handEl.innerHTML = '';
    G.playerHand.forEach((card, idx) => {
        const div = document.createElement('div');
        div.className = 'card';
        if (idx === G.selectedCardIdx) div.classList.add('selected');
        const group = GROUP_MAP[card];
        const rate = EXCHANGE_RATE[group] || 0;
        div.innerHTML = `<span>${card}</span><span class="sub">${group} ${rate}步/万</span>`;
        div.onclick = () => {
            G.selectedCardIdx = idx;
            renderUI();
        };
        handEl.appendChild(div);
    });

    const oppHandEl = document.getElementById('opponentHand');
    oppHandEl.innerHTML = '';
    for (let i = 0; i < Math.min(G.aiHand.length, 3); i++) {
        const div = document.createElement('div');
        div.className = 'card-back';
        div.textContent = '🃏';
        oppHandEl.appendChild(div);
    }

    // 更新筹码抽屉底部的筹码堆叠（简化，显示总数）
    const chipStack = document.getElementById('chipStack3d');
    chipStack.innerHTML = '';
    const displayCount = Math.min(G.playerChips, 20);
    for (let i = 0; i < displayCount; i++) {
        const chip = document.createElement('div');
        chip.className = 'chip-3d';
        chipStack.appendChild(chip);
    }
    if (G.playerChips > 20) {
        const span = document.createElement('span');
        span.textContent = `+${G.playerChips - 20}`;
        span.style.cssText = 'color:var(--text-secondary);font-size:12px;';
        chipStack.appendChild(span);
    }
}

// ===== 12. 主题切换 =====
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}
const savedTheme = localStorage.getItem('theme') || 'dark';
setTheme(savedTheme);
document.getElementById('lobbyThemeToggle').addEventListener('click', toggleTheme);
document.getElementById('tableThemeToggle').addEventListener('click', toggleTheme);

// ===== 13. 大厅逻辑 =====
let selectedBuyin = 20;
let selectedZodiac = 'aries';
let selectedSoul = 'guardian';

document.querySelectorAll('.buyin-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.buyin-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        selectedBuyin = parseInt(this.dataset.chips);
    });
});
document.getElementById('customChips').addEventListener('input', function() {
    document.querySelectorAll('.buyin-btn').forEach(b => b.classList.remove('active'));
    const val = parseInt(this.value);
    if (val >= 1 && val <= 10000) selectedBuyin = val;
});

document.querySelectorAll('.zodiac-opt').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.zodiac-opt').forEach(e => e.classList.remove('active'));
        this.classList.add('active');
        selectedZodiac = this.dataset.zodiac;
    });
});
document.querySelectorAll('.soul-opt').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.soul-opt').forEach(e => e.classList.remove('active'));
        this.classList.add('active');
        selectedSoul = this.dataset.soul;
    });
});
// 默认高亮
document.querySelector('.buyin-btn[data-chips="20"]')?.classList.add('active');
document.querySelector('.zodiac-opt[data-zodiac="aries"]')?.classList.add('active');
document.querySelector('.soul-opt[data-soul="guardian"]')?.classList.add('active');

document.getElementById('startGame').addEventListener('click', function() {
    initGameState();
    G.playerSoul = selectedSoul;
    G.playerZodiac = selectedZodiac;
    G.chips = selectedBuyin;
    G.aiChips = selectedBuyin;
    G.playerChips = selectedBuyin;
    G.aiChips = selectedBuyin;
    G.aiSoul = pickRandom(SOUL_LIST);
    G.aiZodiac = pickRandom(ZODIAC_LIST);
    if (G.playerSoul === 'strategist') G.playerChips += 5;
    if (G.aiSoul === 'strategist') G.aiChips += 5;
    G.dealer = Math.random() > 0.5 ? 'player' : 'ai';
    G.rhythmIndex = 0;
    G.rhythmCounter = 0;
    G.deck = buildDeck();
    G.board = initBoard();
    G.playerPos = {r:0,c:0};
    G.aiPos = {r:4,c:4};
    G.playerHand = [];
    G.aiHand = [];
    drawCards(G.playerHand, 3);
    drawCards(G.aiHand, 3);
    G.currentPlayer = 'player';
    G.round = 0;
    G.smallRound = 0;
    G.macroRound = 0;
    G.pot = 0;
    G.gameOver = false;
    G.usedBoom = false;
    G.boomActive = 0;
    G.stepsSinceLastView = 0;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('table').classList.remove('hidden');
    renderBoard();
    renderUI();
    payBlinds();
    log('🎮 游戏开始！');
    log(`庄家: ${G.dealer === 'player' ? '你' : 'AI'}`);
    enableActions(true);
    if (G.dealer === 'ai') {
        G.currentPlayer = 'ai';
        enableActions(false);
        aiDecide();
    } else {
        G.currentPlayer = 'player';
        enableActions(true);
    }
});

// 初始隐藏牌桌
document.getElementById('table').classList.add('hidden');
console.log('♟️ 星穹弈 V2.0 已加载');
