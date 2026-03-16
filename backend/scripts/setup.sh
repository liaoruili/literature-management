#!/bin/bash
# Database migration and initialization script

set -e

echo "========================================="
echo "Literature Database - Setup Script"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
    echo -e "${YELLOW}⚠ Please edit .env with your database credentials${NC}"
    echo ""
fi

# Install dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
uv sync
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
alembic upgrade head
echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Initialize database
echo -e "${YELLOW}Initializing database...${NC}"
python scripts/init_db.py
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Database setup complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
