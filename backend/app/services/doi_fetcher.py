"""
DOI Metadata Fetcher Service

Fetches bibliographic metadata from Crossref API using DOI.
Supports automatic metadata extraction for academic papers.
"""

import httpx
from typing import Optional, Dict, Any, List


class DOIMetadataFetcher:
    """Service for fetching metadata from DOI using Crossref API."""
    
    CROSSREF_API = "https://api.crossref.org/works"
    
    @classmethod
    async def fetch_by_doi(cls, doi: str) -> Optional[Dict[str, Any]]:
        """
        Fetch metadata for a given DOI.
        
        Args:
            doi: The DOI string (with or without '10.' prefix)
            
        Returns:
            Dictionary containing paper metadata, or None if failed
        """
        # Clean DOI - remove prefixes and whitespace
        clean_doi = doi.strip()
        if clean_doi.startswith('https://doi.org/'):
            clean_doi = clean_doi.replace('https://doi.org/', '')
        elif clean_doi.startswith('doi:'):
            clean_doi = clean_doi.replace('doi:', '').strip()
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{cls.CROSSREF_API}/{clean_doi}"
                headers = {
                    'Accept': 'application/json',
                    'User-Agent': 'LiteratureDatabase/0.1.0 (mailto:support@example.com)'
                }
                
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                
                if data['status'] == 'ok' and 'message' in data:
                    return cls._parse_crossref_metadata(data['message'])
                    
        except httpx.RequestError:
            return None
        except Exception:
            return None
        
        return None
    
    @classmethod
    def _clean_abstract(cls, abstract: str) -> str:
        """
        Clean abstract text by removing XML tags and extra whitespace.
        
        Args:
            abstract: Raw abstract text (may contain XML tags like <jats:p>)
            
        Returns:
            Cleaned abstract text
        """
        import re
        
        if not abstract:
            return ''
        
        # Remove JATS XML tags (<jats:p>, </jats:p>, etc.)
        cleaned = re.sub(r'<jats:[^>]+>', '', abstract)
        cleaned = re.sub(r'</jats:[^>]+>', '', cleaned)
        
        # Remove other common XML/HTML tags
        cleaned = re.sub(r'<[^>]+>', '', cleaned)
        
        # Remove extra whitespace and newlines
        cleaned = re.sub(r'\s+', ' ', cleaned)
        
        # Remove standalone parentheses content that looks like JEL codes
        # But keep the text before them
        jel_pattern = r'\s*\(JEL\s+[A-Z0-9,\s]+\)'
        cleaned = re.sub(jel_pattern, '', cleaned)
        
        return cleaned.strip()
    
    @classmethod
    def _parse_crossref_metadata(cls, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Crossref API response into our schema format.
        
        Args:
            message: Crossref API message object
            
        Returns:
            Dictionary matching our PaperCreate schema
        """
        # Extract authors
        authors = []
        if 'author' in message:
            for author in message['author']:
                name_parts = []
                if 'given' in author:
                    name_parts.append(author['given'])
                if 'family' in author:
                    name_parts.append(author['family'])
                if 'name' in author:  # Fallback for single-name authors
                    name_parts = [author['name']]
                
                if name_parts:
                    authors.append({
                        'name': ' '.join(name_parts),
                        'affiliation': author.get('affiliation', [{}])[0].get('name') if author.get('affiliation') else None
                    })
        
        # Extract title
        title = ''
        if 'title' in message and message['title']:
            title = message['title'][0]
        elif 'container-title' in message and message['container-title']:
            title = message['container-title'][0]
        
        # Extract journal/book title
        journal = ''
        if 'container-title' in message and message['container-title']:
            journal = ' / '.join(message['container-title'])
        elif 'short-container-title' in message and message['short-container-title']:
            journal = ' / '.join(message['short-container-title'])
        
        # Extract year
        year = 2024
        if 'published' in message and 'date-parts' in message['published']:
            date_parts = message['published']['date-parts']
            if date_parts and len(date_parts[0]) >= 1:
                year = int(date_parts[0][0])
        elif 'created' in message and 'date-parts' in message['created']:
            date_parts = message['created']['date-parts']
            if date_parts and len(date_parts[0]) >= 1:
                year = int(date_parts[0][0])
        
        # Extract volume, issue, pages
        volume = message.get('volume', '')
        number = message.get('issue', '')
        pages = message.get('page', '')
        
        # Extract abstract (if available) and clean it
        abstract = ''
        if 'abstract' in message:
            abstract = cls._clean_abstract(message['abstract'])
        
        # Extract keywords
        keywords = []
        if 'subject' in message:
            keywords = [{'name': subj} for subj in message['subject'][:5]]  # Limit to 5
        
        # Extract URL
        url = ''
        if 'URL' in message:
            url = message['URL']
        elif 'link' in message and message['link']:
            for link in message['link']:
                if link.get('intended-application') == 'text-mining':
                    url = link['URL']
                    break
        
        return {
            'title': title,
            'authors': authors,
            'journal': journal,
            'year': year,
            'volume': str(volume) if volume else '',
            'number': str(number) if number else '',
            'pages': pages,
            'doi': message.get('DOI', ''),
            'abstract': abstract,
            'keywords': keywords,
            'url': url,
            'note': '',
        }


# Test function
async def test_doi_fetch():
    """Test DOI fetching with a known DOI."""
    test_dois = [
        '10.1038/nature12373',  # Nature paper
        '10.1257/aer.20240001',  # AER paper
    ]
    
    for doi in test_dois:
        print(f"\nTesting DOI: {doi}")
        result = await DOIMetadataFetcher.fetch_by_doi(doi)
        if result:
            print(f"✓ Title: {result['title']}")
            print(f"✓ Authors: {len(result['authors'])} authors")
            print(f"✓ Journal: {result['journal']}")
            print(f"✓ Year: {result['year']}")
        else:
            print(f"✗ Failed to fetch metadata")


if __name__ == '__main__':
    import asyncio
    asyncio.run(test_doi_fetch())
