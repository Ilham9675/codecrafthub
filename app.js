// app.js — CodeCraftHub: a simple REST API to track courses you want to learn.
// Data is stored in courses.json (no database needed).

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, "courses.json");
const VALID_STATUSES = ["Not Started", "In Progress", "Completed"];
const REQUIRED_FIELDS = ["name", "description", "target_date", "status"];

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Parse JSON request bodies (req.body)
app.use(express.json());

// CORS: allow a browser-based dashboard (for example one generated with Bolt)
// running on another origin to call this API.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  // Browsers send an OPTIONS "preflight" request before PUT/DELETE/JSON POST
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// ---------------------------------------------------------------------------
// Helper functions for the JSON file
// ---------------------------------------------------------------------------

// Read all courses. Creates courses.json with an empty list if it doesn't exist.
function loadCourses() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    return [];
  }
  const data = fs.readFileSync(DATA_FILE, "utf8");
  return data.trim() ? JSON.parse(data) : [];
}

// Write all courses back to courses.json.
function saveCourses(courses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2));
}

// Next ID = highest existing ID + 1 (starts at 1).
function getNextId(courses) {
  return courses.length === 0 ? 1 : Math.max(...courses.map((c) => c.id)) + 1;
}

// Current time as "YYYY-MM-DD HH:MM:SS".
function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

// True for a real calendar date in YYYY-MM-DD format (e.g. rejects 2025-02-30).
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date) && date.toISOString().startsWith(value);
}

// Validates course fields. With partial = true (updates), only fields that are present are checked.
// Returns an error message, or null when the data is valid.
function validateCourse(data, partial = false) {
  if (!partial) {
    const missing = REQUIRED_FIELDS.filter(
      (field) => data[field] === undefined || String(data[field]).trim() === ""
    );
    if (missing.length > 0) {
      return `Missing required fields: ${missing.join(", ")}`;
    }
  }
  for (const field of ["name", "description"]) {
    if (data[field] !== undefined && (typeof data[field] !== "string" || data[field].trim() === "")) {
      return `Field '${field}' must be a non-empty string`;
    }
  }
  if (data.target_date !== undefined && !isValidDate(data.target_date)) {
    return "Field 'target_date' must be a valid date in YYYY-MM-DD format";
  }
  if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  return null;
}

// Parses the :id route parameter; returns null when it isn't a positive integer.
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Consistent error response: { success: false, error: "..." }
function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Welcome / health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the CodeCraftHub API",
    endpoints: {
      "GET /api/courses": "Get all courses",
      "GET /api/courses/:id": "Get a specific course",
      "POST /api/courses": "Add a new course",
      "PUT /api/courses/:id": "Update a course",
      "DELETE /api/courses/:id": "Delete a course",
      "GET /api/courses/stats": "Course statistics",
      "GET /api/courses/search?q=term": "Search courses by name or description",
    },
  });
});

// GET all courses
app.get("/api/courses", (req, res) => {
  try {
    const courses = loadCourses();
    res.status(200).json({ success: true, count: courses.length, courses });
  } catch (error) {
    sendError(res, 500, `Failed to read courses: ${error.message}`);
  }
});

// GET statistics — must be declared before /api/courses/:id, otherwise "stats" would be treated as an id
app.get("/api/courses/stats", (req, res) => {
  try {
    const courses = loadCourses();
    const byStatus = {};
    VALID_STATUSES.forEach((status) => {
      byStatus[status] = courses.filter((c) => c.status === status).length;
    });
    res.status(200).json({ success: true, stats: { total: courses.length, by_status: byStatus } });
  } catch (error) {
    sendError(res, 500, `Failed to read courses: ${error.message}`);
  }
});

// GET search by name/description — also declared before /api/courses/:id
app.get("/api/courses/search", (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  if (!query) {
    return sendError(res, 400, 'Search query parameter "q" is required');
  }
  try {
    const results = loadCourses().filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
    );
    res.status(200).json({ success: true, query, count: results.length, courses: results });
  } catch (error) {
    sendError(res, 500, `Failed to read courses: ${error.message}`);
  }
});

// GET one course by id
app.get("/api/courses/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "Course ID must be a positive integer");
  try {
    const course = loadCourses().find((c) => c.id === id);
    if (!course) return sendError(res, 404, `Course with ID ${id} not found`);
    res.status(200).json({ success: true, course });
  } catch (error) {
    sendError(res, 500, `Failed to read courses: ${error.message}`);
  }
});

// POST a new course
app.post("/api/courses", (req, res) => {
  const data = req.body || {};
  const validationError = validateCourse(data);
  if (validationError) return sendError(res, 400, validationError);

  try {
    const courses = loadCourses();
    const newCourse = {
      id: getNextId(courses),
      name: data.name.trim(),
      description: data.description.trim(),
      target_date: data.target_date,
      status: data.status,
      created_at: timestamp(),
    };
    courses.push(newCourse);
    saveCourses(courses);
    res.status(201).json({ success: true, message: "Course added successfully", course: newCourse });
  } catch (error) {
    sendError(res, 500, `Failed to save course: ${error.message}`);
  }
});

// PUT update a course (send only the fields you want to change)
app.put("/api/courses/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "Course ID must be a positive integer");

  const data = req.body || {};
  const updatable = REQUIRED_FIELDS.filter((field) => data[field] !== undefined);
  if (updatable.length === 0) {
    return sendError(res, 400, `Provide at least one field to update: ${REQUIRED_FIELDS.join(", ")}`);
  }
  const validationError = validateCourse(data, true);
  if (validationError) return sendError(res, 400, validationError);

  try {
    const courses = loadCourses();
    const course = courses.find((c) => c.id === id);
    if (!course) return sendError(res, 404, `Course with ID ${id} not found`);

    updatable.forEach((field) => {
      course[field] = typeof data[field] === "string" ? data[field].trim() : data[field];
    });
    course.updated_at = timestamp();
    saveCourses(courses);
    res.status(200).json({ success: true, message: "Course updated successfully", course });
  } catch (error) {
    sendError(res, 500, `Failed to update course: ${error.message}`);
  }
});

// DELETE a course
app.delete("/api/courses/:id", (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return sendError(res, 400, "Course ID must be a positive integer");

  try {
    const courses = loadCourses();
    const index = courses.findIndex((c) => c.id === id);
    if (index === -1) return sendError(res, 404, `Course with ID ${id} not found`);

    const [deletedCourse] = courses.splice(index, 1);
    saveCourses(courses);
    res.status(200).json({ success: true, message: "Course deleted successfully", deleted_course: deletedCourse });
  } catch (error) {
    sendError(res, 500, `Failed to delete course: ${error.message}`);
  }
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// Unknown routes
app.use((req, res) => {
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
});

// Malformed JSON bodies and other unexpected errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return sendError(res, 400, "Request body is not valid JSON");
  }
  console.error(err);
  sendError(res, 500, "Internal server error");
});

// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  loadCourses(); // make sure courses.json exists
  console.log("=".repeat(60));
  console.log("CodeCraftHub API is starting...");
  console.log(`Data will be stored in: ${DATA_FILE}`);
  console.log(`API is available at: http://localhost:${PORT}`);
  console.log("=".repeat(60));
  console.log("Press CTRL+C to stop the server");
});
