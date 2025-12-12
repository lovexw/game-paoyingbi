class CoinFlipGame {
    constructor() {
        this.balance = 10000;
        this.testStats = { rounds: 0, heads: 0, tails: 0 };
        this.realStats = { rounds: 0, heads: 0, tails: 0 };
        this.history = [];
        this.currentMode = 'test';
        this.isFlipping = false;
        this.continuousMode = {
            active: false,
            currentRound: 0,
            totalRounds: 0,
            choice: null,
            betAmount: 0,
            netProfit: 0
        };
        
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.updateUI();
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('coinFlipGameData');
        if (saved) {
            const data = JSON.parse(saved);
            this.balance = data.balance || 10000;
            this.testStats = data.testStats || { rounds: 0, heads: 0, tails: 0 };
            this.realStats = data.realStats || { rounds: 0, heads: 0, tails: 0 };
            this.history = data.history || [];
        }
    }

    saveToLocalStorage() {
        const data = {
            balance: this.balance,
            testStats: this.testStats,
            realStats: this.realStats,
            history: this.history.slice(0, 100)
        };
        localStorage.setItem('coinFlipGameData', JSON.stringify(data));
    }

    setupEventListeners() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchMode(btn.dataset.mode));
        });

        document.getElementById('startTestBtn').addEventListener('click', () => this.startTest());
        
        document.querySelectorAll('#realModeControls .choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.playReal(btn.dataset.choice));
        });

        document.querySelectorAll('#continuousModeControls .choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startContinuous(btn.dataset.choice));
        });

        document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());
        document.getElementById('clearHistoryBtn').addEventListener('click', () => this.clearHistory());

        document.getElementById('continuousBetAmount').addEventListener('input', () => this.updateMaxRounds());
        document.getElementById('continuousRounds').addEventListener('input', () => this.updateSpeedModeVisibility());
        document.getElementById('betAmount').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value % 100 !== 0) {
                e.target.value = Math.floor(value / 100) * 100;
            }
        });
        document.getElementById('continuousBetAmount').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            if (value % 100 !== 0) {
                e.target.value = Math.floor(value / 100) * 100;
            }
        });

        document.getElementById('openDetailsBtn').addEventListener('click', () => this.openDataPanel());
        document.getElementById('closeDetailsBtn').addEventListener('click', () => this.closeDataPanel());
        document.getElementById('dataPanelOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'dataPanelOverlay') {
                this.closeDataPanel();
            }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.getElementById('historyModeFilter').addEventListener('change', () => this.updateDetailedHistory());
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        document.getElementById('testModeControls').style.display = mode === 'test' ? 'block' : 'none';
        document.getElementById('realModeControls').style.display = mode === 'real' ? 'block' : 'none';
        document.getElementById('continuousModeControls').style.display = mode === 'continuous' ? 'block' : 'none';

        if (mode === 'continuous') {
            this.updateMaxRounds();
        }
    }

    updateMaxRounds() {
        const betAmount = parseInt(document.getElementById('continuousBetAmount').value) || 100;
        const fee = 5;
        const maxRounds = Math.floor(this.balance / (betAmount + fee));
        document.getElementById('maxRounds').textContent = maxRounds;
        document.getElementById('continuousRounds').max = maxRounds;
        this.updateSpeedModeVisibility();
    }

    updateSpeedModeVisibility() {
        const rounds = parseInt(document.getElementById('continuousRounds').value) || 5;
        const speedModeControl = document.getElementById('speedModeControl');
        if (rounds > 10) {
            speedModeControl.style.display = 'block';
        } else {
            speedModeControl.style.display = 'none';
            document.getElementById('speedModeToggle').checked = false;
        }
    }

    trueRandom() {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % 2 === 0 ? 'heads' : 'tails';
    }

    async flipCoin(result) {
        return new Promise((resolve) => {
            const coin = document.getElementById('coin');
            coin.className = 'coin';
            
            setTimeout(() => {
                coin.classList.add(`flip-${result}`);
                setTimeout(() => {
                    resolve();
                }, 1500);
            }, 50);
        });
    }

    async startTest() {
        if (this.isFlipping) return;

        const rounds = parseInt(document.getElementById('testRoundsInput').value) || 1;
        if (rounds < 1 || rounds > 100) {
            alert('测试局数必须在1-100之间');
            return;
        }

        this.isFlipping = true;
        document.getElementById('startTestBtn').disabled = true;

        for (let i = 0; i < rounds; i++) {
            const result = this.trueRandom();
            await this.flipCoin(result);
            
            this.testStats.rounds++;
            this.testStats[result]++;
            
            this.addHistory('test', result, null, null);
            this.updateUI();
            
            if (i < rounds - 1) {
                await this.delay(500);
            }
        }

        this.saveToLocalStorage();
        this.isFlipping = false;
        document.getElementById('startTestBtn').disabled = false;
    }

    async playReal(choice) {
        if (this.isFlipping) return;

        const betAmount = parseInt(document.getElementById('betAmount').value) || 100;
        const fee = 5;
        const totalCost = betAmount + fee;

        if (betAmount % 100 !== 0) {
            alert('下注金额必须是100的倍数');
            return;
        }

        if (this.balance < totalCost) {
            alert('余额不足！');
            return;
        }

        this.isFlipping = true;
        this.disableChoiceButtons('#realModeControls');

        this.balance -= totalCost;
        this.updateUI();

        const result = this.trueRandom();
        await this.flipCoin(result);

        this.realStats.rounds++;
        this.realStats[result]++;

        const won = result === choice;
        let profit = 0;
        const winAmount = betAmount * 2;

        if (won) {
            profit = winAmount - totalCost;
            this.balance += winAmount;
            this.showResult(`🎉 恭喜！你赢了: ${profit}`, 'win');
        } else {
            profit = -totalCost;
            this.showResult(`😢 很遗憾，你输了: ${totalCost}`, 'lose');
        }

        this.addHistory('real', result, choice, profit);
        this.updateUI();
        this.saveToLocalStorage();

        this.isFlipping = false;
        this.enableChoiceButtons('#realModeControls');
    }

    async startContinuous(choice) {
        if (this.isFlipping || this.continuousMode.active) return;

        const betAmount = parseInt(document.getElementById('continuousBetAmount').value) || 100;
        const rounds = parseInt(document.getElementById('continuousRounds').value) || 5;
        const fee = 5;
        const totalCost = betAmount + fee;

        if (betAmount % 100 !== 0) {
            alert('下注金额必须是100的倍数');
            return;
        }

        const maxRounds = Math.floor(this.balance / totalCost);
        if (rounds > maxRounds) {
            alert(`余额不足！最多只能下注 ${maxRounds} 局`);
            return;
        }

        const speedMode = rounds > 10 && document.getElementById('speedModeToggle').checked;

        this.continuousMode = {
            active: true,
            currentRound: 0,
            totalRounds: rounds,
            choice: choice,
            betAmount: betAmount,
            netProfit: 0,
            speedMode: speedMode
        };

        this.isFlipping = true;
        this.disableChoiceButtons('#continuousModeControls');
        document.getElementById('continuousProgress').style.display = 'block';

        for (let i = 0; i < rounds; i++) {
            this.continuousMode.currentRound = i + 1;
            
            this.balance -= totalCost;
            this.updateContinuousProgress();

            const result = this.trueRandom();
            if (!speedMode) {
                await this.flipCoin(result);
            }

            this.realStats.rounds++;
            this.realStats[result]++;

            const won = result === choice;
            let profit = 0;
            const winAmount = betAmount * 2;

            if (won) {
                profit = winAmount - totalCost;
                this.balance += winAmount;
            } else {
                profit = -totalCost;
            }

            this.continuousMode.netProfit += profit;
            this.addHistory('continuous', result, choice, profit);
            this.updateUI();
            this.updateContinuousProgress();

            if (i < rounds - 1) {
                await this.delay(speedMode ? 100 : 800);
            }
        }

        const finalProfit = this.continuousMode.netProfit;
        if (finalProfit > 0) {
            this.showResult(`🎉 连续下注完成！净收益: ${finalProfit}`, 'win');
        } else if (finalProfit < 0) {
            this.showResult(`😢 连续下注完成！净亏损: ${Math.abs(finalProfit)}`, 'lose');
        } else {
            this.showResult(`😐 连续下注完成！打平`, '');
        }

        this.saveToLocalStorage();
        
        await this.delay(2000);
        document.getElementById('continuousProgress').style.display = 'none';
        this.continuousMode.active = false;
        this.isFlipping = false;
        this.enableChoiceButtons('#continuousModeControls');
    }

    updateContinuousProgress() {
        const { currentRound, totalRounds, netProfit } = this.continuousMode;
        document.getElementById('currentRound').textContent = currentRound;
        document.getElementById('totalRounds').textContent = totalRounds;
        document.getElementById('netProfit').textContent = `$${netProfit}`;
        document.getElementById('netProfit').style.color = netProfit > 0 ? 'var(--success)' : netProfit < 0 ? 'var(--danger)' : 'var(--text-primary)';
        
        const progress = (currentRound / totalRounds) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    showResult(message, type) {
        const resultDisplay = document.getElementById('resultDisplay');
        resultDisplay.textContent = message;
        resultDisplay.className = `result-display show ${type}`;
        
        setTimeout(() => {
            resultDisplay.className = 'result-display';
        }, 3000);
    }

    addHistory(mode, result, choice, profit) {
        const historyItem = {
            mode,
            result,
            choice,
            profit,
            timestamp: Date.now()
        };
        
        this.history.unshift(historyItem);
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
    }

    updateUI() {
        document.getElementById('balance').textContent = `$${this.balance.toLocaleString()}`;
        
        document.getElementById('testRounds').textContent = this.testStats.rounds;
        document.getElementById('realRounds').textContent = this.realStats.rounds;
        
        const testHeadsRate = this.testStats.rounds > 0 
            ? ((this.testStats.heads / this.testStats.rounds) * 100).toFixed(1)
            : 50;
        const realHeadsRate = this.realStats.rounds > 0
            ? ((this.realStats.heads / this.realStats.rounds) * 100).toFixed(1)
            : 50;
        
        document.getElementById('testHeadsRate').textContent = `${testHeadsRate}%`;
        document.getElementById('realHeadsRate').textContent = `${realHeadsRate}%`;
        
        this.updateProbability();
        this.updateHistory();
    }

    updateProbability() {
        let headsProb = 50;
        let tailsProb = 50;

        if (this.realStats.rounds > 0) {
            headsProb = ((this.realStats.heads / this.realStats.rounds) * 100).toFixed(1);
            tailsProb = ((this.realStats.tails / this.realStats.rounds) * 100).toFixed(1);
        } else if (this.testStats.rounds > 0) {
            headsProb = ((this.testStats.heads / this.testStats.rounds) * 100).toFixed(1);
            tailsProb = ((this.testStats.tails / this.testStats.rounds) * 100).toFixed(1);
        }

        document.getElementById('headsProbability').textContent = `${headsProb}%`;
        document.getElementById('tailsProbability').textContent = `${tailsProb}%`;
        document.getElementById('headsProbabilityBar').style.width = `${headsProb}%`;
        document.getElementById('tailsProbabilityBar').style.width = `${tailsProb}%`;
    }

    updateHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = '<div class="empty-state">暂无记录</div>';
            return;
        }

        const recentHistory = this.history.slice(0, 50);
        historyList.innerHTML = recentHistory.map(item => {
            const modeEmoji = item.mode === 'test' ? '🧪' : item.mode === 'continuous' ? '🔄' : '🎮';
            const modeText = item.mode === 'test' ? '测试' : item.mode === 'continuous' ? '连续' : '正式';
            const resultText = item.result === 'heads' ? '正面' : '反面';
            const resultEmoji = item.result === 'heads' ? '🪙' : '⚫';
            const choiceText = item.choice ? (item.choice === 'heads' ? '正面' : '反面') : '-';
            const profitText = item.profit !== null ? `${item.profit}` : '-';
            const resultClass = item.result;
            const profitClass = item.profit > 0 ? 'win' : item.profit < 0 ? 'lose' : '';
            
            return `
                <div class="history-item ${profitClass}">
                    <div style="font-size: 1.5rem; margin-bottom: 4px;">${modeEmoji}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 2px;">${modeText}</div>
                    <div style="font-weight: bold; margin-bottom: 4px;">${resultEmoji}</div>
                    <div style="font-size: 0.9rem; margin-bottom: 4px;"><span class="history-result ${resultClass}">${resultText}</span></div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${choiceText}</div>
                    <div style="font-size: 1rem; font-weight: bold; margin-top: 4px; color: ${item.profit > 0 ? 'var(--success)' : item.profit < 0 ? 'var(--danger)' : 'var(--text-primary)'};">${item.profit !== null ? `${item.profit}` : profitText}</div>
                </div>
            `;
        }).join('');
    }

    openDataPanel() {
        document.getElementById('dataPanelOverlay').classList.add('show');
        this.updateDataPanel();
    }

    closeDataPanel() {
        document.getElementById('dataPanelOverlay').classList.remove('show');
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}Tab`);
        });

        if (tabName === 'history') {
            this.updateDetailedHistory();
        } else if (tabName === 'analysis') {
            this.updateAnalysis();
        }
    }

    updateDataPanel() {
        this.updateOverviewTab();
        this.updateDetailedHistory();
    }

    updateOverviewTab() {
        const totalRounds = this.testStats.rounds + this.realStats.rounds;
        let totalProfit = 0;
        let totalCost = 0;

        for (const item of this.history) {
            if (item.profit !== null) {
                totalProfit += item.profit;
                totalCost += Math.abs(item.profit > 0 ? item.profit : -item.profit);
            }
        }

        document.getElementById('totalRoundsOverview').textContent = totalRounds;
        document.getElementById('totalCostOverview').textContent = `$${totalCost.toLocaleString()}`;
        
        const profitDisplay = document.getElementById('totalProfitOverview');
        profitDisplay.textContent = `$${totalProfit}`;
        profitDisplay.style.color = totalProfit > 0 ? 'var(--success)' : totalProfit < 0 ? 'var(--danger)' : 'var(--primary)';

        document.getElementById('balanceOverview').textContent = `$${this.balance.toLocaleString()}`;

        document.getElementById('testModeRounds').textContent = this.testStats.rounds;
        document.getElementById('testModeHeads').textContent = this.testStats.heads;
        document.getElementById('testModeTails').textContent = this.testStats.tails;
        const testRate = this.testStats.rounds > 0 ? ((this.testStats.heads / this.testStats.rounds) * 100).toFixed(1) : '50';
        document.getElementById('testModeRate').textContent = `${testRate}%`;

        document.getElementById('realModeRounds').textContent = this.realStats.rounds;
        document.getElementById('realModeHeads').textContent = this.realStats.heads;
        document.getElementById('realModeTails').textContent = this.realStats.tails;
        const realRate = this.realStats.rounds > 0 ? ((this.realStats.heads / this.realStats.rounds) * 100).toFixed(1) : '50';
        document.getElementById('realModeRate').textContent = `${realRate}%`;

        const continuousHistory = this.history.filter(item => item.mode === 'continuous');
        const continuousRounds = continuousHistory.length;
        let continuousProfit = 0;
        for (const item of continuousHistory) {
            if (item.profit !== null) {
                continuousProfit += item.profit;
            }
        }
        document.getElementById('continuousModeRounds').textContent = continuousRounds;
        const continuousProfitDisplay = document.getElementById('continuousModeProfit');
        continuousProfitDisplay.textContent = `$${continuousProfit}`;
        continuousProfitDisplay.style.color = continuousProfit > 0 ? 'var(--success)' : continuousProfit < 0 ? 'var(--danger)' : 'var(--text-secondary)';
    }

    updateDetailedHistory() {
        const filter = document.getElementById('historyModeFilter').value;
        let filteredHistory = this.history;

        if (filter) {
            filteredHistory = this.history.filter(item => item.mode === filter);
        }

        const historyContainer = document.getElementById('detailedHistory');
        
        if (filteredHistory.length === 0) {
            historyContainer.innerHTML = '<div class="empty-state">暂无记录</div>';
            return;
        }

        historyContainer.innerHTML = filteredHistory.map((item, index) => {
            const modeText = item.mode === 'test' ? '🧪 测试' : item.mode === 'continuous' ? '🔄 连续' : '🎮 正式';
            const resultText = item.result === 'heads' ? '正面' : '反面';
            const choiceText = item.choice ? (item.choice === 'heads' ? '正面' : '反面') : '-';
            const profitText = item.profit !== null ? `$${item.profit}` : '-';
            const profitClass = item.profit > 0 ? 'win' : item.profit < 0 ? 'lose' : '';
            const resultClass = item.result;
            const time = new Date(item.timestamp).toLocaleTimeString();
            const date = new Date(item.timestamp).toLocaleDateString();

            return `
                <div class="detailed-history-item ${profitClass}">
                    <div class="history-cell">
                        <div class="history-cell-label">模式</div>
                        <div class="history-cell-value">${modeText}</div>
                    </div>
                    <div class="history-cell">
                        <div class="history-cell-label">结果</div>
                        <div class="history-cell-value ${resultClass}">${resultText}</div>
                    </div>
                    <div class="history-cell">
                        <div class="history-cell-label">选择</div>
                        <div class="history-cell-value">${choiceText}</div>
                    </div>
                    <div class="history-cell">
                        <div class="history-cell-label">盈亏</div>
                        <div class="history-cell-value ${profitClass}">${profitText}</div>
                    </div>
                    <div class="history-cell">
                        <div class="history-cell-label">时间</div>
                        <div class="history-cell-value history-cell-time">${date} ${time}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateAnalysis() {
        this.updateWinLossAnalysis();
        this.updateProfitAnalysis();
        this.updateTrendAnalysis();
    }

    updateWinLossAnalysis() {
        const realGames = this.history.filter(item => item.mode === 'real' || item.mode === 'continuous');
        let wins = 0;
        let losses = 0;

        for (const item of realGames) {
            if (item.profit > 0) {
                wins++;
            } else if (item.profit < 0) {
                losses++;
            }
        }

        const total = wins + losses;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

        const container = document.getElementById('winLossAnalysis');
        if (total === 0) {
            container.innerHTML = '<div class="empty-state">暂无数据</div>';
            return;
        }

        container.innerHTML = `
            <div class="analysis-row">
                <span class="analysis-label">赢局数</span>
                <span class="analysis-value" style="color: var(--success)">${wins}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">输局数</span>
                <span class="analysis-value" style="color: var(--danger)">${losses}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">总局数</span>
                <span class="analysis-value">${total}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">胜率</span>
                <span class="analysis-value">${winRate}%</span>
            </div>
        `;
    }

    updateProfitAnalysis() {
        let totalProfit = 0;
        let maxProfit = -Infinity;
        let maxLoss = 0;
        let profitCount = 0;
        let lossCount = 0;

        for (const item of this.history) {
            if (item.profit !== null) {
                totalProfit += item.profit;
                if (item.profit > 0) {
                    profitCount++;
                    maxProfit = Math.max(maxProfit, item.profit);
                } else if (item.profit < 0) {
                    lossCount++;
                    maxLoss = Math.min(maxLoss, item.profit);
                }
            }
        }

        const container = document.getElementById('profitAnalysis');
        if (this.history.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无数据</div>';
            return;
        }

        const avgProfit = this.history.length > 0 ? (totalProfit / this.history.length).toFixed(2) : 0;

        container.innerHTML = `
            <div class="analysis-row">
                <span class="analysis-label">总盈亏</span>
                <span class="analysis-value" style="color: ${totalProfit > 0 ? 'var(--success)' : totalProfit < 0 ? 'var(--danger)' : 'var(--text-secondary)'}">${totalProfit > 0 ? '+' : ''}$${totalProfit}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">平均收益</span>
                <span class="analysis-value">${avgProfit > 0 ? '+' : ''}$${avgProfit}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">单局最大利</span>
                <span class="analysis-value" style="color: var(--success)">${maxProfit !== -Infinity ? `$${maxProfit}` : '-'}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">单局最大亏</span>
                <span class="analysis-value" style="color: var(--danger)">${maxLoss !== 0 ? `$${maxLoss}` : '-'}</span>
            </div>
        `;
    }

    updateTrendAnalysis() {
        const realGames = this.history.filter(item => item.mode === 'real' || item.mode === 'continuous').reverse();
        
        let headCount = 0;
        let tailCount = 0;

        for (const item of realGames.slice(0, 20)) {
            if (item.result === 'heads') {
                headCount++;
            } else {
                tailCount++;
            }
        }

        const recentTotal = headCount + tailCount;
        const container = document.getElementById('trendAnalysis');

        if (recentTotal === 0) {
            container.innerHTML = '<div class="empty-state">暂无数据</div>';
            return;
        }

        const headRate = ((headCount / recentTotal) * 100).toFixed(1);
        const tailRate = ((tailCount / recentTotal) * 100).toFixed(1);

        let trend = '均衡';
        if (Math.abs(headCount - tailCount) > 4) {
            trend = headCount > tailCount ? '倾向正面 📈' : '倾向反面 📉';
        }

        container.innerHTML = `
            <div class="analysis-row">
                <span class="analysis-label">最近20局正面</span>
                <span class="analysis-value">${headCount} (${headRate}%)</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">最近20局反面</span>
                <span class="analysis-value">${tailCount} (${tailRate}%)</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">趋势判断</span>
                <span class="analysis-value">${trend}</span>
            </div>
        `;
    }

    disableChoiceButtons(selector) {
        document.querySelectorAll(`${selector} .choice-btn`).forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
    }

    enableChoiceButtons(selector) {
        document.querySelectorAll(`${selector} .choice-btn`).forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }

    resetData() {
        if (confirm('确定要重置所有数据吗？这将清空余额、统计和历史记录。')) {
            this.balance = 10000;
            this.testStats = { rounds: 0, heads: 0, tails: 0 };
            this.realStats = { rounds: 0, heads: 0, tails: 0 };
            this.history = [];
            this.saveToLocalStorage();
            this.updateUI();
            this.showResult('数据已重置', '');
        }
    }

    clearHistory() {
        if (confirm('确定要清空历史记录吗？')) {
            this.history = [];
            this.saveToLocalStorage();
            this.updateUI();
            this.showResult('历史记录已清空', '');
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CoinFlipGame();
});
