# Lookup Table: PRD_CHAR_TYPE

**Note:** The database table already exists. Haiku should generate only the API and UI layers, not SQL or migrations..

## Purpose
Defines product characteristic type codes used throughout the quality system.

---

# 1. Table Definition

**Table:** PRD_CHAR_TYPE  
**Primary Key:** PRD_CHAR_TYPE (VARCHAR(16))

## Fields
| Field          | Type        | Required | Notes |
|----------------|-------------|----------|-------|
| PRD_CHAR_TYPE  | string(16)  | yes      | Primary key; unique; uppercase |
| DESCRIPTION    | string(40)  | no       | Human-readable description |

---

# 2. Business Rules
- `PRD_CHAR_TYPE` must be unique.
- Always stored uppercase.
- Cannot delete if referenced by dependent tables.
- PK cannot be edited after creation.
- DESCRIPTION is optional but limited to 40 characters.

---

# 3. API Requirements  
*(Match existing OPCODE API pattern exactly)*

Note: The application automatically loads all routers from the routes folder. Do not generate or suggest app.use() registration code.

## Endpoints
- `GET /api/prd-char-type`
- `GET /api/prd-char-type/:id`
- `POST /api/prd-char-type`
- `PUT /api/prd-char-type/:id`
- `DELETE /api/prd-char-type/:id`

## API Behavior Rules
- Use mysql2 with a `createConnection()` helper.
- Connect → query → end connection.
- Normalize PK to uppercase on POST.
- Error responses:
  - 400 → missing required field
  - 404 → record not found
  - 409 → duplicate PK insert
  - 500 → DB connection/query failure
- JSON response format:
  ```json
  { "message": "...", "prd_char_type": "<value>" }