# Literature Database - 学术期刊数据库系统

一个基于 FastAPI + React 的学术期刊文献管理系统，支持元数据自动抓取、PDF 管理、笔记功能和引用追踪。

## 🎯 项目目标

为经济学研究者提供一个本地化的期刊文献数据库解决方案：

- 📚 **文献管理** - 存储和管理学术论文元数据（BibTeX 格式）
- 🔍 **自动抓取** - 从期刊网站自动获取元数据
- 📝 **笔记系统** - Markdown 格式的读书笔记
- 📊 **引用追踪** - 定期自动更新引用数
- 🤖 **AI 助手** - 提供 API 供 AI 助手撰写笔记和查找文献
- 📄 **LaTeX 集成** - 直接导出 BibTeX 引用

## 🏗️ 系统架构

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│    Nginx     │────▶│  FastAPI    │
│  Frontend   │     │  Reverse Proxy│    │   Backend   │
└─────────────┘     └──────────────┘     └─────────────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                 ┌────────────┐      ┌────────────┐      ┌────────────┐
                 │ PostgreSQL │      │   Redis    │      │   Celery   │
                 │  Database  │      │   Cache    │      │   Tasks    │
                 └────────────┘      └────────────┘      └────────────┘
```

## 🛠️ 技术栈

### 后端
- **框架**: FastAPI 0.115+
- **数据库**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0 (async)
- **迁移**: Alembic
- **任务队列**: Celery + Redis
- **包管理**: UV
- **PDF 处理**: PyMuPDF
- **爬虫**: Playwright + BeautifulSoup

### 前端 (已完成)
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: TailwindCSS
- **状态管理**: React Query (@tanstack/react-query)
- **路由**: React Router v6
- **图标**: Lucide React

### 部署
- **Web 服务器**: Nginx
- **ASGI 服务器**: Gunicorn + Uvicorn
- **容器化**: Docker + Docker Compose
- **SSL**: Let's Encrypt

## 📦 项目结构

```
literature_v1/
├── backend/                    # 后端代码
│   ├── app/
│   │   ├── api/v1/            # API 路由
│   │   ├── models/            # SQLAlchemy 模型
│   │   ├── schemas/           # Pydantic 模型
│   │   ├── services/          # 业务逻辑
│   │   ├── tasks/             # Celery 任务
│   │   ├── main.py            # FastAPI 入口
│   │   ├── config.py          # 配置管理
│   │   └── database.py        # 数据库连接
│   ├── alembic/               # 数据库迁移
│   ├── scripts/               # 工具脚本
│   ├── tests/                 # 测试用例
│   └── pyproject.toml         # 依赖管理
├── frontend/                  # 前端代码
│   ├── src/
│   │   ├── components/        # React 组件
│   │   ├── pages/             # 页面组件
│   │   ├── services/          # API 服务
│   │   ├── hooks/             # 自定义 Hooks
│   │   └── App.tsx            # 应用入口
│   └── package.json           # Node 依赖
├── docker/                    # Docker 配置
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── nginx/                     # Nginx 配置
│   └── nginx.conf
├── scripts/                   # 部署脚本
│   ├── deploy.sh
│   └── backup_db.sh
└── docs/                      # 文档
```

## 🚀 快速开始

### 环境要求

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- UV 包管理器
- Node.js 20+ (前端开发)

### 1. 安装依赖

```bash
cd backend
uv sync
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库密码等配置
```

### 3. 初始化数据库

```bash
# 创建数据库
createdb literature_db

# 运行迁移
alembic upgrade head

# 验证安装
python scripts/init_db.py
```

### 4. 启动开发服务器

```bash
# 后端
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Celery Worker (另开终端)
celery -A app.tasks.celery_app worker --loglevel=info

# Celery Beat (定时任务，另开终端)
celery -A app.tasks.celery_app beat --loglevel=info
```

### 5. 启动前端开发服务器（可选）

```bash
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 6. 访问 API 文档

打开浏览器访问：http://localhost:8000/docs

## 📡 API 接口

### 文献管理
- `POST /api/v1/papers` - 创建文献
- `GET /api/v1/papers` - 获取文献列表
- `GET /api/v1/papers/{id}` - 获取文献详情
- `PUT /api/v1/papers/{id}` - 更新文献
- `DELETE /api/v1/papers/{id}` - 删除文献
- `GET /api/v1/papers/{id}/bib` - 导出 BibTeX
- `POST /api/v1/papers/{id}/pdf` - 上传 PDF
- `GET /api/v1/papers/{id}/pdf` - 下载 PDF

### 笔记管理
- `POST /api/v1/papers/{id}/notes` - 创建笔记
- `GET /api/v1/papers/{id}/notes` - 获取笔记列表
- `GET /api/v1/notes/{id}` - 获取笔记详情
- `PUT /api/v1/notes/{id}` - 更新笔记
- `DELETE /api/v1/notes/{id}` - 删除笔记

