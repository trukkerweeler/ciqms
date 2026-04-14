# Chemical Tank Chart Configuration Guide

## Overview

Tank trend reporting system displays temperature and concentration data with control limits, out-of-limit detection, and colored status banners for printing.

**Current Status:**

- ✅ Tank 1 (01TE) - Configured
- ✅ Tank 8 (08TE) - Configured (same limits as Tank 1)
- ⏳ Tank 3 (03TE) - Needs configuration
- ⏳ Tank 5 (05TE) - Needs configuration
- ⏳ Tank 7 (07TE) - Needs configuration
- ⏳ Tank 11 (11TE) - Needs configuration
- ⏳ Tank 13 (13TE) - Needs configuration

---

## Architecture

### Backend (`routes/chem-tank.js`)

- **GET `/chem-tank/trend-data/:subject`** - Returns trend data for a tank (e.g., 01TE)
- **GET `/chem-tank/tank-info/:subject`** - Returns record metadata
- **Database**: MySQL `quality` database
  - **PEOPLE_INPUT** table: Contains INPUT_ID, INPUT_DATE, SUBJECT
  - **EIGHTYFIVETWELVE** table: Contains INPUT_ID, UNIT, VALUE
- **Data Filter**: Last 13 months using `DATE_FORMAT(NOW(), '%Y-%m-01') - INTERVAL 11 MONTH`
- **Units**: "Percent" and "F"/"Fahrenheit"

### Frontend Files

- **HTML Pages**: `/public/tank1.html`, `/public/tank3.html`, `/public/tank5.html`, etc.
- **JavaScript Module**: `/public/js/tank.mjs`
  - Fetches tank data
  - Detects tank number from URL
  - Analyzes data for out-of-limit readings
  - Renders two Chart.js instances (Temperature and Concentration)
  - Updates status banners with color coding
- **Print CSS**: `/public/css/tank-print.css`
  - Ensures full-width chart rendering
  - Preserves banner colors during printing
  - Optimized for landscape orientation, single page

---

## Working Configuration: Tank 1

### Control Limits (Tank 1 & 8)

```
Temperature:
  - LCL (Lower Control Limit): 120°F
  - UCL (Upper Control Limit): 160°F
  - Chart Y-axis range: 110–170°F

Concentration:
  - LCL: 10%
  - UCL: 25%
  - Chart Y-axis range: 5–30%
```

### Status Banner Colors

- **Green** (#27ae60): All readings in limits
- **Red** (#e74c3c): Latest reading out of limits
- **Gray** (#95a5a6): No data available

### Chart Styling

- **Temperature**: Black line with black points
- **Concentration**: Blue line (#1e88e5) with blue points
- **Out-of-limits**: Red line/points (#e74c3c) displayed as separate dataset
- **Control Lines**: Dashed red lines for LCL and UCL

---

## How to Configure a New Tank

### Step 1: Provide Control Limits

For each new tank, provide:

- Tank number (3, 5, 7, 11, or 13)
- Temperature LCL and UCL (in °F)
- Concentration LCL and UCL (in %)

### Step 2: Update `tank.mjs`

The limits are currently hardcoded:

```javascript
const TEMP_LCL = 120;
const TEMP_UCL = 160;
const PERCENT_LCL = 10;
const PERCENT_UCL = 25;
```

**For multiple tank limits**, recommend creating a configuration object by tank number:

```javascript
const TANK_LIMITS = {
  1: { tempLcl: 120, tempUcl: 160, percentLcl: 10, percentUcl: 25 },
  3: { tempLcl: xxx, tempUcl: xxx, percentLcl: xxx, percentUcl: xxx },
  // ... etc
};

// Then use:
const limits = TANK_LIMITS[tankNumber];
const TEMP_LCL = limits.tempLcl;
// etc
```

### Step 3: Update Chart Y-Axis Ranges

Currently hardcoded in chart options:

```javascript
// Temperature chart
min: 110, max: 170

// Concentration chart
min: 5, max: 30
```

May need to adjust based on new tanks' limit ranges. For example, if Tank 5 has concentration limits 15-45%, adjust the chart range accordingly.

### Step 4: HTML Pages

Tank pages (`tank{n}.html`) all follow the same structure:

- Use `/public/tank1.html` as template
- Update title and h1 heading
- Link to `/css/tank-print.css` for print styles
- Import `/js/tank.mjs` module
- Canvas IDs must be `temperatureChart` and `percentChart`
- Status banners must have IDs `tempStatusBanner` and `percentStatusBanner`

Example:

```html
<title>Tank 3 Trend</title>
<h1>Tank 3 Trend Report</h1>
<script type="module" src="/js/tank.mjs"></script>
```

---

## Implementation Workflow for Remaining Tanks

### For Each Tank (3, 5, 7, 11, 13):

1. **User provides**:
   - Temperature LCL, UCL
   - Concentration LCL, UCL
   - Any custom chart Y-axis ranges (optional)

2. **Configuration update**:
   - Add limits to `TANK_LIMITS` object in `tank.mjs`
   - Update Y-axis ranges if needed

3. **HTML page**:
   - Copy and update relevant tank page or create new ones
   - Update labels and heading with tank number
   - Ensure canvas and banner IDs match expected names

4. **Testing**:
   - Verify data loads (check Recent banner, record count)
   - Verify out-of-limit detection (banners show status)
   - Test printing (landscape orientation, single page)

5. **Backend**:
   - No changes needed; backend routes already support all tank codes (03TE, 05TE, etc.)
   - Data must exist in PEOPLE_INPUT/EIGHTYFIVETWELVE tables

---

## Files Affected

### Create/Modify for New Tanks

- `/public/js/tank.mjs` - Add limits to config object
- `/public/tank3.html`, `/public/tank5.html`, etc. - Create/update

### Shared Resources (Not Tank-Specific)

- `/public/css/tank-print.css` - Already created, reusable
- `/routes/chem-tank.js` - Backend supports any subject code
- `/public/json/reports.json` - Already has Chemical Tank Trends entry

---

## Database Prerequisites

For each tank to display data:

1. **PEOPLE_INPUT** must have records with:
   - `SUBJECT` = tank code (e.g., "03TE", "05TE")
   - `INPUT_DATE` populated
   - `INPUT_ID` that matches records in EIGHTYFIVETWELVE

2. **EIGHTYFIVETWELVE** must have:
   - `INPUT_ID` matching PEOPLE_INPUT
   - `UNIT` = "Percent" or "F"/"Fahrenheit"
   - `VALUE` = numeric measurement

### Verify Data Availability

Check if tank has data:

```sql
SELECT COUNT(*) FROM PEOPLE_INPUT
WHERE SUBJECT = '03TE'
AND INPUT_DATE >= DATE_FORMAT(NOW(), '%Y-%m-01') - INTERVAL 11 MONTH;
```

---

## Print Style Notes

The `/public/css/tank-print.css` file includes:

- `print-color-adjust: exact` - Forces banner colors to print
- Box-sizing and margin resets for full-width charts
- `page-break-inside: avoid` - Keeps sections together
- Canvas width 100% for proper landscape rendering

No additional print CSS needed for new tanks; same stylesheet applies to all.

---

## Next Steps

1. Collect control limit specifications for tanks 3, 5, 7, 11, 13
2. Update `tank.mjs` with configuration object
3. Create/update HTML pages for each tank
4. Deploy and test
5. Verify printing behavior

Questions or issues? Refer back to Tank 1 implementation or this guide.
