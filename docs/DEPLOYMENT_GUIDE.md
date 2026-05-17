# BobSec Deployment Guide

**Version**: 3.0.0  
**Last Updated**: 2026-05-16

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Minimum**:
- Node.js 18.x or higher
- npm 9.x or higher
- 4GB RAM
- 10GB disk space

**Recommended**:
- Node.js 20.x LTS
- npm 10.x
- 8GB RAM
- 50GB disk space
- Linux/Unix-based OS (Ubuntu 22.04 LTS recommended)

### External Services

**Required**:
- IBM Cloud account (for watsonx.ai)
- watsonx.ai project with Granite model access

**Optional**:
- PostgreSQL 14+ or MongoDB 6+ (for production)
- Redis 7+ (for caching)
- SMTP server (for email notifications)

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/bobsec.git
cd bobsec
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install

# Return to root
cd ..
```

### 3. Environment Variables

Create `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# ════════════════════════════════════════════════════════════════
# IBM watsonx.ai Configuration
# ════════════════════════════════════════════════════════════════

WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_TOKEN=your_ibm_cloud_iam_token_here
WATSONX_PROJECT_ID=your_watsonx_project_id_here

# ════════════════════════════════════════════════════════════════
# Application Configuration
# ════════════════════════════════════════════════════════════════

# Set to 'true' for demo mode (uses mock responses)
# Set to 'false' for production (uses live watsonx.ai)
MOCK_MODE=false

# Server port
PORT=3001

# Node environment
NODE_ENV=production

# ════════════════════════════════════════════════════════════════
# Security Configuration
# ════════════════════════════════════════════════════════════════

# JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here

# JWT expiry (in seconds)
JWT_EXPIRY=900

# Refresh token expiry (in seconds)
REFRESH_TOKEN_EXPIRY=604800

# Chain of custody signing key
CUSTODY_SIGNING_KEY=your_custody_signing_key_here

# ════════════════════════════════════════════════════════════════
# Database Configuration (Production)
# ════════════════════════════════════════════════════════════════

# Database type: 'memory', 'postgres', 'mongodb'
DB_TYPE=memory

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bobsec
POSTGRES_USER=bobsec_user
POSTGRES_PASSWORD=your_postgres_password_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/bobsec

# ════════════════════════════════════════════════════════════════
# Redis Configuration (Optional)
# ════════════════════════════════════════════════════════════════

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_here

# ════════════════════════════════════════════════════════════════
# Logging Configuration
# ════════════════════════════════════════════════════════════════

# Log level: 'ERROR', 'WARN', 'INFO', 'DEBUG'
LOG_LEVEL=INFO

# Log file path
LOG_FILE=./logs/bobsec.log

# ════════════════════════════════════════════════════════════════
# Email Configuration (Optional)
# ════════════════════════════════════════════════════════════════

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=noreply@bobsec.ai

# ════════════════════════════════════════════════════════════════
# Feature Flags
# ════════════════════════════════════════════════════════════════

ENABLE_SCAMNET=true
ENABLE_INVESTIGATIONS=true
ENABLE_GOVERNANCE=true
ENABLE_WEBHOOKS=true
ENABLE_PLUGINS=true
```

---

## Configuration

### IBM watsonx.ai Setup

1. **Create IBM Cloud Account**:
   - Go to https://cloud.ibm.com
   - Sign up or log in

2. **Create watsonx.ai Project**:
   - Navigate to watsonx.ai
   - Create new project
   - Note the Project ID

3. **Get IAM Token**:
   ```bash
   # Install IBM Cloud CLI
   curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
   
   # Login
   ibmcloud login
   
   # Get IAM token
   ibmcloud iam oauth-tokens
   ```

4. **Update `.env`**:
   ```env
   WATSONX_TOKEN=<your_iam_token>
   WATSONX_PROJECT_ID=<your_project_id>
   ```

### Security Configuration

1. **Generate JWT Secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Generate Custody Signing Key**:
   ```bash
   openssl rand -base64 32
   ```

3. **Update `.env`** with generated secrets

---

## Database Setup

### Option 1: In-Memory (Development)

No setup required. Data is stored in memory and cleared on restart.

```env
DB_TYPE=memory
```

### Option 2: PostgreSQL (Production)

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Start service
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

2. **Create Database**:
   ```bash
   sudo -u postgres psql
   ```
   
   ```sql
   CREATE DATABASE bobsec;
   CREATE USER bobsec_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE bobsec TO bobsec_user;
   \q
   ```

3. **Update `.env`**:
   ```env
   DB_TYPE=postgres
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=bobsec
   POSTGRES_USER=bobsec_user
   POSTGRES_PASSWORD=your_password
   ```

4. **Run Migrations**:
   ```bash
   npm run migrate
   ```

### Option 3: MongoDB (Production)

1. **Install MongoDB**:
   ```bash
   # Ubuntu/Debian
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt update
   sudo apt install -y mongodb-org
   
   # Start service
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

2. **Create Database**:
   ```bash
   mongosh
   ```
   
   ```javascript
   use bobsec
   db.createUser({
     user: "bobsec_user",
     pwd: "your_password",
     roles: [{ role: "readWrite", db: "bobsec" }]
   })
   ```

3. **Update `.env`**:
   ```env
   DB_TYPE=mongodb
   MONGODB_URI=mongodb://bobsec_user:your_password@localhost:27017/bobsec
   ```

