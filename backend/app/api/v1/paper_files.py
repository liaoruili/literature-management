"""Paper files API endpoints - Fixed version using raw SQL."""

import uuid
from pathlib import Path
from datetime import datetime
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import text

from app.api.deps import DbSession, PaperDependency
from app.config import settings

router = APIRouter()

ALLOWED_CATEGORIES = ["pdf", "supplementary_data", "code", "other"]
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/{paper_id}/files", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_file(
    paper_id: uuid.UUID,
    file: Annotated[UploadFile, File()],
    category: Annotated[str, Query()] = "other",
    description: Annotated[str | None, Query()] = None,
    db: DbSession = None,
    paper: PaperDependency = None,
) -> dict:
    """Upload a file (PDF or supplementary material) for a paper."""
    
    # Validate category
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(ALLOWED_CATEGORIES)}"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // 1024 // 1024}MB"
        )
    
    # Get original filename and extension
    original_filename = file.filename or "unnamed"
    file_extension = Path(original_filename).suffix.lower().lstrip('.')
    
    # Generate unique filename
    file_uuid = uuid.uuid4()
    safe_filename = f"{file_uuid}.{file_extension}" if file_extension else str(file_uuid)
    file_type = file_extension or "unknown"
    
    # Save file - 使用相对路径存储，便于迁移和容器化部署
    relative_path = f"files/{paper_id}/{safe_filename}"
    storage_path = Path(settings.PDF_STORAGE_PATH) / relative_path
    
    try:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create storage directory: {str(e)}"
        )
    
    try:
        with open(storage_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Insert using raw SQL - 存储相对路径
    await db.execute(text("""
        INSERT INTO paper_files (
            id, paper_id, filename, original_filename, file_type, 
            file_size, description, category, file_path, created_at, updated_at
        ) VALUES (
            :id, :paper_id, :filename, :original_filename, :file_type,
            :file_size, :description, :category, :file_path, :created_at, :updated_at
        )
    """), {
        'id': str(file_uuid),
        'paper_id': str(paper_id),
        'filename': safe_filename,
        'original_filename': original_filename,
        'file_type': file_type,
        'file_size': file_size,
        'description': description,
        'category': category,
        'file_path': relative_path,  # 存储相对路径
        'created_at': datetime.utcnow(),
        'updated_at': datetime.utcnow(),
    })
    
    await db.commit()
    
    return {
        'id': str(file_uuid),
        'paper_id': str(paper_id),
        'filename': safe_filename,
        'original_filename': original_filename,
        'file_type': file_type,
        'file_size': file_size,
        'description': description,
        'category': category,
        'file_path': relative_path,
    }


@router.get("/{paper_id}/files")
async def list_files(
    paper_id: uuid.UUID,
    category: str | None = Query(None),
    db: DbSession = None,
    paper: PaperDependency = None,
):
    """List all files attached to a paper."""
    
    query = """
        SELECT id, paper_id, filename, original_filename, file_type, 
               file_size, description, category, file_path, created_at, updated_at
        FROM paper_files
        WHERE paper_id = :paper_id
    """
    params = {'paper_id': str(paper_id)}
    
    if category:
        query += " AND category = :category"
        params['category'] = category
    
    query += " ORDER BY created_at DESC"
    
    result = await db.execute(text(query), params)
    rows = result.fetchall()
    
    return {
        'items': [
            {
                'id': str(row.id),
                'paper_id': str(row.paper_id),
                'filename': row.filename,
                'original_filename': row.original_filename,
                'file_type': row.file_type,
                'file_size': row.file_size,
                'description': row.description,
                'category': row.category,
                'file_path': row.file_path,
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'updated_at': row.updated_at.isoformat() if row.updated_at else None,
            }
            for row in rows
        ],
        'total': len(rows),
    }


@router.delete("/{paper_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    paper_id: uuid.UUID,
    file_id: uuid.UUID,
    db: DbSession = None,
    paper: PaperDependency = None,
) -> None:
    """Delete a file."""
    
    # Get file info first
    result = await db.execute(text("""
        SELECT file_path FROM paper_files
        WHERE id = :file_id AND paper_id = :paper_id
    """), {'file_id': str(file_id), 'paper_id': str(paper_id)})
    
    row = result.fetchone()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Delete file from disk - 支持相对路径和绝对路径
    stored_path = row.file_path
    if Path(stored_path).is_absolute():
        file_path = Path(stored_path)
    else:
        file_path = Path(settings.PDF_STORAGE_PATH) / stored_path
    
    if file_path.exists():
        file_path.unlink()
    
    # Delete database record
    await db.execute(text("""
        DELETE FROM paper_files
        WHERE id = :file_id AND paper_id = :paper_id
    """), {'file_id': str(file_id), 'paper_id': str(paper_id)})
    
    await db.commit()


@router.put("/{paper_id}/files/{file_id}", response_model=dict)
async def update_file(
    paper_id: uuid.UUID,
    file_id: uuid.UUID,
    data: dict,
    db: DbSession = None,
    paper: PaperDependency = None,
) -> dict:
    """Update file metadata (original_filename, description, category)."""
    from pydantic import BaseModel
    
    class FileUpdateRequest(BaseModel):
        original_filename: str | None = None
        description: str | None = None
        category: str | None = None
    
    # Validate request data
    try:
        update_data = FileUpdateRequest(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    
    # Check if file exists
    result = await db.execute(text("""
        SELECT id FROM paper_files
        WHERE id = :file_id AND paper_id = :paper_id
    """), {'file_id': str(file_id), 'paper_id': str(paper_id)})
    
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Build update query dynamically
    update_fields = []
    params = {'file_id': str(file_id), 'paper_id': str(paper_id)}
    
    if update_data.original_filename is not None:
        update_fields.append("original_filename = :original_filename")
        params['original_filename'] = update_data.original_filename
    
    if update_data.description is not None:
        update_fields.append("description = :description")
        params['description'] = update_data.description
    
    if update_data.category is not None:
        if update_data.category not in ALLOWED_CATEGORIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {', '.join(ALLOWED_CATEGORIES)}"
            )
        update_fields.append("category = :category")
        params['category'] = update_data.category
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Execute update
    await db.execute(text(f"""
        UPDATE paper_files
        SET {', '.join(update_fields)}, updated_at = :updated_at
        WHERE id = :file_id AND paper_id = :paper_id
    """), {**params, 'updated_at': datetime.utcnow()})
    
    await db.commit()
    
    # Return updated file info
    result = await db.execute(text("""
        SELECT id, paper_id, filename, original_filename, file_type, 
               file_size, description, category, file_path, created_at, updated_at
        FROM paper_files
        WHERE id = :file_id AND paper_id = :paper_id
    """), {'file_id': str(file_id), 'paper_id': str(paper_id)})
    
    row = result.fetchone()
    
    return {
        'id': str(row.id),
        'paper_id': str(row.paper_id),
        'filename': row.filename,
        'original_filename': row.original_filename,
        'file_type': row.file_type,
        'file_size': row.file_size,
        'description': row.description,
        'category': row.category,
        'file_path': row.file_path,
        'created_at': row.created_at.isoformat() if row.created_at else None,
        'updated_at': row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/{paper_id}/files/{file_id}/download")
async def download_file(
    paper_id: uuid.UUID,
    file_id: uuid.UUID,
    db: DbSession = None,
    paper: PaperDependency = None,
):
    """Download a file or preview in browser."""
    from fastapi.responses import FileResponse
    import os

    result = await db.execute(text("""
        SELECT file_path, original_filename, file_type FROM paper_files
        WHERE id = :file_id AND paper_id = :paper_id
    """), {'file_id': str(file_id), 'paper_id': str(paper_id)})

    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    # 从数据库获取的路径可能是相对路径或绝对路径
    stored_path = row.file_path
    
    # 调试日志
    print(f"[DEBUG] Download request: paper_id={paper_id}, file_id={file_id}")
    print(f"[DEBUG] File path from DB: {stored_path}")
    print(f"[DEBUG] PDF_STORAGE_PATH: {settings.PDF_STORAGE_PATH}")
    
    # 构建完整路径
    if Path(stored_path).is_absolute():
        # 如果是绝对路径，直接使用
        file_path = Path(stored_path)
    else:
        # 如果是相对路径，与 PDF_STORAGE_PATH 拼接
        file_path = Path(settings.PDF_STORAGE_PATH) / stored_path
    
    print(f"[DEBUG] Resolved path: {file_path.absolute()}")
    print(f"[DEBUG] Path exists: {file_path.exists()}")
    print(f"[DEBUG] Path is file: {file_path.is_file() if file_path.exists() else False}")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found on disk: {file_path}"
        )
    
    # Determine media type based on file extension
    file_extension = file_path.suffix.lower()
    media_type_map = {
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.csv': 'text/csv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.zip': 'application/zip',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
    }
    media_type = media_type_map.get(file_extension, 'application/octet-stream')
    
    # 处理包含非 ASCII 字符的文件名
    # HTTP 头必须使用 latin-1 编码，所以非 ASCII 字符需要特殊处理
    original_filename = row.original_filename
    
    # 始终使用 RFC 5987 编码方式，确保兼容性
    # 对 filename 参数使用 ASCII 安全的版本（去掉或替换非 ASCII 字符）
    # 对 filename* 参数使用 UTF-8 编码
    ascii_filename = original_filename.encode('ascii', 'ignore').decode('ascii')
    if not ascii_filename:
        ascii_filename = 'download.pdf'
    
    encoded_filename = quote(original_filename, safe='')
    # 使用双参数格式：filename（ASCII）和 filename*（UTF-8）
    content_disposition = f"inline; filename=\"{ascii_filename}\"; filename*=UTF-8''{encoded_filename}"
    
    # 添加 CORS 和缓存控制头，确保 PDF 可以在浏览器中预览
    headers = {
        'Content-Disposition': content_disposition,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=3600',
    }
    
    # 注意：不要传递 filename 参数给 FileResponse，因为它会覆盖我们自定义的 Content-Disposition 头
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers=headers,
    )
