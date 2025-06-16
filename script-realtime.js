// 实时协作版本的费用分摊计算器
// 集成Firebase Firestore实现多人协作编辑

// 加载Firebase服务
const firebaseServiceScript = document.createElement('script');
firebaseServiceScript.src = './firebase-service.js';
firebaseServiceScript.onload = function() {
    // Firebase服务加载完成后初始化应用
    initializeApp();
};
document.head.appendChild(firebaseServiceScript);

// 全局变量
let persons = [];
let expenses = [];
let activityName = '';
let sessionId = '';
let currentStep = 1;
let isRealtimeEnabled = false;
let userId = '';
let lastSyncVersion = 0;

// 生成用户ID
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 生成会话ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 初始化应用
async function initializeApp() {
    console.log('🚀 初始化实时协作费用分摊计算器');
    
    // 确保Firebase服务已加载
    if (!window.firebaseService) {
        console.error('❌ Firebase服务未加载');
        return;
    }
    
    // 生成用户ID
    userId = generateUserId();
    console.log('👤 用户ID:', userId);
    
    // 初始化Firebase
    const firebaseInitialized = await window.firebaseService.initialize();
    
    if (firebaseInitialized && window.firebaseService.isConfigured()) {
        isRealtimeEnabled = true;
        console.log('✅ 实时协作功能已启用');
        updateRealtimeStatus('已连接到云端数据库 🌟');
    } else {
        console.log('⚠️ 实时协作功能未启用，使用本地存储');
        updateRealtimeStatus('离线模式 📱');
    }
    
    // 检查URL参数
    checkUrlParams();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 显示欢迎界面或加载数据
    if (persons.length === 0 && expenses.length === 0) {
        showWelcomeDialog();
    } else {
        initializeSteps();
    }
}

// 检查URL参数
async function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('s');
    
    if (urlSessionId) {
        console.log('🔗 检测到会话链接:', urlSessionId);
        await joinCollaborativeSession(urlSessionId);
    } else {
        // 生成新的会话ID
        sessionId = generateSessionId();
        updateUrl();
    }
}

// 加入协作会话
async function joinCollaborativeSession(urlSessionId) {
    if (!isRealtimeEnabled) {
        console.log('⚠️ 实时协作未启用，尝试从URL加载数据');
        loadDataFromURL();
        return;
    }
    
    try {
        updateRealtimeStatus('正在加入协作会话... 🔄');
        
        const sessionData = await window.firebaseService.joinSession(urlSessionId, userId);
        
        if (sessionData) {
            sessionId = urlSessionId;
            persons = sessionData.persons || [];
            expenses = sessionData.expenses || [];
            activityName = sessionData.activityName || '';
            
            console.log('✅ 成功加入协作会话');
            updateRealtimeStatus(`协作会话：${sessionData.collaborators?.length || 1} 人在线 👥`);
            
            // 订阅实时更新
            subscribeToRealtimeUpdates();
            
            // 更新UI
            updateActivityTitle();
            updateAllUI();
            initializeSteps();
            
            // 显示协作提示
            showCollaborationNotice(sessionData.collaborators?.length || 1);
        } else {
            console.log('⚠️ 无法加入会话，创建新会话');
            await createNewCollaborativeSession();
        }
    } catch (error) {
        console.error('❌ 加入会话失败:', error);
        updateRealtimeStatus('连接失败，使用离线模式 📴');
        createNewCollaborativeSession();
    }
}

// 创建新的协作会话
async function createNewCollaborativeSession() {
    if (!isRealtimeEnabled) {
        sessionId = generateSessionId();
        updateUrl();
        return;
    }
    
    try {
        const sessionData = {
            sessionId: sessionId || generateSessionId(),
            activityName: activityName,
            persons: persons,
            expenses: expenses,
            creatorId: userId
        };
        
        const createdSessionId = await window.firebaseService.createSession(sessionData);
        
        if (createdSessionId) {
            sessionId = createdSessionId;
            console.log('✅ 协作会话创建成功');
            updateRealtimeStatus('协作会话已创建 🆕');
            
            // 订阅实时更新
            subscribeToRealtimeUpdates();
            
            // 更新URL
            updateUrl();
        }
    } catch (error) {
        console.error('❌ 创建会话失败:', error);
        updateRealtimeStatus('创建失败，使用离线模式 📴');
    }
}

// 订阅实时更新
function subscribeToRealtimeUpdates() {
    if (!isRealtimeEnabled || !sessionId) return;
    
    window.firebaseService.subscribeToSession(sessionId, (data) => {
        // 避免重复更新（如果是自己的更改）
        if (data.version <= lastSyncVersion) return;
        
        console.log('🔄 收到远程数据更新');
        lastSyncVersion = data.version;
        
        // 更新本地数据
        persons = data.persons || [];
        expenses = data.expenses || [];
        activityName = data.activityName || '';
        
        // 更新UI
        updateActivityTitle();
        updateAllUI();
        
        // 更新协作状态
        updateRealtimeStatus(`协作会话：${data.collaborators?.length || 1} 人在线 👥`);
        
        // 显示同步提示
        showSyncNotification('数据已同步 🔄');
    });
}

// 同步数据到云端
async function syncToFirebase() {
    if (!isRealtimeEnabled || !sessionId) return;
    
    const updates = {
        persons: persons,
        expenses: expenses,
        activityName: activityName
    };
    
    const success = await window.firebaseService.updateSession(sessionId, updates, userId);
    if (success) {
        lastSyncVersion++;
        console.log('✅ 数据同步成功');
    }
}

// 更新实时协作状态显示
function updateRealtimeStatus(message) {
    const statusElement = document.getElementById('realtimeStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `text-xs text-blue-600 mb-2`;
    }
}

