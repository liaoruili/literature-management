import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import PaperList from './pages/PaperList'
import PaperDetail from './pages/PaperDetail'
import PaperForm from './pages/PaperForm'
import SearchPage from './pages/SearchPage'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<PaperList />} />
            <Route path="papers/new" element={<PaperForm />} />
            <Route path="papers/:id/edit" element={<PaperForm />} />
            <Route path="papers/:id" element={<PaperDetail />} />
            <Route path="search" element={<SearchPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
