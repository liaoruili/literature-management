import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { X, Save, Link as LinkIcon, Plus, Package, Download, File, FileText as FileTextIcon, ChevronDown, ChevronUp, Check, Edit3, Code, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface PaperFile {
  id: string
  paper_id: string
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  description: string | null
  category: string
  file_path: string
  created_at: string
  updated_at: string
}

const CATEGORY_ICONS: Record<string, any> = {
  pdf: FileTextIcon,
  supplementary_data: Package,
  code: Code,
  other: File,
}

const CATEGORY_LABELS: Record<string, string> = {
  pdf: '稿件原文',
  supplementary_data: '补充数据',
  code: '代码',
  other: '其他文件',
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pdf: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  supplementary_data: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  code: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200' },
  other: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

interface Author {
  name: string
  affiliation?: string | null
}

interface Keyword {
  name: string
}

export default function PaperForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const isEditMode = !!id
  const doiFromUrl = searchParams.get('doi') || ''

  const [formData, setFormData] = useState({
    title: '',
    authors: [] as Author[],
    journal: '',
    year: new Date().getFullYear(),
    volume: '',
    number: '',
    pages: '',
    doi: '',
    abstract: '',
    keywords: [] as Keyword[],
    url: '',
    note: '',
  })

  const [authorInput, setAuthorInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editFileCategory, setEditFileCategory] = useState('')
  const [editFileDescription, setEditFileDescription] = useState('')
  const [showFilesSection, setShowFilesSection] = useState(true)
  const [doiCheckResult, setDoiCheckResult] = useState<{ exists: boolean; message: string; paper_id?: string; title?: string } | null>(null)

  // Check DOI existence mutation
  const checkDoiMutation = useMutation({
    mutationFn: (doi: string) => papersApi.checkDoi(doi).then((res) => res.data),
    onSuccess: (data) => {
      setDoiCheckResult(data)
      if (data.exists) {
        toast.error('该文献已存在，无法重复添加', {
          description: data.title,
          duration: 4000,
        })
      } else {
        // DOI doesn't exist, proceed to fetch metadata
        fetchDoiMutation.mutate(formData.doi.trim())
      }
    },
    onError: (error: any) => {
      toast.error('检查 DOI 失败', {
        description: error.response?.data?.detail || '请稍后重试',
        duration: 4000,
      })
    },
  })

  const fetchDoiMutation = useMutation({
    mutationFn: (doi: string) => papersApi.fetchDoi(doi).then((res) => res.data),
    onSuccess: (data) => {
      setFormData({
        ...formData,
        title: data.title || formData.title,
        authors: data.authors?.length > 0 ? data.authors : formData.authors,
        journal: data.journal || formData.journal,
        year: data.year || formData.year,
        volume: data.volume || formData.volume,
        number: data.number || formData.number,
        pages: data.pages || formData.pages,
        doi: data.doi || formData.doi,
        abstract: data.abstract || formData.abstract,
        keywords: data.keywords?.length > 0
          ? [...formData.keywords, ...data.keywords.filter((k: any) =>
              !formData.keywords.some((fk: any) => fk.name === k.name)
            )]
          : formData.keywords,
        url: data.url || formData.url,
      })
      setDoiCheckResult(null)
      toast.success('元信息已成功填充！')
    },
    onError: (error: any) => {
      toast.error('无法通过 DOI 获取元信息', {
        description: error.response?.data?.detail || '请检查 DOI 是否正确',
        duration: 4000,
      })
    },
  })

  const handleDoiAutoFill = () => {
    const doi = formData.doi.trim()
    if (!doi) {
      toast.error('请先输入 DOI')
      return
    }
    // First check if DOI exists
    checkDoiMutation.mutate(doi)
  }

  const { data: existingPaper } = useQuery({
    queryKey: ['paper', id],
    queryFn: () => papersApi.get(id!).then((res) => res.data),
    enabled: isEditMode,
  })

  const { data: filesData } = useQuery({
    queryKey: ['paper-files', id],
    queryFn: () => papersApi.getFiles(id!).then((res) => res.data),
    enabled: isEditMode,
  })

  const updateFileMutation = useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: { category?: string; description?: string } }) =>
      papersApi.updateFile(id!, fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-files', id] })
      toast.success('附件信息已更新', { duration: 3000 })
      setEditingFileId(null)
    },
    onError: (error: any) => {
      toast.error('更新失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })

  // Handle DOI from URL (quick add)
  useEffect(() => {
    if (doiFromUrl && !isEditMode) {
      setFormData(prev => ({ ...prev, doi: doiFromUrl }))
      // Auto-trigger DOI check and fetch
      setTimeout(() => {
        checkDoiMutation.mutate(doiFromUrl)
      }, 100)
    }
  }, [doiFromUrl, isEditMode])

  useEffect(() => {
    if (existingPaper && isEditMode) {
      setFormData({
        title: existingPaper.title || '',
        authors: existingPaper.authors || [],
        journal: existingPaper.journal || '',
        year: existingPaper.year || new Date().getFullYear(),
        volume: existingPaper.volume || '',
        number: existingPaper.number || '',
        pages: existingPaper.pages || '',
        doi: existingPaper.doi || '',
        abstract: existingPaper.abstract || '',
        keywords: existingPaper.keywords?.map((k: string) => ({ name: k })) || [],
        url: existingPaper.url || '',
        note: existingPaper.note || '',
      })
    }
  }, [existingPaper, isEditMode])

  const createMutation = useMutation({
    mutationFn: (data: any) => papersApi.create(data),
    onSuccess: () => {
      navigate('/')
    },
    onError: (error: any) => {
      alert('创建失败：' + (error.response?.data?.detail || '未知错误'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => papersApi.update(id, data),
    onSuccess: () => {
      navigate(`/papers/${id}`)
    },
    onError: (error: any) => {
      alert('更新失败：' + (error.response?.data?.detail || '未知错误'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditMode) {
      updateMutation.mutate({ id: id!, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const addAuthor = () => {
    if (authorInput.trim()) {
      setFormData({
        ...formData,
        authors: [...formData.authors, { name: authorInput.trim() }],
      })
      setAuthorInput('')
    }
  }

  const removeAuthor = (index: number) => {
    setFormData({
      ...formData,
      authors: formData.authors.filter((_, i) => i !== index),
    })
  }

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, { name: keywordInput.trim() }],
      })
      setKeywordInput('')
    }
  }

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords.filter((_, i) => i !== index),
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const startEditingFile = (file: PaperFile) => {
    setEditingFileId(file.id)
    setEditFileCategory(file.category)
    setEditFileDescription(file.description || '')
  }

  const cancelEditingFile = () => {
    setEditingFileId(null)
    setEditFileCategory('')
    setEditFileDescription('')
  }

  const saveEditingFile = (fileId: string) => {
    updateFileMutation.mutate({
      fileId,
      data: {
        category: editFileCategory,
        description: editFileDescription.trim() || undefined,
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Edit3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditMode ? '编辑文献' : '添加文献'}
            </h1>
            <p className="text-sm text-slate-500">
              {isEditMode ? '更新文献信息和元数据' : '创建新的文献记录'}
            </p>
          </div>
        </div>
        <button
          onClick={() => isEditMode ? navigate(`/papers/${id}`) : navigate('/')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  标题 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="academic-input"
                  placeholder="论文标题"
                />
              </div>

              {/* Authors */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  作者
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthor())}
                    className="academic-input"
                    placeholder="输入作者姓名，按回车添加"
                  />
                  <button
                    type="button"
                    onClick={addAuthor}
                    className="btn-secondary"
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.authors.map((author, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100"
                    >
                      {author.name}
                      <button
                        type="button"
                        onClick={() => removeAuthor(index)}
                        className="hover:text-blue-800 p-0.5 hover:bg-blue-100 rounded transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Journal and Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    期刊/会议
                  </label>
                  <input
                    type="text"
                    value={formData.journal}
                    onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                    className="academic-input"
                    placeholder="期刊或会议名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    年份
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="academic-input"
                    placeholder="2024"
                  />
                </div>
              </div>

              {/* Volume, Number, Pages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    卷号
                  </label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="academic-input"
                    placeholder="Vol. 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    期号
                  </label>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    className="academic-input"
                    placeholder="No. 2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    页码
                  </label>
                  <input
                    type="text"
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                    className="academic-input"
                    placeholder="pp. 100-200"
                  />
                </div>
              </div>

              {/* DOI and URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    DOI
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.doi}
                      onChange={(e) => {
                        setFormData({ ...formData, doi: e.target.value })
                        setDoiCheckResult(null) // Clear check result when DOI changes
                      }}
                      className={`academic-input ${doiCheckResult?.exists ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                      placeholder="10.1000/xxx"
                    />
                    <button
                      type="button"
                      onClick={handleDoiAutoFill}
                      disabled={checkDoiMutation.isPending || fetchDoiMutation.isPending || !formData.doi.trim()}
                      className="btn-secondary whitespace-nowrap"
                      title="通过 DOI 自动填充元信息"
                    >
                      <LinkIcon className="h-4 w-4" />
                      {checkDoiMutation.isPending || fetchDoiMutation.isPending ? '获取中...' : '自动填充'}
                    </button>
                  </div>
                  {doiCheckResult?.exists ? (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>该文献已存在，无法重复添加</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/papers/${doiCheckResult.paper_id}`)}
                        className="text-blue-600 hover:text-blue-700 underline ml-1"
                      >
                        查看文献
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1.5">点击"自动填充"可从 Crossref 获取元信息</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    URL
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="academic-input"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Abstract */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  摘要
                </label>
                <textarea
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  className="academic-input h-32 resize-none"
                  placeholder="论文摘要"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  关键词
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    className="academic-input"
                    placeholder="输入关键词，按回车添加"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="btn-secondary"
                  >
                    <Plus className="h-4 w-4" />
                    添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium border border-slate-200"
                    >
                      {keyword.name}
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="hover:text-slate-900 p-0.5 hover:bg-slate-200 rounded transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  备注
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="academic-input h-24 resize-none"
                  placeholder="个人备注或笔记"
                />
              </div>

              {/* Attachments Section - Edit Mode Only */}
              {isEditMode && filesData?.items && filesData.items.length > 0 && (
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
                        <Package className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">附件管理</h3>
                        <p className="text-xs text-slate-500">{filesData.items.length} 个文件</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilesSection(!showFilesSection)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      {showFilesSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {showFilesSection && (
                    <div className="space-y-3">
                      {filesData.items.map((file: PaperFile) => {
                        const IconComponent = CATEGORY_ICONS[file.category] || File
                        const colors = CATEGORY_COLORS[file.category]
                        const isEditing = editingFileId === file.id

                        if (isEditing) {
                          return (
                            <div
                              key={file.id}
                              className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 animate-fade-in"
                            >
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                                    <IconComponent className={`h-4 w-4 ${colors.text}`} />
                                  </div>
                                  <span className="font-medium text-slate-900 text-sm truncate">{file.original_filename}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">文件分类</label>
                                    <select
                                      value={editFileCategory}
                                      onChange={(e) => setEditFileCategory(e.target.value)}
                                      className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                      <option value="pdf">稿件原文</option>
                                      <option value="supplementary_data">补充数据</option>
                                      <option value="code">代码</option>
                                      <option value="other">其他文件</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">描述（可选）</label>
                                    <input
                                      type="text"
                                      value={editFileDescription}
                                      onChange={(e) => setEditFileDescription(e.target.value)}
                                      className="w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                      placeholder="简短描述"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditingFile}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                                  >
                                    取消
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveEditingFile(file.id)}
                                    disabled={updateFileMutation.isPending}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                  >
                                    <Check className="h-3 w-3" />
                                    保存
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                                <IconComponent className={`h-4 w-4 ${colors.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate" title={file.original_filename}>
                                  {file.original_filename}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                  <span>{formatFileSize(file.file_size)}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                                    {CATEGORY_LABELS[file.category]}
                                  </span>
                                  {file.description && (
                                    <span className="truncate max-w-[150px] text-slate-400" title={file.description}>
                                      {file.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={() => startEditingFile(file)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="编辑"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={papersApi.getFileDownloadUrl(id!, file.id)}
                                download
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="下载"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => isEditMode ? navigate(`/papers/${id}`) : navigate('/')}
                  className="btn-outline sm:order-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="btn-primary sm:order-2"
                >
                  <Save className="h-4 w-4" />
                  {isEditMode
                    ? (updateMutation.isPending ? '保存中...' : '保存修改')
                    : (createMutation.isPending ? '保存中...' : '创建文献')
                  }
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  )
}
