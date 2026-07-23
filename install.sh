#!/usr/bin/env bash
# =============================================================================
# CyberLearn LMS — Kali Linux Installer
# Usage: sudo bash install.sh
# =============================================================================
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
banner(){ echo -e "\n${BOLD}${CYAN}══ $* ══${NC}\n"; }

# ── Must run as root ──────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && error "Run with sudo: sudo bash install.sh"

# ── Resolve install directory (where this script lives) ──────────────────────
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCH_CMD="cyberlearn"
API_PORT=5000
DB_NAME="cyberlearn"
DB_USER="$(logname 2>/dev/null || echo "${SUDO_USER:-postgres}")"

banner "CyberLearn LMS Installer"
info "Install directory : $INSTALL_DIR"
info "Launch command    : $LAUNCH_CMD"
info "API port          : $API_PORT"
info "DB name           : $DB_NAME"
info "DB owner          : $DB_USER"

# =============================================================================
# STEP 1 — System packages
# =============================================================================
banner "Step 1: Installing system packages"

apt-get update -qq
apt-get install -y -qq \
    curl wget gnupg ca-certificates \
    postgresql postgresql-client \
    xdg-utils \
    2>/dev/null || true

ok "System packages installed"

# =============================================================================
# STEP 2 — Node.js 20 LTS (skip if already ≥20)
# =============================================================================
banner "Step 2: Node.js"

NODE_OK=false
if command -v node &>/dev/null; then
    NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
    if [[ $NODE_VER -ge 20 ]]; then
        ok "Node.js $NODE_VER already installed — skipping"
        NODE_OK=true
    fi
fi

if [[ $NODE_OK == false ]]; then
    info "Installing Node.js 20 LTS via NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
    apt-get install -y -qq nodejs
    ok "Node.js $(node --version) installed"
fi

# =============================================================================
# STEP 3 — pnpm
# =============================================================================
banner "Step 3: pnpm"

if ! command -v pnpm &>/dev/null; then
    info "Installing pnpm..."
    npm install -g pnpm@9 --silent
    ok "pnpm $(pnpm --version) installed"
else
    ok "pnpm $(pnpm --version) already installed"
fi

# Make pnpm available to the actual user too
ACTUAL_USER="${SUDO_USER:-$USER}"
if [[ -n "$ACTUAL_USER" && "$ACTUAL_USER" != "root" ]]; then
    runuser -l "$ACTUAL_USER" -c "npm install -g pnpm@9 --silent" 2>/dev/null || true
fi

# =============================================================================
# STEP 4 — PostgreSQL setup
# =============================================================================
banner "Step 4: PostgreSQL"

# Start PostgreSQL service
PG_VERSION=$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $1}' || echo "")
if [[ -z "$PG_VERSION" ]]; then
    info "No PostgreSQL cluster found, creating one..."
    pg_createcluster 18 main --start 2>/dev/null || \
    pg_createcluster "$(ls /usr/lib/postgresql/ | sort -V | tail -1)" main --start
else
    PG_STATUS=$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $4}')
    if [[ "$PG_STATUS" != "online" ]]; then
        info "Starting PostgreSQL cluster..."
        pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || service postgresql start
    fi
fi
# Ensure service is up
service postgresql start 2>/dev/null || true
sleep 2

# Detect actual PG port
PG_PORT=$(pg_lsclusters -h 2>/dev/null | awk 'NR==1{print $3}' || echo "5432")
info "PostgreSQL listening on port $PG_PORT"

# Create DB user (the OS user) if missing
if ! su -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'\" 2>/dev/null" postgres | grep -q 1; then
    info "Creating PostgreSQL role '$DB_USER'..."
    su -c "createuser --superuser '$DB_USER' 2>/dev/null || true" postgres
fi

# Create cyberlearn database if missing
if ! su -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$DB_NAME'\"" postgres | grep -q 1; then
    info "Creating database '$DB_NAME'..."
    su -c "createdb -O '$DB_USER' '$DB_NAME'" postgres
    ok "Database '$DB_NAME' created"
else
    ok "Database '$DB_NAME' already exists"
fi

DATABASE_URL="postgresql://${DB_USER}@localhost:${PG_PORT}/${DB_NAME}?sslmode=disable"
ok "Database URL: $DATABASE_URL"

