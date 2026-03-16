import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  BookOpen,
  LayoutGrid,
  X,
  Download,
  Maximize2,
  Minimize2,
  List,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PDFViewerProps {
  url: string
  filename?: string
  onClose?: () => void
}

interface PDFOutline {
  title: string
  dest: any
  items?: PDFOutline[]
}

export default function PDFViewer({ url, filename = 'document.pdf', onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [showOutline, setShowOutline] = useState<boolean>(false)
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false)
  const [outline, setOutline] = useState<PDFOutline[]>([])
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [showToolbar, setShowToolbar] = useState<boolean>(true)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pdfDocumentRef = useRef<any>(null)
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])

  const calculateOptimalScale = useCallback(() => {
    if (viewerRef.current) {
      // 获取容器可用宽度（减去内边距）
      const containerW = viewerRef.current.clientWidth
      // 使用更小的边距，让 PDF 更紧凑
      const padding = 16 // 左右各 8px
      const availableWidth = containerW - padding

      // 更新容器宽度状态，用于 Page 组件的 width 属性
      setContainerWidth(availableWidth)

      // A4 页面在 72 DPI 下的宽度约为 595 PDF 单位
      // 但 react-pdf 的 scale 是相对于 72 DPI 的
      // 直接使用 width 属性让 Page 组件自动计算高度
      // 返回 1.0 表示使用原始尺寸，由 width 属性控制大小
      return 1.0
    }
    // 默认回退值
    return 1.0
  }, [])

  useEffect(() => {
    const handleResize = () => {
      // 使用防抖优化 resize 性能
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        const newScale = calculateOptimalScale()
        if (!loading && numPages > 0) {
          setScale(newScale)
        }
      }, 150)
    }

    window.addEventListener('resize', handleResize)
    // 初始计算
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [calculateOptimalScale, loading, numPages])

  const onDocumentLoadSuccess = useCallback(async (pdf: any) => {
    setNumPages(pdf.numPages)
    setError(null)
    pdfDocumentRef.current = pdf

    // 立即计算最优缩放比例，确保容器已渲染
    requestAnimationFrame(() => {
      const optimalScale = calculateOptimalScale()
      setScale(optimalScale)
      setLoading(false)
    })

    try {
      const outlineData = await pdf.getOutline()
      if (outlineData) {
        setOutline(outlineData as PDFOutline[])
      }
    } catch (err) {
      console.error('Failed to load outline:', err)
    }
  }, [calculateOptimalScale])

  const onDocumentLoadError = useCallback((error: Error) => {
    setLoading(false)
    let errorMessage = 'PDF 加载失败: ' + error.message
    
    // 针对常见错误提供更友好的提示
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      errorMessage = 'PDF 加载失败: 无法获取文件。可能是网络问题或文件不存在。'
    } else if (error.message?.includes('Invalid PDF') || error.message?.includes('Malformed')) {
      errorMessage = 'PDF 加载失败: 文件格式不正确或已损坏。'
    } else if (error.message?.includes('Missing PDF')) {
      errorMessage = 'PDF 加载失败: 文件不存在或已被删除。'
    }
    
    setError(errorMessage)
    console.error('PDF load error:', error)
  }, [])

  // 滚动到指定页面
  const scrollToPage = useCallback((page: number) => {
    const pageElement = pageRefs.current[page - 1]
    if (pageElement && viewerRef.current) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  useEffect(() => {
    if (showThumbnails && thumbnailContainerRef.current) {
      const thumbnail = thumbnailContainerRef.current.querySelector(`[data-page="${pageNumber}"]`)
      if (thumbnail) {
        thumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [pageNumber, showThumbnails])

  const goToPrevPage = useCallback(() => {
    const newPage = Math.max(pageNumber - 1, 1)
    scrollToPage(newPage)
  }, [pageNumber, scrollToPage])

  const goToNextPage = useCallback(() => {
    if (!numPages || numPages <= 0) return
    const newPage = Math.min(pageNumber + 1, numPages)
    scrollToPage(newPage)
  }, [pageNumber, numPages, scrollToPage])
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))
  const rotate = () => setRotation((prev) => (prev + 90) % 360)
  const resetZoom = () => {
    const optimalScale = calculateOptimalScale()
    setScale(optimalScale)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      setTimeout(() => {
        const optimalScale = calculateOptimalScale()
        setScale(optimalScale)
      }, 100)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [calculateOptimalScale])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        goToPrevPage()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        goToNextPage()
      }
      if (e.key === 'Home') {
        e.preventDefault()
        scrollToPage(1)
      }
      if (e.key === 'End') {
        e.preventDefault()
        scrollToPage(numPages)
      }
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, goToNextPage, goToPrevPage, scrollToPage, numPages])

  // 使用 Intersection Observer 检测当前可见页面
  useEffect(() => {
    if (!viewerRef.current || numPages === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 找到最可见的页面
        let maxVisiblePage = 1
        let maxVisibleRatio = 0

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxVisibleRatio) {
            const pageIndex = parseInt(entry.target.getAttribute('data-page-index') || '1')
            maxVisibleRatio = entry.intersectionRatio
            maxVisiblePage = pageIndex
          }
        })

        if (maxVisiblePage !== pageNumber) {
          setPageNumber(maxVisiblePage)
        }
      },
      {
        root: viewerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-10% 0px -10% 0px'
      }
    )

    // 观察所有页面元素
    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [numPages, pageNumber])

  // 允许正常滚动，不做分页拦截
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // 如果用户按住 Ctrl/Cmd 键（通常用于缩放），则不处理
    if (e.ctrlKey || e.metaKey) return
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只有在缩放比例大于1时才启用拖拽
    if (scale > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - scrollPosition.x, y: e.clientY - scrollPosition.y })
      if (viewerRef.current) {
        viewerRef.current.style.cursor = 'grabbing'
      }
    }
  }, [scale, scrollPosition])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && viewerRef.current) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setScrollPosition({ x: newX, y: newY })
      viewerRef.current.scrollLeft = -newX
      viewerRef.current.scrollTop = -newY
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    if (viewerRef.current) {
      viewerRef.current.style.cursor = scale > 1 ? 'grab' : 'default'
    }
  }, [scale])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
    if (viewerRef.current) {
      viewerRef.current.style.cursor = scale > 1 ? 'grab' : 'default'
    }
  }, [scale])

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  const navigateToDestination = useCallback(async (dest: any) => {
    try {
      if (!pdfDocumentRef.current) return

      const pdf = pdfDocumentRef.current
      let pageIndex = 0

      if (typeof dest === 'number') {
        pageIndex = dest
      } else if (Array.isArray(dest)) {
        if (dest[0] && typeof dest[0] === 'object' && dest[0].num) {
          pageIndex = await pdf.getPageIndex(dest[0])
        } else if (typeof dest[0] === 'number') {
          pageIndex = dest[0]
        } else if (dest[0] && typeof dest[0] === 'object') {
          try {
            pageIndex = await pdf.getPageIndex(dest[0])
          } catch {
            pageIndex = dest[0].num ? dest[0].num - 1 : 0
          }
        }
      } else if (typeof dest === 'string') {
        try {
          const destArray = await pdf.getDestination(dest)
          if (destArray && Array.isArray(destArray)) {
            if (destArray[0] && typeof destArray[0] === 'object') {
              pageIndex = await pdf.getPageIndex(destArray[0])
            } else if (typeof destArray[0] === 'number') {
              pageIndex = destArray[0]
            }
          }
        } catch (err) {
          console.error('Failed to resolve named destination:', err)
        }
      }

      const targetPage = Math.max(1, Math.min(pageIndex + 1, numPages))
      scrollToPage(targetPage)
    } catch (err) {
      console.error('Failed to navigate to destination:', err)
    }
  }, [numPages])

  const renderOutline = (items: PDFOutline[], level = 0) => {
    return items.map((item, index) => (
      <div key={index} className={`${level > 0 ? 'ml-3' : ''}`}>
        <button
          onClick={() => {
            if (item.dest) {
              navigateToDestination(item.dest)
            }
          }}
          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors truncate"
          style={{ paddingLeft: `${12 + level * 12}px` }}
          title={item.title}
        >
          {item.title}
        </button>
        {item.items && item.items.length > 0 && renderOutline(item.items, level + 1)}
      </div>
    ))
  }

  return (
    <div
      ref={containerRef}
      className={`
        flex flex-col bg-slate-100 overflow-hidden
        ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full rounded-xl'}
      `}
    >
      {/* Toolbar */}
      <div className={`
        flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0
        transition-transform duration-300
        ${showToolbar ? 'translate-y-0' : '-translate-y-full'}
      `}>
        <div className="flex items-center gap-1">
          {/* Outline Toggle */}
          <button
            onClick={() => {
              setShowOutline(!showOutline)
              setShowThumbnails(false)
            }}
            className={`
              p-2 rounded-lg transition-colors
              ${showOutline ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}
            `}
            title={showOutline ? '隐藏目录' : '显示目录'}
          >
            <BookOpen className="h-4 w-4" />
          </button>

          {/* Thumbnails Toggle */}
          <button
            onClick={() => {
              setShowThumbnails(!showThumbnails)
              setShowOutline(false)
            }}
            className={`
              p-2 rounded-lg transition-colors
              ${showThumbnails ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}
            `}
            title={showThumbnails ? '隐藏缩略图' : '显示缩略图'}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {/* Navigation */}
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="上一页"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="text-sm font-medium text-slate-700 min-w-[70px] text-center">
            {pageNumber} / {numPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="下一页"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <button
            onClick={zoomOut}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="缩小"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          <button
            onClick={resetZoom}
            className="text-sm font-medium text-slate-700 min-w-[60px] text-center hover:text-blue-600 transition-colors"
            title="重置缩放"
          >
            {Math.round(scale * 100)}%
          </button>

          <button
            onClick={zoomIn}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="放大"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {/* Rotate */}
          <button
            onClick={rotate}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="旋转"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Download */}
          <a
            href={url}
            download={filename}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="下载 PDF"
          >
            <Download className="h-4 w-4" />
          </a>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? '退出全屏' : '全屏'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Close */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors ml-1"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar Toggle */}
      <button
        onClick={() => setShowToolbar(!showToolbar)}
        className={`
          absolute left-1/2 -translate-x-1/2 z-10 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm
          transition-all duration-300 hover:bg-slate-50
          ${showToolbar ? 'top-[52px]' : 'top-2'}
        `}
      >
        {showToolbar ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Outline Panel */}
        {showOutline && outline.length > 0 && (
          <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto scrollbar-smooth flex-shrink-0">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <List className="h-4 w-4 text-slate-500" />
                目录
              </h3>
            </div>
            <div className="py-2">
              {renderOutline(outline)}
            </div>
          </div>
        )}

        {/* Thumbnails Panel */}
        {showThumbnails && (
          <div
            ref={thumbnailContainerRef}
            className="w-48 bg-white border-r border-slate-200 overflow-y-auto scrollbar-smooth flex-shrink-0"
          >
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                <LayoutGrid className="h-4 w-4 text-slate-500" />
                缩略图
              </h3>
            </div>
            <div className="p-3 space-y-2">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  data-page={page}
                  onClick={() => scrollToPage(page)}
                  className={`
                    w-full p-2 rounded-xl transition-all duration-200
                    ${page === pageNumber
                      ? 'bg-blue-50 ring-2 ring-blue-500'
                      : 'hover:bg-slate-50'
                    }
                  `}
                >
                  <Document file={url} loading={null} error={null}>
                    <Page
                      pageNumber={page}
                      width={100}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                  <span className="text-xs font-medium text-slate-600 mt-1 block">{page}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        <div
          ref={viewerRef}
          className={`flex-1 overflow-auto bg-slate-100 relative scrollbar-smooth ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="loading-spinner h-12 w-12" />
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="h-16 w-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-rose-500" />
                </div>
                <p className="text-slate-700 mb-4 font-medium">{error}</p>
                <div className="space-y-2">
                  <a
                    href={url}
                    download={filename}
                    className="btn-primary inline-flex"
                  >
                    <Download className="h-4 w-4" />
                    下载 PDF 文件
                  </a>
                  <p className="text-xs text-slate-400">
                    如果预览无法加载，请尝试下载后查看
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-full p-2">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              error={null}
            >
              {/* 连续滚动模式：渲染所有页面 */}
              <div className="flex flex-col items-center gap-4">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
                  <div
                    key={page}
                    ref={(el) => { pageRefs.current[page - 1] = el }}
                    data-page-index={page}
                    className="scroll-mt-4"
                  >
                    <Page
                      pageNumber={page}
                      scale={scale}
                      rotate={rotation}
                      className="shadow-2xl shadow-slate-400/50 bg-white"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      width={containerWidth > 100 ? containerWidth : undefined}
                      loading={
                        <div className="w-full h-32 flex items-center justify-center">
                          <div className="loading-spinner h-8 w-8" />
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>
            </Document>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-200 text-xs text-slate-500 flex-shrink-0">
        <span className="truncate max-w-[50%] sm:max-w-[60%] md:max-w-[70%] font-medium" title={filename}>{filename}</span>
        <span className="hidden sm:inline text-slate-400 flex-shrink-0 ml-4">
          连续滚动 | ↑↓←→ 导航 | Home/End 跳转到首尾
        </span>
      </div>
    </div>
  )
}
