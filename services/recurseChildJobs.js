// services/recurseChildJobs.js - Recursive job hierarchy traversal for PROCESSCERT2

const {
  cleanSerialNumber,
  isJobReference,
  parseJobReference,
  toDateTime,
  compareDateTimes,
} = require("./utils");
const { getOperationForJob } = require("./getOperationForJob");

/**
 * Query all J52 transactions for a given job/suffix
 */
function queryJ52Transactions(connection, job, suffix) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        CAST(DATE_HISTORY AS CHAR) AS DATE_HISTORY,
        CAST(TIME_ITEM_HISTORY AS CHAR) AS TIME_ITEM_HISTORY,
        QUANTITY,
        JOB,
        SUFFIX,
        PART,
        SERIAL_NUMBER
      FROM ITEM_HISTORY
      WHERE JOB = ? AND SUFFIX = ?
      ORDER BY DATE_HISTORY DESC, TIME_ITEM_HISTORY DESC
    `;
    connection.query(query, [job, suffix], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Recursively build job hierarchy
 *
 * @param {object} connection - MySQL connection
 * @param {string} parentJob - Parent job number
 * @param {string} parentSuffix - Parent job suffix
 * @param {string} parentDateTime - Parent completion datetime (cutoff)
 * @param {Set} visitedJobs - Set to track visited jobs (prevent loops)
 * @param {number} depth - Recursion depth (for logging)
 * @returns {Promise<object>} Hierarchy object with children array
 */
async function recurseChildJobs(
  connection,
  parentJob,
  parentSuffix,
  parentDateTime,
  visitedJobs = new Set(),
  depth = 0,
) {
  const jobKey = `${parentJob}-${parentSuffix}`;

  // Check for cycles
  if (visitedJobs.has(jobKey)) {
    console.log(`[Loop detected] ${jobKey}`);
    return { job: parentJob, suffix: parentSuffix, children: [] };
  }

  visitedJobs.add(jobKey);

  try {
    // STEP 1 — Get all J52s for this job
    const j52Rows = await queryJ52Transactions(
      connection,
      parentJob,
      parentSuffix,
    );
    console.log(`Found ${j52Rows.length} J52 rows for ${jobKey}`);

    // STEP 2 — Identify child jobs via SERIAL_NUMBER
    const childJobsSet = new Set();

    j52Rows.forEach((row) => {
      const sn = cleanSerialNumber(row.SERIAL_NUMBER);
      if (isJobReference(sn)) {
        const childInfo = parseJobReference(sn);
        if (childInfo) {
          childJobsSet.add(`${childInfo.job}-${childInfo.suffix}`);
        }
      }
    });

    const children = [];

    // STEP 3 — Process each child job
    for (const childKey of childJobsSet) {
      const [childJob, childSuffix] = childKey.split("-");

      // Skip self-references
      if (childJob === parentJob && childSuffix === parentSuffix) {
        console.log(`[Skipping self-reference] ${childKey}`);
        continue;
      }

      const childJ52Rows = await queryJ52Transactions(
        connection,
        childJob,
        childSuffix,
      );

      // STEP 4 — Apply timestamp cutoff
      const validRows = childJ52Rows.filter((row) => {
        const rowDateTime = toDateTime(row.DATE_HISTORY, row.TIME_ITEM_HISTORY);
        return (
          rowDateTime && compareDateTimes(rowDateTime, parentDateTime) <= 0
        );
      });

      if (validRows.length > 0) {
        // STEP 5 — Pick the latest valid J52 (MAX datetime)
        validRows.sort((a, b) => {
          const aTime = toDateTime(a.DATE_HISTORY, a.TIME_ITEM_HISTORY);
          const bTime = toDateTime(b.DATE_HISTORY, b.TIME_ITEM_HISTORY);
          return compareDateTimes(bTime, aTime);
        });

        const selectedRow = validRows[0];
        const selectedDateTime = toDateTime(
          selectedRow.DATE_HISTORY,
          selectedRow.TIME_ITEM_HISTORY,
        );

        // ⭐ Get operation info (active → archived → router)
        const operation = await getOperationForJob(
          connection,
          childJob,
          childSuffix,
          selectedRow.PART,
        );

        // STEP 6 — Recurse deeper
        const childData = await recurseChildJobs(
          connection,
          childJob,
          childSuffix,
          selectedDateTime,
          visitedJobs,
          depth + 1,
        );

        children.push({
          ...childData,
          selectedRow: {
            dateTime: selectedDateTime,
            quantity: selectedRow.QUANTITY,
            part: selectedRow.PART,
            operation, // ⭐ integrated operation info
          },
        });
      }
    }

    return {
      job: parentJob,
      suffix: parentSuffix,
      dateTime: parentDateTime,
      children,
    };
  } catch (err) {
    console.error(`Error at ${jobKey}:`, err.message);
    throw err;
  }
}

module.exports = {
  recurseChildJobs,
  queryJ52Transactions,
};
