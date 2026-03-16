#!/bin/bash
# Production deployment script for Literature Database

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="literature-database"
PROJECT_DIR="/opt/literature-app"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"
NGINX_CONFIG="/etc/nginx/sites-available/$PROJECT_NAME"
SYSTEMD_SERVICE="/etc/systemd/system/$PROJECT_NAME.service"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Literature Database - Production Deploy${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo)$NC"
    exit 1
fi

# Step 1: Install system dependencies
echo -e "${YELLOW}[1/8] Installing system dependencies...${NC}"
apt update
apt install -y nginx postgresql postgresql-contrib redis-server curl git

# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

echo -e "${GREEN}✓ System dependencies installed${NC}"
echo ""

# Step 2: Create project directory and clone/pull code
echo -e "${YELLOW}[2/8] Setting up project directory...${NC}"
mkdir -p $PROJECT_DIR

# If you're using git:
# cd $PROJECT_DIR
# git pull origin main

# Copy files from local (assuming files are already transferred)
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Project directory ready${NC}"
echo ""

# Step 3: Setup Python virtual environment
echo -e "${YELLOW}[3/8] Setting up Python environment...${NC}"
cd $BACKEND_DIR
uv venv .venv
source $VENV_DIR/bin/activate
uv pip install -e .

echo -e "${GREEN}✓ Python environment ready${NC}"
echo ""

# Step 4: Configure database
echo -e "${YELLOW}[4/8] Configuring PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE DATABASE literature_db;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "CREATE USER literature_app WITH ENCRYPTED PASSWORD 'your_secure_password';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE literature_db TO literature_app;"

# Run migrations
export DATABASE_URL="postgresql://literature_app:your_secure_password@localhost:5432/literature_db"
alembic upgrade head

echo -e "${GREEN}✓ Database configured${NC}"
echo ""

# Step 5: Configure systemd service
echo -e "${YELLOW}[5/8] Configuring systemd service...${NC}"
cat > $SYSTEMD_SERVICE << EOF
[Unit]
Description=Literature Database API
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="DATABASE_URL=$DATABASE_URL"
ExecStart=$VENV_DIR/bin/gunicorn app.main:app \\
    --workers 4 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 127.0.0.1:8001 \\
    --timeout 120 \\
    --access-logfile /var/log/literature-app/access.log \\
    --error-logfile /var/log/literature-app/error.log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

mkdir -p /var/log/literature-app
chown www-data:www-data /var/log/literature-app

systemctl daemon-reload
systemctl enable $PROJECT_NAME
systemctl start $PROJECT_NAME

echo -e "${GREEN}✓ Systemd service configured${NC}"
echo ""

# Step 6: Configure Nginx
echo -e "${YELLOW}[6/8] Configuring Nginx...${NC}"
cat > $NGINX_CONFIG << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }

    location / {
        root /var/www/literature-app;
        try_files $uri $uri/ /index.html;
    }
}
EOF

ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/$PROJECT_NAME
nginx -t
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}"
echo ""

# Step 7: Setup SSL with Let's Encrypt
echo -e "${YELLOW}[7/8] Setting up SSL certificate...${NC}"
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com --non-interactive --agree-tos --email your-email@example.com

echo -e "${GREEN}✓ SSL certificate installed${NC}"
echo ""

# Step 8: Start Celery workers
echo -e "${YELLOW}[8/8] Starting Celery workers...${NC}"
cat > /etc/systemd/system/${PROJECT_NAME}-celery.service << EOF
[Unit]
Description=Literature Database Celery Worker
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="CELERY_BROKER_URL=redis://localhost:6379/0"
ExecStart=$VENV_DIR/bin/celery -A app.tasks.celery_app worker --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/${PROJECT_NAME}-celery-beat.service << EOF
[Unit]
Description=Literature Database Celery Beat
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="CELERY_BROKER_URL=redis://localhost:6379/0"
ExecStart=$VENV_DIR/bin/celery -A app.tasks.celery_app beat --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${PROJECT_NAME}-celery
systemctl start ${PROJECT_NAME}-celery
systemctl enable ${PROJECT_NAME}-celery-beat
systemctl start ${PROJECT_NAME}-celery-beat

echo -e "${GREEN}✓ Celery workers started${NC}"
echo ""

# Verification
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Deployment Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Services status:${NC}"
systemctl status $PROJECT_NAME --no-pager -l
echo ""
systemctl status ${PROJECT_NAME}-celery --no-pager -l
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update domain name in Nginx config"
echo "2. Configure firewall (ufw allow 'Nginx Full')"
echo "3. Setup database backups"
echo "4. Configure monitoring (optional)"
echo ""
echo -e "API Documentation: ${GREEN}https://your-domain.com/docs${NC}"
echo -e "Health Check: ${GREEN}https://your-domain.com/health${NC}"
echo ""
