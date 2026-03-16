import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesApi } from '../services/api'
import { Plus, Trash2, Edit2, Tag, MessageSquare, X, Check, Sparkles, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Note {
  id: string
  content: string
  tags: string[]
  created_at: string
  updated_at: string
  ai_generated?: boolean
}

interface PaperNotesProps {
  paperId: string
}

export default function PaperNotes({ paperId }: PaperNotesProps) {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteTags, setNoteTags] = useState('')
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<Note | null>(null)

  const { data: notesData } = useQuery({
    queryKey: ['notes', paperId],
    queryFn: () => notesApi.list(paperId).then((res) => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => notesApi.create(paperId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] })
      setShowAddForm(false)
      setNoteContent('')
      setNoteTags('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => notesApi.update(paperId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] })
      setEditingNoteId(null)
      setNoteContent('')
      setNoteTags('')
    },
    onError: (error: any) => {
      console.error('Update note error:', error)
      alert('更新失败：' + (error.response?.data?.detail || '未知错误'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notesApi.delete(paperId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] })
      setDeleteConfirmNote(null)
      toast.success('笔记已删除', {
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

  const handleCreate = () => {
    if (!noteContent.trim()) return
    createMutation.mutate({
      content: noteContent,
      tags: noteTags.split(',').map((t: string) => t.trim()).filter(Boolean),
    })
  }

  const handleUpdate = () => {
    if (!noteContent.trim() || !editingNoteId) return
    updateMutation.mutate({
      id: editingNoteId,
      data: {
        content: noteContent,
        tags: noteTags.split(',').map((t: string) => t.trim()).filter(Boolean),
      },
    })
  }

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id)
    setNoteContent(note.content)
    setNoteTags(note.tags?.join(', ') || '')
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingNoteId(null)
    setNoteContent('')
    setNoteTags('')
  }

  const notes = notesData?.items || []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl flex items-center justify-center border border-violet-200">
            <MessageSquare className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">笔记</h3>
            {notes.length > 0 && (
              <span className="text-xs text-slate-500">{notes.length} 条笔记</span>
            )}
          </div>
        </div>
        {!showAddForm && !editingNoteId && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary text-sm"
          >
            <Plus className="h-4 w-4" />
            添加笔记
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingNoteId) && (
        <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200 animate-fade-in">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                笔记内容
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="academic-input h-32 resize-none"
                placeholder="记录你的想法、总结或问题..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                标签（用逗号分隔）
              </label>
              <input
                type="text"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                className="academic-input"
                placeholder="重要，待读，方法"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={editingNoteId ? handleUpdate : handleCreate}
                disabled={createMutation.isPending || updateMutation.isPending || !noteContent.trim()}
                className="btn-primary flex-1 sm:flex-none"
              >
                <Check className="h-4 w-4" />
                {editingNoteId ? '更新' : '保存'}
              </button>
              <button
                onClick={editingNoteId ? cancelEdit : () => { setShowAddForm(false); setNoteContent(''); setNoteTags('') }}
                className="btn-outline"
              >
                <X className="h-4 w-4" />
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <MessageSquare className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-600 mb-1">还没有笔记</p>
          <p className="text-xs text-slate-400">点击上方按钮添加第一篇笔记</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note: Note, index: number) => (
            <div
              key={note.id}
              className={`
                p-5 rounded-xl border transition-all duration-200
                ${editingNoteId === note.id
                  ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {editingNoteId === note.id ? (
                <div className="flex items-center gap-2 text-sm text-violet-600">
                  <Edit2 className="h-4 w-4" />
                  正在编辑...
                </div>
              ) : (
                <>
                  {/* Note Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(note.created_at).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      {note.ai_generated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200">
                          <Sparkles className="h-3 w-3" />
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmNote(note)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Note Content */}
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed mb-3">
                    {note.content}
                  </p>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {note.tags.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal - 居中显示 */}
      {deleteConfirmNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setDeleteConfirmNote(null)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                确认删除笔记
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                确定要删除这篇笔记吗？此操作不可恢复。
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeleteConfirmNote(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirmNote.id)}
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
