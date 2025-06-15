# 部署指南

## 🚀 推荐方式1：Netlify部署（最简单）

### 准备工作
1. 访问 [netlify.com](https://netlify.com)
2. 注册并登录账户（可用GitHub/Google账户登录）

### 部署步骤
1. **拖拽部署**
   - 将整个项目文件夹压缩成zip文件
   - 或者直接将项目文件夹拖拽到Netlify首页的"Deploy"区域
   - 等待自动部署完成（约1-2分钟）

2. **自定义域名**（可选）
   - 在Netlify面板中点击"Domain settings"
   - 可以修改默认的随机域名为自定义名称
   - 例如：`smart-expense-splitter.netlify.app`

### 优势
- ✅ 完全免费
- ✅ 自动HTTPS
- ✅ 全球CDN加速
- ✅ 自动域名生成

---

## 🚀 方式2：Vercel部署

### 步骤
1. 访问 [vercel.com](https://vercel.com)
2. 注册登录
3. 点击"New Project"
4. 拖拽文件夹或导入代码
5. 点击"Deploy"

---

## 🚀 方式3：GitHub Pages部署

### 准备工作
1. 在GitHub创建新仓库
2. 上传所有文件到仓库

### 部署步骤
1. 进入仓库Settings
2. 找到"Pages"选项
3. 选择"Deploy from a branch"
4. 选择main分支
5. 等待部署完成

### 访问地址
`https://yourusername.github.io/repositoryname`

---

## 📁 文件结构确认

确保以下文件都在项目目录中：
```
├── index.html          # 主页面
├── script.js           # 核心逻辑
├── README.md           # 项目说明
├── netlify.toml        # Netlify配置
├── package.json        # 项目信息
└── DEPLOY.md          # 部署说明
```

## 🔧 本地测试

部署前建议本地测试：
```bash
# 进入项目目录
cd /path/to/your/project

# 启动本地服务器
python3 -m http.server 8000
# 或者使用其他端口
python3 -m http.server 3000

# 访问 http://localhost:8000
```

## 💡 部署后优化建议

1. **自定义域名**：使用自己的域名更专业
2. **添加统计**：可以添加Google Analytics跟踪使用情况
3. **添加收藏图标**：创建favicon.ico文件
4. **SEO优化**：已添加基本的meta标签

## 📞 技术支持

如果部署过程中遇到问题：
1. 检查文件是否完整
2. 确认浏览器控制台没有错误
3. 验证所有文件路径正确

**推荐使用Netlify，部署最简单！** 