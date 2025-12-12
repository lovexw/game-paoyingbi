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

        if (won) {
            profit = 200 - totalCost;
            this.balance += 200;
            this.showResult(`🎉 恭喜！你赢了 $${profit}`, 'win');
        } else {
            profit = -totalCost;
            this.showResult(`😢 很遗憾，你输了 $${totalCost}`, 'lose');
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

        this.continuousMode = {
            active: true,
            currentRound: 0,
            totalRounds: rounds,
            choice: choice,
            betAmount: betAmount,
            netProfit: 0
        };

        this.isFlipping = true;
        this.disableChoiceButtons('#continuousModeControls');
        document.getElementById('continuousProgress').style.display = 'block';

        for (let i = 0; i < rounds; i++) {
            this.continuousMode.currentRound = i + 1;
            
            this.balance -= totalCost;
            this.updateContinuousProgress();

            const result = this.trueRandom();
            await this.flipCoin(result);

            this.realStats.rounds++;
            this.realStats[result]++;

            const won = result === choice;
            let profit = 0;

            if (won) {
                profit = 200 - totalCost;
                this.balance += 200;
            } else {
                profit = -totalCost;
            }

            this.continuousMode.netProfit += profit;
            this.addHistory('continuous', result, choice, profit);
            this.updateUI();
            this.updateContinuousProgress();

            if (i < rounds - 1) {
                await this.delay(800);
            }
        }

        const finalProfit = this.continuousMode.netProfit;
        if (finalProfit > 0) {
            this.showResult(`🎉 连续下注完成！净收益 $${finalProfit}`, 'win');
        } else if (finalProfit < 0) {
            this.showResult(`😢 连续下注完成！净亏损 $${Math.abs(finalProfit)}`, 'lose');
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

        const recentHistory = this.history.slice(0, 20);
        historyList.innerHTML = recentHistory.map(item => {
            const modeText = item.mode === 'test' ? '测试' : item.mode === 'continuous' ? '连续' : '正式';
            const resultText = item.result === 'heads' ? '正面' : '反面';
            const choiceText = item.choice ? (item.choice === 'heads' ? '正面' : '反面') : '-';
            const profitText = item.profit !== null ? `$${item.profit}` : '-';
            const resultClass = item.result;
            const profitClass = item.profit > 0 ? 'win' : item.profit < 0 ? 'lose' : '';
            
            return `
                <div class="history-item">
                    <span>${modeText}</span>
                    <span class="history-result ${resultClass}">${resultText}</span>
                    <span>${choiceText}</span>
                    <span class="history-result ${profitClass}">${profitText}</span>
                </div>
            `;
        }).join('');
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
