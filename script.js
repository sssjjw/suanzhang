// 全局数据存储
let persons = [];
let expenses = [];
let currentStep = 1;
let sessionId = null; // 当前会话ID
let activityName = ''; // 当前活动名称

// 会话管理
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getStorageKey() {
    return `expenseSplitterData_${sessionId}`;
}

function initializeSession() {
    // 从URL参数获取会话ID
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('session') || urlParams.get('s'); // 支持新旧格式
    
    if (urlSessionId) {
        sessionId = urlSessionId;
        // 尝试加载URL中的数据
        if (!loadDataFromURL()) {
            // 如果URL中没有数据，尝试从localStorage加载
            loadDataFromStorage();
        }
    } else {
        // 生成新的会话ID
        sessionId = generateSessionId();
        // 更新URL但不刷新页面
        const newUrl = `${window.location.pathname}?s=${sessionId}`;
        window.history.replaceState({}, '', newUrl);
        // 清空数据开始新会话
        persons = [];
        expenses = [];
        currentStep = 1;
    }
    
    // 检查存储使用情况
    checkStorageUsage();
    
    updateAllUI();
}

// 存储管理和清理功能
function checkStorageUsage() {
    try {
        const allKeys = Object.keys(localStorage);
        const appKeys = allKeys.filter(key => key.startsWith('expenseSplitterData_'));
        
        // 计算总存储大小
        let totalSize = 0;
        appKeys.forEach(key => {
            totalSize += localStorage.getItem(key).length;
        });
        
        // 转换为KB
        const sizeInKB = Math.round(totalSize / 1024);
        
        console.log(`📊 存储状态: ${appKeys.length}个会话, 占用${sizeInKB}KB`);
        
        // 如果存储过多，提示清理
        if (appKeys.length > 20) {
            console.warn('⚠️ 检测到较多会话数据，建议清理旧数据');
            // 可以在合适时机提醒用户清理
            if (appKeys.length > 50) {
                setTimeout(() => {
                    if (confirm('检测到存储了很多计算会话（' + appKeys.length + '个）\n\n是否要清理7天前的旧数据？这不会影响当前正在使用的计算任务。')) {
                        cleanOldSessions();
                    }
                }, 2000);
            }
        }
        
        // 检查localStorage剩余空间
        checkLocalStorageQuota();
        
    } catch (error) {
        console.error('存储检查失败:', error);
    }
}

function cleanOldSessions() {
    try {
        const allKeys = Object.keys(localStorage);
        const appKeys = allKeys.filter(key => key.startsWith('expenseSplitterData_'));
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        let cleanedCount = 0;
        
        appKeys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                const sessionTime = new Date(data.timestamp).getTime();
                
                // 如果数据超过7天且不是当前会话，则删除
                if (sessionTime < sevenDaysAgo && !key.includes(sessionId)) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            } catch (error) {
                // 如果数据格式错误，也删除
                if (!key.includes(sessionId)) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
        });
        
        alert(`✅ 清理完成！\n\n删除了${cleanedCount}个旧的计算会话数据\n当前会话和最近的数据已保留`);
        
    } catch (error) {
        console.error('清理旧数据失败:', error);
    }
}

function checkLocalStorageQuota() {
    try {
        // 估算localStorage使用情况
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        
        if (totalSize > 3 * 1024 * 1024) { // 超过3MB
            console.warn(`⚠️ localStorage使用量较高: ${sizeInMB}MB`);
        }
        
        // 简单的容量测试
        const testKey = 'storageTest_' + Date.now();
        const testData = 'x'.repeat(1024); // 1KB test data
        
        localStorage.setItem(testKey, testData);
        localStorage.removeItem(testKey);
        
    } catch (error) {
        if (error.name === 'QuotaExceededError') {
            alert('⚠️ 浏览器存储空间不足！\n\n建议清理一些数据或使用新的浏览器标签页');
        }
    }
}

