# CIQMS - Quality Management System

## Architecture Overview

CIQMS is a **Quality Management System** built as a Node.js/Express application with MySQL backend, designed for manufacturing quality control workflows including nonconformance management, corrective actions, supplier quality, competency tracking, and certification management.

### Key Components

- **Backend**: Express.js API server (`server.js`) with modular route handlers in `routes/`
- **Frontend**: Static HTML with vanilla JavaScript modules (`.mjs` files) in `public/js/`
- **Database**: MySQL with environment-based connection configuration via `.env`
- **Hybrid Execution**: Node.js backend + **VBScript files** for Windows-specific database operations and reports

## Critical Architecture Patterns

### Route Structure

Each major feature has both JS and VBS implementations:

- `routes/*.js` - Express route handlers for API endpoints
- `routes/*.vbs` - VBScript files for complex database operations and reporting
- URL pattern: `/feature` maps to `routes/feature.js`

### Database Patterns

**Connection Pattern** (every route):

```javascript
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: 3306,
  database: "quality",
});
```

**ID Generation Pattern**:

- All entities use 7-digit zero-padded IDs from `SYSTEM_IDS` table
- Pattern: Get next ID → Insert record → Update `SYSTEM_IDS.CURRENT_ID`

### Frontend Patterns

- **Template System**: `utils.mjs` provides `renderWithTemplate()` and `renderWithTemplate2()` for HTML templating
- **Module Loading**: Frontend uses ES6 modules (`.mjs` extensions)
- **Partial Templates**: HTML fragments in `public/partials/` for reusable components

### VBScript Integration

VBScript files handle:

- Complex reporting logic
- Direct database connections using ADODB
- Environment detection (`QUALITY-MGR` computer has different paths)
- Certificate and RMA processing workflows

## Development Workflows

### Environment Setup

1. Requires `.env` file with database credentials (`DB_HOST`, `DB_USER`, `DB_PASS`)
2. Start with: `npm run dev` (uses `--env-file=.env` flag)
3. Access at: `http://localhost:3003`

### Windows-Specific Deployment

- `ciqms.bat` - Batch file for starting application
- `ciqms.vbs` - VBScript wrapper for silent startup
- Designed for Windows startup integration via shortcuts

### Database Schema Conventions

- Table naming: UPPERCASE with underscores (e.g., `PEOPLE_INPUT`, `PPL_INPT_TEXT`)
- Text fields: Separate tables for large text (e.g., `PPL_INPT_TEXT` for `PEOPLE_INPUT` details)
- Audit fields: `CREATE_DATE`, `CREATE_BY`, `MODIFIED_DATE`, `MODIFIED_BY`

## Key Business Domain Concepts

### Core Modules

- **Actions/Inputs**: Task/action item tracking (`routes/input.js`)
- **NCM**: Nonconformance Management (`routes/ncm.js`)
- **Corrective Actions**: Quality improvement workflows (`routes/corrective.js`)
- **Suppliers**: Supplier quality management (`routes/suppliers.js`)
- **Competency**: Training/competency tracking (`routes/attendance.js`)
- **Certification**: Certificate management with VBS integration (`routes/cert.js` + `cert.vbs`)

### Email Integration

- Nodemailer for notifications (see `input.js` email routes)
- BCC to `<tim.kent@ci-aviation.com>` for tracking
- Action item assignments trigger automatic emails

### File Organization

- **Static Assets**: `public/` (HTML, CSS, images, client-side JS)
- **API Routes**: `routes/` (server-side logic)
- **Templates**: `public/partials/` (reusable HTML fragments)
- **Styling**: `public/css/` (shared stylesheets)

## Code Style & Conventions

### JavaScript

- Mix of traditional callbacks and async/await
- Error handling: Try-catch with connection cleanup
- Route parameter pattern: `/:id` for entity operations
- Body parsing: Both `req.body` and `req.body.data` patterns supported

### Database Operations

- Use parameterized queries (`?` placeholders) for user input
- String interpolation for static values (table names, fixed conditions)
- Manual connection management (create → use → close)

### VBScript

- ADODB connections with credentials from `.env` file
- Computer-specific path detection for deployment flexibility
- Command-line argument processing for parameterized operations

When modifying this system, respect the hybrid JS/VBS architecture and maintain the established patterns for database connections, ID generation, and template rendering.
