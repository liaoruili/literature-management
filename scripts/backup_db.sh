#!/bin/bash
# Database backup script

set -e

# Configuration
DB_NAME="literature_db"
DB_USER="postgres"
BACKUP_DIR="/backups/literature-db"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/literature_db_$DATE.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
echo "Creating database backup..."
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

echo "Backup created: $BACKUP_FILE"

# Remove old backups
echo "Removing backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup complete!"

# Optional: Upload to remote storage (S3, etc.)
# aws s3 cp $BACKUP_FILE s3://your-bucket/backups/
