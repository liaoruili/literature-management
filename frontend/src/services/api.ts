import axios from 'axios'

const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://172.10.0.100:8001/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Papers API
export const papersApi = {
  list: (params?: { page?: number; page_size?: number; journal?: string | string[]; year?: number; has_pdf?: boolean }) =>
    api.get('/papers', { params }),

  get: (id: string) => api.get(`/papers/${id}`),

  create: (data: any) => api.post('/papers', data),

  update: (id: string, data: any) => api.put(`/papers/${id}`, data),

  delete: (id: string) => api.delete(`/papers/${id}`),

  getBibtex: (id: string) => api.get(`/papers/${id}/bib`),

  checkDoi: (doi: string) => api.get('/papers/check-doi', { params: { doi } }),

  fetchDoi: (doi: string) => api.get('/papers/fetch-doi', { params: { doi } }),

  getDoiDiff: (id: string, doi: string) => api.get(`/papers/${id}/doi-diff`, { params: { doi } }),

  uploadPdf: (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/papers/${id}/pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getPdf: (id: string) => `${API_BASE_URL}/papers/${id}/pdf`,

  // Paper Files API (multiple files support)
  getFiles: (paperId: string) => api.get(`/papers/${paperId}/files`),

  uploadFile: (paperId: string, file: File, category: string, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/papers/${paperId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { category, description },
    })
  },

  getFileDownloadUrl: (paperId: string, fileId: string) =>
    `${API_BASE_URL}/papers/${paperId}/files/${fileId}/download`,

  deleteFile: (paperId: string, fileId: string) =>
    api.delete(`/papers/${paperId}/files/${fileId}`),

  updateFile: (paperId: string, fileId: string, data: { original_filename?: string; description?: string }) =>
    api.put(`/papers/${paperId}/files/${fileId}`, data),
}

// Notes API
export const notesApi = {
  list: (paperId: string, params?: { page?: number; page_size?: number }) =>
    api.get(`/papers/${paperId}/notes`, { params }),

  create: (paperId: string, data: any) => api.post(`/papers/${paperId}/notes`, data),

  update: (paperId: string, id: string, data: any) => api.put(`/papers/${paperId}/notes/${id}`, data),

  delete: (paperId: string, id: string) => api.delete(`/papers/${paperId}/notes/${id}`),
}

// Search API
export const searchApi = {
  search: (params: any) => api.get('/search', { params }),
}

// Journals API
export const journalsApi = {
  list: (params?: { page?: number; page_size?: number }) => api.get('/journals', { params }),
}
