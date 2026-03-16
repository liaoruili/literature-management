import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { papersApi, notesApi } from '../services/api'

export function usePapers(params?: { journal?: string; year?: number }) {
  return useQuery({
    queryKey: ['papers', params],
    queryFn: () => papersApi.list(params).then((res) => res.data),
  })
}

export function usePaper(id: string) {
  return useQuery({
    queryKey: ['paper', id],
    queryFn: () => papersApi.get(id).then((res) => res.data),
    enabled: !!id,
  })
}

export function useCreatePaper() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => papersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] })
    },
  })
}

export function useDeletePaper() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => papersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['papers'] })
    },
  })
}

export function useNotes(paperId: string) {
  return useQuery({
    queryKey: ['notes', paperId],
    queryFn: () => notesApi.list(paperId).then((res) => res.data),
    enabled: !!paperId,
  })
}

export function useCreateNote(paperId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: any) => notesApi.create(paperId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', paperId] })
    },
  })
}
