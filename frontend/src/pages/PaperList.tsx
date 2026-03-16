import { useQuery } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { FileText, Calendar, BookOpen, Plus, Users, Tag, Filter } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PaperList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['papers'],
    queryFn: () => papersApi.list().then((res) => res.data),
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner h-12 w-12" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="empty-state py-16">
        <div className="h-20 w-20 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="h-10 w-10 text-rose-500" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-1">加载失败</h3>
        <p className="text-sm text-slate-500">请检查后端服务是否启动</p>
      </div>
    )
  }

  const papers = data?.items || []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">文献列表</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {papers.length} 篇文献
          </p>
        </div>
        <Link
          to="/papers/new"
          className="btn-primary self-start"
        >
          <Plus className="h-4 w-4" />
          添加文献
        </Link>
      </div>

      {/* Papers Grid */}
      {papers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="empty-state py-20">
            <div className="h-24 w-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6">
              <FileText className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">暂无文献</h3>
            <p className="text-slate-500 mb-6 max-w-sm">
              点击"添加文献"创建第一篇文献，开始管理你的学术资料
            </p>
            <Link
              to="/papers/new"
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              添加文献
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {papers.map((paper: any, index: number) => (
            <Link
              key={paper.id}
              to={`/papers/${paper.id}`}
              className="group bg-white rounded-2xl border border-slate-200/60 p-6
                transition-all duration-300 ease-out
                hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 hover:-translate-y-1"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                    {paper.citation_key}
                  </span>
                  {paper.pdf_uploaded && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <FileText className="h-3 w-3" />
                      PDF
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                {paper.title}
              </h3>

              {/* Authors */}
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <p className="text-sm text-slate-600 line-clamp-1">
                  {paper.authors?.map((a: any) => a.name).join(', ')}
                </p>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                {paper.journal && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{paper.journal}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-medium">{paper.year}</span>
                </div>
              </div>

              {/* Keywords */}
              {paper.keywords && paper.keywords.length > 0 && (
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <Tag className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                  <div className="flex flex-wrap gap-1.5">
                    {paper.keywords.slice(0, 3).map((keyword: string) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        {keyword}
                      </span>
                    ))}
                    {paper.keywords.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{paper.keywords.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
