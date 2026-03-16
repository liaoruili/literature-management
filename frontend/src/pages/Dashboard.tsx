import { useQuery } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { BookOpen, FileText, Calendar, TrendingUp, Plus, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

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

export default function Dashboard() {
  const { data: papersData, isLoading } = useQuery({
    queryKey: ['papers'],
    queryFn: () => papersApi.list({ page: 1, page_size: 100 }).then((res) => res.data),
  })

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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
            <Link
              to="/papers/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              添加文献
            </Link>
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
  )
}
