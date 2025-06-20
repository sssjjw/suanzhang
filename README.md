# 智能费用均摊计算器

一个专为聚餐、旅行、团建等活动设计的费用均摊工具，能够智能优化转账次数，支持家庭成员分组。

## 功能特色

### 🏠 家庭分组支持
- 支持将家庭成员归为一组
- 自动省略家庭内部转账
- 以家庭代表进行对外收付款

### 💰 智能费用计算
- 精确计算每人应分摊费用
- 自动处理复杂的多人付款情况
- 实时显示个人收支明细

### 🔄 转账次数优化
- 使用优化算法减少转账笔数
- 智能匹配债权债务关系
- 生成最优转账方案

### 📱 现代化界面
- 响应式设计，支持移动端
- 直观的操作流程
- 美观的结果展示

## 使用方法

### 1. 添加参与人员
- 输入参与者姓名
- 勾选"同一家庭"将连续添加的人员归为一组
- 家庭成员将共同承担费用，免内部转账

### 2. 记录费用支出
- 选择付款人（家庭付款以代表显示）
- 输入支付金额
- 可选择添加费用描述

### 3. 计算均摊结果
- 点击"计算均摊"按钮
- 查看费用统计和个人明细
- 获取优化的转账方案

## 示例案例

网站内置了一个实际案例：8人聚餐费用均摊
- 参与者：崔师傅（男女）、李师傅、刘师傅、时师傅、宋师傅、吴师傅、周师傅
- 总费用：178.72欧
- 优化后仅需5笔转账完成均摊

点击"加载示例案例"即可体验完整功能。

## 技术实现

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **样式**: Tailwind CSS
- **图标**: Font Awesome
- **算法**: 贪心算法优化转账次数

## 核心算法

采用贪心算法解决多人债务清算问题：

1. **计算净收支**: 每个家庭的已付金额减去应付金额
2. **分类处理**: 将净收支为正的归为债权方，为负的归为债务方
3. **优化匹配**: 按金额排序，优先处理大额债权债务
4. **生成方案**: 生成最少转账次数的清算方案

## 文件结构

```
├── index.html          # 主页面
├── script.js          # 核心逻辑
└── README.md          # 说明文档
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 部署方式

直接将文件放在Web服务器上即可使用，无需额外配置。

## 使用场景

- 🍽️ 聚餐费用分摊
- 🏨 旅行住宿费用
- 🎉 活动组织费用
- 🏢 团建花费分摊
- 🛒 团购费用计算

---

*让费用分摊变得简单高效！* 