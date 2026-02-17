# Garden Planner

A full-stack garden planning application with time-aware soil simulation and planting calendar.

## Features

- User authentication and garden management
- Interactive garden grid for plant placement
- Time-aware soil nutrient simulation
- Plant compatibility insights
- Forecasting for harvest dates and fertilizer needs
- Calendar integration for garden events

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Go with Gin framework
- **Database:** PostgreSQL with GORM
- **Containerization:** Docker and Docker Compose

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (for local frontend development)
- Go 1.21+ (for local backend development)

### Development Setup

1. Clone the repository

2. Create a development environment file:
   ```bash
   cp .env.example .env.development
   ```
   
   Adjust the values in `.env.development` as needed.

3. Generate SSL certificates for development (optional):
   ```bash
   ./scripts/generate-ssl-certs.sh
   ```

4. Start the development environment:
   ```bash
   docker-compose -f infra/docker-compose.dev.yml up
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Go backend API on port 8080
   - React frontend on port 3000

5. Access the application:
   - Frontend: http://localhost:3000
   - API: http://localhost:8080

### Production Deployment

1. Set up your production environment variables:
   ```bash
   cp .env.example .env
   ```
   
   **IMPORTANT**: Be sure to change the following values for production:
   - `POSTGRES_PASSWORD`: Use a strong password
   - `JWT_SECRET`: Set to a long, random string
   - `CORS_ALLOW_ORIGINS`: Set to your production domain(s)

2. Set up SSL certificates:
   - For production, you should use certificates from a trusted Certificate Authority
   - Place them in the `./ssl/` directory or adjust the path in your `.env` file

3. Deploy with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Access your production application:
   - Frontend: https://yourdomain.com
   - API: https://yourdomain.com/api (proxied through the frontend)

### System Requirements

#### Minimum Requirements
- 1 CPU core
- 2GB RAM
- 10GB storage

#### Recommended Requirements
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ SSD storage

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token

### Gardens

- `GET /api/gardens` - Get all user gardens
- `POST /api/gardens` - Create a new garden
- `GET /api/gardens/:id` - Get garden details
- `POST /api/gardens/:id/plants` - Add a plant to garden
- `GET /api/gardens/:id/soil` - Get soil data
- `GET /api/gardens/:id/future-soil` - Get soil forecast

### Plants

- `GET /api/plants` - Get all available plants
- `GET /api/plants/:id` - Get plant details
- `POST /api/plants` - Create a new plant (admin)

## Project Structure

```
├── backend/               # Go backend code
│   ├── cmd/               # Application entrypoints
│   ├── config/            # Configuration
│   ├── internal/          # Internal packages
│   │   ├── database/      # Database connection and migrations
│   │   ├── handlers/      # HTTP handlers
│   │   ├── middleware/    # Middleware components
│   │   ├── models/        # Data models
│   │   └── services/      # Business logic
│   └── migrations/        # SQL migrations
├── frontend/              # React frontend code
├── scripts/               # Utility scripts
├── ssl/                   # SSL certificates (not included in repository)
├── infra/docker-compose.yml     # Production Docker configuration
└── infra/docker-compose.dev.yml # Development Docker configuration
```

## Environment Variables

### Backend

| Variable | Description | Default | Required in Production |
|----------|-------------|---------|------------------------|
| SERVER_PORT | API server port | 8080 | No |
| DB_HOST | Database hostname | postgres | No |
| DB_PORT | Database port | 5432 | No |
| DB_USER | Database username | postgres | No |
| DB_PASSWORD | Database password | postgres | Yes (change) |
| DB_NAME | Database name | garden_planner | No |
| JWT_SECRET | JWT signing secret | - | Yes |
| JWT_EXPIRATION_HOURS | Token expiration in hours | 24 | No |
| CORS_ALLOW_ORIGINS | Allowed origins for CORS | https://yourdomain.com | Yes |
| GIN_MODE | Gin framework mode | release | No |

### Frontend

| Variable | Description | Default | Required in Production |
|----------|-------------|---------|------------------------|
| VITE_API_URL | API base URL | /api | No |
| WEB_PORT | HTTP port | 80 | No |
| WEB_SSL_PORT | HTTPS port | 443 | No |
| SSL_CERT_PATH | Path to SSL certificate | ./ssl/cert.pem | Yes |
| SSL_KEY_PATH | Path to SSL private key | ./ssl/key.pem | Yes |

## Maintenance and Backups

### Database Backups

To back up the PostgreSQL database:

```bash
docker exec -t garden_planner_postgres_1 pg_dumpall -c -U postgres > garden_planner_backup_$(date +%Y-%m-%d_%H-%M-%S).sql
```

To restore from a backup:

```bash
cat garden_planner_backup.sql | docker exec -i garden_planner_postgres_1 psql -U postgres
```

## Security Considerations

- All passwords are stored using bcrypt hashing
- JWT tokens are used for authentication
- HTTPS is enforced in production
- Database is not exposed to the public internet
- Backend uses a distroless container for minimal attack surface

## License

MIT