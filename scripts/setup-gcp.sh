#!/bin/bash
# =============================================================================
# PropTrack AI — Google Cloud VM First-Time Setup Script
# Run this ONCE on a fresh Google Cloud e2-micro instance (Ubuntu 22.04 LTS)
# =============================================================================
# Usage:
#   chmod +x scripts/setup-gcp.sh
#   ./scripts/setup-gcp.sh
# =============================================================================
set -e

echo "🚀 Starting PropTrack AI GCP setup..."

# Clean up any bad previous Docker attempts before doing ANYTHING
sudo rm -f /etc/apt/sources.list.d/docker.list

# ── System update ─────────────────────────────────────────────────────────────
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y \
    curl git unzip ufw \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# ── Docker install ────────────────────────────────────────────────────────────
echo "📦 Installing Docker..."

# Detect OS ID (ubuntu or debian)
OS_ID=$(grep '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"')

# Add Docker's official GPG key:
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${OS_ID} \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow current user to run docker without sudo
sudo usermod -aG docker $USER
echo "✅ Docker installed."

# ── Firewall ──────────────────────────────────────────────────────────────────
echo "🔒 Configuring UFW firewall (internal VM level)..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "✅ UFW configured (SSH, HTTP, HTTPS allowed)."

echo "⚠️  IMPORTANT GCP FIREWALL INSTRUCTION ⚠️"
echo "In GCP, enabling UFW inside the VM is not enough."
echo "You MUST also add VPC Network Firewall Rules for HTTP and HTTPS:"
echo "  1. Go to GCP Console -> VPC Network -> Firewall"
echo "  2. Create Firewall Rule"
echo "  3. Targets: All instances in the network (or targeting your VM tag)"
echo "  4. Source IPv4 ranges: 0.0.0.0/0"
echo "  5. Protocols and ports: Check 'tcp', enter '80, 443'"
echo "Alternatively, edit your exact VM instance settings to check 'Allow HTTP traffic' and 'Allow HTTPS traffic'."
echo "──────────────────────────────────────────────"

# ── Clone repository ──────────────────────────────────────────────────────────
APP_DIR="/opt/proptrack"
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Cloning repository to $APP_DIR..."
    sudo git clone https://github.com/Abhishekkrsinghdev/Property-Tracker.git "$APP_DIR"
    sudo chown -R $USER:$USER "$APP_DIR"
else
    echo "📁 Repository already exists at $APP_DIR, pulling latest..."
    cd "$APP_DIR" && git pull origin master
fi

cd "$APP_DIR"

# ── Environment file ──────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "❗ ACTION REQUIRED: Fill in your secrets in $APP_DIR/.env"
    echo "   Open the file with: nano $APP_DIR/.env"
    echo "   Required values:"
    echo "     DB_PASSWORD       — strong random password"
    echo "     JWT_SECRET        — 32+ character random string"
    echo "     ANTHROPIC_API_KEY — from console.anthropic.com"
    echo "     RESEND_API_KEY    — from resend.com (optional, emails will be mocked)"
    echo ""
    read -p "Press Enter after filling in .env to continue..."
fi

# ── Build frontend static assets ─────────────────────────────────────────────
echo "🔨 Building React frontend..."
cd "$APP_DIR/frontend"
# Install Node via nvm if not present
if ! command -v node &> /dev/null; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
fi
npm ci
npm run build
echo "✅ Frontend built → frontend/dist/"

# ── Start production stack ────────────────────────────────────────────────────
cd "$APP_DIR"
echo "🐳 Pulling Docker images and starting services..."
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ PropTrack AI is running!"
echo "   → App:      http://$(curl -s ifconfig.me)"
echo "   → API:      http://$(curl -s ifconfig.me)/api"
echo "   → AI Docs:  http://$(curl -s ifconfig.me)/ai/docs"
echo ""
echo "Next steps:"
echo "  1. Point your domain DNS A record to: $(curl -s ifconfig.me)"
echo "  2. Run SSL provisioning: docker run --rm -v proptrack-certbot-conf:/etc/letsencrypt \\"
echo "       -v proptrack-certbot-www:/var/www/certbot certbot/certbot certonly \\"
echo "       --webroot -w /var/www/certbot -d yourdomain.com --email you@email.com --agree-tos"
echo "  3. Update nginx/default.conf to enable HTTPS block, then: docker compose restart nginx"
echo ""
echo "🎉 Setup complete!"