---

## Running the Application

### Development Mode

```bash
# Run both client and server with hot reload
npm run dev
```

This starts:
- Server on http://localhost:3001
- Client on http://localhost:5173

### Production Mode

```bash
# Build client
cd client && npm run build

# Start server
cd ../server && npm start
```

Server runs on http://localhost:3001 and serves built client.

---

## Production Deployment

### Option 1: Docker Deployment

1. **Build Docker Image**:
   ```bash
   docker build -t bobsec:3.0.0 .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --name bobsec \
     -p 3001:3001 \
     --env-file .env \
     bobsec:3.0.0
   ```

3. **Docker Compose** (with PostgreSQL):
   ```yaml
   version: '3.8'
   
   services:
     bobsec:
       build: .
       ports:
         - "3001:3001"
       env_file:
         - .env
       depends_on:
         - postgres
       restart: unless-stopped
     
     postgres:
       image: postgres:14
       environment:
         POSTGRES_DB: bobsec
         POSTGRES_USER: bobsec_user
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: unless-stopped
   
   volumes:
     postgres_data:
   ```
   
   Run with:
   ```bash
   docker-compose up -d
   ```

### Option 2: PM2 Deployment

1. **Install PM2**:
   ```bash
   npm install -g pm2
   ```

2. **Create `ecosystem.config.js`**:
   ```javascript
   module.exports = {
     apps: [{
       name: 'bobsec',
       script: './server/index.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3001
       },
       error_file: './logs/pm2-error.log',
       out_file: './logs/pm2-out.log',
       log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
     }]
   }
   ```

3. **Start Application**:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Monitor**:
   ```bash
   pm2 status
   pm2 logs bobsec
   pm2 monit
   ```

### Option 3: Kubernetes Deployment

1. **Create Deployment**:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: bobsec
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: bobsec
     template:
       metadata:
         labels:
           app: bobsec
       spec:
         containers:
         - name: bobsec
           image: bobsec:3.0.0
           ports:
           - containerPort: 3001
           envFrom:
           - secretRef:
               name: bobsec-secrets
           resources:
             requests:
               memory: "2Gi"
               cpu: "1000m"
             limits:
               memory: "4Gi"
               cpu: "2000m"
   ```

2. **Create Service**:
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: bobsec-service
   spec:
     selector:
       app: bobsec
     ports:
     - protocol: TCP
       port: 80
       targetPort: 3001
     type: LoadBalancer
   ```

3. **Deploy**:
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   ```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name bobsec.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bobsec.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/bobsec.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bobsec.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=bobsec:10m rate=10r/s;
    limit_req zone=bobsec burst=20 nodelay;
}
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl http://localhost:3001/api/health

# Metrics
curl http://localhost:3001/api/metrics

# Governance health
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/governance/health
```

### Log Management

```bash
# View logs
tail -f logs/bobsec.log

# Rotate logs (add to crontab)
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/bobsec
```

### Backup Strategy

**Database Backup**:
```bash
# PostgreSQL
pg_dump -U bobsec_user bobsec > backup_$(date +%Y%m%d).sql

# MongoDB
mongodump --uri="mongodb://bobsec_user:password@localhost:27017/bobsec" --out=backup_$(date +%Y%m%d)
```

**Automated Backups**:
```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install
cd client && npm install
cd ../server && npm install

# Run migrations
npm run migrate

# Restart application
pm2 restart bobsec
```

---

## Troubleshooting

### Common Issues

**Issue**: Server won't start
```bash
# Check port availability
lsof -i :3001

# Check logs
tail -f logs/bobsec.log

# Check environment variables
node -e "console.log(process.env)"
```

**Issue**: Database connection failed
```bash
# Test PostgreSQL connection
psql -h localhost -U bobsec_user -d bobsec

# Test MongoDB connection
mongosh mongodb://bobsec_user:password@localhost:27017/bobsec
```

**Issue**: watsonx.ai API errors
```bash
# Verify IAM token
curl -X POST "https://iam.cloud.ibm.com/identity/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=<your_api_key>"

# Test watsonx.ai connection
curl -X GET "${WATSONX_URL}/ml/v1/deployments?version=2024-05-31" \
  -H "Authorization: Bearer ${WATSONX_TOKEN}"
```

**Issue**: High memory usage
```bash
# Check Node.js memory
node --max-old-space-size=4096 server/index.js

# Monitor with PM2
pm2 monit
```

### Performance Tuning

**Node.js Optimization**:
```bash
# Increase memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Enable cluster mode
pm2 start ecosystem.config.js -i max
```

**Database Optimization**:
```sql
-- PostgreSQL: Create indexes
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_timestamp ON analyses(timestamp);

-- Analyze tables
ANALYZE analyses;
```

**Caching**:
```javascript
// Enable Redis caching
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_CACHE=true
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up log monitoring
- [ ] Configure automated backups
- [ ] Enable security headers
- [ ] Implement IP whitelisting (if applicable)
- [ ] Set up intrusion detection
- [ ] Configure CORS properly
- [ ] Enable audit logging
- [ ] Set up vulnerability scanning
- [ ] Implement DDoS protection

---

## Support

For deployment assistance:
- Email: support@bobsec.ai
- Documentation: https://docs.bobsec.ai
- Community: https://community.bobsec.ai

---

**Made with Bob** 🛡️