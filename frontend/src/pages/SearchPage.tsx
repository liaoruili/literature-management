import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { papersApi } from '../services/api'
import { Search, Filter, Calendar, BookOpen, FileText, X, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    journal: '',
    year_from: '',
    year_to: '',
    has_pdf: false,
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['papers', searchQuery, filters],
    queryFn: () => papersApi.list({
      page: 1,
      page_size: 50,
      ...(filters.journal && { journal: filters.journal }),
      ...(filters.year_from && { year: parseInt(filters.year_from) }),
    }).then((res) => res.data),
    enabled: false,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    refetch()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilters({
      journal: '',
      year_from: '',
      year_to: '',
      has_pdf: false,
    })
  }

  const hasActiveFilters = searchQuery || filters.journal || filters.year_from || filters.year_to || filters.has_pdf

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Search className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">搜索文献</h1>
              <p className="text-sm text-slate-500">通过关键词、期刊、年份等条件查找文献</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            {/* Main Search */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索标题、作者、摘要..."
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                className="btn-primary px-8"
              >
                <Search className="h-4 w-4" />
                搜索
              </button>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center gap-2 text-sm font-medium transition-colors
                  ${showFilters ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}
                `}
              >
                <Filter className="h-4 w-4" />
                筛选条件
                {hasActiveFilters && (
                  <span className="h-2 w-2 bg-blue-500 rounded-full" />
                )}
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  清除所有
                </button>
              )}
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    期刊/会议
                  </label>
                  <input
                    type="text"
                    value={filters.journal}
                    onChange={(e) => setFilters({ ...filters, journal: e.target.value })}
                    className="academic-input"
                    placeholder="期刊名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    起始年份
                  </label>
                  <input
                    type="number"
                    value={filters.year_from}
                    onChange={(e) => setFilters({ ...filters, year_from: e.target.value })}
                    className="academic-input"
                    placeholder="2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    截止年份
                  </label>
                  <input
                    type="number"
                    value={filters.year_to}
                    onChange={(e) => setFilters({ ...filters, year_to: e.target.value })}
                    className="academic-input"
                    placeholder="2024"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.has_pdf}
                      onChange={(e) => setFilters({ ...filters, has_pdf: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">仅显示有 PDF</span>
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="loading-spinner h-12 w-12" />
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              找到 <span className="font-semibold text-slate-900">{data.total}</span> 篇文献
            </p>
          </div>

          {data.items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="empty-state py-16">
                <div className="h-20 w-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Search className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">没有找到匹配的文献</h3>
                <p className="text-sm text-slate-500">尝试调整搜索条件或筛选器</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((paper: any, index: number) => (
                <Link
                  key={paper.id}
                  to={`/papers/${paper.id}`}
                  className="group block bg-white rounded-2xl border border-slate-200/60 p-6
                    transition-all duration-300 ease-out
                    hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 hover:-translate-y-0.5"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="h-14 w-14 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl flex items-center justify-center border border-slate-200 group-hover:border-blue-200 group-hover:from-blue-50 group-hover:to-blue-50/50 transition-all duration-200">
                        <FileText className="h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
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

                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {paper.title}
                      </h3>

                      {/* Authors */}
                      <p className="text-sm text-slate-600 mb-3">
                        {paper.authors?.map((a: any) => a.name).join(', ')}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                        {paper.journal && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>{paper.journal}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="font-medium">{paper.year}</span>
                        </div>
                        {paper.doi && (
                          <div className="hidden sm:flex items-center gap-1.5">
                            <span className="text-slate-400">DOI:</span>
                            <span className="truncate max-w-[200px]">{paper.doi}</span>
                          </div>
                        )}
                      </div>

                      {/* Abstract */}
                      {paper.abstract && (
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                          {paper.abstract}
                        </p>
                      )}

                      {/* Keywords */}
                      {paper.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {paper.keywords.slice(0, 5).map((keyword: string) => (
                            <span
                              key={keyword}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                              {keyword}
                            </span>
                          ))}
                          {paper.keywords.length > 5 && (
                            <span className="text-xs text-slate-400">
                              +{paper.keywords.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 self-center">
                      <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
