# 🔥 Firebase实时协作设置指南

## 📋 功能对比

| 功能 | 离线版本 | 实时协作版本 |
|------|----------|-------------|
| 基础费用分摊 | ✅ | ✅ |
| 本地数据保存 | ✅ | ✅ |
| URL静态分享 | ✅ | ✅ |
| **实时多人协作** | ❌ | ✅ |
| **云端数据同步** | ❌ | ✅ |
| **离线缓存** | ❌ | ✅ |
| **协作者状态** | ❌ | ✅ |

## 🚀 快速设置Firebase（5分钟完成）

### 步骤1：创建Firebase项目

1. 访问 [Firebase控制台](https://console.firebase.google.com/)
2. 点击"创建项目"
3. 输入项目名称（如：`suanzhang-collaborative`）
4. 选择是否启用Google Analytics（可选）
5. 点击"创建项目"

### 步骤2：添加Web应用

1. 在项目概览页面，点击"Web"图标（`</>`）
2. 输入应用昵称（如：`费用分摊计算器`）
3. 选择"同时为此应用设置Firebase托管"（可选）
4. 点击"注册应用"
5. **复制配置对象**（重要！）

### 步骤3：启用Firestore数据库

1. 在左侧菜单点击"Firestore Database"
2. 点击"创建数据库"
3. 选择"生产模式"
4. 选择数据库位置（推荐：asia-east1）
5. 点击"创建"

### 步骤4：配置安全规则

在Firestore控制台的"规则"标签页，粘贴以下规则：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允许读写sessions集合
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
  }
}
```

**重要**：生产环境请使用更严格的安全规则！

### 步骤5：更新配置文件

编辑 `firebase-config.js` 文件，替换配置信息：

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...",  // 替换为您的API密钥
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

export default firebaseConfig;
```

### 步骤6：测试功能

1. 刷新页面
2. 控制台应显示：`🚀 加载实时协作版本`
3. 页面状态显示：`已连接到云端数据库 🌟`
4. 添加一些数据并分享链接
5. 在另一个浏览器/设备打开分享链接
6. 修改数据，观察实时同步效果

## 💰 费用说明

### Firebase免费额度（Spark计划）
- **Firestore操作**：每月50,000次读写
- **存储空间**：1GB
- **网络流量**：10GB/月
- **并发连接**：100个

对于个人或小团队使用，免费额度完全足够！

### 预估使用量
- **单次会话**：约20-50次操作
- **活跃用户**：支持数百人同时使用
- **数据存储**：每个会话约1-5KB

## 🛠️ 高级配置

### 生产环境安全规则

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      // 只允许协作者访问
      allow read, write: if request.auth != null ||
        resource.data.collaborators.hasAny([request.auth.uid]);
      
      // 限制会话生命周期（7天）
      allow read, write: if resource.data.createdAt > 
        timestamp.date(timestamp.now().seconds - 604800);
    }
  }
}
```

### 自动清理旧数据

在Firebase控制台设置Cloud Functions（可选）：

```javascript
exports.cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
    );
    
    const query = db.collection('sessions')
      .where('createdAt', '<', cutoff);
    
    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} old sessions`);
  });
```

## 🔧 故障排除

### Firebase未加载
- 检查网络连接
- 验证配置信息是否正确
- 查看浏览器控制台错误信息

### 权限错误
- 确认Firestore规则是否正确设置
- 检查项目ID是否匹配

### 数据不同步
- 检查网络状态
- 验证会话ID是否正确
- 查看控制台同步日志

## 📞 技术支持

如遇问题，请：
1. 查看浏览器控制台错误信息
2. 检查Firebase控制台的使用情况
3. 参考[Firebase文档](https://firebase.google.com/docs/firestore)

---

配置完成后，您就拥有了一个支持实时协作的费用分摊计算器！🎉 