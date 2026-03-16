import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { BookOpen, FileText, Calendar, TrendingUp, Plus, ArrowRight, Link as LinkIcon, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  color: 'blue' | 'emerald' | 'violet' | 'amber'
  trend?: string
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-100',
    border: 'border-blue-100',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    border: 'border-emerald-100',
  },
  violet: {
    bg: 'bg-violet-50',
    icon: 'text-violet-600',
    iconBg: 'bg-violet-100',
    border: 'border-violet-100',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
    border: 'border-amber-100',
  },
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  const colors = colorVariants[color]

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border ${colors.border} bg-white p-6
      transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
      group cursor-default
    `}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.bg} rounded-full -mr-16 -mt-16 opacity-50 transition-transform duration-500 group-hover:scale-110`} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">{trend}</span>
              </div>
            )}
          </div>
          <div className={`h-12 w-12 ${colors.iconBg} rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className={`h-6 w-6 ${colors.icon}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

interface Author {
  name: string
  affiliation?: string | null
}

interface Keyword {
  name: string
}

interface DoiMetadata {
  title: string
  authors: Author[]
  journal: string
  year: number
  volume: string
  number: string
  pages: string
  doi: string
  abstract: string
  keywords: Keyword[]
  url: string
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const { data: papersData, isLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: () => papersApi.list({ page: 1, page_size: 100 }).then((res) => res.data),
  })

  // DOI Quick Add State
  const [doiInput, setDoiInput] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [doiMetadata, setDoiMetadata] = useState<DoiMetadata | null>(null)
  const [doiCheckResult, setDoiCheckResult] = useState<{ exists: boolean; paper_id?: string; title?: string } | null>(null)

  // Check DOI mutation
  const checkDoiMutation = useMutation({
    mutationFn: (doi: string) => papersApi.checkDoi(doi).then((res) => res.data),
    onSuccess: (data) => {
      setDoiCheckResult(data)
      if (data.exists) {
        toast.error('该文献已存在', { description: data.title })
      } else {
        // Fetch metadata
        fetchDoiMutation.mutate(doiInput.trim())
      }
    },
    onError: (error: any) => {
      toast.error('检查 DOI 失败', { description: error.response?.data?.detail || '请稍后重试' })
    },
  })

  // Fetch DOI metadata mutation
  const fetchDoiMutation = useMutation({
    mutationFn: (doi: string) => papersApi.fetchDoi(doi).then((res) => res.data),
    onSuccess: (data) => {
      setDoiMetadata(data)
      toast.success('元数据获取成功', { description: '请确认信息后添加文献' })
    },
    onError: (error: any) => {
      toast.error('获取元数据失败', { description: error.response?.data?.detail || '请检查 DOI 是否正确' })
    },
  })

  // Create paper mutation
  const createPaperMutation = useMutation({
    mutationFn: (data: any) => papersApi.create(data),
    onSuccess: () => {
      toast.success('文献添加成功')
      queryClient.invalidateQueries({ queryKey: ['papers'] })
      resetAddPanel()
    },
    onError: (error: any) => {
      toast.error('添加失败', { description: error.response?.data?.detail || '未知错误' })
    },
  })

  const resetAddPanel = () => {
    setDoiInput('')
    setDoiMetadata(null)
    setDoiCheckResult(null)
    setShowAddPanel(false)
  }

  const handleDoiSubmit = () => {
    const doi = doiInput.trim()
    if (!doi) {
      toast.error('请输入 DOI')
      return
    }
    checkDoiMutation.mutate(doi)
  }

  const handleConfirmAdd = () => {
    if (!doiMetadata) return

    const paperData = {
      title: doiMetadata.title,
      authors: doiMetadata.authors || [],
      journal: doiMetadata.journal || '',
      year: doiMetadata.year || new Date().getFullYear(),
      volume: doiMetadata.volume || '',
      number: doiMetadata.number || '',
      pages: doiMetadata.pages || '',
      doi: doiMetadata.doi || doiInput.trim(),
      abstract: doiMetadata.abstract || '',
      keywords: doiMetadata.keywords?.map((k: any) => k.name || k) || [],
      url: doiMetadata.url || '',
      note: '',
    }

    createPaperMutation.mutate(paperData)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-12 w-12" />
      </div>
    )
  }

  const papers = papersData?.items || []
  const totalPapers = papersData?.total || 0
  const papersWithPdf = papers.filter((p: any) => p.pdf_uploaded).length
  const recentPapers = papers.slice(0, 5)

  // Calculate year distribution
  const yearDist = papers.reduce((acc: Record<number, number>, paper: any) => {
    const year = paper.year
    acc[year] = (acc[year] || 0) + 1
    return acc
  }, {})

  const latestYear = Object.keys(yearDist).sort().reverse()[0] || 'N/A'
  const papersThisYear = yearDist[latestYear] || 0

  // Get unique journals
  const journals = new Set(papers.map((p: any) => p.journal).filter(Boolean))

  const pdfCoverage = totalPapers > 0 ? Math.round((papersWithPdf / totalPapers) * 100) : 0

  const isProcessing = checkDoiMutation.isPending || fetchDoiMutation.isPending || createPaperMutation.isPending

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-8">
        {/* Welcome Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -ml-32 -mb-32" />

          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  欢迎使用文献管理系统
                </h1>
                <p className="text-slate-400 text-lg">
                  管理你的学术文献，让研究更高效
                </p>
              </div>
              <button
                onClick={() => setShowAddPanel(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
              >
                <Plus className="h-5 w-5" />
                添加文献
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="总文献数"
            value={totalPapers}
            icon={BookOpen}
            color="blue"
          />
          <StatCard
            title="有 PDF"
            value={papersWithPdf}
            subtitle={`${pdfCoverage}% 覆盖率`}
            icon={FileText}
            color="emerald"
          />
          <StatCard
            title="期刊/会议数"
            value={journals.size}
            icon={TrendingUp}
            color="violet"
          />
          <StatCard
            title={`${latestYear} 年文献数`}
            value={papersThisYear}
            icon={Calendar}
            color="amber"
          />
        </div>

        {/* Recent Papers */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">最近添加的文献</h2>
                <p className="text-sm text-slate-500">最近更新的学术文献列表</p>
              </div>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentPapers.length === 0 ? (
              <div className="empty-state py-16">
                <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <BookOpen className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">还没有文献</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  点击上方"添加文献"按钮开始创建你的第一篇文献记录
                </p>
              </div>
            ) : (
              recentPapers.map((paper: any, index: number) => (
                <Link
                  key={paper.id}
                  to={`/papers/${paper.id}`}
                  className="flex items-start gap-4 p-5 hover:bg-slate-50/80 transition-colors duration-200 group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-200 group-hover:border-blue-200 group-hover:from-blue-50 group-hover:to-blue-50/50 transition-all duration-200">
                      <FileText className="h-5 w-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {paper.citation_key}
                      </span>
                      {paper.pdf_uploaded && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <FileText className="h-3 w-3" />
                          PDF
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {paper.title}
                    </h3>

                    <p className="text-sm text-slate-500 line-clamp-1">
                      {paper.authors?.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <span className="inline-flex items-center justify-center h-8 px-3 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">
                      {paper.year}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - DOI Quick Add */}
      {showAddPanel && (
        <div className="w-96 bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">添加文献</h3>
                <p className="text-[10px] text-slate-500">通过 DOI 快速添加</p>
              </div>
            </div>
            <button
              onClick={resetAddPanel}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* DOI Input */}
            {!doiMetadata && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  输入 DOI
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={doiInput}
                    onChange={(e) => setDoiInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleDoiSubmit()}
                    placeholder="10.1000/xxx"
                    disabled={isProcessing}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleDoiSubmit}
                  disabled={isProcessing || !doiInput.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4" />
                      获取元数据
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Error - DOI Exists */}
            {doiCheckResult?.exists && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-rose-900">该文献已存在</p>
                    <p className="text-xs text-rose-700 mt-1 line-clamp-2">{doiCheckResult.title}</p>
                    <Link
                      to={`/papers/${doiCheckResult.paper_id}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-rose-700 hover:text-rose-800 underline"
                    >
                      查看文献
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Preview */}
            {doiMetadata && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-medium">元数据获取成功</span>
                </div>

                <div className="space-y-3">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">标题</label>
                    <p className="text-sm text-slate-900 line-clamp-3">{doiMetadata.title}</p>
                  </div>

                  {/* Authors */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">作者</label>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {doiMetadata.authors?.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>

                  {/* Journal & Year */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">期刊</label>
                      <p className="text-sm text-slate-700 line-clamp-1">{doiMetadata.journal || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">年份</label>
                      <p className="text-sm text-slate-700">{doiMetadata.year}</p>
                    </div>
                  </div>

                  {/* DOI */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">DOI</label>
                    <p className="text-sm text-slate-700 font-mono">{doiMetadata.doi || doiInput}</p>
                  </div>

                  {/* Abstract */}
                  {doiMetadata.abstract && (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">摘要</label>
                      <p className="text-xs text-slate-600 line-clamp-4 bg-slate-50 p-2 rounded-lg">{doiMetadata.abstract}</p>
                    </div>
                  )}

                  {/* Keywords */}
                  {doiMetadata.keywords && doiMetadata.keywords.length > 0 && (
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">关键词</label>
                      <div className="flex flex-wrap gap-1">
                        {doiMetadata.keywords.slice(0, 5).map((k: any, i: number) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">
                            {k.name || k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={resetAddPanel}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleConfirmAdd}
                    disabled={createPaperMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors"
                  >
                    {createPaperMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        添加中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        确认添加
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
