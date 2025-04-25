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

2. Start the development environment:

```bash
docker-compose -f docker-compose.dev.yml up
```

This will start:
- PostgreSQL database on port 5432
- Go backend API on port 8080
- React frontend on port 3000

3. Access the application:
   - Frontend: http://localhost:3000
   - API: http://localhost:8080

### Running in Production Mode

```bash
docker-compose up -d
```

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
└── docker-compose.yml     # Production Docker configuration
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| SERVER_PORT | API server port | 8080 |
| DB_HOST | Database hostname | postgres |
| DB_PORT | Database port | 5432 |
| DB_USER | Database username | postgres |
| DB_PASSWORD | Database password | postgres |
| DB_NAME | Database name | garden_planner |
| JWT_SECRET | JWT signing secret | (required in production) |
| CORS_ALLOW_ORIGINS | Allowed origins for CORS | http://localhost:3000 |

## License

MIT