# CodeCraftHub – Learning Management System API

A simple REST API to track your personal learning goals and courses.

## Overview

CodeCraftHub helps developers keep track of the courses they want to learn. It is built with **Node.js** and **Express** and stores data in a plain JSON file (`courses.json`), so no database is needed. There is no authentication; the goal is to learn REST API basics.

## Features

- Full CRUD (Create, Read, Update, Delete) for courses
- JSON file storage – `courses.json` is created automatically on first run
- Input validation with clear error messages (required fields, `YYYY-MM-DD` dates, allowed status values)
- Consistent JSON responses: `{ "success": true, ... }` or `{ "success": false, "error": "..." }`
- CORS enabled, so a browser dashboard on another origin can call the API
- Bonus: course statistics and search endpoints

Each course has:

| Field | Type | Notes |
|---|---|---|
| `id` | number | Auto-generated, starts at 1 |
| `name` | string | Required |
| `description` | string | Required |
| `target_date` | string | Required, format `YYYY-MM-DD` |
| `status` | string | Required: `Not Started`, `In Progress`, or `Completed` |
| `created_at` | string | Auto-generated timestamp |
| `updated_at` | string | Set when the course is updated |

## Installation

Requirements: Node.js 14 or newer and npm.

```bash
git clone <your-repo-url>
cd codecrafthub
npm install
```

## Running the application

```bash
npm start
```

The API is available at `http://localhost:5000`. To use another port: `PORT=8080 npm start`.

## API endpoints

| Method | Endpoint | Description | Success code |
|---|---|---|---|
| GET | `/api/courses` | Get all courses | 200 |
| GET | `/api/courses/:id` | Get one course | 200 |
| POST | `/api/courses` | Add a course | 201 |
| PUT | `/api/courses/:id` | Update a course (only the fields you send) | 200 |
| DELETE | `/api/courses/:id` | Delete a course | 200 |
| GET | `/api/courses/stats` | Totals by status | 200 |
| GET | `/api/courses/search?q=term` | Search name and description | 200 |

### Add a course

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Content-Type: application/json" \
  -d '{"name":"Python Basics","description":"Learn Python fundamentals","target_date":"2025-12-31","status":"Not Started"}'
```

Response `201 Created`:

```json
{
  "success": true,
  "message": "Course added successfully",
  "course": {
    "id": 1,
    "name": "Python Basics",
    "description": "Learn Python fundamentals",
    "target_date": "2025-12-31",
    "status": "Not Started",
    "created_at": "2025-11-04 10:30:00"
  }
}
```

### Get all courses

```bash
curl http://localhost:5000/api/courses
```

Response `200 OK`: `{ "success": true, "count": 1, "courses": [ ... ] }`

### Get a specific course

```bash
curl http://localhost:5000/api/courses/1
```

### Update a course

```bash
curl -X PUT http://localhost:5000/api/courses/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"In Progress"}'
```

### Delete a course

```bash
curl -X DELETE http://localhost:5000/api/courses/1
```

### Statistics

```bash
curl http://localhost:5000/api/courses/stats
```

Response: `{ "success": true, "stats": { "total": 3, "by_status": { "Not Started": 1, "In Progress": 1, "Completed": 1 } } }`

### Search

```bash
curl "http://localhost:5000/api/courses/search?q=python"
```

## Error responses

| Situation | Status | Example `error` |
|---|---|---|
| Missing fields | 400 | `Missing required fields: description, status` |
| Invalid status | 400 | `Invalid status. Must be one of: Not Started, In Progress, Completed` |
| Invalid date | 400 | `Field 'target_date' must be a valid date in YYYY-MM-DD format` |
| Invalid JSON body | 400 | `Request body is not valid JSON` |
| Course not found | 404 | `Course with ID 99 not found` |
| File read/write problem | 500 | `Failed to save course: ...` |

## Troubleshooting

- **`Cannot find module 'express'`** – run `npm install` in the project folder.
- **`EADDRINUSE` / port already in use** – stop the other program on port 5000, or start with another port: `PORT=5001 npm start`.
- **`Request body is not valid JSON`** – check the quotes in your curl `-d '...'` body. On Windows Command Prompt use double quotes outside and escaped quotes inside: `-d "{\"status\":\"Completed\"}"`.
- **Browser dashboard shows a CORS error** – make sure this server (with CORS enabled) is running and the dashboard uses the correct base URL.
- **`courses.json` got corrupted** – replace its content with `[]` and restart the server.

## Project structure

```
codecrafthub/
├── app.js          # Express application (routes, validation, file storage)
├── courses.json    # Data storage (auto-created)
├── package.json    # Project metadata and dependencies
└── README.md       # This file
```
