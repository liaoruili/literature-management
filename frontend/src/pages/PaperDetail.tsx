import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  BookOpen,
  Tag,
  Calendar,
  FileDigit,
  Quote,
  AlertCircle,
  Users,
  Link2,
  Copy,
  Check,
  RefreshCw,
  Save,
  X
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import PaperNotes from '../components/PaperNotes'
import PaperFiles from '../components/PaperFiles'
import PDFViewer from '../components/PDFViewer'
import { AlertTriangle } from 'lucide-react'

export default function PaperDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    authors: '',
    journal: '',
    year: '',
    volume: '',
    number: '',
    pages: '',
    doi: '',
    abstract: '',
    keywords: '',
  })
  const queryClient = useQueryClient()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const { data: paper, isLoading, error: paperError } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => papersApi.get(id!).then((res) => res.data),
    staleTime: 0, // 允许数据立即被视为过期，以便 invalidateQueries 能正确工作
  })

  const { data: filesData } = useQuery({
    queryKey: ['paper-files', id],
    queryFn: () => papersApi.getFiles(id!).then((res) => res.data),
  })

  const { data: bibtexData } = useQuery({
    queryKey: ['bibtex', id],
    queryFn: () => papersApi.getBibtex(id!).then((res) => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: () => papersApi.delete(id!),
    onSuccess: () => {
      setShowDeleteConfirm(false)
      toast.success('文献已删除', {
        description: '正在返回文献列表...',
        duration: 2000,
      })
      setTimeout(() => navigate('/'), 500)
    },
    onError: (error: any) => {
      toast.error('删除失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })

  const refetchDoiMutation = useMutation({
    mutationFn: async () => {
      // 先获取DOI信息
      const doiResponse = await papersApi.fetchDoi(paper?.doi!)
      // 然后更新文献信息
      await papersApi.update(id!, {
        title: doiResponse.data.title,
        authors: doiResponse.data.authors,
        journal: doiResponse.data.journal,
        year: doiResponse.data.year,
        volume: doiResponse.data.volume,
        number: doiResponse.data.number,
        pages: doiResponse.data.pages,
        abstract: doiResponse.data.abstract,
        keywords: doiResponse.data.keywords,
      })
      return doiResponse.data
    },
    onSuccess: () => {
      toast.success('DOI信息已更新', {
        description: '文献元数据已成功重新拉取',
        duration: 3000,
      })
      // 局部刷新文献数据，不整页重载
      queryClient.invalidateQueries({ queryKey: ['paper', id] })
      queryClient.invalidateQueries({ queryKey: ['bibtex', id] })
    },
    onError: (error: any) => {
      toast.error('拉取DOI信息失败', {
        description: error.response?.data?.detail || '无法获取DOI元数据',
        duration: 4000,
      })
    },
  })

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  // 开始编辑
  const startEditing = () => {
    if (paper) {
      setEditForm({
        title: paper.title || '',
        authors: paper.authors?.map((a: any) => a.name).join(', ') || '',
        journal: paper.journal || '',
        year: paper.year?.toString() || '',
        volume: paper.volume || '',
        number: paper.number || '',
        pages: paper.pages || '',
        doi: paper.doi || '',
        abstract: paper.abstract || '',
        keywords: paper.keywords?.join(', ') || '',
      })
      setIsEditing(true)
    }
  }

  // 保存编辑
  const saveEditMutation = useMutation({
    mutationFn: async () => {
      const authors = editForm.authors.split(',').map(name => ({
        name: name.trim(),
        affiliation: null
      })).filter(a => a.name)

      const keywords = editForm.keywords.split(',').map(k => k.trim()).filter(k => k)

      const response = await papersApi.update(id!, {
        title: editForm.title,
        authors,
        journal: editForm.journal || undefined,
        year: parseInt(editForm.year) || new Date().getFullYear(),
        volume: editForm.volume || undefined,
        number: editForm.number || undefined,
        pages: editForm.pages || undefined,
        doi: editForm.doi || undefined,
        abstract: editForm.abstract || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success('文献信息已更新', {
        description: '更改已成功保存',
        duration: 3000,
      })
      setIsEditing(false)
      // 直接更新缓存，避免重新获取导致的闪烁
      queryClient.setQueryData(['paper', id], data)
      queryClient.invalidateQueries({ queryKey: ['bibtex', id] })
    },
    onError: (error: any) => {
      toast.error('保存失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })



  const copyBibtex = () => {
    if (bibtexData?.bibtex) {
      // 使用传统的复制方法作为备选
      const textArea = document.createElement('textarea')
      textArea.value = bibtexData.bibtex
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)

        if (successful) {
          setCopied(true)
          toast.success('BibTeX 引用已复制到剪贴板', {
            description: '您可以直接粘贴到论文中使用',
            duration: 3000,
          })
          setTimeout(() => setCopied(false), 2000)
        } else {
          throw new Error('execCommand returned false')
        }
      } catch (err) {
        document.body.removeChild(textArea)
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(bibtexData.bibtex).then(() => {
            setCopied(true)
            toast.success('BibTeX 引用已复制到剪贴板', {
              description: '您可以直接粘贴到论文中使用',
              duration: 3000,
            })
            setTimeout(() => setCopied(false), 2000)
          }).catch(() => {
            toast.error('复制失败', {
              description: '请手动复制 BibTeX 内容',
              duration: 3000,
            })
          })
        } else {
          toast.error('复制失败', {
            description: '请手动复制 BibTeX 内容',
            duration: 3000,
          })
        }
      }
    }
  }

  const selectedFile = filesData?.items?.find((f: any) => f.id === selectedFileId)
  const isSelectedFilePdf = selectedFile && (
    selectedFile.file_type?.toLowerCase().includes('pdf') ||
    selectedFile.original_filename?.toLowerCase().endsWith('.pdf')
  )
  const pdfUrl = selectedFile && isSelectedFilePdf
    ? papersApi.getFileDownloadUrl(id!, selectedFileId!)
    : null

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-12 w-12" />
      </div>
    )
  }

  if (paperError) {
    return (
      <div className="empty-state py-20">
        <div className="h-20 w-20 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-rose-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">加载失败</h3>
        <p className="text-slate-500 mb-4">{(paperError as Error).message || '无法加载文献信息'}</p>
        <Link to="/" className="btn-primary mt-4">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </div>
    )
  }

  if (!paper) {
    return (
      <div className="empty-state py-20">
        <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">文献不存在</h3>
        <Link to="/" className="btn-primary mt-4">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="space-y-4 pb-8">
        {/* Top Bar - 仅保留返回按钮 */}
        <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 px-4 py-3 -mx-4 flex items-center justify-between">
          <Link to="/" className="btn-ghost">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
        </div>

        {/* PDF Preview */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
          {pdfUrl ? (
            <div className="h-[60vh]">
              <PDFViewer
                url={pdfUrl}
                filename={selectedFile?.original_filename}
                onClose={() => setSelectedFileId(null)}
              />
            </div>
          ) : (
            <div className="p-4">
              <PaperFiles
                paperId={paper.id}
                selectedFileId={selectedFileId}
                onFileSelect={setSelectedFileId}
                compact={true}
              />
            </div>
          )}
        </div>

        {/* Paper Info */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-6">
          {/* 表单编辑模式 */}
          {isEditing ? (
            /* 表单编辑模式 */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">编辑文献信息</h3>

              {/* 标题 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">标题</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* 作者 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">作者（用逗号分隔）</label>
                <input
                  type="text"
                  value={editForm.authors}
                  onChange={(e) => setEditForm({ ...editForm, authors: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="作者1, 作者2, 作者3"
                />
              </div>

              {/* 期刊和年份 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">期刊</label>
                  <input
                    type="text"
                    value={editForm.journal}
                    onChange={(e) => setEditForm({ ...editForm, journal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">年份</label>
                  <input
                    type="number"
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* 卷、期、页码 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">卷</label>
                  <input
                    type="text"
                    value={editForm.volume}
                    onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">期</label>
                  <input
                    type="text"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">页码</label>
                  <input
                    type="text"
                    value={editForm.pages}
                    onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* DOI */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">DOI</label>
                <input
                  type="text"
                  value={editForm.doi}
                  onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* 关键词 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">关键词（用逗号分隔）</label>
                <input
                  type="text"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="关键词1, 关键词2, 关键词3"
                />
              </div>

              {/* 摘要 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">摘要</label>
                <textarea
                  value={editForm.abstract}
                  onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                  className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              {/* 保存按钮 */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => saveEditMutation.mutate()}
                  disabled={saveEditMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saveEditMutation.isPending ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
              </div>
            </div>
          ) : (
            /* 只读显示模式 */
            <>
              {/* Header - 集成操作按钮 */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="badge-primary">{paper.citation_key}</span>
                  {paper.pdf_uploaded && (
                    <span className="badge-success">
                      <FileText className="h-3 w-3" />
                      有 PDF
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight mb-4">{paper.title}</h1>

            {/* 操作按钮组 */}
            <div className="flex flex-wrap gap-2">
              {!isEditing && (
                <>
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    编辑
                  </button>
                  {paper.doi && (
                    <button
                      onClick={() => refetchDoiMutation.mutate()}
                      disabled={refetchDoiMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refetchDoiMutation.isPending ? 'animate-spin' : ''}`} />
                      {refetchDoiMutation.isPending ? '拉取中...' : '重新拉取DOI'}
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    取消
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Authors */}
          <div className="flex items-start gap-3">
            <Users className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">作者</h3>
              <p className="text-slate-800">{paper.authors?.map((a: any) => a.name).join(', ')}</p>
            </div>
          </div>

          {/* Publication Info */}
          <div className="grid grid-cols-2 gap-4">
            {paper.journal && (
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">期刊</h3>
                  <p className="text-sm text-slate-800">{paper.journal}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">年份</h3>
                <p className="text-sm text-slate-800">{paper.year}</p>
              </div>
            </div>
            {paper.volume && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">卷期</h3>
                <p className="text-sm text-slate-800">
                  {paper.volume}{paper.number && `(${paper.number})`}
                </p>
              </div>
            )}
            {paper.pages && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">页码</h3>
                <p className="text-sm text-slate-800">{paper.pages}</p>
              </div>
            )}
          </div>

          {/* DOI */}
          {paper.doi && (
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">DOI</h3>
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {paper.doi}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Keywords */}
          {(paper.keywords?.length > 0 || paper.jel_codes?.length > 0) && (
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">关键词</h3>
                <div className="flex flex-wrap gap-1.5">
                  {paper.keywords?.map((keyword: string) => (
                    <span key={keyword} className="academic-tag">{keyword}</span>
                  ))}
                  {paper.jel_codes?.map((jel: string) => (
                    <span key={jel} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700">
                      JEL: {jel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Citation Count */}
          <div className="flex items-start gap-3">
            <Quote className="h-5 w-5 text-slate-400 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">引用数</h3>
              <p className="text-sm text-slate-800">{paper.citation_count || 0}</p>
            </div>
          </div>

          {/* Abstract */}
          {paper.abstract && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">摘要</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{paper.abstract}</p>
            </div>
          )}
            </>
          )}

          {/* BibTeX - Copy button only */}
          {bibtexData?.bibtex && (
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-sm font-medium text-slate-700">BibTeX 引用</span>
              <button
                onClick={copyBibtex}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                {copied ? '已复制' : '复制引用'}
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="border-t border-slate-200 pt-6">
            <PaperNotes paperId={paper.id} />
          </div>
        </div>
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="h-full flex flex-col">
      {/* Top Bar - 仅保留返回按钮 */}
      <div className="flex-shrink-0 mb-3">
        <Link to="/" className="btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </Link>
      </div>

      {/* Two Column Layout - 5:3 ratio for better PDF viewing and more right column space */}
      <div className="flex-1 grid grid-cols-[5fr_3fr] gap-4 min-h-0">
        {/* Left Column - PDF Only (Full Height) */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm h-full">
          {pdfUrl ? (
            <PDFViewer
              url={pdfUrl}
              filename={selectedFile?.original_filename}
              onClose={() => setSelectedFileId(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-slate-300" />
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-1">选择 PDF 文件进行预览</p>
                <p className="text-sm text-slate-500">从右侧文件列表中选择一个 PDF 文件</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Paper Info + Files + Notes (Single Scroll) */}
        <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm h-full overflow-y-auto scrollbar-smooth">
          <div className="p-5 space-y-5">
            {/* Header - 集成操作按钮 */}
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="badge-primary">{paper.citation_key}</span>
                {paper.pdf_uploaded && (
                  <span className="badge-success">
                    <FileText className="h-3 w-3" />
                    有 PDF
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-4">{paper.title}</h1>

              {/* 操作按钮组 */}
              <div className="flex flex-wrap gap-2">
                {!isEditing && (
                  <>
                    <button
                      onClick={startEditing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      编辑
                    </button>
                    {paper.doi && (
                      <button
                        onClick={() => refetchDoiMutation.mutate()}
                        disabled={refetchDoiMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${refetchDoiMutation.isPending ? 'animate-spin' : ''}`} />
                        {refetchDoiMutation.isPending ? '拉取中...' : '重新拉取DOI'}
                      </button>
                    )}
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      取消
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 表单编辑模式 - 桌面端 */}
            {isEditing ? (
              /* 表单编辑模式 - 桌面端 */
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900">编辑文献信息</h3>

                {/* 标题 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">标题</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* 作者 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">作者（用逗号分隔）</label>
                  <input
                    type="text"
                    value={editForm.authors}
                    onChange={(e) => setEditForm({ ...editForm, authors: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="作者1, 作者2, 作者3"
                  />
                </div>

                {/* 期刊和年份 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">期刊</label>
                    <input
                      type="text"
                      value={editForm.journal}
                      onChange={(e) => setEditForm({ ...editForm, journal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">年份</label>
                    <input
                      type="number"
                      value={editForm.year}
                      onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* 卷、期、页码 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">卷</label>
                    <input
                      type="text"
                      value={editForm.volume}
                      onChange={(e) => setEditForm({ ...editForm, volume: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">期</label>
                    <input
                      type="text"
                      value={editForm.number}
                      onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">页码</label>
                    <input
                      type="text"
                      value={editForm.pages}
                      onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* DOI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">DOI</label>
                  <input
                    type="text"
                    value={editForm.doi}
                    onChange={(e) => setEditForm({ ...editForm, doi: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* 关键词 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">关键词（用逗号分隔）</label>
                  <input
                    type="text"
                    value={editForm.keywords}
                    onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="关键词1, 关键词2, 关键词3"
                  />
                </div>

                {/* 摘要 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">摘要</label>
                  <textarea
                    value={editForm.abstract}
                    onChange={(e) => setEditForm({ ...editForm, abstract: e.target.value })}
                    className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>

                {/* 保存按钮 */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => saveEditMutation.mutate()}
                    disabled={saveEditMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saveEditMutation.isPending ? '保存中...' : '保存'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="h-4 w-4" />
                    取消
                  </button>
                </div>
              </div>
            ) : (
              /* 只读显示模式 - 桌面端 */
              <>
                {/* Authors */}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">作者</h3>
                    <p className="text-slate-800">{paper.authors?.map((a: any) => a.name).join(', ')}</p>
                  </div>
                </div>

                {/* Journal - Full width display */}
            {paper.journal && (
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  期刊
                </h3>
                <p className="text-base font-semibold text-slate-900 leading-relaxed">{paper.journal}</p>
              </div>
            )}

            {/* Publication Info - Reorganized */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">年份</span>
                <span className="text-sm font-medium text-slate-800">{paper.year}</span>
              </div>
              {paper.volume && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <FileDigit className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500">卷</span>
                  <span className="text-sm font-medium text-slate-800">{paper.volume}</span>
                </div>
              )}
              {paper.number && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">期</span>
                  <span className="text-sm font-medium text-slate-800">{paper.number}</span>
                </div>
              )}
              {paper.pages && (
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">页码</span>
                  <span className="text-sm font-medium text-slate-800">{paper.pages}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <Quote className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">引用</span>
                <span className="text-sm font-medium text-slate-800">{paper.citation_count || 0}</span>
              </div>
            </div>

            {/* DOI */}
            {paper.doi && (
              <div className="flex items-start gap-3">
                <Link2 className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">DOI</h3>
                  <a
                    href={`https://doi.org/${paper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {paper.doi}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Keywords */}
            {(paper.keywords?.length > 0 || paper.jel_codes?.length > 0) && (
              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-slate-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">关键词</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {paper.keywords?.map((keyword: string) => (
                      <span key={keyword} className="academic-tag">{keyword}</span>
                    ))}
                    {paper.jel_codes?.map((jel: string) => (
                      <span key={jel} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700">
                        JEL: {jel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Abstract */}
            {paper.abstract && (
              <div className="bg-slate-50 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">摘要</h3>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{paper.abstract}</p>
              </div>
            )}
              </>
            )}

            {/* BibTeX - Copy button only */}
            {bibtexData?.bibtex && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-sm font-medium text-slate-700">BibTeX 引用</span>
                <button
                  onClick={copyBibtex}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? '已复制' : '复制引用'}
                </button>
              </div>
            )}

            {/* Files Section */}
            <div className="border-t border-slate-200 pt-6">
              <PaperFiles
                paperId={paper.id}
                selectedFileId={selectedFileId}
                onFileSelect={setSelectedFileId}
                compact={false}
              />
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-200 pt-6">
              <PaperNotes paperId={paper.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal - 居中显示 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                确认删除文献
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                确定要删除这篇文献吗？此操作不可恢复。
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
