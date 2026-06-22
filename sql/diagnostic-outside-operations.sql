-- Diagnostic Query for JOB 122562 - Outside Operations Issue
-- Pervasive SQL v10 compatible version
-- RUN EACH QUERY SEPARATELY
--
-- This checks if there's a part number mismatch in the router lookup

-- ============================================================================
-- STEP 1: Get the job header (what part is this job for?)
-- Run this query first
-- ============================================================================
SELECT 'STEP 1: Job Header' AS Step, 
       JOB, SUFFIX, PART, PART_DESCRIPTION, ROUTER
FROM JOB_HEADER
WHERE JOB = '122562' AND SUFFIX = '000'

-- ============================================================================
-- STEP 2: Get all JOB_OPERATIONS for this job
-- Run this query second
-- ============================================================================
-- SELECT 'STEP 2: Job Operations' AS Step,
--        SEQ, OPERATION, LMO, ROUTER, ROUTER_SEQ, 
--        DATE_COMPLETED, UNITS_COMPLETE
-- FROM JOB_OPERATIONS
-- WHERE JOB = '122562' AND SUFFIX = '000'
--   AND SEQ < '990000'
-- ORDER BY SEQ

-- ============================================================================
-- STEP 3: For each operation, check if ROUTER_LINE exists
-- Run this query third
-- ============================================================================
-- SELECT 'STEP 3: Router Line Lookup' AS Step,
--        JO.SEQ, JO.OPERATION, JO.ROUTER, JO.ROUTER_SEQ,
--        RL.ROUTER, RL.LINE_ROUTER, RL.DESC_RT_LINE, RL.PART_WC_OUTSIDE,
--        CASE 
--          WHEN RL.ROUTER IS NULL THEN 'MISSING - No ROUTER_LINE row'
--          WHEN RL.PART_WC_OUTSIDE = 'Y' THEN 'YES - Outside Processing'
--          ELSE 'NO - Inside Processing'
--        END AS Outside_Status
-- FROM JOB_OPERATIONS JO
-- LEFT OUTER JOIN ROUTER_LINE RL 
--   ON RL.ROUTER = JO.ROUTER 
--   AND RL.LINE_ROUTER = JO.ROUTER_SEQ
-- WHERE JO.JOB = '122562' AND JO.SUFFIX = '000' AND JO.SEQ < '990000'
-- ORDER BY JO.SEQ

-- ============================================================================
-- STEP 4: Check if ROUTER_LINE has multiple parts for same router/line
-- Run this query fourth
-- ============================================================================
-- SELECT 'STEP 4: Router Line Multi-Part Check' AS Step,
--        ROUTER, LINE_ROUTER, DESC_RT_LINE, PART_WC_OUTSIDE,
--        COUNT(*) AS RowCount
-- FROM ROUTER_LINE
-- WHERE ROUTER IN (SELECT DISTINCT ROUTER FROM JOB_OPERATIONS 
--                  WHERE JOB = '122562' AND SUFFIX = '000')
--   AND LINE_ROUTER IN (SELECT DISTINCT ROUTER_SEQ FROM JOB_OPERATIONS 
--                       WHERE JOB = '122562' AND SUFFIX = '000')
-- GROUP BY ROUTER, LINE_ROUTER, DESC_RT_LINE, PART_WC_OUTSIDE
-- HAVING COUNT(*) > 1

-- ============================================================================
-- STEP 5: For operations with PART_WC_OUTSIDE='Y', check for PO in JOB_DETAIL
-- Run this query fifth
-- ============================================================================
-- SELECT 'STEP 5: Outside Processing PO Lookup' AS Step,
--        JO.SEQ, JO.OPERATION, JO.LMO, RL.PART_WC_OUTSIDE,
--        JD.SEQ AS JD_SEQ, JD.OPERATION AS JD_OP, JD.LMO AS JD_LMO, 
--        JD.REFERENCE AS PO_Number,
--        CASE 
--          WHEN RL.PART_WC_OUTSIDE = 'Y' AND JD.REFERENCE IS NULL THEN 'WARNING: OUTSIDE but no PO'
--          WHEN RL.PART_WC_OUTSIDE = 'Y' AND JD.REFERENCE IS NOT NULL THEN 'OK'
--          ELSE 'N/A'
--        END AS Status
-- FROM JOB_OPERATIONS JO
-- LEFT OUTER JOIN ROUTER_LINE RL 
--   ON RL.ROUTER = JO.ROUTER 
--   AND RL.LINE_ROUTER = JO.ROUTER_SEQ
-- LEFT OUTER JOIN JOB_DETAIL JD
--   ON JD.JOB = JO.JOB
--   AND JD.SUFFIX = JO.SUFFIX
--   AND JD.OPERATION = JO.OPERATION
-- WHERE JO.JOB = '122562' AND JO.SUFFIX = '000'
--   AND JO.SEQ < '990000'
--   AND (RL.PART_WC_OUTSIDE = 'Y' OR JD.LMO = 'O')
-- ORDER BY JO.SEQ
