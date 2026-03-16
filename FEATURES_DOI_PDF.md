# DOI 自动填充和 PDF 上传功能说明

## 🎯 新增功能

### 1. DOI 自动填充元信息

通过 DOI（Digital Object Identifier）自动从 Crossref API 获取论文的完整元信息，包括：
- ✅ 标题（Title）
- ✅ 作者列表（Authors）
- ✅ 期刊/会议名称（Journal）
- ✅ 发表年份（Year）
- ✅ 卷号、期号、页码（Volume, Number, Pages）
- ✅ DOI 标识符
- ✅ URL 链接

#### 使用方法

1. 进入"添加文献"页面
2. 在 DOI 输入框中输入 DOI（例如：`10.1038/nature12373`）
3. 点击 DOI 输入框旁边的 **"自动填充"** 按钮（紫色）
4. 系统会自动从 Crossref 获取元信息并填充到表单中
5. 检查并补充缺失的信息（如摘要、关键词等）
6. 点击"保存"完成添加

#### 支持的 DOI 格式

- 标准 DOI：`10.1038/nature12373`
- URL 格式：`https://doi.org/10.1038/nature12373`
- 前缀格式：`doi:10.1038/nature12373`

#### API 端点

```
GET /api/v1/papers/fetch-doi?doi={doi}
```

**响应示例：**
```json
{
  "title": "Nanometre-scale thermometry in a living cell",
  "authors": [
    {"name": "G. Kucsko", "affiliation": null},
    {"name": "P. C. Maurer", "affiliation": null}
  ],
  "journal": "Nature",
  "year": 2013,
  "volume": "500",
  "number": "7460",
  "pages": "54-58",
  "doi": "10.1038/nature12373",
  "url": "https://doi.org/10.1038/nature12373"
}
```

---

### 2. PDF 上传功能

为已有文献上传 PDF 文件，支持在线阅读和管理。

#### 使用方法

1. 创建或编辑文献（必须先保存文献）
2. 进入文献详情页
3. 点击 **"编辑"** 按钮
4. 滚动到页面底部的 **"上传 PDF"** 区域
5. 选择 PDF 文件或拖拽到上传区域
6. 点击 **"上传"** 按钮
7. 上传成功后会显示文件名和大小

#### 支持的格式

- ✅ PDF 格式（.pdf）
- ✅ 最大文件大小：50MB
- ✅ 每个文献仅支持一个 PDF 文件（新上传会覆盖旧的）

#### 文件存储

- **存储路径**: `/data/pdfs/{paper_id}.pdf`
- **文件命名**: 使用文献的 UUID 作为文件名
- **数据库字段**: `pdf_path`, `pdf_uploaded`

#### API 端点

```
POST /api/v1/papers/{paper_id}/pdf
Content-Type: multipart/form-data

Parameters:
- file: PDF 文件

Response:
{
  "id": "uuid",
  "pdf_path": "/data/pdfs/xxx.pdf",
  "pdf_uploaded": true,
  ...
}
```

---

## 🔧 技术实现

### 后端实现

#### 1. DOI 解析服务

**文件**: `backend/app/services/doi_fetcher.py`

```python
class DOIMetadataFetcher:
    """Service for fetching metadata from DOI using Crossref API."""
    
    CROSSREF_API = "https://api.crossref.org/works"
    
    @classmethod
    async def fetch_by_doi(cls, doi: str) -> Optional[Dict[str, Any]]:
        # 清理 DOI 格式
        # 发送 HTTP 请求到 Crossref API
        # 解析返回的 JSON 数据
        # 转换为我们的 schema 格式
```

**特性**:
- 自动清理 DOI 格式（移除前缀、空格等）
- 超时保护（10 秒）
- 错误处理和降级策略
- 支持多种作者姓名格式

#### 2. PDF 上传端点

**文件**: `backend/app/api/v1/papers.py`

```python
@router.post("/{paper_id}/pdf", response_model=PaperResponse)
async def upload_pdf(
    paper_id: uuid.UUID,
    file: Annotated[UploadFile, File()],
    paper: PaperDependency,
    db: DbSession,
) -> Paper:
    # 验证文件类型（必须是 PDF）
    # 保存到指定目录
    # 更新数据库记录
    # 返回更新后的文献信息
```

**特性**:
- 文件类型验证
- 自动创建存储目录
- 事务性数据库更新
- 响应式返回完整数据

### 前端实现

#### 1. DOI 自动填充按钮

**文件**: `frontend/src/pages/PaperForm.tsx`

```tsx
const fetchDoiMutation = useMutation({
  mutationFn: (doi: string) => papersApi.fetchDoi(doi).then((res) => res.data),
  onSuccess: (data) => {
    // 自动填充表单字段
    setFormData({
      ...formData,
      title: data.title,
      authors: data.authors,
      journal: data.journal,
      // ...
    })
    alert('元信息已成功填充！')
  },
  onError: (error: any) => {
    alert('无法通过 DOI 获取元信息：' + error.message)
  },
})
```

