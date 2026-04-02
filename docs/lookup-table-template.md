# Lookup Table: <TABLE_NAME>

**Note:** The database table already exists. Haiku should generate only the API and UI layers, not SQL or migrations.
**Note:** The application automatically loads all routers from the routes folder. Do not generate or suggest app.use() registration code.

## Purpose
<Describe what this lookup table represents and where it is used.>

---

# 1. Table Definition

**Table:** <TABLE_NAME>  
**Primary Key:** <PRIMARY_KEY> (<TYPE>)

## Fields
| Field        | Type        | Required | Notes |
|--------------|-------------|----------|-------|
| <FIELD>      | <TYPE>      | yes/no   | <notes> |
| <FIELD>      | <TYPE>      | yes/no   | <notes> |

---

# 2. Business Rules
- <PRIMARY_KEY> must be unique.
- <PRIMARY_KEY> is always stored uppercase.
- Cannot delete if referenced by dependent tables.
- Primary key cannot be edited after creation.
- Optional: enforce alphanumeric codes.
- Optional: max lengths based on schema.

---

# 3. API Requirements 
*(Match existing OPCODE API pattern exactly)*

Note: The application automatically loads all routers from the routes folder. Do not generate or suggest app.use() registration code.

## Endpoints
- `GET /api/<route>`
- `GET /api/<route>/:id`
- `POST /api/<route>`
- `PUT /api/<route>/:id`
- `DELETE /api/<route>/:id`

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
  { "message": "...", "<primary_key>": "<value>" }