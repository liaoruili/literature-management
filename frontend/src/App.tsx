import { Outlet, Link, useLocation } from 'react-router-dom'
import { BookOpen, FileText, Search, Home, Sparkles } from 'lucide-react'
import { Toaster } from 'sonner'

export default function App() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '文献列表', icon: FileText },
    { path: '/search', label: '搜索', icon: Search },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header - Modern Academic Style */}
      <header className="flex-shrink-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:bg-blue-500/30 transition-all duration-300" />
                <div className="relative h-9 w-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Literature DB
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  学术文献管理系统
                </span>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200 ease-out
                      ${active
                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }
                    `}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content - 使用 flex-1 和 overflow-hidden 避免外部滚动，但允许 Outlet 内部滚动 */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        <div className="h-full max-w-[1800px] mx-auto animate-fade-in overflow-y-auto scrollbar-smooth">
          <Outlet />
        </div>
      </main>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
          },
        }}
      />

      {/* Footer - Minimal - 固定高度 */}
      <footer className="flex-shrink-0 bg-white border-t border-slate-200/60">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="text-sm">
                Literature Database v0.1.0
              </span>
            </div>
            <p className="text-sm text-slate-400">
              Powered by FastAPI + React + Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