**UI 组件**:
```tsx
<div className="flex gap-2">
  <input
    type="text"
    value={formData.doi}
    onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
    className="flex-1 px-3 py-2 border..."
    placeholder="10.1000/xxx"
  />
  <button
    onClick={() => fetchDoiMutation.mutate(formData.doi)}
    disabled={fetchDoiMutation.isPending}
    className="px-4 py-2 bg-purple-600 text-white..."
  >
    <LinkIcon className="h-4 w-4" />
    {fetchDoiMutation.isPending ? '获取中...' : '自动填充'}
  </button>
</div>
```

#### 2. PDF 上传组件

```tsx
const uploadPdfMutation = useMutation({
  mutationFn: ({ id, file }: { id: string; file: File }) => 
    papersApi.uploadPdf(id, file),
  onSuccess: () => {
    alert('PDF 上传成功！')
    setPdfFile(null)
  },
  onError: (error: any) => {
    alert('PDF 上传失败：' + error.message)
  },
})
```

**文件选择器**:
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept=".pdf"
  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
  className="flex-1 text-sm text-gray-600"
/>
<button
  onClick={() => uploadPdfMutation.mutate({ id, file: pdfFile })}
  disabled={!pdfFile}
>
  <FileUp className="h-4 w-4" />
  上传
</button>
```

---

## 📝 使用场景示例

### 场景 1：快速添加已知 DOI 的文献

1. 你有一篇论文的 DOI：`10.1126/science.1234567`
2. 点击"添加文献"
3. 在 DOI 输入框粘贴 DOI
4. 点击"自动填充"
5. 系统自动填充 90% 的字段
6. 手动补充摘要和关键词
7. 点击"保存" ✅

**节省时间**: 从 5 分钟减少到 30 秒！

### 场景 2：批量导入文献 PDF

1. 先创建文献条目（可以用 DOI 快速创建）
2. 进入编辑模式
3. 上传对应的 PDF 文件
4. 系统自动关联 PDF 和元数据
5. 在文献列表中可以看到 📄 图标标识

---

## ⚠️ 注意事项

### DOI 自动填充

1. **网络连接**: 需要能访问 `api.crossref.org`
2. **DOI 有效性**: 确保 DOI 是真实存在的
3. **数据完整性**: 不是所有 DOI 都有完整的元数据
4. **速率限制**: Crossref 有请求频率限制（建议不要短时间内大量请求）

### PDF 上传

1. **文件大小**: 单个文件不超过 50MB
2. **文件格式**: 仅支持 PDF 格式
3. **存储空间**: 注意服务器磁盘空间
4. **备份**: 定期备份 `/data/pdfs/` 目录
5. **权限**: 确保 Docker 容器有写入权限

---

## 🐛 故障排查

### DOI 自动填充失败

**问题**: 点击"自动填充"后提示"无法获取元信息"

**解决方案**:
1. 检查 DOI 是否正确（尝试在 https://doi.org 验证）
2. 检查网络连接（能否访问 api.crossref.org）
3. 查看后端日志：
   ```bash
   docker compose logs backend | grep "doi_fetcher"
   ```
4. 手动测试 API：
   ```bash
   curl "http://172.10.0.100:8001/api/v1/papers/fetch-doi?doi=10.1038/nature12373"
   ```

### PDF 上传失败

**问题**: 上传时提示错误或无响应

**解决方案**:
1. 检查文件大小是否超过 50MB
2. 确认文件是 PDF 格式
3. 检查磁盘空间：
   ```bash
   df -h /data/pdfs
   ```
4. 查看后端日志：
   ```bash
   docker compose logs backend | grep "upload_pdf"
   ```
5. 检查存储目录权限：
   ```bash
   docker compose exec backend ls -la /data/pdfs
   ```

---

## 📊 性能优化建议

### DOI 解析

1. **缓存**: 可以添加 Redis 缓存已查询的 DOI
2. **批量处理**: 对于批量导入，考虑异步任务处理
3. **重试机制**: 网络错误时自动重试

### PDF 存储

1. **CDN**: 大量 PDF 时考虑使用 CDN
2. **压缩**: 上传前自动压缩 PDF
3. **分片上传**: 大文件支持分片上传
4. **去重**: 基于文件 hash 去重

---

## 🔮 未来扩展

1. **PDF 全文提取**: 自动提取 PDF 中的文本和元数据
2. **OCR 支持**: 扫描版 PDF 的文字识别
3. **云存储**: 支持 S3、阿里云 OSS 等对象存储
4. **预览功能**: 在线 PDF 阅读器
5. **版本管理**: PDF 多版本支持
6. **水印**: 自动添加水印

---

## 📞 技术支持

如有问题，请查看：
- API 文档：http://172.10.0.100:8001/docs
- 后端日志：`docker compose logs -f backend`
- 前端控制台：浏览器开发者工具

---

**Literature Database v0.2.0** | DOI Auto-Fill & PDF Upload