# =============================================================================
# STEP 5 — .env file
# =============================================================================
banner "Step 5: Environment configuration"

ENV_FILE="$INSTALL_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    info "Creating .env..."
    cat > "$ENV_FILE" <<EOF
DATABASE_URL=${DATABASE_URL}
SESSION_SECRET=$(openssl rand -hex 48)
PORT=${API_PORT}
BASE_PATH=/
NODE_ENV=production
EOF
    ok ".env created with a fresh random SESSION_SECRET"
else
    # Update DATABASE_URL and PORT in existing .env silently
    if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        echo "DATABASE_URL=${DATABASE_URL}" >> "$ENV_FILE"
    else
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" "$ENV_FILE"
    fi
    if ! grep -q "^PORT=" "$ENV_FILE"; then
        echo "PORT=${API_PORT}" >> "$ENV_FILE"
    fi
    if ! grep -q "^BASE_PATH=" "$ENV_FILE"; then
        echo "BASE_PATH=/" >> "$ENV_FILE"
    fi
    ok ".env already exists — updated DATABASE_URL and PORT"
fi

# Export for subsequent steps in this script
set -a
source "$ENV_FILE"
set +a

# =============================================================================
# STEP 6 — Install Node dependencies
# =============================================================================
banner "Step 6: Installing Node.js dependencies"

cd "$INSTALL_DIR"
pnpm install --frozen-lockfile 2>&1 | tail -5
ok "Node dependencies installed"

# =============================================================================
# STEP 7 — Build the API server
# =============================================================================
banner "Step 7: Building API server"

pnpm --filter @workspace/api-server run build 2>&1 | tail -10
ok "API server built"

# =============================================================================
# STEP 8 — Build the frontend
# =============================================================================
banner "Step 8: Building frontend"

pnpm --filter @workspace/cyberlearn run build 2>&1 | tail -10
ok "Frontend built"

# =============================================================================
# STEP 9 — Push DB schema + seed
# =============================================================================
banner "Step 9: Database schema and seed data"

info "Pushing schema..."
pnpm --filter @workspace/db run push-force 2>&1 | tail -5

info "Seeding database..."
cd "$INSTALL_DIR/lib/db"
node --loader tsx src/seed.ts 2>&1 | tail -8 || \
    npx --yes tsx src/seed.ts 2>&1 | tail -8
cd "$INSTALL_DIR"

ok "Database ready with sample data"

# =============================================================================
# STEP 10 — Register the 'cyberlearn' launch command
# =============================================================================
banner "Step 10: Registering '$LAUNCH_CMD' command"

# Write the launcher script
cat > "/usr/local/bin/$LAUNCH_CMD" <<'LAUNCHER'
#!/usr/bin/env bash
# CyberLearn LMS launcher — starts the server and opens the browser

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find install dir from a symlink-safe stored path
INSTALL_DIR_FILE="/etc/cyberlearn/install_path"
if [[ -f "$INSTALL_DIR_FILE" ]]; then
    CYBERLEARN_DIR="$(cat "$INSTALL_DIR_FILE")"
else
    # fallback: try common locations
    for d in \
        "$HOME/cyberlearn" \
        "/opt/cyberlearn" \
        "/home/kali/Desktop/Cyber-Learn-LMS (copy 1)" \
        "/home/kali/Desktop/llms"; do
        [[ -f "$d/.env" ]] && CYBERLEARN_DIR="$d" && break
    done
fi

[[ -z "$CYBERLEARN_DIR" || ! -d "$CYBERLEARN_DIR" ]] && \
    echo "CyberLearn install directory not found. Re-run install.sh" && exit 1

cd "$CYBERLEARN_DIR"

# Source env
set -a
source .env
set +a

PORT="${PORT:-5000}"
URL="http://localhost:${PORT}"

# Check if already running
if curl -sf "$URL/api/healthz" &>/dev/null; then
    echo "CyberLearn is already running at $URL"
    xdg-open "$URL" 2>/dev/null &
    exit 0
fi

