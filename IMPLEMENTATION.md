# 实现说明文档

## 项目概述

这是一个完整的抛硬币游戏，具有以下特点：
- ✅ 真随机算法 (Web Crypto API)
- ✅ 三种游戏模式 (测试、正式、连续)
- ✅ 完整的动画效果
- ✅ 数据持久化 (LocalStorage)
- ✅ 优雅的UI设计
- ✅ 完整的统计功能
- ✅ 概率预测系统

## 技术实现细节

### 1. 真随机算法

```javascript
trueRandom() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % 2 === 0 ? 'heads' : 'tails';
}
```

**实现原理**:
- 使用 `crypto.getRandomValues()` 生成加密级别的随机数
- 生成32位无符号整数
- 通过模2运算得到0或1
- 映射到正面(heads)或反面(tails)

**随机性保证**:
- CSPRNG (密码学安全伪随机数生成器)
- 不可预测性
- 均匀分布
- 独立性

### 2. 游戏模式

#### 测试模式
```javascript
async startTest() {
    // 批量测试，不消耗资金
    // 记录到 testStats
    // 用于数据参考
}
```

#### 正式游戏
```javascript
async playReal(choice) {
    // 单次投注
    // 扣除资金 (betAmount + fee)
    // 判断输赢
    // 更新余额和统计
}
```

#### 连续下注
```javascript
async startContinuous(choice) {
    // 批量自动投注
    // 循环执行指定局数
    // 实时更新进度
    // 计算净收益
}
```

### 3. 数据结构

```javascript
{
    balance: 1000,                     // 余额
    testStats: {                       // 测试统计
        rounds: 0,
        heads: 0,
        tails: 0
    },
    realStats: {                       // 正式统计
        rounds: 0,
        heads: 0,
        tails: 0
    },
    history: [                         // 历史记录
        {
            mode: 'test|real|continuous',
            result: 'heads|tails',
            choice: 'heads|tails|null',
            profit: number,
            timestamp: number
        }
    ]
}
```

### 4. 动画实现

#### 硬币翻转动画
```css
@keyframes flipHeads {
    0% { transform: rotateY(0deg) rotateX(0deg); }
    100% { transform: rotateY(1800deg) rotateX(360deg); }
}

@keyframes flipTails {
    0% { transform: rotateY(0deg) rotateX(0deg); }
    100% { transform: rotateY(1980deg) rotateX(360deg); }
}
```

**实现要点**:
- 使用 CSS 3D Transform
- `perspective` 创建3D空间
- `transform-style: preserve-3d` 保持3D效果
- `backface-visibility: hidden` 隐藏背面
- 正面旋转1800度 (5圈)
- 反面旋转1980度 (5.5圈)

#### 其他动画
- `fadeIn`: 页面加载淡入
- `fadeInDown`: 标题下滑淡入
- `bounceIn`: 结果弹入
- `slideInRight`: 历史记录滑入

### 5. 概率计算

```javascript
updateProbability() {
    let headsProb = 50;
    let tailsProb = 50;

    // 优先使用正式游戏数据
    if (this.realStats.rounds > 0) {
        headsProb = (this.realStats.heads / this.realStats.rounds) * 100;
        tailsProb = (this.realStats.tails / this.realStats.rounds) * 100;
    } 
    // 无正式数据则使用测试数据
    else if (this.testStats.rounds > 0) {
        headsProb = (this.testStats.heads / this.testStats.rounds) * 100;
        tailsProb = (this.testStats.tails / this.testStats.rounds) * 100;
    }
    
    // 更新UI显示
}
```

### 6. 数据持久化

```javascript
// 保存到 LocalStorage
saveToLocalStorage() {
    const data = {
        balance: this.balance,
        testStats: this.testStats,
        realStats: this.realStats,
        history: this.history.slice(0, 100)  // 最多100条
    };
    localStorage.setItem('coinFlipGameData', JSON.stringify(data));
}

// 从 LocalStorage 加载
loadFromLocalStorage() {
    const saved = localStorage.getItem('coinFlipGameData');
    if (saved) {
        const data = JSON.parse(saved);
        this.balance = data.balance || 1000;
        this.testStats = data.testStats || { rounds: 0, heads: 0, tails: 0 };
        this.realStats = data.realStats || { rounds: 0, heads: 0, tails: 0 };
        this.history = data.history || [];
    }
}
```

## 游戏逻辑

### 资金计算

#### 下注
```javascript
const betAmount = 100;           // 下注金额 (100的倍数)
const fee = 5;                   // 手续费
const totalCost = betAmount + fee;  // 总成本 = 105
```

#### 赢了
```javascript
const winAmount = 200;           // 获得200
const profit = winAmount - totalCost;  // 净利润 = 95
balance += winAmount;
```

