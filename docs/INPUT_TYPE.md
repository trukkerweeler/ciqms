# Lookup Table: INPUT_TYPE

**Note:** The database table already exists. Haiku should generate only the API and UI layers, not SQL or migrations.
**Note:** The application automatically loads all routers from the routes folder. Do not generate or suggest app.use() registration code.

## Purpose

INPUT_TYPE defines the classification categories for action items and requests within the quality management system. These types are used to categorize inputs (actions, tasks, requests) such as Purchase Requests, Evaluations, Risk Assessments, Training Requirements, etc. Input types help organize and filter work items throughout the system and provide clear intent classification for tracking and reporting.

---

# 1. Table Definition

**Table:** INPUT_TYPE  
**Primary Key:** INPUT_TYPE (VARCHAR(16))

## Fields

| Field       | Type        | Required | Notes                                        |
| ----------- | ----------- | -------- | -------------------------------------------- |
| INPUT_TYPE  | VARCHAR(16) | yes      | Unique identifier, always stored uppercase   |
| DESCRIPTION | VARCHAR(40) | no       | Human-readable description of the input type |

---

# 2. Business Rules

- INPUT_TYPE must be unique.
- INPUT_TYPE is always stored uppercase.
- Cannot delete if referenced by INPUT records in the PEOPLE_INPUT table.
- Primary key cannot be edited after creation.
- Codes are typically 3-5 character abbreviations (e.g., REQ, BUY, EVAL, RISK).

---

# 3. API Requirements

_(Match existing OPCODE API pattern exactly)_

Note: The application automatically loads all routers from the routes folder. Do not generate or suggest app.use() registration code.

## Endpoints

- `GET /api/inputtype`
- `GET /api/inputtype/:id`
- `POST /api/inputtype`
- `PUT /api/inputtype/:id`
- `DELETE /api/inputtype/:id`

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
  { "message": "...", "INPUT_TYPE": "<value>" }
  ```

---

# 4. UI Requirements

## Maintenance Page: input-type-maint.html

- Display all INPUT_TYPE records in a scrollable table
- Show columns: INPUT_TYPE, DESCRIPTION
- Provide Add/Edit/Delete buttons
- Form validation: INPUT_TYPE required, auto-uppercase
- Prevent deletion if referenced by INPUT records

## Integration Points

- `inputs.html` - Dropdown on Add Input dialog must load from API instead of hardcoded options
- `inputs.mjs` - Function to load INPUT_TYPE options dynamically from API
