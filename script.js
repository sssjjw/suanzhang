// 全局数据存储
let persons = [];
let expenses = [];
let currentStep = 1;

// 人员管理
function addPerson() {
    const nameInput = document.getElementById('personName');
    const familyCheckbox = document.getElementById('isFamily');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('请输入姓名');
        return;
    }
    
    // 检查是否重名
    if (persons.find(p => p.name === name)) {
        alert('该姓名已存在');
        return;
    }
    
    const person = {
        id: Date.now(),
        name: name,
        familyGroup: familyCheckbox.checked && persons.length > 0 ? 
            persons[persons.length - 1].familyGroup : 
            persons.length + 1
    };
    
    persons.push(person);
    nameInput.value = '';
    familyCheckbox.checked = false;
    
    updatePersonList();
    updatePayerSelect();
    updateStepSummary();
}

function removePerson(id) {
    persons = persons.filter(p => p.id !== id);
    expenses = expenses.filter(e => e.payerId !== id);
    updatePersonList();
    updatePayerSelect();
    updateExpenseList();
    updateStepSummary();
}

function updatePersonList() {
    const personList = document.getElementById('personList');
    personList.innerHTML = '';
    
    persons.forEach(person => {
        const familyMembers = persons.filter(p => p.familyGroup === person.familyGroup);
        const familyInfo = familyMembers.length > 1 ? 
            `（家庭${person.familyGroup}：${familyMembers.map(p => p.name).join('、')}）` : '';
        
        personList.innerHTML += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                    <span class="font-medium">${person.name}</span>
                    <div class="text-sm text-gray-600">${familyInfo}</div>
                </div>
                <button onclick="removePerson(${person.id})" 
                        class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
}

function updatePayerSelect() {
    const payerSelect = document.getElementById('payerSelect');
    const currentValue = payerSelect.value;
    
    payerSelect.innerHTML = '<option value="">选择付款人</option>';
    
    // 按家庭分组显示
    const familyGroups = {};
    persons.forEach(person => {
        if (!familyGroups[person.familyGroup]) {
            familyGroups[person.familyGroup] = [];
        }
        familyGroups[person.familyGroup].push(person);
    });
    
    Object.values(familyGroups).forEach(family => {
        if (family.length === 1) {
            payerSelect.innerHTML += `<option value="${family[0].id}">${family[0].name}</option>`;
        } else {
            payerSelect.innerHTML += `<option value="${family[0].id}">${family.map(p => p.name).join('、')}（家庭）</option>`;
        }
    });
    
    payerSelect.value = currentValue;
    
    // 同时更新中介人选择
    updateHubPersonSelect();
}

function updateHubPersonSelect() {
    const hubPersonSelect = document.getElementById('hubPersonSelect');
    if (!hubPersonSelect) return;
    
    const currentValue = hubPersonSelect.value;
    hubPersonSelect.innerHTML = '<option value="">选择中介人</option>';
    
    // 按家庭分组显示
    const familyGroups = {};
    persons.forEach(person => {
        if (!familyGroups[person.familyGroup]) {
            familyGroups[person.familyGroup] = [];
        }
        familyGroups[person.familyGroup].push(person);
    });
    
    Object.values(familyGroups).forEach(family => {
        if (family.length === 1) {
            hubPersonSelect.innerHTML += `<option value="${family[0].id}">${family[0].name}</option>`;
        } else {
            hubPersonSelect.innerHTML += `<option value="${family[0].id}">${family.map(p => p.name).join('、')}（家庭代表）</option>`;
        }
    });
    
    hubPersonSelect.value = currentValue;
}

function toggleHubSelection() {
    const transferMode = document.getElementById('transferMode').value;
    const hubPersonDiv = document.getElementById('hubPersonDiv');
    
    if (transferMode === 'hub') {
        hubPersonDiv.classList.remove('hidden');
    } else {
        hubPersonDiv.classList.add('hidden');
    }
}

// 费用管理
function addExpense() {
    const payerSelect = document.getElementById('payerSelect');
    const amountInput = document.getElementById('expenseAmount');
    const descInput = document.getElementById('expenseDesc');
    
    const payerId = parseInt(payerSelect.value);
    const amount = parseFloat(amountInput.value);
    const description = descInput.value.trim();
    
    if (!payerId) {
        alert('请选择付款人');
        return;
    }
    
    if (!amount || amount <= 0) {
        alert('请输入有效金额');
        return;
    }
    
    const expense = {
        id: Date.now(),
        payerId: payerId,
        amount: amount,
        description: description || '未描述'
    };
    
    expenses.push(expense);
    
    amountInput.value = '';
    descInput.value = '';
    
    updateExpenseList();
    updateStepSummary();
}

function removeExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    updateExpenseList();
    updateStepSummary();
}

function updateExpenseList() {
    const expenseList = document.getElementById('expenseList');
    
    if (expenses.length === 0) {
        expenseList.innerHTML = '<div class="text-gray-500 text-center py-4">暂无费用记录</div>';
        return;
    }
    
    expenseList.innerHTML = '';
    
    expenses.forEach(expense => {
        const payer = persons.find(p => p.id === expense.payerId);
        const familyMembers = persons.filter(p => p.familyGroup === payer.familyGroup);
        const payerName = familyMembers.length > 1 ? 
            familyMembers.map(p => p.name).join('、') : payer.name;
        
        expenseList.innerHTML += `
            <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                    <span class="font-medium">${payerName}</span> 支付了 
                    <span class="text-green-600 font-semibold">€${expense.amount.toFixed(2)}</span>
                    <div class="text-sm text-gray-600">${expense.description}</div>
                </div>
                <button onclick="removeExpense(${expense.id})" 
                        class="text-red-600 hover:text-red-800">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
}

// 核心计算逻辑
function calculateSplit() {
    if (persons.length === 0) {
        alert('请添加参与人员');
        return;
    }
    
    if (expenses.length === 0) {
        alert('请添加费用记录');
        return;
    }
    
    // 计算总费用
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const perPersonAmount = totalAmount / persons.length;
    
    // 计算每个家庭的已付金额和应付金额
    const familyGroups = {};
    persons.forEach(person => {
        if (!familyGroups[person.familyGroup]) {
            familyGroups[person.familyGroup] = {
                members: [],
                totalPaid: 0,
                shouldPay: 0,
                representative: null
            };
        }
        familyGroups[person.familyGroup].members.push(person);
        if (!familyGroups[person.familyGroup].representative) {
            familyGroups[person.familyGroup].representative = person;
        }
    });
    
    // 计算每个家庭的已付金额
    expenses.forEach(expense => {
        const payer = persons.find(p => p.id === expense.payerId);
        familyGroups[payer.familyGroup].totalPaid += expense.amount;
    });
    
    // 计算每个家庭应付金额
    Object.values(familyGroups).forEach(family => {
        family.shouldPay = family.members.length * perPersonAmount;
    });
    
    // 计算每个家庭的净收支
    const settlements = [];
    const creditors = []; // 应收款方
    const debtors = []; // 应付款方
    
    Object.values(familyGroups).forEach(family => {
        const netAmount = family.totalPaid - family.shouldPay;
        const settlement = {
            family: family,
            netAmount: netAmount,
            representative: family.representative
        };
        
        settlements.push(settlement);
        
        if (netAmount > 0.01) {
            creditors.push(settlement);
        } else if (netAmount < -0.01) {
            debtors.push(settlement);
        }
    });
    
    // 根据转账模式生成转账方案
    const transferMode = document.getElementById('transferMode').value;
    let transfers;
    
    if (transferMode === 'hub') {
        const hubPersonId = parseInt(document.getElementById('hubPersonSelect').value);
        if (!hubPersonId) {
            alert('请选择转账中介人');
            return;
        }
        const hubPerson = persons.find(p => p.id === hubPersonId);
        transfers = generateHubTransfers(settlements, hubPerson);
    } else {
        transfers = generateOptimalTransfers(creditors, debtors);
    }
    
    // 显示结果
    displayResults(totalAmount, perPersonAmount, settlements, transfers, transferMode);
}

function generateOptimalTransfers(creditors, debtors) {
    const transfers = [];
    const creditorsClone = creditors.map(c => ({...c}));
    const debtorsClone = debtors.map(d => ({...d, netAmount: -d.netAmount}));
    
    creditorsClone.sort((a, b) => b.netAmount - a.netAmount);
    debtorsClone.sort((a, b) => b.netAmount - a.netAmount);
    
    let i = 0, j = 0;
    
    while (i < creditorsClone.length && j < debtorsClone.length) {
        const creditor = creditorsClone[i];
        const debtor = debtorsClone[j];
        
        const transferAmount = Math.min(creditor.netAmount, debtor.netAmount);
        
        if (transferAmount > 0.01) {
            transfers.push({
                from: debtor.representative,
                to: creditor.representative,
                amount: transferAmount
            });
            
            creditor.netAmount -= transferAmount;
            debtor.netAmount -= transferAmount;
        }
        
        if (creditor.netAmount < 0.01) i++;
        if (debtor.netAmount < 0.01) j++;
    }
    
    return transfers;
}

function generateHubTransfers(settlements, hubPerson) {
    const transfers = [];
    
    // 找到中介人的结算信息
    const hubSettlement = settlements.find(s => s.representative.id === hubPerson.id);
    if (!hubSettlement) {
        alert('中介人不在参与者列表中');
        return [];
    }
    
    // 分两个阶段：收集资金和分发资金
    let hubBalance = hubSettlement.netAmount; // 中介人的初始净收支
    
    settlements.forEach(settlement => {
        if (settlement.representative.id === hubPerson.id) return; // 跳过中介人自己
        
        if (settlement.netAmount < -0.01) {
            // 负数表示需要支付，让此人向中介人转账
            const transferAmount = -settlement.netAmount;
            transfers.push({
                from: settlement.representative,
                to: hubPerson,
                amount: transferAmount,
                type: 'collect' // 收集阶段
            });
            hubBalance += transferAmount;
        }
    });
    
    settlements.forEach(settlement => {
        if (settlement.representative.id === hubPerson.id) return; // 跳过中介人自己
        
        if (settlement.netAmount > 0.01) {
            // 正数表示应该收回，让中介人向此人转账
            const transferAmount = settlement.netAmount;
            transfers.push({
                from: hubPerson,
                to: settlement.representative,
                amount: transferAmount,
                type: 'distribute' // 分发阶段
            });
            hubBalance -= transferAmount;
        }
    });
    
    return transfers;
}

function displayResults(totalAmount, perPersonAmount, settlements, transfers, transferMode = 'optimal') {
    const resultsDiv = document.getElementById('results');
    resultsDiv.classList.remove('hidden');
    
    // 费用统计
    const expenseStats = document.getElementById('expenseStats');
    expenseStats.innerHTML = `
        <div class="space-y-2">
            <div>总费用: <span class="font-semibold text-blue-800">€${totalAmount.toFixed(2)}</span></div>
            <div>参与人数: <span class="font-semibold text-blue-800">${persons.length}人</span></div>
            <div>人均费用: <span class="font-semibold text-blue-800">€${perPersonAmount.toFixed(2)}</span></div>
        </div>
    `;
    
    // 均摊详情
    const splitDetails = document.getElementById('splitDetails');
    const modeText = transferMode === 'hub' ? '中介转账模式' : '最优转账模式';
    const optimizationText = transferMode === 'hub' ? '所有人只需与中介人交互' : '已优化到最少转账次数';
    
    splitDetails.innerHTML = `
        <div class="space-y-2">
            <div>转账模式: <span class="font-semibold text-green-800">${modeText}</span></div>
            <div>转账笔数: <span class="font-semibold text-green-800">${transfers.length}笔</span></div>
            <div class="text-sm text-gray-600">${optimizationText}</div>
        </div>
    `;
    
    // 转账方案
    const transferPlan = document.getElementById('transferPlan');
    if (transfers.length === 0) {
        transferPlan.innerHTML = '<div class="text-center py-4 text-gray-600">无需转账，费用已平衡！</div>';
    } else {
        if (transferMode === 'hub') {
            // 中介转账模式：分收集和分发两个阶段显示
            const collectTransfers = transfers.filter(t => t.type === 'collect');
            const distributeTransfers = transfers.filter(t => t.type === 'distribute');
            
            let html = '';
            
            if (collectTransfers.length > 0) {
                html += '<div class="mb-4"><h4 class="font-semibold text-yellow-800 mb-2 flex items-center"><i class="fas fa-hand-holding-usd mr-2"></i>阶段1：资金收集</h4>';
                html += collectTransfers.map((transfer, index) => `
                    <div class="flex items-center justify-between bg-blue-50 p-3 rounded-lg shadow-sm mb-2">
                        <div class="flex items-center">
                            <span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3">
                                ${index + 1}
                            </span>
                            <span class="font-medium">${transfer.from.name}</span>
                            <i class="fas fa-arrow-right mx-2 text-gray-400"></i>
                            <span class="font-medium">${transfer.to.name}</span>
                            <span class="text-sm text-blue-600 ml-2">（中介）</span>
                        </div>
                        <span class="font-semibold text-blue-800">€${transfer.amount.toFixed(2)}</span>
                    </div>
                `).join('');
                html += '</div>';
            }
            
            if (distributeTransfers.length > 0) {
                html += '<div><h4 class="font-semibold text-yellow-800 mb-2 flex items-center"><i class="fas fa-hand-holding-heart mr-2"></i>阶段2：资金分发</h4>';
                html += distributeTransfers.map((transfer, index) => `
                    <div class="flex items-center justify-between bg-green-50 p-3 rounded-lg shadow-sm mb-2">
                        <div class="flex items-center">
                            <span class="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3">
                                ${index + 1}
                            </span>
                            <span class="font-medium">${transfer.from.name}</span>
                            <span class="text-sm text-green-600 mr-2">（中介）</span>
                            <i class="fas fa-arrow-right mx-2 text-gray-400"></i>
                            <span class="font-medium">${transfer.to.name}</span>
                        </div>
                        <span class="font-semibold text-green-800">€${transfer.amount.toFixed(2)}</span>
                    </div>
                `).join('');
                html += '</div>';
            }
            
            transferPlan.innerHTML = html;
        } else {
            // 原有的最优转账显示
            transferPlan.innerHTML = transfers.map((transfer, index) => `
                <div class="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                    <div class="flex items-center">
                        <span class="bg-yellow-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-3">
                            ${index + 1}
                        </span>
                        <span class="font-medium">${transfer.from.name}</span>
                        <i class="fas fa-arrow-right mx-2 text-gray-400"></i>
                        <span class="font-medium">${transfer.to.name}</span>
                    </div>
                    <span class="font-semibold text-yellow-800">€${transfer.amount.toFixed(2)}</span>
                </div>
            `).join('');
        }
    }
    
    // 个人明细
    const personalDetails = document.getElementById('personalDetails');
    personalDetails.innerHTML = settlements.map(settlement => {
        const statusClass = settlement.netAmount > 0.01 ? 'text-green-600' : 
                           settlement.netAmount < -0.01 ? 'text-red-600' : 'text-gray-600';
        const statusText = settlement.netAmount > 0.01 ? '应收回' :
                          settlement.netAmount < -0.01 ? '应支付' : '已平衡';
        const amount = Math.abs(settlement.netAmount);
        
        return `
            <div class="bg-white p-3 rounded-lg shadow-sm">
                <div class="font-medium text-gray-800 mb-1">
                    ${settlement.family.members.map(p => p.name).join('、')}
                </div>
                <div class="text-sm text-gray-600 mb-2">
                    已付: €${settlement.family.totalPaid.toFixed(2)} | 
                    应付: €${settlement.family.shouldPay.toFixed(2)}
                </div>
                <div class="${statusClass} font-semibold">
                    ${statusText}: €${amount.toFixed(2)}
                </div>
            </div>
        `;
    }).join('');
    
    // 滚动到结果区域
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// 初始化示例数据（您的具体案例）
function loadExampleData() {
    // 添加人员
    const examplePersons = [
        { name: '崔师傅（男）', familyGroup: 1 },
        { name: '崔师傅（女）', familyGroup: 2 },
        { name: '李师傅', familyGroup: 3 },
        { name: '刘师傅', familyGroup: 4 },
        { name: '时师傅', familyGroup: 4 }, // 与刘师傅同一家庭
        { name: '宋师傅', familyGroup: 5 },
        { name: '吴师傅', familyGroup: 5 }, // 与宋师傅同一家庭
        { name: '周师傅', familyGroup: 6 }
    ];
    
    persons = examplePersons.map((person, index) => ({
        id: index + 1,
        ...person
    }));
    
    // 添加费用
    expenses = [
        { id: 1, payerId: 1, amount: 30.24, description: '崔师傅（男）支付' },
        { id: 2, payerId: 3, amount: 17.5, description: '李师傅支付' },
        { id: 3, payerId: 4, amount: 81.25, description: '时师傅和刘师傅支付' },
        { id: 4, payerId: 6, amount: 22, description: '宋师傅和吴师傅支付' },
        { id: 5, payerId: 8, amount: 27.73, description: '周师傅支付' }
    ];
    
    updatePersonList();
    updatePayerSelect();
    updateExpenseList();
}

// 步骤管理函数
function toggleStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    const content = document.getElementById(`step${stepNumber}-content`);
    const arrow = document.getElementById(`step${stepNumber}-arrow`);
    
    if (step.classList.contains('collapsed')) {
        // 展开步骤
        step.classList.remove('collapsed');
        content.classList.remove('hidden');
        arrow.classList.remove('fa-chevron-down');
        arrow.classList.add('fa-chevron-up');
    } else {
        // 折叠步骤
        step.classList.add('collapsed');
        content.classList.add('hidden');
        arrow.classList.remove('fa-chevron-up');
        arrow.classList.add('fa-chevron-down');
    }
}

function completeStep(stepNumber) {
    const step = document.getElementById(`step${stepNumber}`);
    const nextStep = document.getElementById(`step${stepNumber + 1}`);
    
    // 标记当前步骤为已完成
    step.classList.add('step-completed');
    step.classList.remove('step-active');
    
    // 折叠当前步骤
    toggleStep(stepNumber);
    
    // 更新进度指示器
    updateStepIndicator(stepNumber, 'completed');
    
    // 展开下一步
    if (nextStep) {
        currentStep = stepNumber + 1;
        nextStep.classList.remove('collapsed');
        nextStep.classList.add('step-active');
        document.getElementById(`step${stepNumber + 1}-content`).classList.remove('hidden');
        document.getElementById(`step${stepNumber + 1}-arrow`).classList.remove('fa-chevron-down');
        document.getElementById(`step${stepNumber + 1}-arrow`).classList.add('fa-chevron-up');
        
        // 更新下一步指示器
        updateStepIndicator(stepNumber + 1, 'active');
        
        // 滚动到下一步
        nextStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateStepIndicator(stepNumber, status) {
    const indicator = document.getElementById(`step${stepNumber}-indicator`);
    const circle = indicator.querySelector('div');
    const text = indicator.querySelector('span');
    const progress = document.getElementById(`progress${stepNumber}`);
    
    if (status === 'completed') {
        circle.classList.remove('bg-gray-300', 'text-gray-600');
        circle.classList.add('bg-green-600', 'text-white');
        circle.innerHTML = '<i class="fas fa-check text-xs"></i>';
        text.classList.remove('text-gray-500');
        text.classList.add('text-green-600');
        
        if (progress) {
            progress.classList.add('progress-active');
        }
    } else if (status === 'active') {
        circle.classList.remove('bg-gray-300', 'text-gray-600');
        circle.classList.add('bg-blue-600', 'text-white');
        text.classList.remove('text-gray-500');
        text.classList.add('text-gray-800');
    }
}

function updateStepSummary() {
    // 更新第一步摘要
    const step1Summary = document.getElementById('step1-summary');
    if (persons.length > 0) {
        const familyCount = new Set(persons.map(p => p.familyGroup)).size;
        step1Summary.textContent = `${persons.length}人，${familyCount}个家庭`;
    } else {
        step1Summary.textContent = '';
    }
    
    // 更新第二步摘要
    const step2Summary = document.getElementById('step2-summary');
    if (expenses.length > 0) {
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        step2Summary.textContent = `${expenses.length}笔费用，共€${totalAmount.toFixed(2)}`;
    } else {
        step2Summary.textContent = '';
    }
    
    // 检查是否可以进入下一步
    checkStepCompletion();
}

function checkStepCompletion() {
    // 检查第一步是否完成
    const step1Next = document.getElementById('step1-next');
    if (persons.length > 0) {
        step1Next.disabled = false;
    } else {
        step1Next.disabled = true;
    }
    
    // 检查第二步是否完成
    const step2Next = document.getElementById('step2-next');
    if (expenses.length > 0) {
        step2Next.disabled = false;
    } else {
        step2Next.disabled = true;
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化第一步为活动状态
    document.getElementById('step1').classList.add('step-active');
    updateStepIndicator(1, 'active');
    
    // 添加回车键监听
    document.getElementById('personName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addPerson();
        }
    });
    
    document.getElementById('expenseAmount').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addExpense();
        }
    });
});

// 添加加载示例数据的按钮功能
function loadExample() {
    if (confirm('这将清空当前数据并加载示例案例，确定继续吗？')) {
        loadExampleData();
        updateStepSummary();
        alert('示例数据已加载！');
    }
} 