#### 输了
```javascript
const loss = -totalCost;         // 损失105
// balance 已经扣除了 totalCost
```

### 最大局数计算

```javascript
updateMaxRounds() {
    const betAmount = parseInt(input.value) || 100;
    const fee = 5;
    const maxRounds = Math.floor(this.balance / (betAmount + fee));
}
```

## UI/UX 设计

### 配色方案
```css
:root {
    --primary: #6366f1;           /* 主色 - 靛蓝 */
    --success: #10b981;           /* 成功 - 绿色 */
    --danger: #ef4444;            /* 危险 - 红色 */
    --heads-color: #f59e0b;       /* 正面 - 金色 */
    --tails-color: #06b6d4;       /* 反面 - 青色 */
    --bg-main: #0f172a;           /* 主背景 - 深蓝 */
    --bg-card: #1e293b;           /* 卡片背景 */
}
```

### 布局结构
- 三列网格布局 (左-中-右)
- 左侧: 余额、统计、概率、历史
- 中间: 硬币、控制面板
- 右侧: 规则、说明、操作按钮
- 响应式: 小屏幕下单列显示

### 交互设计
- 按钮悬停效果
- 禁用状态视觉反馈
- 实时数据更新
- 流畅的过渡动画
- 清晰的结果提示

## 性能优化

### 1. 动画性能
- 使用 `transform` 而非 `left/top`
- 使用 `opacity` 过渡
- 启用硬件加速
- 避免 layout thrashing

### 2. 数据更新
- 批量DOM更新
- 使用 `requestAnimationFrame` (隐式通过CSS动画)
- 限制历史记录数量 (最多100条)

### 3. 存储优化
- 只保存必要数据
- 定期清理旧记录
- JSON序列化压缩

## 浏览器兼容性

### 必需API支持
- Web Crypto API (Chrome 11+, Firefox 21+, Safari 6.1+)
- LocalStorage API (所有现代浏览器)
- CSS3 Transform 3D (所有现代浏览器)
- ES6+ JavaScript (可选：添加Babel转译)

### 渐进增强
- 基础功能在所有现代浏览器可用
- 动画效果在支持的浏览器更优
- 无需任何Polyfill

## 安全性

### 1. 随机数安全
- 使用加密级别的CSPRNG
- 无法被预测或操纵
- 符合密码学安全标准

### 2. 数据安全
- 纯本地存储
- 不涉及网络传输
- 不收集用户信息
- 完全客户端运行

### 3. 输入验证
- 验证下注金额 (必须是100的倍数)
- 验证测试局数 (1-100)
- 验证连续局数 (不超过余额允许)
- 防止余额不足时下注

## 可扩展性

### 潜在功能扩展
1. **多种游戏模式**
   - 三选一 (石头剪刀布)
   - 骰子游戏
   - 轮盘赌

2. **高级统计**
   - 图表展示
   - 连胜/连败统计
   - 收益率曲线

3. **社交功能**
   - 分享战绩
   - 排行榜
   - 多人对战

4. **个性化**
   - 主题切换
   - 音效配置
   - 自定义规则

5. **数据导出**
   - CSV导出
   - JSON备份
   - 数据分析报告

## 测试建议

### 功能测试
1. 测试模式: 100局测试，验证统计准确性
2. 正式游戏: 多次下注，验证资金计算
3. 连续下注: 大量局数，验证性能
4. 数据持久化: 刷新页面，验证数据保存
5. 边界条件: 余额为0，最大下注等

### 随机性测试
1. 运行10000次，统计正反面比例
2. 应接近 50% : 50%
3. 卡方检验验证均匀分布

### 性能测试
1. 连续1000局的执行时间
2. 内存占用情况
3. LocalStorage大小

### 兼容性测试
1. Chrome, Firefox, Safari, Edge
2. 桌面和移动设备
3. 不同屏幕尺寸

## 代码质量

### 代码组织
- 面向对象设计 (ES6 Class)
- 单一职责原则
- 清晰的方法命名
- 适当的代码注释

### 可维护性
- 模块化结构
- 配置与逻辑分离
- 易于扩展的架构
- 完善的文档

### 可读性
- 语义化的变量名
- 一致的代码风格
- 清晰的逻辑流程
- 合理的代码结构

## 总结

这是一个功能完整、设计优雅、技术先进的抛硬币游戏实现。所有需求都已满足：

✅ 动画效果的抛硬币游戏
✅ 真随机算法保证
✅ 初始资金$1,000
✅ 下注规则完整实现
✅ 测试模式 (1-100局)
✅ 统计和概率展示
✅ 连续下注功能 (超过5局可快速查看结果)
✅ 优雅大气的网页设计
✅ 丝滑的交互体验
✅ LocalStorage数据持久化
✅ 娱乐性质免责声明

代码质量高，注释清晰，易于维护和扩展。