// 数据持久化功能
function saveDataToStorage() {
    const data = {
        persons: persons,
        expenses: expenses,
        currentStep: currentStep,
        activityName: activityName,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    updateDataStatus();
    
    // 同时保存到活动历史
    saveToActivityHistory();
}

function updateDataStatus() {
    const statusElement = document.getElementById('dataStatus');
    if (persons.length > 0 || expenses.length > 0) {
        const timestamp = new Date().toLocaleTimeString('zh-CN');
        statusElement.innerHTML = `<i class="fas fa-save mr-1"></i>数据已自动保存 (${timestamp})`;
        statusElement.className = 'text-xs text-green-600 mb-4';
    } else {
        statusElement.innerHTML = `<i class="fas fa-info-circle mr-1"></i>开始添加数据，将自动保存到本地`;
        statusElement.className = 'text-xs text-gray-500 mb-4';
    }
}

function loadDataFromStorage() {
    try {
        const savedData = localStorage.getItem(getStorageKey());
        if (savedData) {
            const data = JSON.parse(savedData);
            persons = data.persons || [];
            expenses = data.expenses || [];
            currentStep = data.currentStep || 1;
            activityName = data.activityName || '';
            updateActivityTitle();
            return true;
        }
    } catch (error) {
        console.error('加载数据失败:', error);
    }
    return false;
}

function clearStoredData() {
    localStorage.removeItem(getStorageKey());
    persons = [];
    expenses = [];
    currentStep = 1;
    // 注意：不清空活动名称
    updateAllUI();
}

// 活动管理功能
function saveToActivityHistory() {
    if (!activityName || (persons.length === 0 && expenses.length === 0)) {
        return; // 没有活动名称或数据时不保存历史
    }
    
    try {
        const historyKey = 'activityHistory';
        const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        const activityData = {
            id: sessionId,
            name: activityName,
            persons: persons,
            expenses: expenses,
            timestamp: new Date().toISOString(),
            summary: generateActivitySummary()
        };
        
        // 更新或添加活动
        const existingIndex = history.findIndex(item => item.id === sessionId);
        if (existingIndex >= 0) {
            history[existingIndex] = activityData;
        } else {
            history.unshift(activityData); // 添加到开头
        }
        
        // 限制历史记录数量（最多50个）
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem(historyKey, JSON.stringify(history));
    } catch (error) {
        console.error('保存活动历史失败:', error);
    }
}

function generateActivitySummary() {
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const familyGroups = [...new Set(persons.map(p => p.familyGroup))].length;
    
    return {
        totalAmount: totalAmount,
        personCount: persons.length,
        familyCount: familyGroups,
        expenseCount: expenses.length
    };
}

function updateActivityTitle() {
    const titleElement = document.querySelector('h1');
    if (activityName) {
        titleElement.innerHTML = `
            <i class="fas fa-calculator text-blue-600"></i>
            ${activityName} - 费用均摊
        `;
    } else {
        titleElement.innerHTML = `
            <i class="fas fa-calculator text-blue-600"></i>
            智能费用均摊计算器
        `;
    }
}

// 分享功能
// 压缩数据以缩短URL
function compressDataForSharing() {
    // 创建简化的数据结构
    const compactData = {
        p: persons.map(person => ({
            i: person.id,
            n: person.name,
            f: person.familyGroup
        })),
        e: expenses.map(expense => ({
            i: expense.id,
            p: expense.payerId,
            a: expense.amount,
            d: expense.description
        })),
        an: activityName || '' // 活动名称
    };
    return compactData;
}

function decompressSharedData(compactData) {
    return {
        persons: compactData.p?.map(p => ({
            id: p.i,
            name: p.n,
            familyGroup: p.f
        })) || [],
        expenses: compactData.e?.map(e => ({
            id: e.i,
            payerId: e.p,
            amount: e.a,
            description: e.d
        })) || [],
        activityName: compactData.an || ''
    };
}

// 简单的字符串压缩函数
function simpleCompress(str) {
    // 替换常见的重复字符串
    return str
        .replace(/"id":/g, '"i":')
        .replace(/"name":/g, '"n":')
        .replace(/"familyGroup":/g, '"f":')
        .replace(/"payerId":/g, '"p":')
        .replace(/"amount":/g, '"a":')
        .replace(/"description":/g, '"d":')
        .replace(/"activityName":/g, '"an":')
        .replace(/,"/g, ',"')
        .replace(/":"/g, '":"');
}

function simpleDecompress(str) {
    // 还原压缩的字符串
    return str
        .replace(/"i":/g, '"id":')
        .replace(/"n":/g, '"name":')
        .replace(/"f":/g, '"familyGroup":')
        .replace(/"p":/g, '"payerId":')
        .replace(/"a":/g, '"amount":')
        .replace(/"d":/g, '"description":')
        .replace(/"an":/g, '"activityName":');
}

function generateShareableLink() {
    try {
        console.log('开始生成分享链接...');
        console.log('当前数据状态:', { 
            persons: persons.length, 
            expenses: expenses.length, 
            activityName: activityName,
            sessionId: sessionId
        });
        
        // 检查数据是否有效
        if (!persons || persons.length === 0) {
            console.warn('没有人员数据，无法生成分享链接');
            throw new Error('没有人员数据');
        }
        
        const compactData = compressDataForSharing();
        console.log('压缩数据完成:', compactData);
        
        const jsonStr = JSON.stringify(compactData);
        console.log('JSON字符串长度:', jsonStr.length);
        console.log('JSON内容预览:', jsonStr.substring(0, 200) + '...');
        
        const compressedStr = simpleCompress(jsonStr);
        console.log('压缩后长度:', compressedStr.length);
        
        // 使用URL安全的base64编码
        const encodedData = btoa(compressedStr)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, ''); // 去掉padding
        console.log('编码后长度:', encodedData.length);
        console.log('编码数据预览:', encodedData.substring(0, 100) + '...');
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?s=${sessionId}&d=${encodedData}`;
        console.log('生成的分享链接长度:', shareUrl.length);
        console.log('分享链接:', shareUrl);
        
        if (shareUrl.length > 2000) {
            console.warn('分享链接过长，可能在某些平台无法正常使用');
            // 如果链接过长，尝试精简数据
            console.log('尝试生成精简版分享链接...');
            
            // 创建精简版数据（不包含描述）
            const minimalData = {
                p: persons.map(p => ({ i: p.id, n: p.name, f: p.familyGroup })),
                e: expenses.map(e => ({ i: e.id, p: e.payerId, a: e.amount, d: e.description ? e.description.substring(0, 10) : '' })),
                an: activityName ? activityName.substring(0, 20) : ''
            };
            
            const minimalJson = JSON.stringify(minimalData);
            const minimalCompressed = simpleCompress(minimalJson);
            const minimalEncoded = btoa(minimalCompressed)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const minimalShareUrl = `${window.location.origin}${window.location.pathname}?s=${sessionId}&d=${minimalEncoded}`;
            console.log('精简版分享链接长度:', minimalShareUrl.length);
            
            if (minimalShareUrl.length <= 2000) {
                console.log('使用精简版分享链接');
                return minimalShareUrl;
            }
        }
        
        return shareUrl;
    } catch (error) {
        console.error('生成分享链接失败:', error);
        console.error('错误堆栈:', error.stack);
        console.error('当前数据:', { persons, expenses, activityName, sessionId });
        
        // 尝试更安全的降级方案
        try {
            // 尝试创建最小化的数据
            const emergencyData = {
                p: persons.slice(0, 3).map(p => ({ i: p.id, n: p.name.substring(0, 5), f: 1 })),
                e: expenses.slice(0, 3).map(e => ({ i: e.id, p: e.payerId, a: e.amount, d: '' })),
                an: ''
            };
            
            const emergencyJson = JSON.stringify(emergencyData);
            const emergencyEncoded = btoa(emergencyJson).replace(/[+/=]/g, '');
            const emergencyUrl = `${window.location.origin}${window.location.pathname}?s=${sessionId}&d=${emergencyEncoded}`;
            
            console.log('使用应急分享链接:', emergencyUrl);
            return emergencyUrl;
        } catch (emergencyError) {
            console.error('应急分享链接也失败了:', emergencyError);
            
            // 最后的降级方案：仅包含会话ID
            const fallbackUrl = `${window.location.origin}${window.location.pathname}?s=${sessionId}`;
            console.log('使用最终降级链接:', fallbackUrl);
            return fallbackUrl;
        }
    }
}

function loadDataFromURL() {
    console.log('开始从URL加载数据...');
    const urlParams = new URLSearchParams(window.location.search);
    const currentUrl = window.location.href;
    console.log('当前URL:', currentUrl);
    
    // 尝试新格式 (压缩格式)
    let encodedData = urlParams.get('d');
    console.log('获取到的新格式编码数据长度:', encodedData ? encodedData.length : 0);
    if (encodedData) {
        console.log('新格式数据前50个字符:', encodedData.substring(0, 50) + '...');
        try {
            // 还原URL安全的base64编码
            let base64Str = encodedData
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            
            // 添加padding
            while (base64Str.length % 4) {
                base64Str += '=';
            }
            
            console.log('base64解码前长度:', base64Str.length);
            const compressedStr = atob(base64Str);
            console.log('base64解码后长度:', compressedStr.length);
            
            const decompressedStr = simpleDecompress(compressedStr);
            console.log('解压缩后长度:', decompressedStr.length);
            
            const compactData = JSON.parse(decompressedStr);
            console.log('紧凑数据结构:', compactData);
            
            const decodedData = decompressSharedData(compactData);
            console.log('解压缩分享数据:', decodedData);
            
            if (decodedData.persons && decodedData.expenses) {
                console.log('成功解析分享数据:', { 
                    persons: decodedData.persons.length, 
                    expenses: decodedData.expenses.length, 
                    activityName: decodedData.activityName 
                });
                persons = decodedData.persons;
                expenses = decodedData.expenses;
                activityName = decodedData.activityName || '';
                updateActivityTitle();
                updateAllUI();
                return true;
            } else {
                console.warn('新格式数据无效：缺少persons或expenses');
            }
        } catch (error) {
            console.error('从URL加载压缩数据失败:', error);
            console.error('错误详情:', error.message);
        }
    }
    
    // 尝试旧格式 (兼容性)
    encodedData = urlParams.get('data');
    console.log('获取到的旧格式编码数据长度:', encodedData ? encodedData.length : 0);
    if (encodedData) {
        console.log('旧格式数据前50个字符:', encodedData.substring(0, 50) + '...');
        try {
            const decodedData = JSON.parse(decodeURIComponent(atob(encodedData)));
            console.log('解析旧格式分享数据:', decodedData);
            if (decodedData.persons && decodedData.expenses) {
                console.log('成功解析旧格式分享数据:', { 
                    persons: decodedData.persons.length, 
                    expenses: decodedData.expenses.length, 
                    activityName: decodedData.activityName 
                });
                persons = decodedData.persons;
                expenses = decodedData.expenses;
                activityName = decodedData.activityName || '';
                updateActivityTitle();
                updateAllUI();
                return true;
            } else {
                console.warn('旧格式数据无效：缺少persons或expenses');
            }
        } catch (error) {
            console.error('从URL加载旧格式数据失败:', error);
            console.error('错误详情:', error.message);
        }
    }
    
    // 列出所有URL参数用于调试
    const allParams = {};
    for (const [key, value] of urlParams.entries()) {
        allParams[key] = value;
    }
    console.log('所有URL参数:', allParams);
    
    console.log('URL数据加载失败，没有找到有效数据');
    return false;
}

function updateAllUI() {
    updatePersonList();
    updatePayerSelect();
    updateExpenseList();
    updateStepSummary();
    updateDataStatus();
}

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
    saveDataToStorage();
}

function removePerson(id) {
    persons = persons.filter(p => p.id !== id);
    expenses = expenses.filter(e => e.payerId !== id);
    updatePersonList();
    updatePayerSelect();
    updateExpenseList();
    updateStepSummary();
    saveDataToStorage();
}

function updatePersonList() {
    const personList = document.getElementById('personList');
    personList.innerHTML = '';
    
    // 按家庭分组并重新排序家庭序号
    const familyGroups = {};
    persons.forEach(person => {
        if (!familyGroups[person.familyGroup]) {
            familyGroups[person.familyGroup] = [];
        }
        familyGroups[person.familyGroup].push(person);
    });
    
    // 获取所有家庭组并按原家庭编号排序
    const sortedFamilyKeys = Object.keys(familyGroups).sort((a, b) => parseInt(a) - parseInt(b));
    
    // 为每个人添加序号显示
    let personIndex = 1;
    sortedFamilyKeys.forEach((originalFamilyGroup, familyIndex) => {
        const newFamilyNumber = familyIndex + 1;
        const familyMembers = familyGroups[originalFamilyGroup];
        
        familyMembers.forEach(person => {
            const familyInfo = familyMembers.length > 1 ? 
                `（家庭${newFamilyNumber}：${familyMembers.map(p => p.name).join('、')}）` : '';
            
            personList.innerHTML += `
                <div class="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <span class="font-medium">${personIndex}. ${person.name}</span>
                        <div class="text-sm text-gray-600">${familyInfo}</div>
                    </div>
                    <button onclick="removePerson(${person.id})" 
                            class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            personIndex++;
        });
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
    
    // 按家庭编号排序并重新编号
    const sortedFamilyKeys = Object.keys(familyGroups).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedFamilyKeys.forEach((originalFamilyGroup, familyIndex) => {
        const family = familyGroups[originalFamilyGroup];
        const newFamilyNumber = familyIndex + 1;
        
        if (family.length === 1) {
            payerSelect.innerHTML += `<option value="${family[0].id}">${family[0].name}</option>`;
        } else {
            payerSelect.innerHTML += `<option value="${family[0].id}">${family.map(p => p.name).join('、')}（家庭${newFamilyNumber}）</option>`;
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
    
    // 按家庭编号排序并重新编号
    const sortedFamilyKeys = Object.keys(familyGroups).sort((a, b) => parseInt(a) - parseInt(b));
    
    sortedFamilyKeys.forEach((originalFamilyGroup, familyIndex) => {
        const family = familyGroups[originalFamilyGroup];
        const newFamilyNumber = familyIndex + 1;
        
        if (family.length === 1) {
            hubPersonSelect.innerHTML += `<option value="${family[0].id}">${family[0].name}</option>`;
        } else {
            hubPersonSelect.innerHTML += `<option value="${family[0].id}">${family.map(p => p.name).join('、')}（家庭${newFamilyNumber}代表）</option>`;
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
    saveDataToStorage();
}

function removeExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    updateExpenseList();
    updateStepSummary();
    saveDataToStorage();
}

function updateExpenseList() {
    const expenseList = document.getElementById('expenseList');
    
    if (expenses.length === 0) {
        expenseList.innerHTML = '<div class="text-gray-500 text-center py-4">暂无费用记录</div>';
        return;
    }
    
    expenseList.innerHTML = '';
    
    // 构建家庭分组映射以获取正确的家庭序号
    const familyGroups = {};
    persons.forEach(person => {
        if (!familyGroups[person.familyGroup]) {
            familyGroups[person.familyGroup] = [];
        }
        familyGroups[person.familyGroup].push(person);
    });
    const sortedFamilyKeys = Object.keys(familyGroups).sort((a, b) => parseInt(a) - parseInt(b));
    const familyNumberMap = {};
    sortedFamilyKeys.forEach((originalFamilyGroup, index) => {
        familyNumberMap[originalFamilyGroup] = index + 1;
    });
    
    expenses.forEach(expense => {
        const payer = persons.find(p => p.id === expense.payerId);
        const familyMembers = persons.filter(p => p.familyGroup === payer.familyGroup);
        const familyNumber = familyNumberMap[payer.familyGroup];
        const payerName = familyMembers.length > 1 ? 
            `${familyMembers.map(p => p.name).join('、')}（家庭${familyNumber}）` : payer.name;
        
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
    
    // 个人明细 - 添加家庭序号
    const personalDetails = document.getElementById('personalDetails');
    
    // 构建家庭序号映射
    const familyGroups = {};
    settlements.forEach(settlement => {
        const familyGroup = settlement.family.members[0].familyGroup;
        if (!familyGroups[familyGroup]) {
            familyGroups[familyGroup] = settlement;
        }
    });
    const sortedFamilyKeys = Object.keys(familyGroups).sort((a, b) => parseInt(a) - parseInt(b));
    const familyNumberMap = {};
    sortedFamilyKeys.forEach((originalFamilyGroup, index) => {
        familyNumberMap[originalFamilyGroup] = index + 1;
    });
    
    personalDetails.innerHTML = settlements.map(settlement => {
        const statusClass = settlement.netAmount > 0.01 ? 'text-green-600' : 
                           settlement.netAmount < -0.01 ? 'text-red-600' : 'text-gray-600';
        const statusText = settlement.netAmount > 0.01 ? '应收回' :
                          settlement.netAmount < -0.01 ? '应支付' : '已平衡';
        const amount = Math.abs(settlement.netAmount);
        const familyNumber = familyNumberMap[settlement.family.members[0].familyGroup];
        const familyLabel = settlement.family.members.length > 1 ? `家庭${familyNumber}：` : '';
        
        return `
            <div class="bg-white p-3 rounded-lg shadow-sm">
                <div class="font-medium text-gray-800 mb-1">
                    ${familyLabel}${settlement.family.members.map(p => p.name).join('、')}
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
    const nextButton = document.getElementById(`step${stepNumber}-next-wrapper`);
    
    if (step.classList.contains('collapsed')) {
        // 展开步骤
        step.classList.remove('collapsed');
        content.classList.remove('hidden');
        arrow.classList.remove('fa-chevron-down');
        arrow.classList.add('fa-chevron-up');
        // 显示下一步按钮（如果存在）
        if (nextButton) {
            nextButton.classList.remove('hidden');
        }
    } else {
        // 折叠步骤
        step.classList.add('collapsed');
        content.classList.add('hidden');
        arrow.classList.remove('fa-chevron-up');
        arrow.classList.add('fa-chevron-down');
        // 隐藏下一步按钮（如果存在）
        if (nextButton) {
            nextButton.classList.add('hidden');
        }
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
        
        // 显示下一步的按钮
        const nextStepButton = document.getElementById(`step${stepNumber + 1}-next-wrapper`);
        if (nextStepButton) {
            nextStepButton.classList.remove('hidden');
        }
        
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

// 隐藏彩蛋：三击标题加载示例，五击副标题存储管理
let titleClickCount = 0;
let titleClickTimer = null;
let subtitleClickCount = 0;
let subtitleClickTimer = null;

function initTitleEasterEgg() {
    // 主标题彩蛋：三击加载示例
    const titleElement = document.getElementById('mainTitle');
    titleElement.title = '💡 连续点击3次可加载示例数据';
    titleElement.addEventListener('click', function() {
        titleClickCount++;
        
        // 清除之前的定时器
        if (titleClickTimer) {
            clearTimeout(titleClickTimer);
        }
        
        // 设置2秒后重置计数器
        titleClickTimer = setTimeout(() => {
            titleClickCount = 0;
        }, 2000);
        
        // 三击触发示例数据
        if (titleClickCount === 3) {
            titleClickCount = 0;
            clearTimeout(titleClickTimer);
            loadExampleEasterEgg();
        }
    });
    
    // 副标题彩蛋：五击存储管理
    const subtitleElement = document.querySelector('p.text-sm.md\\:text-base.text-gray-600.mb-2');
    if (subtitleElement) {
        subtitleElement.style.cursor = 'pointer';
        subtitleElement.style.userSelect = 'none';
        subtitleElement.title = '💡 连续点击5次可打开存储管理器';
        subtitleElement.addEventListener('click', function() {
            subtitleClickCount++;
            
            // 清除之前的定时器
            if (subtitleClickTimer) {
                clearTimeout(subtitleClickTimer);
            }
            
            // 设置2秒后重置计数器
            subtitleClickTimer = setTimeout(() => {
                subtitleClickCount = 0;
            }, 2000);
            
            // 五击触发存储管理
            if (subtitleClickCount === 5) {
                subtitleClickCount = 0;
                clearTimeout(subtitleClickTimer);
                showStorageManagerEasterEgg();
            }
        });
    }
}

function loadExampleEasterEgg() {
    // 添加一个小动画效果
    const titleElement = document.getElementById('mainTitle');
    titleElement.style.transform = 'scale(1.05)';
    titleElement.style.transition = 'transform 0.2s';
    
    setTimeout(() => {
        titleElement.style.transform = 'scale(1)';
    }, 200);
    
    // 如果有数据，询问是否覆盖
    if (persons.length > 0 || expenses.length > 0) {
        if (confirm('🎉 彩蛋触发！\n\n检测到已有数据，是否清空并加载示例案例？')) {
            loadExampleData();
            updateStepSummary();
            saveDataToStorage();
            
            // 显示有趣的提示
            setTimeout(() => {
                alert('🧮 示例数据已加载！\n这是一个8人聚餐的费用均摊案例，体验一下智能转账优化吧！');
            }, 100);
        }
    } else {
        // 没有数据直接加载
        loadExampleData();
        updateStepSummary();
        saveDataToStorage();
        
        setTimeout(() => {
            alert('🎉 隐藏功能已激活！\n\n已加载8人聚餐示例，快来体验智能费用均摊吧！\n\n💡 小贴士：数据会自动保存，也可以分享给朋友一起填写。');
        }, 100);
    }
}

function showStorageManagerEasterEgg() {
    // 添加动画效果
    const titleElement = document.getElementById('mainTitle');
    titleElement.style.transform = 'scale(1.05)';
    titleElement.style.transition = 'transform 0.2s';
    titleElement.style.color = '#6366f1'; // 变为紫色
    
    setTimeout(() => {
        titleElement.style.transform = 'scale(1)';
        titleElement.style.color = '';
    }, 300);
    
    setTimeout(() => {
        alert('🔍 隐藏功能已激活！\n\n存储管理器即将启动...\n\n💡 小贴士：\n• 点击主标题3次 = 加载示例数据\n• 点击副标题5次 = 打开存储管理');
        showStorageManager();
    }, 100);
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('s');
    const urlData = urlParams.get('d') || urlParams.get('data'); // 兼容新旧格式
    
    console.log('URL参数检查:', { sessionId: urlSessionId, hasData: !!urlData });
    
    // 如果有URL参数，尝试从URL加载数据
    if (urlSessionId || urlData) {
        if (urlSessionId) {
            sessionId = urlSessionId; // 设置会话ID
            console.log('设置会话ID:', sessionId);
        }
        
        const success = loadDataFromURL();
        console.log('URL数据加载结果:', success);
        
        if (success) {
            console.log('URL数据加载成功，显示主界面');
            updateAllUI();
            initializeSteps();
            return;
        } else {
            console.log('URL数据加载失败，检查是否为仅会话ID的链接');
            
            // 如果有会话ID但没有数据，尝试从localStorage加载该会话的数据
            if (urlSessionId && !urlData) {
                console.log('尝试从localStorage加载会话数据:', urlSessionId);
                const sessionKey = `expenseSplitterData_${urlSessionId}`;
                const sessionData = localStorage.getItem(sessionKey);
                
                if (sessionData) {
                    try {
                        const data = JSON.parse(sessionData);
                        console.log('从localStorage加载会话数据成功:', data);
                        
                        persons = data.persons || [];
                        expenses = data.expenses || [];
                        activityName = data.activityName || '';
                        
                        updateActivityTitle();
                        updateAllUI();
                        initializeSteps();
                        return;
                    } catch (error) {
                        console.error('解析localStorage会话数据失败:', error);
                    }
                }
            }
        }
    }
    
    // 初始化会话（如果还没有设置sessionId）
    if (!sessionId) {
        initializeSession();
    }
    
    // 检查是否有现有数据
    if (persons.length > 0 || expenses.length > 0) {
        // 有数据时，正常显示步骤
        initializeSteps();
        return;
    }
    
    // 没有数据时，显示欢迎弹窗
    showWelcomeDialog();
});

// 初始化步骤状态
function initializeSteps() {
    // 确保主要内容区域是显示的
    const mainContent = document.querySelector('.max-w-6xl');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // 移除可能存在的弹窗
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
        overlay.remove();
    }
    
    // 检查应该在哪一步
    if (persons.length > 0 && expenses.length > 0) {
        // 如果已经有人员和费用，直接到第三步
        completeStep(1);
        completeStep(2);
    } else if (persons.length > 0) {
        // 如果只有人员，到第二步
        completeStep(1);
    } else {
        // 初始化第一步为活动状态
        document.getElementById('step1').classList.add('step-active');
        updateStepIndicator(1, 'active');
    }
    
    // 初始化标题彩蛋功能
    initTitleEasterEgg();
    setupEventListeners();
}

// 设置事件监听器
function setupEventListeners() {
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
}

// 欢迎弹窗功能
function showWelcomeDialog() {
    // 隐藏主要内容
    const mainContent = document.querySelector('.max-w-6xl');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // 创建弹窗
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6 text-center">
            <div class="mb-6">
                <i class="fas fa-calculator text-6xl text-blue-600 mb-4"></i>
                <h2 class="text-2xl font-bold text-gray-800 mb-2">智能费用均摊</h2>
                <p class="text-gray-600">让聚餐、旅行、活动费用分摊变得简单</p>
            </div>
            
            <div class="space-y-4">
                <button onclick="startNewActivity()" class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium">
                    <i class="fas fa-plus mr-2"></i>
                    新建活动
                </button>
                
                <button onclick="showActivityHistory()" class="w-full bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors text-lg font-medium">
                    <i class="fas fa-history mr-2"></i>
                    查看历史活动
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// 开始新活动
function startNewActivity() {
    // 检查是否已有数据，如果有则询问用户
    if (persons.length > 0 || expenses.length > 0 || activityName) {
        const currentActivityText = activityName ? `当前活动：${activityName}` : '当前计算任务';
        const confirmMessage = `确定要创建新的活动吗？\n\n${currentActivityText}的数据将被保存到历史活动中，您随时可以在"查看历史活动"中找回。\n\n点击确定将开始新的计算任务。`;
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // 清空现有数据
        persons = [];
        expenses = [];
        currentStep = 1;
        activityName = '';
        
        // 生成新的会话ID
        sessionId = generateSessionId();
        
        // 更新URL
        const newUrl = `${window.location.pathname}?s=${sessionId}`;
        window.history.pushState({}, '', newUrl);
        
        // 重置所有步骤状态
        resetAllSteps();
    }
    
    const activityNameInput = prompt('请输入活动名称：', '');
    if (activityNameInput === null) {
        return; // 用户取消
    }
    
    if (!activityNameInput.trim()) {
        alert('活动名称不能为空！');
        startNewActivity(); // 重新输入
        return;
    }
    
    // 设置活动名称
    activityName = activityNameInput.trim();
    updateActivityTitle();
    
    // 移除欢迎弹窗（如果存在）
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
        overlay.remove();
    }
    
    // 显示主要内容
    const mainContent = document.querySelector('.max-w-6xl');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // 初始化步骤
    document.getElementById('step1').classList.add('step-active');
    updateStepIndicator(1, 'active');
    initTitleEasterEgg();
    setupEventListeners();
    
    // 保存初始状态
    saveDataToStorage();
}

// 重置所有步骤状态的辅助函数
function resetAllSteps() {
    for(let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step${i}`);
        const content = document.getElementById(`step${i}-content`);
        const arrow = document.getElementById(`step${i}-arrow`);
        const nextButton = document.getElementById(`step${i}-next-wrapper`);
        
        // 清除所有状态类
        step.classList.remove('step-completed', 'step-active', 'collapsed');
        content.classList.add('hidden');
        arrow.classList.remove('fa-chevron-up');
        arrow.classList.add('fa-chevron-down');
        
        // 隐藏下一步按钮
        if (nextButton) {
            nextButton.classList.add('hidden');
        }
        
        // 第一步除外
        if (i !== 1) {
            step.classList.add('collapsed');
        }
    }
    
    // 重置进度指示器
    updateStepIndicator(1, 'active');
    for(let i = 2; i <= 3; i++) {
        const indicator = document.getElementById(`step${i}-indicator`);
        if (indicator) {
            const circle = indicator.querySelector('div');
            const text = indicator.querySelector('span');
            circle.classList.remove('bg-blue-600', 'bg-green-600', 'text-white');
            circle.classList.add('bg-gray-300', 'text-gray-600');
            circle.innerHTML = i;
            text.classList.remove('text-gray-800', 'text-green-600');
            text.classList.add('text-gray-500');
            
            // 重置进度条
            const progress = document.getElementById(`progress${i-1}`);
            if (progress) {
                progress.classList.remove('progress-active');
            }
        }
    }
    
    // 更新所有UI
    updateAllUI();
}

// 显示历史活动
function showActivityHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('activityHistory') || '[]');
        
        if (history.length === 0) {
            alert('暂无历史活动记录');
            return;
        }
        
        // 创建历史活动选择弹窗
        const overlay = document.querySelector('.fixed.inset-0');
        overlay.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl mx-4 p-6">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        <i class="fas fa-history mr-2 text-blue-600"></i>
                        历史活动
                    </h2>
                    <button onclick="closeActivityHistory()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-3 max-h-96 overflow-y-auto">
                    ${history.map(activity => `
                        <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg text-gray-800 mb-1">${activity.name}</h3>
                                    <div class="text-sm text-gray-600 mb-2">
                                        <i class="fas fa-users mr-1"></i>${activity.summary.personCount}人 
                                        <i class="fas fa-receipt ml-3 mr-1"></i>${activity.summary.expenseCount}笔费用
                                        <i class="fas fa-yen-sign ml-3 mr-1"></i>￥${activity.summary.totalAmount.toFixed(2)}
                                    </div>
                                    <div class="text-xs text-gray-500">
                                        <i class="fas fa-clock mr-1"></i>
                                        ${new Date(activity.timestamp).toLocaleString('zh-CN')}
                                    </div>
                                </div>
                                <button onclick="loadActivity('${activity.id}')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                                    查看详情
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mt-6 text-center">
                    <button onclick="startNewActivity()" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-plus mr-2"></i>
                        新建活动
                    </button>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('加载历史活动失败:', error);
        alert('加载历史活动失败，请重试');
    }
}

// 关闭历史活动弹窗
function closeActivityHistory() {
    // 移除当前弹窗
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
        overlay.remove();
    }
    
    // 回到欢迎弹窗
    showWelcomeDialog();
}

// 加载指定活动
function loadActivity(activityId) {
    try {
        const history = JSON.parse(localStorage.getItem('activityHistory') || '[]');
        const activity = history.find(item => item.id === activityId);
        
        if (!activity) {
            alert('活动数据不存在');
            return;
        }
        
        // 设置会话ID和数据
        sessionId = activityId;
        persons = activity.persons || [];
        expenses = activity.expenses || [];
        activityName = activity.name || '';
        
        // 更新URL
        const newUrl = `${window.location.pathname}?s=${sessionId}`;
        window.history.pushState({}, '', newUrl);
        
        // 移除弹窗
        const overlay = document.querySelector('.fixed.inset-0');
        if (overlay) {
            overlay.remove();
        }
        
        // 显示主要内容
        const mainContent = document.querySelector('.max-w-6xl');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
        
        // 更新标题和UI
        updateActivityTitle();
        initializeSteps();
        updateAllUI();
        
    } catch (error) {
        console.error('加载活动失败:', error);
        alert('加载活动失败，请重试');
    }
}

// 创建新会话
function createNewSession() {
    if (confirm('确定要创建新的计算任务吗？\n\n这将开启一个全新的计算会话，当前数据仍会保留在原链接中。')) {
        // 生成新的会话ID
        sessionId = generateSessionId();
        
        // 清空当前数据
        persons = [];
        expenses = [];
        currentStep = 1;
        
        // 更新URL到新会话
        const newUrl = `${window.location.pathname}?s=${sessionId}`;
        window.history.pushState({}, '', newUrl);
        
        // 重置所有步骤状态
        for(let i = 1; i <= 3; i++) {
            const step = document.getElementById(`step${i}`);
            const content = document.getElementById(`step${i}-content`);
            const arrow = document.getElementById(`step${i}-arrow`);
            const nextButton = document.getElementById(`step${i}-next-wrapper`);
            
            // 清除所有状态类
            step.classList.remove('step-completed', 'step-active', 'collapsed');
            content.classList.add('hidden');
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
            
            // 隐藏下一步按钮
            if (nextButton) {
                nextButton.classList.add('hidden');
            }
            
            // 第一步除外
            if (i !== 1) {
                step.classList.add('collapsed');
            }
        }
        
        // 设置第一步为活动状态
        const step1 = document.getElementById('step1');
        const step1Content = document.getElementById('step1-content');
        const step1Arrow = document.getElementById('step1-arrow');
        const step1NextButton = document.getElementById('step1-next-wrapper');
        
        step1.classList.add('step-active');
        step1Content.classList.remove('hidden');
        step1Arrow.classList.remove('fa-chevron-down');
        step1Arrow.classList.add('fa-chevron-up');
        
        // 显示第一步的按钮
        if (step1NextButton) {
            step1NextButton.classList.remove('hidden');
        }
        
        // 重置进度指示器
        updateStepIndicator(1, 'active');
        for(let i = 2; i <= 3; i++) {
            const indicator = document.getElementById(`step${i}-indicator`);
            if (indicator) {
                const circle = indicator.querySelector('div');
                const text = indicator.querySelector('span');
                circle.classList.remove('bg-blue-600', 'bg-green-600', 'text-white');
                circle.classList.add('bg-gray-300', 'text-gray-600');
                circle.innerHTML = i;
                text.classList.remove('text-gray-800', 'text-green-600');
                text.classList.add('text-gray-500');
                
                // 重置进度条
                const progress = document.getElementById(`progress${i-1}`);
                if (progress) {
                    progress.classList.remove('progress-active');
                }
            }
        }
        
        // 更新UI
        updateAllUI();
        
        alert('🎉 新的计算任务已创建！\n\n现在您可以开始添加新的参与人员和费用记录。每个计算任务都有独立的数据空间，互不干扰。');
    }
}

// 分享和数据管理功能
function shareData() {
    try {
        console.log('开始分享功能...', { 
            persons: persons.length, 
            expenses: expenses.length,
            userAgent: navigator.userAgent 
        });
        
        if (persons.length === 0 && expenses.length === 0) {
            alert('暂无数据可分享！请先添加参与人员和费用记录。');
            return;
        }
        
        const shareUrl = generateShareableLink();
        console.log('生成分享链接:', shareUrl);
        
        // 检测是否在微信环境中
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        console.log('是否微信环境:', isWeChat);
        
        if (isWeChat) {
            // 微信环境：直接复制链接，不使用原生分享
            handleWeChatShare(shareUrl);
        } else if (navigator.share && !isWeChat) {
            // 非微信环境才使用原生分享
            console.log('尝试使用原生分享API...');
            navigator.share({
                title: '智能费用均摊计算器',
                text: '一起来填写费用信息，智能计算转账方案！',
                url: shareUrl
            }).then(() => {
                console.log('原生分享成功');
            }).catch((error) => {
                console.log('原生分享失败，降级到复制链接:', error);
                // 原生分享失败，降级到复制链接
                copyToClipboard(shareUrl);
            });
        } else {
            // 其他情况：复制到剪贴板
            console.log('使用剪贴板复制...');
            copyToClipboard(shareUrl);
        }
        
    } catch (error) {
        console.error('分享功能出错:', error);
        alert('分享功能遇到问题，请刷新页面后重试。\n\n错误信息: ' + error.message);
    }
}

// 处理微信分享
function handleWeChatShare(shareUrl) {
    console.log('处理微信分享...');
    
    // 尝试触发微信的原生分享面板
    if (tryWeChatNativeShare(shareUrl)) {
        return;
    }
    
    // 如果原生分享不可用，使用降级方案
    fallbackWeChatShare(shareUrl);
}

// 尝试触发微信原生分享
function tryWeChatNativeShare(shareUrl) {
    try {
        // 设置页面标题和描述用于微信分享
        const originalTitle = document.title;
        const shareTitle = activityName ? `${activityName} - 费用均摊` : '智能费用均摊计算器';
        document.title = shareTitle;
        
        // 添加页面描述
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = '一起来填写费用信息，智能计算转账方案！';
        
        // 检测是否在微信内置浏览器中
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        
        if (isWeChat) {
            // 尝试使用微信的自定义分享协议
            const wechatShareUrl = `weixin://dl/moments?text=${encodeURIComponent(shareTitle + ' - ' + shareUrl)}`;
            
            // 创建一个隐藏的链接来尝试打开微信分享
            const link = document.createElement('a');
            link.href = wechatShareUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            try {
                link.click();
                document.body.removeChild(link);
                
                // 提示用户点击右上角分享
                setTimeout(() => {
                    alert('✅ 微信分享已准备就绪！\n\n📱 操作步骤：\n1. 点击右上角的 "..." 按钮\n2. 选择 "发送给朋友" 或 "分享到朋友圈"\n3. 朋友打开链接就能查看数据');
                }, 500);
                
                return true;
            } catch (e) {
                console.log('微信自定义协议失败:', e);
                document.body.removeChild(link);
            }
        }
        
        // 恢复原标题
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
        
        return false;
    } catch (error) {
        console.log('微信原生分享尝试失败:', error);
        return false;
    }
}

// 微信分享降级方案
function fallbackWeChatShare(shareUrl) {
    // 优先提示用户使用右上角菜单分享
    alert('📱 微信分享提示\n\n方法一（推荐）：\n1. 点击右上角 "..." 按钮\n2. 选择 "发送给朋友" 或 "分享到朋友圈"\n3. 系统会自动分享当前页面\n\n方法二（备用）：\n点击确定后复制链接手动分享');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            console.log('微信环境复制成功');
            alert('✅ 分享链接已复制成功！\n\n📱 在微信中分享步骤：\n1. 打开要分享的聊天窗口\n2. 长按输入框粘贴链接\n3. 发送给朋友\n\n💡 朋友打开链接就能看到数据并协作编辑！');
        }).catch((error) => {
            console.log('微信环境复制失败:', error);
            showShareDialog(shareUrl);
        });
    } else {
        console.log('微信环境无剪贴板API，使用对话框');
        showShareDialog(shareUrl);
    }
}

function copyToClipboard(shareUrl) {
    console.log('尝试复制到剪贴板...');
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            console.log('剪贴板复制成功');
            alert('✅ 分享链接已复制到剪贴板！\n\n发送给朋友后，他们打开链接就能看到已填写的数据，并可以继续编辑。\n\n💡 每次分享都会创建独立的数据空间，多人可同时使用不同的计算任务。');
        }).catch((error) => {
            console.log('剪贴板复制失败，使用对话框:', error);
            showShareDialog(shareUrl);
        });
    } else {
        console.log('不支持剪贴板API，使用对话框');
        showShareDialog(shareUrl);
    }
}

