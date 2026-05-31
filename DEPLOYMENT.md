# Yebeal Borsa — Production Deployment Guide

This guide details the step-by-step process of deploying the **Yebeal Borsa** application on an **unmanaged cloud server** (e.g., Hetzner, DigitalOcean, Linode) using **Docker** and **Nginx with SSL (HTTPS)**.

---

## 🏗️ Production Architecture Overview

The system is deployed using three Docker containers coordinated via `docker-compose`:

```
                  ┌───────────────────────────────────────────────┐
                  │                HETZNER CLOUD                  │
                  │                                               │
                  │              Nginx Reverse Proxy              │
                  │          (Handles SSL/HTTPS & Port 80/443)    │
                  │                       │                       │
                  └───────────────────────┼───────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │          Docker Network           │
                        │                                   │
                        │   ┌──────────┐     ┌──────────┐   │
                        │   │ Frontend │ ──> │  Backend │   │
                        │   │ (Port 80)│     │(Port 3001)│  │
                        │   └──────────┘     └─────┬────┘   │
                        │                          │        │
                        │                    ┌─────▼────┐   │
                        │                    │ Database │   │
                        │                    │(Port 5432)│  │
                        │                    └──────────┘   │
                        └───────────────────────────────────┘
```

*   **Nginx Reverse Proxy (Host System):** Routes public incoming traffic, handles HTTPS/SSL termination with Let's Encrypt, and forwards requests.
*   **Frontend Container:** Serves the built React application via Nginx.
*   **Backend Container:** Runs the Node.js Express API.
*   **Database Container:** Hosts the PostgreSQL database with a persistent Docker volume to prevent data loss.

---

## 🛠️ Phase 1: Server Provisioning & Initial Setup

### 1. Provision a Server
Create a new cloud instance on Hetzner (Cloud Console):
*   **OS:** Ubuntu 22.04 LTS (recommended)
*   **Plan:** Standard (CPX11/CPX21 recommended - minimum 2 GB RAM for compiling Vite app)
*   **Location:** Select the region closest to your audience.

### 2. Update System Packages
SSH into your server and update all packages to their latest versions:
```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Docker & Docker Compose
Install the official Docker engine:
```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg -y
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update

# Install Docker engine and Compose:
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

Verify the installation:
```bash
docker --version
docker compose version
```

---

## 📦 Phase 2: Application Deployment

### 1. Clone your Repository
Clone the codebase onto the Hetzner server:
```bash
git clone <YOUR_REPOSITORY_URL> /var/www/yebeal-borsa
cd /var/www/yebeal-borsa
```

### 2. Configure Environment Variables
Create the production environment variables inside the backend folder:
```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set the variables carefully:
> [!IMPORTANT]
> Change the passwords and secrets to secure values! Do not use default passwords in production.

```ini
# Database (Update with a strong password)
DATABASE_URL="postgresql://postgres:SUPER_STRONG_DATABASE_PASSWORD@db:5432/yebeal_borsa?schema=public"

# JWT (Set to a very long random key!)
JWT_SECRET="YOUR_GENERATE_LONG_JWT_SECRET_STRING"
JWT_EXPIRES_IN="7d"

# Server Settings
PORT=3001
NODE_ENV=production

# CORS
FRONTEND_URL="https://yebealborsa.com" # Your production domain
```

### 3. Adjust Docker-Compose for Production
Update the root `docker-compose.yml` to reflect your production database password and configurations. Set:
*   `POSTGRES_PASSWORD` matching the password set in `DATABASE_URL`.
*   Update backend command from development to production (`sh -c "npx prisma db push && node prisma/seed.js && npm start"`).

```bash
nano docker-compose.yml
```

### 4. Build and Run Containers
Compile the containers and start them in detached (background) mode:
```bash
docker compose up -d --build
```

Verify that all services are healthy and running:
```bash
docker compose ps
```

To view backend or database logs:
```bash
docker compose logs -f backend
```

---

## 🔒 Phase 3: Domain Routing & SSL Setup

We will configure Nginx on the host server to handle secure client connections and reverse-proxy them to the running Docker containers.

### 1. Install Nginx and Certbot
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2. Configure DNS
Ensure your domain's DNS settings point to your Hetzner server IP:
*   `A Record` for `@` pointing to `<SERVER_IPV4>`
*   `A Record` for `www` pointing to `<SERVER_IPV4>`

### 3. Create Nginx Configuration
Create a new site configuration for Yebeal Borsa:
```bash
sudo nano /etc/nginx/sites-available/yebeal-borsa
```

Paste the following configuration (replace `yebealborsa.com` with your actual domain):
```nginx
server {
    listen 80;
    server_name yebealborsa.com www.yebealborsa.com;

    # React Frontend
    location / {
        proxy_pass http://localhost:5173; # Routes to frontend Docker container
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Express Backend API
    location /api {
        proxy_pass http://localhost:3001; # Routes to backend Docker container
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/yebeal-borsa /etc/nginx/sites-enabled/
sudo nginx -t # Verify syntax is correct
sudo systemctl restart nginx
```

### 4. Generate Free SSL Certificate (HTTPS)
Use Certbot to automatically configure Let's Encrypt SSL certificates for your domain:
```bash
sudo certbot --nginx -d yebealborsa.com -d www.yebealborsa.com
```
*   Follow the prompts.
*   Choose **Redirect** when asked to redirect all HTTP traffic to HTTPS (Option 2).

Let's Encrypt certificates expire every 90 days. Certbot automatically configures a cron job to renew them, which you can test using:
```bash
sudo certbot renew --dry-run
```

---

## 🛡️ Phase 4: Production Maintenance & Security

### Graceful Database Backups
To take a full backup of the production database without downtime:
```bash
docker exec -t yebeal_borsa_db pg_dumpall -c -U postgres > backup_$(date +%F).sql
```

### Restarting the Application
To apply updates or reboot the system:
```bash
# Gracefully stop
docker compose down

# Pull latest code and rebuild
git pull
docker compose up -d --build
```

### Deleting Seed Data
> [!CAUTION]
> The database seed script (`prisma/seed.js`) **clears all data** before seeding. If you have deployed the system and users are saving actual money, edit the startup command in `docker-compose.yml` to remove `&& node prisma/seed.js` so that you do not reset production user accounts!
