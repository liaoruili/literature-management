import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { papersApi } from '../services/api'
import { Clock, Calendar, BookOpen, TrendingUp, FileText, Paperclip, ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { Paper } from '../types'

interface SidebarProps {
  onFilterByJournal?: (journal: string) => void
  onFilterByYear?: (year: number) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  selectedJournals?: string[]
  selectedYear?: number
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  defaultExpanded?: boolean
  children: React.ReactNode
  badge?: string | number
}

function CollapsibleSection({ title, icon, iconColor, defaultExpanded = true, children, badge }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className={iconColor}>{icon}</span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
          {badge !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  )
}

export default function Sidebar({
  onFilterByJournal,
  onFilterByYear,
  isCollapsed = false,
  onToggleCollapse,
  selectedJournals = [],
  selectedYear
}: SidebarProps) {
  const navigate = useNavigate()

  const { data: papersData } = useQuery({
    queryKey: ['papers-sidebar'],
    queryFn: () => papersApi.list({ page: 1, page_size: 100 }).then((res) => res.data),
  })

  const papers = papersData?.items || []

  // 最新添加的文献（按创建时间）
  const recentlyAdded = useMemo(() => {
    return [...papers]
      .sort((a: Paper, b: Paper) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [papers])

  // 最新发表的文献（按发表年份）
  const recentlyPublished = useMemo(() => {
    return [...papers]
      .sort((a: Paper, b: Paper) => (b.year || 0) - (a.year || 0))
      .slice(0, 5)
  }, [papers])

  // 期刊统计排行
  const journalStats = useMemo(() => {
    const stats: Record<string, number> = {}
    papers.forEach((paper: Paper) => {
      if (paper.journal) {
        stats[paper.journal] = (stats[paper.journal] || 0) + 1
      }
    })
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [papers])

  // 年份统计
  const yearStats = useMemo(() => {
    const stats: Record<number, number> = {}
    papers.forEach((paper: Paper) => {
      if (paper.year) {
        stats[paper.year] = (stats[paper.year] || 0) + 1
      }
    })
    return Object.entries(stats)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year)
      .slice(0, 5)
  }, [papers])

  const handleJournalClick = (journal: string) => {
    if (onFilterByJournal) {
      onFilterByJournal(journal)
    } else {
      navigate(`/?journal=${encodeURIComponent(journal)}`)
    }
  }

  const handleYearClick = (year: number) => {
    if (onFilterByYear) {
      onFilterByYear(year)
    } else {
      navigate(`/?year=${year}`)
    }
  }

  // Collapsed state - minimal sidebar
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-white border-r border-slate-200/60 flex flex-col h-full">
        {/* Toggle Button */}
        <div className="p-2 border-b border-slate-100">
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
            title="展开导航"
          >
            <PanelLeftOpen className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Quick Stats Icons */}
        <div className="flex-1 py-2 space-y-1">
          {recentlyAdded.length > 0 && (
            <div className="px-2 pt-2">
              <Link
                to={`/papers/${recentlyAdded[0].id}`}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                title="最新添加"
              >
                <Clock className="h-4 w-4" />
              </Link>
            </div>
          )}

          {journalStats.length > 0 && (
            <div className="px-2">
              <button
                onClick={() => handleJournalClick(journalStats[0][0])}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"
                title={`热门期刊: ${journalStats[0][0]}`}
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="p-2 border-t border-slate-100">
          <div className="w-10 h-10 flex flex-col items-center justify-center rounded-xl bg-slate-50">
            <span className="text-xs font-bold text-slate-700">{papers.length}</span>
            <span className="text-[8px] text-slate-400">篇</span>
          </div>
        </div>
      </aside>
    )
  }

  // Expanded state - full sidebar
  return (
    <aside className="w-72 bg-white border-r border-slate-200/60 flex flex-col h-full">
      {/* Header - Toggle Only */}
      <div className="flex items-center justify-end px-3 py-2 border-b border-slate-100">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title="收起导航"
        >
          <PanelLeftClose className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-smooth">
        {/* Collapsible Sections */}
        {recentlyAdded.length > 0 && (
          <CollapsibleSection
            title="最新添加"
            icon={<Clock className="h-4 w-4" />}
            iconColor="text-blue-500"
            defaultExpanded={true}
            badge={recentlyAdded.length}
          >
            <div className="px-3 pb-3 space-y-1">
              {recentlyAdded.map((paper) => (
                <Link
                  key={paper.id}
                  to={`/papers/${paper.id}`}
                  className="group block p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
                >
                  <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2 leading-relaxed">
                    {paper.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                    <span>{paper.year}</span>
                    {paper.journal && (
                      <span className="line-clamp-1">• {paper.journal}</span>
                    )}
                    {paper.has_files && (
                      <Paperclip className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {recentlyPublished.length > 0 && (
          <CollapsibleSection
            title="最新发表"
            icon={<Calendar className="h-4 w-4" />}
            iconColor="text-emerald-500"
            defaultExpanded={false}
            badge={recentlyPublished.length}
          >
            <div className="px-3 pb-3 space-y-1">
              {recentlyPublished.map((paper) => (
                <Link
                  key={paper.id}
                  to={`/papers/${paper.id}`}
                  className="group block p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
                >
                  <p className="text-xs font-medium text-slate-700 group-hover:text-slate-900 line-clamp-2 leading-relaxed">
                    {paper.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                    <span>{paper.year}</span>
                    {paper.journal && (
                      <span className="line-clamp-1">• {paper.journal}</span>
                    )}
                    {paper.has_files && (
                      <Paperclip className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {journalStats.length > 0 && (
          <CollapsibleSection
            title="热门期刊"
            icon={<BookOpen className="h-4 w-4" />}
            iconColor="text-violet-500"
            defaultExpanded={false}
            badge={journalStats.length}
          >
            <div className="px-3 pb-3 space-y-1">
              {journalStats.map(([journal, count]) => {
                const isSelected = selectedJournals.includes(journal)
                return (
                  <button
                    key={journal}
                    onClick={() => handleJournalClick(journal)}
                    className={`
                      w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-200 group text-left
                      ${isSelected
                        ? 'bg-violet-100 border-violet-300 text-violet-900'
                        : 'bg-slate-50 hover:bg-violet-50 border-transparent hover:border-violet-100'
                      }
                    `}
                  >
                    <span className={`text-xs line-clamp-1 ${isSelected ? 'text-violet-900 font-medium' : 'text-slate-700 group-hover:text-violet-700'}`}>
                      {journal}
                    </span>
                    <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${isSelected ? 'bg-violet-200 text-violet-800' : 'text-slate-400 bg-white'}`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>
        )}

        {yearStats.length > 0 && (
          <CollapsibleSection
            title="年份分布"
            icon={<TrendingUp className="h-4 w-4" />}
            iconColor="text-rose-500"
            defaultExpanded={false}
            badge={yearStats.length}
          >
            <div className="px-3 pb-3 flex flex-wrap gap-1.5">
              {yearStats.map(({ year, count }) => {
                const isSelected = selectedYear === year
                return (
                  <button
                    key={year}
                    onClick={() => handleYearClick(year)}
                    className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200
                      ${isSelected
                        ? 'bg-rose-100 border-rose-300 text-rose-900'
                        : 'bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                      }
                    `}
                  >
                    <span className={`text-xs font-medium ${isSelected ? 'text-rose-900' : 'text-slate-700 group-hover:text-rose-700'}`}>{year}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-rose-700' : 'text-slate-400 group-hover:text-rose-500'}`}>{count}</span>
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Footer - Stats Only */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
          <FileText className="h-4 w-4" />
          <span>{papers.length} 篇文献</span>
        </div>
      </div>
    </aside>
  )
}