echo ""
echo "  ██████╗██╗   ██╗██████╗ ███████╗██████╗ "
echo " ██╔════╝╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗"
echo " ██║      ╚████╔╝ ██████╔╝█████╗  ██████╔╝"
echo " ██║       ╚██╔╝  ██╔══██╗██╔══╝  ██╔══██╗"
echo " ╚██████╗   ██║   ██████╔╝███████╗██║  ██║"
echo "  ╚═════╝   ╚═╝   ╚═════╝ ╚══════╝╚═╝  ╚═╝"
echo ""
echo "  CyberLearn LMS  —  starting on $URL"
echo "  Admin : admin / admin123"
echo "  Student: student1 / admin123"
echo ""

# Start PostgreSQL if not running
pg_isready -q 2>/dev/null || service postgresql start 2>/dev/null || true
sleep 1

# Start API server in background
echo "[*] Starting API server..."
node --enable-source-maps artifacts/api-server/dist/index.mjs &
SERVER_PID=$!

# Wait up to 15s for server to be ready
echo -n "[*] Waiting for server"
for i in $(seq 1 30); do
    sleep 0.5
    if curl -sf "$URL/api/healthz" &>/dev/null; then
        echo " ready!"
        break
    fi
    echo -n "."
done

# Open browser
echo "[*] Opening browser at $URL"
if command -v xdg-open &>/dev/null; then
    xdg-open "$URL" 2>/dev/null &
elif command -v chromium &>/dev/null; then
    chromium "$URL" 2>/dev/null &
elif command -v firefox &>/dev/null; then
    firefox "$URL" 2>/dev/null &
fi

echo ""
echo "  Server PID: $SERVER_PID"
echo "  Press Ctrl+C to stop"
echo ""

# Keep running and forward signals
trap "kill $SERVER_PID 2>/dev/null; echo 'CyberLearn stopped.'" INT TERM
wait $SERVER_PID
LAUNCHER

chmod +x "/usr/local/bin/$LAUNCH_CMD"

# Store the install path so the launcher can find it
mkdir -p /etc/cyberlearn
echo "$INSTALL_DIR" > /etc/cyberlearn/install_path

ok "Registered: /usr/local/bin/$LAUNCH_CMD"

# =============================================================================
# STEP 11 — Create a desktop shortcut (Kali/GNOME)
# =============================================================================
banner "Step 11: Desktop shortcut"

ACTUAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo '')}"
DESKTOP_DIR=""
if [[ -n "$ACTUAL_USER" && "$ACTUAL_USER" != "root" ]]; then
    DESKTOP_DIR="/home/$ACTUAL_USER/Desktop"
elif [[ -d "/root/Desktop" ]]; then
    DESKTOP_DIR="/root/Desktop"
fi

if [[ -n "$DESKTOP_DIR" && -d "$DESKTOP_DIR" ]]; then
    cat > "$DESKTOP_DIR/CyberLearn LMS.desktop" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=CyberLearn LMS
Comment=Cybersecurity Learning Management System
Exec=bash -c '$LAUNCH_CMD'
Icon=$INSTALL_DIR/artifacts/cyberlearn/public/favicon.svg
Terminal=true
Categories=Education;Network;
EOF
    chmod +x "$DESKTOP_DIR/CyberLearn LMS.desktop"
    [[ -n "$ACTUAL_USER" ]] && chown "$ACTUAL_USER:$ACTUAL_USER" "$DESKTOP_DIR/CyberLearn LMS.desktop" 2>/dev/null || true
    ok "Desktop shortcut created at $DESKTOP_DIR/CyberLearn LMS.desktop"
else
    warn "Could not find Desktop directory — skipping shortcut"
fi

# =============================================================================
# DONE
# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║        CyberLearn LMS — Installation Complete!   ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Launch anytime with:${NC}"
echo -e "  ${CYAN}${BOLD}  cyberlearn${NC}"
echo ""
echo -e "  ${BOLD}Or directly:${NC}"
echo -e "  ${CYAN}  cd \"$INSTALL_DIR\" && node --enable-source-maps artifacts/api-server/dist/index.mjs${NC}"
echo ""
echo -e "  ${BOLD}Default credentials:${NC}"
echo -e "  ${YELLOW}  Admin  : admin   / admin123${NC}"
echo -e "  ${YELLOW}  Student: student1 / admin123${NC}"
echo ""
echo -e "  ${BOLD}App URL:${NC} ${CYAN}http://localhost:${API_PORT}${NC}"
echo ""
