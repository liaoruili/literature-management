export interface Author {
  name: string
  affiliation?: string
}

export interface Paper {
  id: string
  citation_key: string
  title: string
  authors: Author[]
  journal?: string
  year: number
  volume?: string
  number?: string
  pages?: string
  doi?: string
  abstract?: string
  keywords: string[]
  jel_codes: string[]
  url?: string
  note?: string
  pdf_uploaded: boolean
  citation_count: number
  created_at: string
  updated_at: string
}

export interface Note {
  id: string
  paper_id: string
  content: string
  tags: string[]
  ai_generated: boolean
  ai_model?: string
  created_at: string
  updated_at: string
}

export interface Journal {
  id: string
  name: string
  abbreviation?: string
  issn?: string
  publisher?: string
  website_url?: string
  auto_update_enabled: boolean
  update_frequency_days: number
  created_at: string
}
