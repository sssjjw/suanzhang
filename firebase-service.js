// Firebase实时协作服务
// 使用Firebase v9兼容性API
import firebaseConfig from './firebase-config.js';

class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.currentSessionId = null;
        this.unsubscribe = null;
        this.isOnline = navigator.onLine;
        this.pendingChanges = [];
        this.lastSyncTime = null;
        
        this.setupOnlineStatusListener();
    }

    // 初始化Firebase
    async initialize() {
        try {
            this.app = firebase.initializeApp(firebaseConfig);
            this.db = firebase.firestore();
            console.log('✅ Firebase初始化成功');
            return true;
        } catch (error) {
            console.error('❌ Firebase初始化失败:', error);
            return false;
        }
    }

    // 检查Firebase是否已配置
    isConfigured() {
        return firebaseConfig.apiKey !== "YOUR_API_KEY";
    }

    // 创建新的协作会话
    async createSession(sessionData) {
        if (!this.db || !this.isConfigured()) {
            console.warn('Firebase未配置，使用本地存储');
            return null;
        }

        try {
            const sessionRef = this.db.collection('sessions').doc(sessionData.sessionId);
            const data = {
                ...sessionData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                collaborators: [sessionData.creatorId || 'anonymous'],
                version: 1
            };
            
            await sessionRef.set(data);
            console.log('✅ 协作会话创建成功:', sessionData.sessionId);
            return sessionData.sessionId;
        } catch (error) {
            console.error('❌ 创建会话失败:', error);
            return null;
        }
    }

    // 加入现有会话
    async joinSession(sessionId, userId = 'anonymous') {
        if (!this.db || !this.isConfigured()) {
            console.warn('Firebase未配置，使用本地存储');
            return null;
        }

        try {
            const sessionRef = this.db.collection('sessions').doc(sessionId);
            const sessionDoc = await sessionRef.get();
            
            if (sessionDoc.exists) {
                // 添加用户到协作者列表
                await sessionRef.update({
                    collaborators: firebase.firestore.FieldValue.arrayUnion(userId),
                    lastModified: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ 成功加入会话:', sessionId);
                return sessionDoc.data();
            } else {
                console.warn('⚠️ 会话不存在:', sessionId);
                return null;
            }
        } catch (error) {
            console.error('❌ 加入会话失败:', error);
            return null;
        }
    }

    // 订阅会话数据变更
    subscribeToSession(sessionId, callback) {
        if (!this.db || !this.isConfigured()) {
            console.warn('Firebase未配置，无法实时同步');
            return null;
        }

        // 取消之前的订阅
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        this.currentSessionId = sessionId;
        const sessionRef = this.db.collection('sessions').doc(sessionId);
        
        this.unsubscribe = sessionRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data();
                this.lastSyncTime = new Date();
                console.log('🔄 接收到数据更新:', data.version);
                callback(data);
            }
        }, (error) => {
            console.error('❌ 实时同步错误:', error);
        });

        return this.unsubscribe;
    }

    // 更新会话数据
    async updateSession(sessionId, updates, userId = 'anonymous') {
        if (!this.db || !this.isConfigured()) {
            console.warn('Firebase未配置，数据仅保存在本地');
            return false;
        }

        if (!this.isOnline) {
            console.warn('⚠️ 离线状态，添加到待同步队列');
            this.pendingChanges.push({ sessionId, updates, userId, timestamp: Date.now() });
            return false;
        }

        try {
            const sessionRef = this.db.collection('sessions').doc(sessionId);
            const sessionDoc = await sessionRef.get();
            const currentVersion = sessionDoc.exists ? sessionDoc.data().version : 0;
            
            const updateData = {
                ...updates,
                lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                lastModifiedBy: userId,
                version: currentVersion + 1
            };
            
            await sessionRef.update(updateData);
            console.log('✅ 数据更新成功');
            return true;
        } catch (error) {
            console.error('❌ 更新失败:', error);
            return false;
        }
    }

    // 删除会话
    async deleteSession(sessionId) {
        if (!this.db || !this.isConfigured()) {
            return false;
        }

        try {
            await this.db.collection('sessions').doc(sessionId).delete();
            console.log('✅ 会话删除成功');
            return true;
        } catch (error) {
            console.error('❌ 删除会话失败:', error);
            return false;
        }
    }

    // 取消订阅
    unsubscribeFromSession() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            this.currentSessionId = null;
            console.log('📡 已取消实时同步');
        }
    }

    // 网络状态监听
    setupOnlineStatusListener() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('🌐 网络已连接，准备同步待处理更改');
            this.syncPendingChanges();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('📴 网络已断开，将缓存更改');
        });
    }

    // 同步待处理的更改
    async syncPendingChanges() {
        if (this.pendingChanges.length === 0) return;

        console.log(`🔄 开始同步 ${this.pendingChanges.length} 个待处理更改`);
        
        for (const change of this.pendingChanges) {
            try {
                await this.updateSession(change.sessionId, change.updates, change.userId);
            } catch (error) {
                console.error('同步更改失败:', error);
                break; // 停止同步，保留剩余更改
            }
        }

        this.pendingChanges = [];
        console.log('✅ 所有待处理更改已同步');
    }

    // 获取连接状态
    getStatus() {
        return {
            isConfigured: this.isConfigured(),
            isOnline: this.isOnline,
            isConnected: this.db !== null,
            currentSession: this.currentSessionId,
            pendingChanges: this.pendingChanges.length,
            lastSync: this.lastSyncTime
        };
    }
}

// 创建全局实例
const firebaseService = new FirebaseService();

export default firebaseService; 