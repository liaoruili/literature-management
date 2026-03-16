"""Note API endpoints - Fixed version using raw SQL."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text

from app.api.deps import DbSession

router = APIRouter()


@router.post("/papers/{paper_id}/notes", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_note(
    paper_id: uuid.UUID,
    note_data: dict,
    db: DbSession = None,
) -> dict:
    """Create a new note for a paper."""
    
    # Validate paper exists
    result = await db.execute(text("SELECT id FROM papers WHERE id = :paper_id"), {'paper_id': str(paper_id)})
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with id {paper_id} not found",
        )
    
    note_id = uuid.uuid4()
    
    import json
    
    # Insert using raw SQL
    await db.execute(text("""
        INSERT INTO notes (
            id, paper_id, content, tags, ai_generated, ai_model, 
            created_at, updated_at
        ) VALUES (
            :id, :paper_id, :content, :tags, :ai_generated, :ai_model, 
            :created_at, :updated_at
        )
    """), {
        'id': str(note_id),
        'paper_id': str(paper_id),
        'content': note_data.get('content', ''),
        'tags': json.dumps(note_data.get('tags', [])),
        'ai_generated': note_data.get('ai_generated', False),
        'ai_model': note_data.get('ai_model'),
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    })
    
    await db.commit()
    
    return {
        'id': str(note_id),
        'paper_id': str(paper_id),
        'content': note_data.get('content', ''),
        'tags': note_data.get('tags', []),
        'ai_generated': note_data.get('ai_generated', False),
        'ai_model': note_data.get('ai_model'),
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat(),
    }


@router.get("/papers/{paper_id}/notes")
async def list_notes(
    paper_id: uuid.UUID,
    db: DbSession = None,
) -> dict:
    """List all notes for a specific paper."""
    
    result = await db.execute(text("""
        SELECT id, paper_id, content, tags, ai_generated, ai_model, created_at, updated_at
        FROM notes
        WHERE paper_id = :paper_id
        ORDER BY created_at DESC
    """), {'paper_id': str(paper_id)})
    
    rows = result.fetchall()
    
    return {
        'items': [
            {
                'id': str(row.id),
                'paper_id': str(row.paper_id),
                'content': row.content,
                'tags': row.tags if row.tags else [],
                'ai_generated': row.ai_generated,
                'ai_model': row.ai_model,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in rows
        ],
        'total': len(rows),
    }


@router.delete("/papers/{paper_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    paper_id: uuid.UUID,
    db: DbSession = None,
) -> None:
    """Delete a note."""
    
    await db.execute(text("""
        DELETE FROM notes WHERE id = :note_id
    """), {'note_id': str(note_id)})
    
    await db.commit()


@router.put("/papers/{paper_id}/notes/{note_id}", response_model=dict)
async def update_note(
    note_id: uuid.UUID,
    paper_id: uuid.UUID,
    note_data: dict,
    db: DbSession = None,
) -> dict:
    """Update a note."""
    
    import json
    
    # Get existing note
    result = await db.execute(text("""
        SELECT id, content, tags, ai_generated, ai_model FROM notes
        WHERE id = :note_id
    """), {'note_id': str(note_id)})
    
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Note with id {note_id} not found",
        )
    
    # Update fields
    update_fields = []
    params = {'note_id': str(note_id)}
    
    if 'content' in note_data:
        update_fields.append('content = :content')
        params['content'] = note_data['content']
    
    if 'tags' in note_data:
        update_fields.append('tags = :tags')
        params['tags'] = json.dumps(note_data['tags'])  # Convert list to JSON string
    
    if 'ai_generated' in note_data:
        update_fields.append('ai_generated = :ai_generated')
        params['ai_generated'] = note_data['ai_generated']
    
    update_fields.append('updated_at = :updated_at')
    params['updated_at'] = datetime.utcnow()
    
    query = f"""
        UPDATE notes SET {', '.join(update_fields)}
        WHERE id = :note_id
    """
    
    await db.execute(text(query), params)
    await db.commit()
    
    # Return updated note
    result = await db.execute(text("""
        SELECT id, paper_id, content, tags, ai_generated, ai_model, created_at, updated_at
        FROM notes WHERE id = :note_id
    """), {'note_id': str(note_id)})
    
    row = result.fetchone()
    
    return {
        'id': str(row.id),
        'paper_id': str(row.paper_id),
        'content': row.content,
        'tags': row.tags if row.tags else [],
        'ai_generated': row.ai_generated,
        'ai_model': row.ai_model,
        'created_at': row.created_at.isoformat() if row.created_at else None,
        'updated_at': row.updated_at.isoformat() if row.updated_at else None,
    }
