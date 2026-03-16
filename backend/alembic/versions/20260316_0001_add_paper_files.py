"""create paper_files table

Revision ID: 20260316_0001_add_paper_files
Revises: 
Create Date: 2026-03-16

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260316_0001_add_paper_files'
down_revision: Union[str, None] = '20260316_0000_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create paper_files table
    op.create_table(
        'paper_files',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('paper_id', sa.UUID(), nullable=False),
        sa.Column('filename', sa.String(length=500), nullable=False),
        sa.Column('original_filename', sa.String(length=500), nullable=False),
        sa.Column('file_type', sa.String(length=100), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=False, default='other'),
        sa.Column('file_path', sa.String(length=1000), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['paper_id'], ['papers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_paper_files_paper_id', 'paper_files', ['paper_id'])
    op.create_index('ix_paper_files_category', 'paper_files', ['category'])


def downgrade() -> None:
    op.drop_index('ix_paper_files_category', table_name='paper_files')
    op.drop_index('ix_paper_files_paper_id', table_name='paper_files')
    op.drop_table('paper_files')
