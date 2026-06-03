// services/getOperationForJob.js - Operation lookup with fallback logic

/**
 * Get operation info for a job with fallback logic:
 * 1. Try active operations (JOB_OPERATIONS)
 * 2. If no rows, try archived operations (JOB_HIST_OPS)
 * 3. If still no rows, fallback to part router (ROUTER_LINE)
 *
 * @param {object} connection - MySQL connection
 * @param {string} job - Job number
 * @param {string} suffix - Job suffix
 * @param {string} part - Part number (for router fallback)
 * @returns {Promise<object>} Operation object or null
 */
async function getOperationForJob(connection, job, suffix, part) {
  // 1. Try active operations
  let ops = await queryJobOperations(connection, job, suffix);
  if (ops.length > 0) {
    return ops.sort((a, b) => b.SEQ - a.SEQ)[0];
  }

  // 2. Try archived operations
  ops = await queryJobHistOps(connection, job, suffix);
  if (ops.length > 0) {
    return ops.sort((a, b) => b.SEQ - a.SEQ)[0];
  }

  // 3. Fallback to router
  const routerOps = await queryRouterLine(connection, part);
  if (routerOps.length > 0) {
    return routerOps.sort((a, b) => b.LINE_ROUTER - a.LINE_ROUTER)[0];
  }

  return null;
}

/**
 * Query JOB_OPERATIONS (active)
 */
function queryJobOperations(connection, job, suffix) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT SEQ, OPERATION, DESCRIPTION, UNITS_COMPLETE, DATE_COMPLETED
      FROM JOB_OPERATIONS
      WHERE JOB_NUMBER = ? AND JOB_SUFFIX = ?
    `;
    connection.query(query, [job, suffix], (err, rows) => {
      if (err) {
        console.warn(
          `JOB_OPERATIONS query failed for ${job}-${suffix}:`,
          err.message,
        );
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Query JOB_HIST_OPS (archived)
 */
function queryJobHistOps(connection, job, suffix) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT SEQ, OPERATION, DESCRIPTION, UNITS_COMPLETE, UNITS_SCRAP, DATE_COMPLETED
      FROM JOB_HIST_OPS
      WHERE JOB_NUMBER = ? AND JOB_SUFFIX = ?
    `;
    connection.query(query, [job, suffix], (err, rows) => {
      if (err) {
        console.warn(
          `JOB_HIST_OPS query failed for ${job}-${suffix}:`,
          err.message,
        );
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Query ROUTER_LINE (part routing)
 */
function queryRouterLine(connection, part) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT LINE_ROUTER, OPERATION, DESCRIPTION
      FROM ROUTER_LINE
      WHERE PART = ?
    `;
    connection.query(query, [part], (err, rows) => {
      if (err) {
        console.warn(`ROUTER_LINE query failed for part ${part}:`, err.message);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
}

module.exports = {
  getOperationForJob,
};
