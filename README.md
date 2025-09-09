# Awan Keusahawanan (Entrepreneurs' Cloud)

A Comprehensive Cloud Computing & Business Management Suite for Malaysian SMEs

Awan Keusahawanan is a full-stack, multi-tenant cloud platform that provides Malaysian entrepreneurs with integrated business tools (CRM, Inventory, Invoicing) and access to powerful, scalable compute resources (GPU & CPU) for advanced tasks like AI, rendering, and data processing.

## 🚀 Architecture Overview

Awan Keusahawanan is built on a modern, microservices-inspired architecture, leveraging Kubernetes for orchestration and isolation.

### High-Level Architecture Diagram

```mermaid
flowchart TD
    Client["Client (Web Browser / Mobile App)"]
    
    subgraph ExternalServices [External Services]
        Stripe[Stripe Payment Processing]
        Email[Email Service]
    end

    subgraph PlatformLayer [Platform Layer]
        Gateway["API Gateway & Load Balancer<br/>(Nginx)"]
        
        subgraph ApplicationServices [Application Services]
            SaaS["SaaS App Module<br/>(Node.js)"]
            ComputeAPI["Compute API<br/>(Node.js)"]
            Notifications["Notification Service"]
        end
        
        Queue["Job Queue<br/>(BullMQ/Redis)"]
        WebSocket["Real-Time Service<br/>(WebSocket)"]
    end

    subgraph KubernetesCluster [Kubernetes Cluster]
        subgraph SaaSWorkloads [SaaS Workloads]
            SAASPods["SaaS Pods<br/>(Node.js)"]
        end
        
        subgraph ComputeWorkloads [Compute Workloads]
            CPUWorker["CPU Worker Pod<br/>(Data Processing)"]
            GPUWorker["GPU Worker Pod<br/>(TensorFlow, PyTorch, CUDA)"]
        end
    end

    subgraph DataLayer [Data & Storage Layer]
        Postgres["Neon PostgreSQL<br/>(Primary Database)"]
        RedisData["Redis<br/>(Caching, Queue)"]
        ObjectStorage["Object Storage (MinIO)<br/>(Files, Models, Output)"]
    end

    subgraph Monitoring [Monitoring Stack]
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
    end

    Client -->|HTTPS / WSS| Gateway
    
    Gateway -->|REST - Business API| SaaS
    Gateway -->|REST - Compute API| ComputeAPI
    Gateway -->|WebSocket| WebSocket
    
    ComputeAPI -->|Job Submission| Queue
    Queue -->|Job Dispatch| KubernetesCluster
    
    SaaS -->|Read/Write| Postgres
    CPUWorker -->|Read/Write| Postgres
    GPUWorker -->|Read/Write| Postgres
    
    SaaS -->|Cache| RedisData
    ComputeAPI -->|Queue| RedisData
    WebSocket -->|Pub/Sub| RedisData
    
    SaaS -->|Files| ObjectStorage
    CPUWorker -->|Files| ObjectStorage
    GPUWorker -->|Files| ObjectStorage
    
    KubernetesCluster -->|Metrics| Prometheus
    Prometheus -->|Dashboards| Grafana
    ApplicationServices -->|Logs| Loki
    Loki -->|Log Querying| Grafana
    
    Notifications -->|Events| WebSocket
    Notifications -->|Emails| Email
    
    SaaS -->|Payments| Stripe
```

## 🏗️ Tech Stack

- **Runtime**: Node.js 22.x (LTS)
- **API Framework**: Express.js
- **ORM & Database Toolkit**: Prisma
- **Primary Database**: Neon PostgreSQL (Serverless Postgres)
- **Cache & Message Broker**: Redis (Upstash)
- **Object Storage**: MinIO (S3-compatible) or AWS S3
- **Container Orchestration**: Kubernetes (k3s for development, EKS/GKE for production)
- **Containerization**: Docker
- **GPU Acceleration**: NVIDIA CUDA Toolkit, NVIDIA Container Toolkit
- **Authentication**: JWT, bcryptjs
- **Validation**: Zod
- **Logging**: Pino
- **Monitoring**: Prometheus, Grafana, NVIDIA DCGM Exporter
- **CI/CD**: GitHub Actions

## 📋 Modules Breakdown

### 1. Core Infrastructure & Platform Modules

| Module | Purpose | Key Tech |
|--------|---------|----------|
| API Gateway | Single entry point, routing, SSL termination, rate limiting | Nginx, Kubernetes Ingress |
| Authentication & Authorization | Manages user identity, sessions, and permissions (RBAC) | JWT, bcrypt, Prisma |
| Data Storage | Central, multi-tenant database for all application data | Neon PostgreSQL, Prisma Client |
| Compute Orchestration | Manages the deployment and scaling of all workloads | Kubernetes, Helm |
| Monitoring & Telemetry | Tracks application & hardware health, metrics, and logs | Prometheus, Grafana, Loki, DCGM Exporter |

### 2. SaaS Business Application Modules

| Module | Purpose | Key Models/Features |
|--------|---------|---------------------|
| Multi-Tenancy Core | Data isolation between customer companies ("Workspaces") | Workspace, User, UserOnWorkspace |
| Customer CRM | Manage interactions with current and potential customers | Customer model, contact notes |
| Inventory Management | Track stock levels, product details, and costs | Product model, low stock alerts |
| Invoicing & Billing | Create, send, and track invoices and payments | Invoice, InvoiceItem, payment status tracking |
| Task Management | Organize, assign, and track team tasks and projects | Task model, assignees, due dates |
| Reporting Dashboard | Overview of key business metrics and KPIs | Aggregated data widgets, charts |

### 3. Cloud Compute Platform Modules