### 搜索
- `GET /api/v1/search?q=query` - 全文搜索
- `GET /api/v1/search/advanced` - 高级搜索

### 期刊管理
- `POST /api/v1/journals` - 添加期刊
- `GET /api/v1/journals` - 获取期刊列表
- `POST /api/v1/journals/scrape` - 触发元数据抓取

### 引用管理
- `POST /api/v1/citations/update` - 更新引用数
- `GET /api/v1/citations/papers/{id}` - 获取引用记录
- `GET /api/v1/citations/papers/{id}/metrics` - 获取引用指标

### 任务管理
- `GET /api/v1/tasks` - 获取任务列表
- `GET /api/v1/tasks/{id}` - 获取任务详情
- `GET /api/v1/tasks/{id}/status` - 获取任务状态

## 💾 数据库 Schema

### 核心表

- **papers** - 文献元数据（UUID 主键，JSONB 字段存储作者、关键词、JEL 代码）
- **notes** - 读书笔记（Markdown 格式，支持 AI 生成标记）
- **journals** - 期刊信息（自动更新配置）
- **citations** - 引用记录（追踪引用历史）
- **tasks** - 后台任务（Celery 任务状态追踪）

详细 Schema 请查看 `backend/alembic/versions/20260316_0000_initial_schema.py`

## 📦 Docker 部署

### 使用 Docker Compose

```bash
cd docker
docker-compose up -d
```

服务端口：
- PostgreSQL: 5432
- Redis: 6379
- Backend API: 8000
- (Frontend: 3000 - 可选)

### 生产环境部署

1. 配置 `.env` 文件
2. 修改 `nginx/nginx.conf` 中的域名
3. 运行部署脚本：

```bash
sudo bash scripts/deploy.sh
```

## 🔧 开发指南

### 数据库迁移

```bash
# 创建新迁移
alembic revision --autogenerate -m "描述变更"

# 应用迁移
alembic upgrade head

# 回滚
alembic downgrade -1
```

### 运行测试

```bash
pytest --cov=app tests/
```

### 代码格式化

```bash
black app/ tests/
ruff check app/ tests/
```

## 📝 BibTeX 格式示例

```bibtex
@article{smith2024aer,
  author = {Smith, John and Doe, Jane},
  title = {Economic Growth and Innovation},
  journal = {American Economic Review},
  year = {2024},
  volume = {114},
  number = {3},
  pages = {123--456},
  doi = {10.1257/aer.20240001},
  keywords = {growth, innovation, R\&D},
  jelcodes = {O30, O40},
  abstract = {This paper studies...},
}
```

## 🤖 AI 助手集成

### 查找文献

```python
import httpx

async def search_papers(query: str, jel_code: str = None):
    async with httpx.AsyncClient() as client:
        params = {"q": query}
        if jel_code:
            params["jel"] = jel_code
        response = await client.get(
            "http://localhost:8000/api/v1/search",
            params=params
        )
        return response.json()
```

### 创建笔记

```python
async def create_note(paper_id: str, content: str, tags: list[str]):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"http://localhost:8000/api/v1/papers/{paper_id}/notes",
            json={"content": content, "tags": tags}
        )
        return response.json()
```

### 获取文献上下文

```python
async def get_paper_context(paper_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:8000/api/v1/papers/{paper_id}"
        )
        return response.json()
```

## 🔐 安全建议

1. **修改默认密钥** - 在 `.env` 中设置强随机 `SECRET_KEY`
2. **数据库密码** - 使用强密码，不要使用默认值
3. **HTTPS** - 生产环境必须启用 SSL
4. **防火墙** - 仅开放必要端口（80, 443）
5. **定期备份** - 使用 `scripts/backup_db.sh` 定期备份数据库
6. **更新依赖** - 定期运行 `uv sync --upgrade`

## 📊 性能优化

1. **数据库索引** - 已为常用查询字段创建索引
2. **连接池** - SQLAlchemy 异步连接池配置
3. **缓存** - Redis 用于 Celery 结果缓存
4. **Gzip** - Nginx 启用压缩
5. **静态资源** - 浏览器缓存策略

## 🐛 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 检查连接
psql -U postgres -d literature_db
```

### Celery 任务不执行

```bash
# 检查 Redis 状态
systemctl status redis

# 查看 Worker 日志
journalctl -u literature-database-celery -f
```

### API 响应慢

```bash
# 查看慢查询
tail -f /var/log/literature-app/error.log

# 检查数据库性能
pg_stat_statements
```

## 📄 License

MIT License

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过 GitHub Issues 联系。
