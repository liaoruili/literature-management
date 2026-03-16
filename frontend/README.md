# 前端快速启动指南

## 🚀 启动步骤

### 1. 确保后端已启动

```bash
# 在另一个终端启动后端
cd ../backend
uvicorn app.main:app --reload
```

访问 http://localhost:8000/docs 确认后端正常运行

### 2. 安装前端依赖

```bash
cd /home/liaoruili/lingma_projects/literature_v1/frontend

# 使用 npm
npm install

# 或使用 yarn
yarn install

# 或使用 pnpm
pnpm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，确保：
```
VITE_API_URL=http://localhost:8000/api/v1
```

### 4. 启动开发服务器

```bash
npm run dev
```

你会看到输出：
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 5. 打开浏览器

访问：**http://localhost:3000**

---

## 📱 功能说明

### 首页 - 文献列表
- 显示所有文献卡片
- 每篇文献显示：标题、作者、期刊、年份、关键词
- 点击卡片进入详情页

### 文献详情页
- 完整文献信息
- BibTeX 引用格式（点击"查看 BibTeX"）
- DOI 链接（跳转到出版社）
- PDF 下载链接（如果已上传）
- JEL 分类号标签

---

## 🛠️ 常见问题

### Q: 页面显示"加载失败"？

**A:** 检查后端是否启动
```bash
curl http://localhost:8000/health
```

应该返回：`{"status":"healthy","version":"0.1.0"}`

### Q: 端口被占用？

**A:** 修改 `vite.config.ts` 中的端口
```typescript
server: {
  port: 3001, // 改为其他端口
}
```

### Q: API 请求失败？

**A:** 检查 `.env` 文件中的 `VITE_API_URL` 是否正确

---

## 📦 构建生产版本

```bash
npm run build
npm run preview
```

---

## 🎨 下一步优化

当前是基础版本，可以添加：
- [ ] 添加文献表单
- [ ] 笔记编辑器
- [ ] 搜索功能
- [ ] PDF 上传功能
- [ ] 文献统计图表