function showShareDialog(shareUrl) {
    console.log('显示分享对话框');
    
    // 创建一个更友好的分享对话框
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // 手机端使用更明确的提示
        const message = isWeChat ? 
            '📱 微信分享步骤：\n\n1. 复制下方链接\n2. 打开要分享的聊天窗口\n3. 长按输入框粘贴\n4. 发送给朋友\n\n链接：' : 
            '📱 请复制下方链接分享给朋友：\n\n长按链接可选择复制\n\n链接：';
        
        const result = prompt(message, shareUrl);
        if (result !== null) {
            alert('✅ 链接已准备好分享！\n\n朋友打开链接就能看到数据并一起编辑。');
        }
    } else {
        // 桌面端使用简洁提示
        const message = isWeChat ? 
            '📱 请复制下方链接在微信中分享：\n\n(长按链接可选择复制)' : 
            '请复制下方链接分享给朋友：';
        
        const result = prompt(message, shareUrl);
        if (result) {
            alert('✅ 链接已准备好分享！\n\n朋友打开链接就能看到数据并一起编辑。');
        }
    }
}

function clearAllData() {
    const currentActivityText = activityName ? `"${activityName}"活动的` : '';
    if (confirm(`确定要清空${currentActivityText}所有数据吗？\n\n注意：活动名称将保留，但人员和费用数据将被清空。这个操作无法撤销。`)) {
        clearStoredData();
        
        // 重置所有步骤状态
        for(let i = 1; i <= 3; i++) {
            const step = document.getElementById(`step${i}`);
            const content = document.getElementById(`step${i}-content`);
            const arrow = document.getElementById(`step${i}-arrow`);
            
            // 清除所有状态类
            step.classList.remove('step-completed', 'step-active', 'collapsed');
            content.classList.add('hidden');
            arrow.classList.remove('fa-chevron-up');
            arrow.classList.add('fa-chevron-down');
            
            // 第一步除外
            if (i !== 1) {
                step.classList.add('collapsed');
            }
        }
        
        // 设置第一步为活动状态
        const step1 = document.getElementById('step1');
        const step1Content = document.getElementById('step1-content');
        const step1Arrow = document.getElementById('step1-arrow');
        const step1NextButton = document.getElementById('step1-next-wrapper');
        
        step1.classList.add('step-active');
        step1Content.classList.remove('hidden');
        step1Arrow.classList.remove('fa-chevron-down');
        step1Arrow.classList.add('fa-chevron-up');
        
        // 显示第一步的按钮
        if (step1NextButton) {
            step1NextButton.classList.remove('hidden');
        }
        
        // 重置进度指示器
        updateStepIndicator(1, 'active');
        for(let i = 2; i <= 3; i++) {
            const indicator = document.getElementById(`step${i}-indicator`);
            if (indicator) {
                const circle = indicator.querySelector('div');
                const text = indicator.querySelector('span');
                circle.classList.remove('bg-blue-600', 'bg-green-600', 'text-white');
                circle.classList.add('bg-gray-300', 'text-gray-600');
                circle.innerHTML = i;
                text.classList.remove('text-gray-800', 'text-green-600');
                text.classList.add('text-gray-500');
                
                // 重置进度条
                const progress = document.getElementById(`progress${i-1}`);
                if (progress) {
                    progress.classList.remove('progress-active');
                }
            }
        }
        
        currentStep = 1;
        
        // 保存清空后的状态（保留活动名称）
        saveDataToStorage();
        
        alert('数据已清空！活动名称已保留。');
    }
}