| Module | Purpose | Key Tech/Features |
|--------|---------|-------------------|
| Resource Manager | Tracks available CPU/GPU capacity across the cluster | Custom API, Kubernetes Metrics Server |
| Job Queueing Service | Accepts, prioritizes, and schedules compute jobs | BullMQ, Redis |
| GPU Accelerated Compute | Executes parallel processing tasks (ML, rendering) | CUDA, PyTorch, TensorFlow, FFmpeg NVENC |
| High-Performance CPU Compute | Runs data processing, simulations, and compilation | Node.js Worker Threads, Python |
| Function-as-a-Service (FaaS) | On-demand execution of user-submitted code | Secure container isolation, time-limiting |

### 4. Cross-Cutting Concern Modules

| Module | Purpose | Key Tech |
|--------|---------|----------|
| Advanced Billing & Metering | Tracks usage of all resources for granular invoicing | Time-based metering ($/GPU-hr, $/vCPU-hr), Stripe API |
| Notification Service | Delivers in-app and email alerts for events and job completion | WebSockets, Nodemailer, BullMQ queues |
| Logging Service | Aggregates and stores logs from all services for debugging | Pino, Loki, Grafana |
| Security & Compliance | Ensures data isolation, secure code execution, and privacy | Kubernetes Network Policies, Pod Security Contexts |

---

## 🛠️ Installation & Development Setup

This guide sets up a development environment using docker-compose to simulate the core services.

### Prerequisites

- Docker and Docker Compose
- Node.js (v22.x or higher)
- npm or yarn
- git

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/awan-keusahawanan.git
cd awan-keusahawanan
```

### 2. Environment Configuration

Copy the example environment file and configure it for development:

```bash
cp .env.example .env
```

Edit the .env file with your specific settings:

```env
# Application
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3000

# Database - Get from Neon.tech dashboard
DATABASE_URL="postgresql://user:pass@ep-abc-123.us-east-2.aws.neon.tech/main?sslmode=require&connect_timeout=300"
DIRECT_URL="postgresql://user:pass@ep-abc-123.us-east-2.aws.neon.tech/main?sslmode=require"

# JWT
JWT_SECRET=your-super-secure-jwt-secret-change-in-production
JWT_EXPIRES_IN=90d

# Redis (for sessions, cache, queue)
REDIS_URL="redis://localhost:6379"

# Object Storage (MinIO for dev)
S3_ENDPOINT="localhost"
S3_PORT=9000
S3_USE_SSL=false
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=awan-keusahawanan

# Email (for notifications - use Ethereal.email for dev)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USERNAME=your-ethereal-email
SMTP_PASSWORD=your-ethereal-password
```

### 3. Start Dependent Services with Docker

This command starts Redis, MinIO (S3), and a local monitoring stack.

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Install Dependencies and Setup Database

```bash
# Install npm dependencies
npm install

# Generate the Prisma Client
npx prisma generate

# Push the schema to your Neon database
npx prisma db push

# (Optional) Seed the database with sample data
npx prisma db seed
```

### 5. Run the Application

```bash
# Run in development mode with hot-reload
npm run dev

# Or, run in production mode
npm start
```

The API server will be running on http://localhost:3000. You can explore the Prisma database using:

```bash
npx prisma studio
```

---

## 🧪 Testing the Compute Platform (Example)

### 1. Submit a CPU-Intensive Job

**Endpoint**: POST /api/compute/jobs  
**Headers**: Authorization: Bearer <YOUR_JWT_TOKEN>  
**Body**:

```json
{
  "jobType": "cpu",
  "command": "data-processing",
  "parameters": {
    "inputFile": "sales-data.csv",
    "operation": "aggregate"
  }
}
```

**Response**:

```json
{
  "success": true,
  "jobId": "job_cpu_12345",
  "message": "Job queued successfully."
}
```

### 2. Check Job Status

**Endpoint**: GET /api/compute/jobs/job_cpu_12345  
**Headers**: Authorization: Bearer <YOUR_JWT_TOKEN>

### 3. Submit a GPU-Accelerated Job (e.g., Video Render)

**Endpoint**: POST /api/compute/jobs  
**Headers**: Authorization: Bearer <YOUR_JWT_TOKEN>  
**Body**:

```json
{
  "jobType": "gpu",
  "command": "video-render",
  "parameters": {
    "projectFile": "my_project.aep",
    "outputFormat": "mp4"
  },
  "resourceRequest": {
    "gpuType": "nvidia-t4",
    "vCpus": 4,
    "memory": "8Gi"
  }
}
```

---

## 📊 Monitoring

Access the local monitoring dashboards (after running docker-compose):

- **Grafana (Metrics)**: http://localhost:3001 (admin:admin)
- **Prometheus**: http://localhost:9090
- **MinIO Console**: http://localhost:9001 (minioadmin:minioadmin)

---

## 🚀 Production Deployment

This project is designed for Kubernetes. Example steps:

1. Build Docker Images:
   ```bash
   docker build -t your-registry/awan-keusahawanan:latest .
   ```
2. Set up a Kubernetes Cluster (e.g., on AWS EKS, GKE, or use k3s).
3. Install NVIDIA GPU Operator if using GPUs.
4. Deploy using Helm charts (located in /k8s/helm/).
5. Configure Ingress, TLS certificates, and production secrets.

Example Helm install:

```bash
helm install awan-keusahawanan ./k8s/helm/awan-keusahawanan/ \
  --set database.url="postgresql://..." \
  --set jwt.secret="your-prod-secret" \
  --namespace awan-keusahawanan \
  --create-namespace
```

---

## 🤝 Contributing

We welcome contributions! Please read our Contributing Guide for details on our code of conduct and the process for submitting pull requests.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the GNU Affero General Public License v3.0 - see the LICENSE file for details. This license is chosen for its strong copyleft protection for network-based software.
