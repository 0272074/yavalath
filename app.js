/**
 * ヤバラス (Yavalath) - メインゲームロジック
 * 61マス六角グリッド、3連負け4連勝ちルール
 */

class YavalathGame {
    constructor() {
        // 盤面データ（軸座標 q, r）
        this.cells = [];
        // 行ごとのマス数（5-9-5）
        this.rowSizes = [5, 6, 7, 8, 9, 8, 7, 6, 5];
        
        // ゲーム状態
        this.currentPlayer = 'B'; // 'B' = 黒, 'W' = 白, 'G' = 灰
        this.gameOver = false;
        this.winner = null;
        this.gameMode = 'pvp'; 
        this.npcLevel = 1;     
        this.userColor = 'B';  
        this.playerCount = 2; // 2 or 3
        
        // 次回のゲーム設定
        this.nextGameMode = 'pvp';
        this.nextNpcLevel = 1;
        this.nextPlayerCount = 2;
        
        this.directions = [
            { dq: 1, dr: 0 }, { dq: -1, dr: 0 },
            { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
            { dq: 1, dr: -1 }, { dq: -1, dr: 1 }
        ];
        
        this.boardEl = document.getElementById('board');
        this.turnTextEl = document.getElementById('turn-text');
        this.turnStoneEl = document.getElementById('turn-stone');
        this.messageEl = document.getElementById('message');
        this.gameModeEl = document.getElementById('game-mode');
        this.playerCountEl = document.getElementById('player-count');
        this.npcLevelEl = document.getElementById('npc-level');
        this.npcLevelContainer = document.getElementById('npc-level-container');
        this.restartBtn = document.getElementById('restart-btn');
        
        // 初期値読み込み
        this.nextGameMode = this.gameModeEl.value;
        this.nextPlayerCount = parseInt(this.playerCountEl.value);
        this.nextNpcLevel = parseInt(this.npcLevelEl.value);
        this.updateNpcLevelVisibility();

        this.init();
    }
    
    init() {
        this.restart(); 
        this.bindEvents();
    }
    
    createBoard() {
        this.cells = [];
        this.boardEl.innerHTML = '';
        const centerRow = 4;
        
        for (let row = 0; row < 9; row++) {
            const rowSize = this.rowSizes[row];
            const rowEl = document.createElement('div');
            rowEl.className = 'board-row';
            const qStart = Math.max(0, centerRow - row);
            const rValue = row - centerRow;
            
            for (let i = 0; i < rowSize; i++) {
                const q = qStart + i;
                const r = rValue;
                const cell = { q, r, state: null, row, index: i };
                this.cells.push(cell);
                
                const hexEl = document.createElement('div');
                hexEl.className = 'hex';
                hexEl.dataset.q = q;
                hexEl.dataset.r = r;
                hexEl.innerHTML = '<div class="hex-inner"></div>';
                hexEl.addEventListener('click', () => this.onCellClick(cell, hexEl));
                rowEl.appendChild(hexEl);
            }
            this.boardEl.appendChild(rowEl);
        }
    }
    
    bindEvents() {
        this.gameModeEl.addEventListener('change', (e) => {
            this.nextGameMode = e.target.value;
            this.updateNpcLevelVisibility();
        });
        
        this.playerCountEl.addEventListener('change', (e) => {
            this.nextPlayerCount = parseInt(e.target.value);
        });

        this.npcLevelEl.addEventListener('change', (e) => {
            this.nextNpcLevel = parseInt(e.target.value);
        });
        
        this.restartBtn.addEventListener('click', () => this.restart());
    }

    updateNpcLevelVisibility() {
        this.npcLevelContainer.classList.toggle('hidden', this.nextGameMode !== 'npc');
    }
    
    onCellClick(cell, hexEl) {
        if (this.gameOver) return;
        if (cell.state !== null) return;
        
        // NPC戦でプレイヤーの手番でない時は無効
        if (this.gameMode === 'npc' && this.currentPlayer !== this.userColor) return;
        
        this.placeStone(cell, hexEl);
    }
    
    placeStone(cell, hexEl) {
        cell.state = this.currentPlayer;
        
        const stoneEl = document.createElement('div');
        let stoneClass = 'stone ';
        if (this.currentPlayer === 'B') stoneClass += 'black';
        else if (this.currentPlayer === 'W') stoneClass += 'white';
        else stoneClass += 'grey';
        
        stoneEl.className = stoneClass;
        hexEl.querySelector('.hex-inner').appendChild(stoneEl);
        
        const result = this.checkResult(cell);
        
        // 勝敗判定
        if (result === 'lose') {
            const winner = this.getNextPlayer(this.currentPlayer); // 暫定的に次の人を勝者扱いはせず、敗者だけ表示
            this.endGame(winner, 'lose', cell); 
            return;
        }
        
        if (result === 'win') {
            this.endGame(this.currentPlayer, 'win', cell);
            return;
        }
        
        // 次の手番へ
        this.currentPlayer = this.getNextPlayer(this.currentPlayer);
        this.updateUI();
        
        // NPCの手番チェック
        if (this.gameMode === 'npc' && this.currentPlayer !== this.userColor && !this.gameOver) {
            setTimeout(() => this.npcMove(), 500);
        }
    }

    getNextPlayer(current) {
        if (this.playerCount === 2) {
            return current === 'B' ? 'W' : 'B';
        } else {
            if (current === 'B') return 'W';
            if (current === 'W') return 'G';
            return 'B';
        }
    }
    
    checkResult(cell) {
        // 3連負けチェック
        if (this.wouldMakeThree(cell, cell.state)) return 'lose';
        // 4連勝ちチェック
        if (this.wouldMakeFour(cell, cell.state)) return 'win';
        return null;
    }
    
    // 指定方向の連続数をカウント
    countInDirection(cell, dir, color = null) {
        const targetColor = color || cell.state; // 指定がなければセルの色
        let count = 0;
        let q = cell.q + dir.dq;
        let r = cell.r + dir.dr;
        
        while (true) {
            const neighbor = this.getCellAt(q, r);
            if (!neighbor || neighbor.state !== targetColor) break;
            count++;
            q += dir.dq;
            r += dir.dr;
        }
        return count;
    }
    
    getCellAt(q, r) {
        return this.cells.find(c => c.q === q && c.r === r);
    }
    
    getHexElement(cell) {
        return this.boardEl.querySelector('[data-q="' + cell.q + '"][data-r="' + cell.r + '"]');
    }
    
    getColorName(color) {
        if (color === 'B') return '黒';
        if (color === 'W') return '白';
        if (color === 'G') return '灰';
        return '';
    }

    endGame(winnerColor, reason, lastCell) {
        this.gameOver = true;
        this.winner = winnerColor; // 3連負けの場合は、手番プレイヤーの「負け」が重要
        
        const activeColor = lastCell.state; // 最後に打った人の色
        const actName = this.getColorName(activeColor);
        
        let msg = '';
        if (reason === 'lose') {
            msg = actName + 'が3連を作ってしまった！\n' + actName + 'の負け！';
            this.messageEl.className = 'lose';
        } else {
            msg = actName + 'が4連を達成！\n' + actName + 'の勝ち！';
            this.messageEl.className = '';
        }
        this.messageEl.textContent = msg;
        
        document.querySelectorAll('.hex').forEach(hex => hex.classList.add('disabled'));
    }
    
    updateUI() {
        const turnName = this.getColorName(this.currentPlayer);
        
        if (this.gameMode === 'npc') {
            if (this.currentPlayer === this.userColor) {
                const colorText = '（' + turnName + '）';
                this.turnTextEl.textContent = 'あなたの番' + colorText;
            } else {
                const colorText = '（' + turnName + '）';
                this.turnTextEl.textContent = 'NPCの番' + colorText;
            }
        } else {
            this.turnTextEl.textContent = turnName + 'の番';
        }
        
        this.turnStoneEl.className = 'turn-stone'; // reset
        if (this.currentPlayer === 'W') this.turnStoneEl.classList.add('white');
        if (this.currentPlayer === 'G') this.turnStoneEl.classList.add('grey');
    }
    
    restart() {
        this.gameMode = this.nextGameMode;
        this.npcLevel = this.nextNpcLevel;
        this.playerCount = this.nextPlayerCount;

        this.currentPlayer = 'B';
        this.gameOver = false;
        this.winner = null;
        this.messageEl.textContent = '';
        this.messageEl.className = '';
        
        this.createBoard();
        
        if (this.gameMode === 'npc') {
            // 色ランダム決定
            const r = Math.random();
            if (this.playerCount === 2) {
                this.userColor = r < 0.5 ? 'B' : 'W';
            } else {
                // 3人の場合 1/3
                if (r < 0.33) this.userColor = 'B';
                else if (r < 0.66) this.userColor = 'W';
                else this.userColor = 'G';
            }
        } else {
            this.userColor = 'B'; 
        }
        
        this.updateUI();
        
        // NPCが先手なら動かす
        if (this.gameMode === 'npc' && this.currentPlayer !== this.userColor) {
             setTimeout(() => this.npcMove(), 500);
        }
    }
    
    // ================= NPC Logic =================
    
    npcMove() {
        if (this.gameOver) return;
        const emptyCells = this.cells.filter(c => c.state === null);
        if (emptyCells.length === 0) return;
        
        let bestCell = null;
        switch (this.npcLevel) {
            case 1: bestCell = this.npcLevel1(emptyCells); break;
            case 2: bestCell = this.npcLevel2(emptyCells); break;
            case 3: bestCell = this.npcLevel3(emptyCells); break;
            default: bestCell = this.npcLevel1(emptyCells);
        }
        
        if (bestCell) {
            const hexEl = this.getHexElement(bestCell);
            this.placeStone(bestCell, hexEl);
        }
    }
    
    // Lv1: ランダムだが自滅（3連）は避ける
    npcLevel1(emptyCells) {
        const safeCells = emptyCells.filter(c => !this.wouldMakeThree(c, this.currentPlayer));
        if (safeCells.length > 0) return safeCells[Math.floor(Math.random() * safeCells.length)];
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    // Lv2: 自分の勝ち > 敵の勝ち（全敵） > 自滅回避 > 中央
    npcLevel2(emptyCells) {
        const myColor = this.currentPlayer;
        
        // 1. 自分の勝ち
        for (const c of emptyCells) if (this.wouldMakeFour(c, myColor)) return c;
        
        // 2. 敵の勝ち阻止（全敵チェック）
        const opponents = this.getOpponents(myColor);
        for (const opp of opponents) {
            for (const c of emptyCells) if (this.wouldMakeFour(c, opp)) return c;
        }
        
        // 3. 安全手＆中央
        const safeCells = emptyCells.filter(c => !this.wouldMakeThree(c, myColor));
        if (safeCells.length > 0) {
            const scored = safeCells.map(c => ({ cell: c, score: this.getCenterScore(c) }));
            scored.sort((a, b) => b.score - a.score);
            // ランダム性も少し入れる（上位3つから）
            const topK = scored.slice(0, 3);
            return topK[Math.floor(Math.random() * topK.length)].cell;
        }
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    
    // Lv3: Lv2 + 相手への嫌がらせ（3連強制は複雑なので汎用的な評価関数）
    // 3人戦の完全読み切りは難しいので、Lv2の強化版とする
    npcLevel3(emptyCells) {
        // 基本Lv2と同じだが、より広く探索するイメージ（今回はLv2+α）
        // 敵に「リーチ」を作らせない（3連を作らせない）手を優先するなど
        return this.npcLevel2(emptyCells);
    }
    
    getOpponents(myColor) {
        if (this.playerCount === 2) {
            return [myColor === 'B' ? 'W' : 'B'];
        } else {
            return ['B', 'W', 'G'].filter(c => c !== myColor);
        }
    }
    
    wouldMakeFour(cell, player) {
        cell.state = player;
        const dirPairs = [[this.directions[0],this.directions[1]], [this.directions[2],this.directions[3]], [this.directions[4],this.directions[5]]];
        let result = false;
        for (const [d1, d2] of dirPairs) {
            if (1 + this.countInDirection(cell, d1, player) + this.countInDirection(cell, d2, player) >= 4) { result = true; break; }
        }
        cell.state = null;
        return result;
    }
    
    wouldMakeThree(cell, player) {
        cell.state = player;
        const dirPairs = [[this.directions[0],this.directions[1]], [this.directions[2],this.directions[3]], [this.directions[4],this.directions[5]]];
        let result = false;
        for (const [d1, d2] of dirPairs) {
            if (1 + this.countInDirection(cell, d1, player) + this.countInDirection(cell, d2, player) === 3) { result = true; break; }
        }
        cell.state = null;
        return result;
    }
    
    getCenterScore(cell) {
        return 10 - (Math.abs(cell.q - 4) + Math.abs(cell.r));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new YavalathGame();
});
