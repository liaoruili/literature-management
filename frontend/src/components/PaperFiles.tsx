import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { Upload, File, Trash2, Download, FileText, Code, Package, X, Eye, FileArchive, Loader2, CheckCircle2, CloudUpload, ChevronDown, ChevronUp, Edit2, Check, AlertTriangle } from 'lucide-react'
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

interface PaperFilesProps {
  paperId: string
  selectedFileId: string | null
  onFileSelect: (fileId: string | null) => void
  compact?: boolean
}

const CATEGORY_ICONS: Record<string, any> = {
  pdf: FileText,
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

export default function PaperFiles({ paperId, selectedFileId, onFileSelect, compact = false }: PaperFilesProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCategory, setSelectedCategory] = useState('pdf')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingFileId, setEditingFileId] = useState<string | null>(null)
  const [editFilename, setEditFilename] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<PaperFile | null>(null)
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const { data: filesData } = useQuery({
    queryKey: ['paper-files', paperId],
    queryFn: () => papersApi.getFiles(paperId).then((res) => res.data),
  })

  // Load last viewed file from localStorage
  useEffect(() => {
    if (filesData?.items && !selectedFileId) {
      // Try to get last viewed file from localStorage
      const storageKey = `lastViewedFile_${paperId}`
      const lastViewedFileId = localStorage.getItem(storageKey)

      // Check if last viewed file still exists in current files
      const fileExists = lastViewedFileId && filesData.items.some((f: PaperFile) => f.id === lastViewedFileId)

      if (fileExists) {
        // Use last viewed file
        onFileSelect(lastViewedFileId)
      } else {
        // Fallback: select the most recently uploaded PDF
        const pdfFiles = filesData.items.filter((f: PaperFile) => f.category === 'pdf')
        if (pdfFiles.length > 0) {
          const sortedPdfs = [...pdfFiles].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          onFileSelect(sortedPdfs[0].id)
        }
      }
    }
  }, [filesData, selectedFileId, onFileSelect, paperId])

  // Save last viewed file to localStorage when user selects a file
  useEffect(() => {
    if (selectedFileId) {
      const storageKey = `lastViewedFile_${paperId}`
      localStorage.setItem(storageKey, selectedFileId)
    }
  }, [selectedFileId, paperId])

  const uploadMutation = useMutation({
    mutationFn: ({ paperId, file, category, description }: {
      paperId: string
      file: File
      category: string
      description?: string
    }) => papersApi.uploadFile(paperId, file, category, description),
    onMutate: () => {
      setUploadProgress(0)
      setUploadSuccess(false)
    },
    onSuccess: (response) => {
      setUploadSuccess(true)
      setUploadProgress(100)
      toast.success('文件上传成功', {
        description: response.data?.original_filename || '文件已上传',
        duration: 3000,
      })
      // Ensure file list is expanded to show new file
      setIsExpanded(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['paper-files', paperId] })
        resetForm()
        setShowUploadForm(false)
        setUploadSuccess(false)
        setUploadProgress(0)
        // Clear drag state
        dragCounter.current = 0
        setIsDragging(false)
        if (response.data?.category === 'pdf') {
          onFileSelect(response.data.id)
        }
      }, 800)
    },
    onError: (error: any) => {
      setUploadProgress(0)
      setUploadSuccess(false)
      toast.error('文件上传失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => papersApi.deleteFile(paperId, fileId),
    onSuccess: (_, deletedFileId) => {
      queryClient.invalidateQueries({ queryKey: ['paper-files', paperId] })
      if (selectedFileId === deletedFileId) {
        onFileSelect(null)
      }
      setDeleteConfirmFile(null)
      toast.success('文件已删除', {
        duration: 3000,
      })
    },
    onError: (error: any) => {
      toast.error('删除失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: { original_filename?: string; description?: string } }) =>
      papersApi.updateFile(paperId, fileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paper-files', paperId] })
      toast.success('文件信息已更新', {
        duration: 3000,
      })
      setEditingFileId(null)
    },
    onError: (error: any) => {
      toast.error('更新失败', {
        description: error.response?.data?.detail || '未知错误',
        duration: 4000,
      })
    },
  })

  const resetForm = () => {
    setSelectedFile(null)
    setSelectedCategory('pdf')
    setDescription('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error('请选择文件', {
        description: '请先选择要上传的文件',
        duration: 3000,
      })
      return
    }

    // Expand file list before upload to show the new file after upload completes
    setIsExpanded(true)

    uploadMutation.mutate({
      paperId,
      file: selectedFile,
      category: selectedCategory,
      description: description || undefined,
    })
  }

  const handleDelete = (file: PaperFile) => {
    setDeleteConfirmFile(file)
  }

  const handleDownload = async (file: PaperFile) => {
    try {
      const downloadUrl = papersApi.getFileDownloadUrl(paperId, file.id)
      const response = await fetch(downloadUrl)

      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.original_filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error('下载失败', {
        description: error.message || '无法下载文件',
        duration: 4000,
      })
    }
  }

  const startEditing = (file: PaperFile) => {
    setEditingFileId(file.id)
    setEditFilename(file.original_filename)
    setEditDescription(file.description || '')
  }

  const cancelEditing = () => {
    setEditingFileId(null)
    setEditFilename('')
    setEditDescription('')
  }

  const saveEditing = (fileId: string) => {
    updateMutation.mutate({
      fileId,
      data: {
        original_filename: editFilename.trim() || undefined,
        description: editDescription.trim() || undefined,
      },
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Auto-detect file category based on file extension and type
  const detectFileCategory = (file: File): string => {
    const filename = file.name.toLowerCase()
    const fileType = file.type.toLowerCase()

    // PDF files
    if (fileType.includes('pdf') || filename.endsWith('.pdf')) {
      return 'pdf'
    }

    // Code files
    const codeExtensions = ['.py', '.js', '.ts', '.jsx', '.tsx', '.r', '.m', '.mat', '.do', '.sas', '.sql', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd']
    if (codeExtensions.some(ext => filename.endsWith(ext)) || fileType.includes('text') || fileType.includes('script')) {
      return 'code'
    }

    // Supplementary data files
    const dataExtensions = ['.csv', '.xlsx', '.xls', '.json', '.xml', '.dta', '.sav', '.por', '.sas7bdat']
    if (dataExtensions.some(ext => filename.endsWith(ext)) || fileType.includes('spreadsheet') || fileType.includes('csv')) {
      return 'supplementary_data'
    }

    // Default to other
    return 'other'
  }

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return { valid: false, error: `文件大小超过 50MB 限制 (${formatFileSize(file.size)})` }
    }

    // Check file type (allow common academic file types)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'application/json',
      'application/zip',
      'application/x-zip-compressed',
    ]
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.json', '.zip', '.py', '.js', '.ts', '.r', '.m', '.do', '.sas', '.sql']

    const filename = file.name.toLowerCase()
    const hasAllowedExtension = allowedExtensions.some(ext => filename.endsWith(ext))
    const hasAllowedType = allowedTypes.some(type => file.type.includes(type))

    if (!hasAllowedExtension && !hasAllowedType) {
      return { valid: false, error: `不支持的文件格式: ${file.type || '未知'}` }
    }

    return { valid: true }
  }

  const processFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0] // Handle single file upload for now
    const validation = validateFile(file)

    if (!validation.valid) {
      toast.error('文件验证失败', {
        description: validation.error,
        duration: 4000,
      })
      return
    }

    // Auto-detect category
    const detectedCategory = detectFileCategory(file)
    setSelectedCategory(detectedCategory)
    setSelectedFile(file)
    setShowUploadForm(true)

    toast.success('文件已选择', {
      description: `${file.name} (${formatFileSize(file.size)})，请确认信息后点击上传`,
      duration: 3000,
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDragging(false)

    const files = e.dataTransfer.files
    processFiles(files)
  }, [processFiles])

  const files = filesData?.items || []

  const groupedFiles = files.reduce((acc: Record<string, PaperFile[]>, file: PaperFile) => {
    if (!acc[file.category]) {
      acc[file.category] = []
    }
    acc[file.category].push(file)
    return acc
  }, {})

  const categoryOrder = ['pdf', 'supplementary_data', 'code', 'other']

  if (compact) {
    return (
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          h-full flex flex-col bg-white rounded-xl border overflow-hidden transition-all duration-300
          ${isDragging
            ? 'border-blue-500 border-2 shadow-lg shadow-blue-500/20 bg-blue-50/30'
            : 'border-slate-200/60'
          }
        `}
      >
        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-sm rounded-xl m-2">
            <div className="h-16 w-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 animate-bounce">
              <CloudUpload className="h-8 w-8 text-white" />
            </div>
            <p className="text-lg font-semibold text-blue-700">释放以上传</p>
            <p className="text-sm text-blue-500 mt-1">支持 PDF、数据文件、代码等</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
              <Package className="h-4 w-4 text-slate-600" />
            </div>
            <span className="font-semibold text-slate-900 text-sm">附件</span>
          </div>
          <button
            onClick={() => {
              const newShowUploadForm = !showUploadForm
              setShowUploadForm(newShowUploadForm)
              // Expand file list when opening upload form
              if (newShowUploadForm) {
                setIsExpanded(true)
              }
            }}
            disabled={uploadMutation.isPending}
            className={`
              group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm
              transition-all duration-300 ease-out overflow-hidden
              ${showUploadForm
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 hover:from-rose-600 hover:to-rose-700'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5'
              }
              disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0
            `}
          >
            {/* Background shimmer effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            {/* Icon with animation */}
            <span className="relative flex items-center justify-center">
              {showUploadForm ? (
                <X className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
              ) : uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : uploadSuccess ? (
                <CheckCircle2 className="h-4 w-4 animate-bounce" />
              ) : (
                <CloudUpload className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              )}
            </span>

            {/* Text label */}
            <span className="relative">
              {showUploadForm
                ? '取消上传'
                : uploadMutation.isPending
                  ? '上传中...'
                  : uploadSuccess
                    ? '上传成功'
                    : '上传文件'
              }
            </span>

            {/* Progress bar overlay */}
            {uploadMutation.isPending && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-white/50 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </button>
        </div>

        {/* Compact Upload Form */}
        {showUploadForm && (
          <div className="p-3 border-b border-slate-100 bg-slate-50 space-y-2 animate-fade-in">
            {/* Drag hint */}
            <div className="text-xs text-slate-500 text-center py-2 border border-dashed border-slate-300 rounded-lg bg-slate-100/50">
              <CloudUpload className="h-4 w-4 mx-auto mb-1 text-slate-400" />
              或将文件拖拽到此处上传
            </div>

            {/* File Selection Display */}
            {selectedFile ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <FileArchive className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {formatFileSize(selectedFile.size)} · {CATEGORY_LABELS[selectedCategory]}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="清除选择"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
            )}

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="pdf">稿件原文</option>
              <option value="supplementary_data">补充数据</option>
              <option value="code">代码</option>
              <option value="other">其他</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !selectedFile}
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                <Upload className="h-3 w-3" />
                上传
              </button>
              <button
                onClick={() => { resetForm(); setShowUploadForm(false) }}
                className="px-3 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-1 overflow-y-auto scrollbar-smooth p-2 space-y-1">
          {files.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              <Package className="mx-auto h-6 w-6 text-slate-300 mb-2" />
              暂无文件
              <p className="text-[10px] text-slate-300 mt-1">拖拽文件到此处上传</p>
            </div>
          ) : (
            categoryOrder.map((category) => {
              const categoryFiles = groupedFiles[category] || []
              if (categoryFiles.length === 0) return null

              return (
                <div key={category}>
                  <div className="text-xs font-semibold text-slate-400 px-2 py-1.5 uppercase tracking-wide">
                    {CATEGORY_LABELS[category]}
                  </div>
                  {categoryFiles.map((file: PaperFile) => {
                    const IconComponent = CATEGORY_ICONS[file.category] || File
                    const isSelected = selectedFileId === file.id
                    const colors = CATEGORY_COLORS[file.category]
                    const isPdf = file.file_type?.toLowerCase().includes('pdf') || file.original_filename?.toLowerCase().endsWith('.pdf')
                    return (
                      <div
                        key={file.id}
                        onClick={() => isPdf && onFileSelect(file.id)}
                        className={`
                          flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all duration-200
                          ${isSelected
                            ? `${colors.bg} ${colors.text} ring-1 ${colors.border}`
                            : 'hover:bg-slate-50 text-slate-700'
                          }
                          ${!isPdf ? 'cursor-default' : ''}
                        `}
                        title={file.original_filename}
                      >
                        <IconComponent className={`h-4 w-4 flex-shrink-0 ${isSelected ? colors.text : 'text-slate-400'}`} />
                        <span className="text-xs truncate flex-1 font-medium">{file.original_filename}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Full mode
  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 relative
        ${isDragging
          ? 'border-blue-500 border-2 shadow-lg shadow-blue-500/20'
          : 'border-slate-200/60'
        }
      `}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-sm rounded-2xl m-4">
          <div className="h-20 w-20 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 animate-bounce">
            <CloudUpload className="h-10 w-10 text-white" />
          </div>
          <p className="text-xl font-semibold text-blue-700">释放以上传</p>
          <p className="text-sm text-blue-500 mt-2">支持 PDF、数据文件、代码等格式</p>
          <p className="text-xs text-blue-400 mt-1">最大 50MB</p>
        </div>
      )}

      {/* Header - 压缩高度 */}
      <div className="flex items-center justify-between p-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-gradient-to-br from-slate-100 to-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
            <Package className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-xs">附件文件</h3>
            <p className="text-[10px] text-slate-500">{files.length} 个文件</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Expand/Collapse Toggle */}
          {files.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  展开
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              const newShowUploadForm = !showUploadForm
              setShowUploadForm(newShowUploadForm)
              // Expand file list when opening upload form
              if (newShowUploadForm) {
                setIsExpanded(true)
              }
            }}
            disabled={uploadMutation.isPending}
            className={`
              group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium text-xs
              transition-all duration-300 ease-out overflow-hidden
              ${showUploadForm
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-md shadow-rose-500/25 hover:shadow-rose-500/40 hover:from-rose-600 hover:to-rose-700'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5'
              }
              disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0
            `}
          >
            {/* Background shimmer effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            {/* Icon with animation */}
            <span className="relative flex items-center justify-center">
              {showUploadForm ? (
                <X className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-90" />
              ) : uploadMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : uploadSuccess ? (
                <CheckCircle2 className="h-3.5 w-3.5 animate-bounce" />
              ) : (
                <CloudUpload className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110" />
              )}
            </span>

            {/* Text label */}
            <span className="relative">
              {showUploadForm
                ? '取消'
                : uploadMutation.isPending
                  ? '上传中'
                  : uploadSuccess
                    ? '成功'
                    : '上传'
              }
            </span>

            {/* Progress bar overlay */}
            {uploadMutation.isPending && (
              <span
                className="absolute bottom-0 left-0 h-0.5 bg-white/50 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Upload Form - 压缩布局 */}
      {showUploadForm && (
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 animate-fade-in">
          <div className="space-y-3">
            {/* Drag and drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-xl p-4 text-center transition-all duration-200 cursor-pointer
                ${isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <CloudUpload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? '释放以上传' : '点击或拖拽文件到此处'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                支持 PDF、Word、Excel、代码文件等，最大 50MB
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                选择文件
              </label>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <FileArchive className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatFileSize(selectedFile.size)} · {CATEGORY_LABELS[selectedCategory]}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="清除选择"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  文件类型
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="pdf">稿件原文</option>
                  <option value="supplementary_data">补充数据</option>
                  <option value="code">代码</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  描述（可选）
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="简短描述"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { resetForm(); setShowUploadForm(false) }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending || !selectedFile}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
              >
                <Upload className="h-3 w-3" />
                {uploadMutation.isPending ? '上传中' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List - 压缩布局，优化文件名显示 */}
      <div className="p-3">
        {files.length === 0 ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              text-center py-8 transition-all duration-200 border-2 border-dashed rounded-xl mx-3
              ${isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <CloudUpload className={`h-6 w-6 ${isDragging ? 'text-blue-500' : 'text-slate-300'}`} />
            </div>
            <p className="text-slate-500 text-sm font-medium mb-0.5">
              {isDragging ? '释放以上传' : '还没有上传任何文件'}
            </p>
            <p className="text-xs text-slate-400">
              {isDragging ? '支持 PDF、数据文件、代码等' : '点击上方按钮或拖拽文件到此处上传'}
            </p>
          </div>
        ) : !isExpanded ? (
          // Collapsed view - show only selected PDF or first PDF
          <div className="space-y-2">
            {(() => {
              const selectedFile = files.find((f: PaperFile) => f.id === selectedFileId)
              const fileToShow = selectedFile || groupedFiles['pdf']?.[0]

              if (!fileToShow) {
                return (
                  <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500">暂无 PDF 文件</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">点击"展开"查看所有文件</p>
                  </div>
                )
              }

              const IconComponent = CATEGORY_ICONS[fileToShow.category] || File
              const colors = CATEGORY_COLORS[fileToShow.category]
              const isSelected = selectedFileId === fileToShow.id

              return (
                <div
                  className={`
                    flex items-center justify-between p-2.5 rounded-lg border transition-all duration-200
                    ${isSelected
                      ? `${colors.bg} ${colors.border} ring-1`
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? colors.bg : 'bg-slate-100'}`}>
                      <IconComponent className={`h-4 w-4 ${isSelected ? colors.text : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-medium text-slate-900 text-sm leading-tight break-all line-clamp-2"
                          title={fileToShow.original_filename}
                        >
                          {fileToShow.original_filename}
                        </span>
                        {isSelected && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium flex-shrink-0`}>
                            预览中
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        <span>{formatFileSize(fileToShow.file_size)}</span>
                        <span className="text-slate-400">{CATEGORY_LABELS[fileToShow.category]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                    {(() => {
                      const isPdf = fileToShow.file_type?.toLowerCase().includes('pdf') || fileToShow.original_filename?.toLowerCase().endsWith('.pdf')
                      return isPdf && (
                        <button
                          onClick={() => onFileSelect(isSelected ? null : fileToShow.id)}
                          className={`
                            p-1.5 rounded-md transition-colors
                            ${isSelected
                              ? `${colors.text} ${colors.bg}`
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                            }
                          `}
                          title={isSelected ? '关闭预览' : '预览 PDF'}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )
                    })()}
                    <button
                      onClick={() => handleDownload(fileToShow)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="下载"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          // Expanded view - show all files grouped by category
          <div className="space-y-4">
            {categoryOrder.map((category) => {
              const categoryFiles = groupedFiles[category] || []
              if (categoryFiles.length === 0) return null
              const colors = CATEGORY_COLORS[category]

              return (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-md ${colors.bg} ${colors.text}`}>
                      {CATEGORY_ICONS[category] && <span className="h-3 w-3" />}
                    </span>
                    {CATEGORY_LABELS[category]}
                    <span className="text-[10px] text-slate-400 font-normal">({categoryFiles.length})</span>
                  </h4>
                  <div className="space-y-1.5">
                    {categoryFiles.map((file: PaperFile) => {
                      const IconComponent = CATEGORY_ICONS[file.category] || File
                      const isSelected = selectedFileId === file.id
                      const isEditing = editingFileId === file.id

                      if (isEditing) {
                        return (
                          <div
                            key={file.id}
                            className="p-2 rounded-lg border border-blue-200 bg-blue-50/50"
                          >
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[10px] font-medium text-slate-600 mb-1">显示名称</label>
                                <input
                                  type="text"
                                  value={editFilename}
                                  onChange={(e) => setEditFilename(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  placeholder="文件名"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-medium text-slate-600 mb-1">备注</label>
                                <input
                                  type="text"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                  placeholder="可选备注"
                                />
                              </div>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={cancelEditing}
                                  className="px-2 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                                >
                                  取消
                                </button>
                                <button
                                  onClick={() => saveEditing(file.id)}
                                  disabled={updateMutation.isPending}
                                  className="px-2 py-1 text-[10px] font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  保存
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      }

                      const isPdf = file.file_type?.toLowerCase().includes('pdf') || file.original_filename?.toLowerCase().endsWith('.pdf')

                      return (
                        <div
                          key={file.id}
                          onClick={() => isPdf && onFileSelect(isSelected ? null : file.id)}
                          className={`
                            flex items-center justify-between p-2 rounded-lg border transition-all duration-200
                            ${isSelected
                              ? `${colors.bg} ${colors.border} ring-1`
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }
                            ${isPdf ? 'cursor-pointer' : 'cursor-default'}
                          `}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? colors.bg : 'bg-slate-100'}`}>
                              <IconComponent className={`h-3.5 w-3.5 ${isSelected ? colors.text : 'text-slate-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="font-medium text-slate-900 text-xs leading-tight break-all line-clamp-2"
                                  title={file.original_filename}
                                >
                                  {file.original_filename}
                                </span>
                                {isSelected && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium flex-shrink-0`}>
                                    预览中
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span className="text-slate-400">{new Date(file.created_at).toLocaleDateString('zh-CN')}</span>
                                {file.description && (
                                  <span className="truncate max-w-[100px] text-slate-400" title={file.description}>{file.description}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0 ml-1.5">
                            {isPdf && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onFileSelect(isSelected ? null : file.id); }}
                                  className={`
                                    p-1.5 rounded-md transition-colors
                                    ${isSelected
                                      ? `${colors.text} ${colors.bg}`
                                      : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                    }
                                  `}
                                  title={isSelected ? '关闭预览' : '预览 PDF'}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                              )}
                            <button
                              onClick={(e) => { e.stopPropagation(); startEditing(file); }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="下载"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
                              title="删除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - 居中显示 */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmFile(null)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                确认删除文件
              </h3>
              <p className="text-sm text-slate-500 mb-2">
                确定要删除以下文件吗？此操作不可恢复。
              </p>
              <p className="text-sm font-medium text-slate-700 mb-6 break-all px-4">
                "{deleteConfirmFile.original_filename}"
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmFile(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirmFile.id)}
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