// 存储管理界面
function showStorageManager() {
    try {
        const allKeys = Object.keys(localStorage);
        const appKeys = allKeys.filter(key => key.startsWith('expenseSplitterData_'));
        
        // 计算总存储大小
        let totalSize = 0;
        appKeys.forEach(key => {
            totalSize += localStorage.getItem(key).length;
        });
        
        const sizeInKB = Math.round(totalSize / 1024);
        
        // 计算整个localStorage的使用情况
        let allSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                allSize += localStorage[key].length + key.length;
            }
        }
        const allSizeInMB = (allSize / (1024 * 1024)).toFixed(2);
        
        const statusIcon = appKeys.length > 10 ? '⚠️' : '✅';
        const statusText = appKeys.length > 10 ? '建议定期清理旧数据以保持最佳性能' : '存储使用情况良好';
        
        const message = `📊 存储管理器\n\n🔢 计算会话数量: ${appKeys.length}个\n💾 应用数据大小: ${sizeInKB}KB\n🗄️ 浏览器总存储: ${allSizeInMB}MB\n\n${statusIcon} ${statusText}\n\n是否清理7天前的旧数据？\n(当前正在使用的会话不会被删除)`;

        if (confirm(message)) {
            // 用户选择确定，执行清理
            cleanOldSessions();
        }
        
    } catch (error) {
        alert('🚫 获取存储信息失败: ' + error.message);
        console.error('Storage manager error:', error);
    }
}

// 原loadExample函数已被三击标题的彩蛋功能替代 