// 显示协作通知
function showCollaborationNotice(collaboratorCount) {
    if (collaboratorCount > 1) {
        const message = `🎉 您已加入协作会话！当前有 ${collaboratorCount} 人在线编辑。\n\n💡 提示：所有人的修改都会实时同步，让费用分摊更加便捷！`;
        setTimeout(() => alert(message), 500);
    }
}

// 显示同步通知
function showSyncNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// 更新URL
function updateUrl() {
    const newUrl = `${window.location.pathname}?s=${sessionId}`;
    window.history.replaceState({}, '', newUrl);
}

// 分享功能（支持实时协作）
async function shareCollaborativeSession() {
    if (!isRealtimeEnabled) {
        // 降级到原有的URL分享
        shareData();
        return;
    }
    
    try {
        console.log('🔗 准备分享协作会话');
        
        if (persons.length === 0) {
            alert('暂无数据可分享！请先添加参与人员。');
            return;
        }
        
        // 确保会话已创建
        if (!sessionId || !await window.firebaseService.joinSession(sessionId, userId)) {
            await createNewCollaborativeSession();
        }
        
        // 同步最新数据
        await syncToFirebase();
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?s=${sessionId}`;
        console.log('📎 生成协作分享链接:', shareUrl);
        
        // 检测分享环境
        const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
        
        if (navigator.share && !isWeChat) {
            try {
                await navigator.share({
                    title: '💰 智能费用均摊 - 实时协作',
                    text: `${activityName ? `【${activityName}】` : ''}一起来填写费用信息，实时协作计算转账方案！`,
                    url: shareUrl
                });
                console.log('✅ 原生分享成功');
            } catch (error) {
                copyToClipboard(shareUrl, true);
            }
        } else {
            copyToClipboard(shareUrl, true);
        }
        
    } catch (error) {
        console.error('❌ 分享失败:', error);
        alert('分享功能遇到问题，请稍后重试。');
    }
}

// 复制到剪贴板（协作版本）
function copyToClipboard(shareUrl, isCollaborative = false) {
    const collaborativeText = isCollaborative ? 
        '\n\n🌟 这是一个实时协作链接！所有人的修改都会同步，让费用分摊更加便捷。' : '';
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            const message = `✅ 协作链接已复制到剪贴板！\n\n📱 使用方法：\n1. 将链接发送给朋友\n2. 朋友打开链接即可实时协作\n3. 所有修改都会自动同步${collaborativeText}`;
            alert(message);
        }).catch(() => {
            showShareDialog(shareUrl, isCollaborative);
        });
    } else {
        showShareDialog(shareUrl, isCollaborative);
    }
}

// 显示分享对话框（协作版本）
function showShareDialog(shareUrl, isCollaborative = false) {
    const collaborativeText = isCollaborative ? '\n\n🌟 实时协作链接 - 多人同步编辑' : '';
    const message = `📎 请复制下方协作链接分享给朋友：\n\n长按链接可选择复制${collaborativeText}`;
    
    const result = prompt(message, shareUrl);
    if (result !== null) {
        alert('✅ 链接已准备好分享！朋友打开链接就能实时协作编辑。');
    }
}

// 人员管理（支持实时同步）
async function addPerson() {
    const nameInput = document.getElementById('personName');
    const familyCheckbox = document.getElementById('isFamily');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('请输入姓名');
        return;
    }
    
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
    
    // 更新UI
    updatePersonList();
    updatePayerSelect();
    updateStepSummary();
    
    // 同步到云端
    await syncToFirebase();
    
    // 保存到本地（备份）
    saveDataToStorage();
}

// 费用管理（支持实时同步）
async function addExpense() {
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
        description: description || '费用'
    };
    
    expenses.push(expense);
    amountInput.value = '';
    descInput.value = '';
    payerSelect.value = '';
    
    // 更新UI
    updateExpenseList();
    updateStepSummary();
    
    // 同步到云端
    await syncToFirebase();
    
    // 保存到本地（备份）
    saveDataToStorage();
}

// 删除人员（支持实时同步）
async function removePerson(id) {
    persons = persons.filter(p => p.id !== id);
    expenses = expenses.filter(e => e.payerId !== id);
    
    updatePersonList();
    updatePayerSelect();
    updateExpenseList();
    updateStepSummary();
    
    // 同步到云端
    await syncToFirebase();
    
    saveDataToStorage();
}

// 删除费用（支持实时同步）
async function removeExpense(id) {
    expenses = expenses.filter(e => e.id !== id);
    
    updateExpenseList();
    updateStepSummary();
    
    // 同步到云端
    await syncToFirebase();
    
    saveDataToStorage();
}

// 更新活动名称（支持实时同步）
async function updateActivityName(newName) {
    activityName = newName;
    updateActivityTitle();
    
    // 同步到云端
    await syncToFirebase();
    
    saveDataToStorage();
}

// 清空数据（支持实时同步）
async function clearAllData() {
    const currentActivityText = activityName ? `"${activityName}"活动的` : '';
    if (confirm(`确定要清空${currentActivityText}所有数据吗？\n\n⚠️ 注意：这个操作会影响所有协作者，无法撤销。`)) {
        persons = [];
        expenses = [];
        
        // 重置步骤
        resetAllSteps();
        
        // 同步到云端
        await syncToFirebase();
        
        // 保存到本地
        saveDataToStorage();
        
        alert('数据已清空！');
    }
}

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    window.firebaseService.unsubscribeFromSession();
});

// 导出函数供HTML调用
window.addPerson = addPerson;
window.addExpense = addExpense;
window.removePerson = removePerson;
window.removeExpense = removeExpense;
window.shareData = shareCollaborativeSession;
window.clearAllData = clearAllData;

// 初始化应用
document.addEventListener('DOMContentLoaded', initializeApp); 