const exp = require("constants");
const cors = require("cors");
const express = require("express");
const session = require("express-session");
const app = express();
const configModule = require("./config");
const LOG_ROUTES_VERBOSE = process.env.LOG_ROUTES_VERBOSE === "true";
const LOG_REQUESTS = process.env.LOG_REQUESTS !== "false";
const LOG_ERROR_STACKS = process.env.LOG_ERROR_STACKS !== "false";

function maskSecret(value) {
  if (!value) return "(missing)";
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getTimestamp() {
  return new Date().toISOString();
}

function logError(scope, error, meta = "") {
  const err = error instanceof Error ? error : new Error(String(error));
  const metaText = meta ? ` | ${meta}` : "";

  console.error(`[ERR ${getTimestamp()}] [${scope}] ${err.message}${metaText}`);

  if (LOG_ERROR_STACKS && err.stack) {
    console.error(err.stack);
  }
}

const launchedWithEnvFile = process.execArgv.some((arg) =>
  arg.startsWith("--env-file"),
);
console.log("\n=== Startup Diagnostics ===");
console.log(`[ENV] launched with --env-file: ${launchedWithEnvFile}`);
console.log(
  `[ENV] AWS_ACCESS_KEY_ID: ${maskSecret(process.env.AWS_ACCESS_KEY_ID)}`,
);
console.log(`[ENV] AWS_REGION: ${process.env.AWS_REGION || "(missing)"}`);
const aiBedrockInferenceProfileArn =
  process.env.AI_BEDROCK_INFERENCE_PROFILE_ARN || "";
const bedrockInferenceProfileArn =
  process.env.BEDROCK_INFERENCE_PROFILE_ARN || "";
const aiModelId = process.env.AI_MODEL_ID || "";
const bedrockModelId = process.env.BEDROCK_MODEL_ID || "";

const bedrockModelSource = aiBedrockInferenceProfileArn
  ? "AI_BEDROCK_INFERENCE_PROFILE_ARN"
  : bedrockInferenceProfileArn
    ? "BEDROCK_INFERENCE_PROFILE_ARN"
    : aiModelId
      ? "AI_MODEL_ID"
      : bedrockModelId
        ? "BEDROCK_MODEL_ID"
        : "legacy_default_model_id";

const selectedBedrockModelTarget =
  aiBedrockInferenceProfileArn ||
  bedrockInferenceProfileArn ||
  aiModelId ||
  bedrockModelId ||
  "amazon.nova-pro-v1:0";

console.log(
  `[ENV] AI_BEDROCK_INFERENCE_PROFILE_ARN: ${
    aiBedrockInferenceProfileArn ? "(set)" : "(missing)"
  }`,
);
console.log(
  `[ENV] BEDROCK_INFERENCE_PROFILE_ARN: ${
    bedrockInferenceProfileArn ? "(set)" : "(missing)"
  }`,
);
console.log(`[ENV] AI_MODEL_ID: ${aiModelId ? "(set)" : "(missing)"}`);
console.log(
  `[ENV] BEDROCK_MODEL_ID: ${bedrockModelId ? "(set)" : "(missing)"}`,
);
console.log(`[ENV] BEDROCK_MODEL_SOURCE: ${bedrockModelSource}`);
console.log(`[ENV] BEDROCK_MODEL_TARGET: ${selectedBedrockModelTarget}`);
console.log(`[ENV] CWD: ${process.cwd()}`);
console.log(`[ENV] LOG_ROUTES_VERBOSE: ${LOG_ROUTES_VERBOSE}`);
console.log(`[ENV] LOG_REQUESTS: ${LOG_REQUESTS}`);
console.log(`[ENV] LOG_ERROR_STACKS: ${LOG_ERROR_STACKS}`);

// Load environment-based configuration
const { port, env: nodeEnv } = configModule;
const isDevelopment = nodeEnv === "development";
const isProduction = nodeEnv === "production";

// Configure CORS to allow credentials
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from any origin (we'll be more specific if needed)
    // For now, allow all for development
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Request logging middleware - log only state-changing requests (POST, PUT, DELETE, PATCH)
// Skip logging browser-specific meta-requests (Chrome DevTools, etc.)
const browserMetaPaths = [
  "/.well-known/",
  "/apple-app-site-association",
  "/.metadata",
  "/browserconfig.xml",
];

const capsNotice = require("./middleware/capsNotice");
app.use(express.json());
app.use(capsNotice); // Add after body parser

app.use((req, res, next) => {
  if (!LOG_REQUESTS) {
    next();
    return;
  }

  const isBrowserMetaRequest = browserMetaPaths.some((path) =>
    req.path.startsWith(path),
  );

  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
    !isBrowserMetaRequest
  ) {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      console.log(
        `[REQ] ${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`,
      );
    });
  }
  next();
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Disable caching for all static files to prevent stale files being served
app.use(
  express.static("public", {
    maxAge: 0,
    etag: false,
    setHeaders: (res, path, stat) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  }),
);
app.use(express.json());

// IP-to-User Mapping - configure your static IP assignments here
const ipUserMapping = {
  // Example format:
  // "192.168.1.100": "john.smith",
  // "192.168.1.101": "jane.doe",
  // Add your IP mappings below
  "192.168.1.60": "OGOLUBOVIC",
  "192.168.1.68": "ZEISS",
  "192.168.1.69": "TKENT",
  "192.168.1.74": "AMIDDLETON",
  "192.168.1.76": "CHARRISON",
  "192.168.1.77": "BOBBI",
  "192.168.1.80": "QC2",
  "192.168.1.81": "SWARNAK",
  "192.168.1.83": "VRASMUSSEN",
};

// Default user for development mode (localhost testing)
const devDefaultUser = "TKENT";

// Middleware: Set user from session or IP mapping
app.use((req, res, next) => {
  // Get user from existing session
  if (req.session && req.session.user_id) {
    req.user = req.session.user_id;
  }

  // Fallback: Try to identify by IP if no session user
  if (!req.user) {
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    req.user = ipUserMapping[clientIP] || null;

    // If IP mapping found, set it in session for consistency
    if (req.user && req.session) {
      req.session.user_id = req.user;
    }
  }

  // Dev mode: Use default user if still no user identified
  if (!req.user && isDevelopment) {
    req.user = devDefaultUser;
  }

  next();
});

// Set CORS headers for requests WITH credentials support
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // Fallback if no origin header (same-origin requests)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  next();
});

// Configuration endpoint for UI config
app.get("/config", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "qms.config.json");
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);
    res.json(config);
  } catch (error) {
    logError("CONFIG", error, "Failed to read qms.config.json");
    // Fallback configuration
    res.json({
      ui: { enableRowColors: false },
      table: { defaultSortOrder: "desc" },
      features: { enableEmailNotifications: true },
    });
  }
});

// API configuration endpoint - returns the API URL for frontend to use
app.get("/api/config", (req, res) => {
  let apiUrl = process.env.API_URL;

  // If API_URL not explicitly set, generate it based on environment
  if (!apiUrl) {
    if (isDevelopment) {
      apiUrl = `http://localhost:${port}`;
    } else {
      apiUrl = `http://192.168.1.10:${port}`;
    }
  }

  res.json({ apiUrl });
});

// Runtime diagnostics endpoint for deployment troubleshooting.
app.get("/health/runtime", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
    host: os.hostname(),
    pid: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    port: {
      configured: process.env.PORT || null,
      effective: port,
    },
    bedrock: {
      modelSource: bedrockModelSource,
      modelTarget: selectedBedrockModelTarget,
      inferenceProfileConfigured: Boolean(
        aiBedrockInferenceProfileArn || bedrockInferenceProfileArn,
      ),
    },
  });
});

// Autoload routes from the routes directory
const fs = require("fs");
const path = require("path");
const os = require("os");

const routesDir = path.join(__dirname, "routes");

const routeLoadSummary = {
  processed: 0,
  registered: 0,
  skippedAuth: 0,
  skippedEmpty: 0,
  skippedInvalid: 0,
  errors: [],
};
const registeredRouteLines = [];

console.log(`\n=== Route Registration ===`);
console.log(`[ROUTES] Loading from: ${routesDir}`);

fs.readdirSync(routesDir)
  .filter((file) => file.endsWith(".js") && !file.includes(".vbs"))
  .sort()
  .forEach((file) => {
    routeLoadSummary.processed += 1;
    const routeName = path.basename(file, ".js");
    if (LOG_ROUTES_VERBOSE) {
      console.log(`[ROUTES] Processing ${file} (name: ${routeName})`);
    }

    // Skip files that are not route modules
    if (["auth"].includes(routeName)) {
      routeLoadSummary.skippedAuth += 1;
      if (LOG_ROUTES_VERBOSE) {
        console.log(`[ROUTES] Skipped ${file} (auth handled separately)`);
      }
      return;
    }

    try {
      const filePath = path.join(routesDir, file);
      const stats = require("fs").statSync(filePath);

      // Skip empty files
      if (stats.size === 0) {
        routeLoadSummary.skippedEmpty += 1;
        if (LOG_ROUTES_VERBOSE) {
          console.log(`[ROUTES] Skipped ${file} (empty file)`);
        }
        return;
      }

      const routes = require(filePath);
      if (LOG_ROUTES_VERBOSE) {
        console.log(`[ROUTES] Loaded ${file}`);
      }

      // Skip if not a valid middleware function or router
      if (!routes || (typeof routes !== "function" && !routes.stack)) {
        routeLoadSummary.skippedInvalid += 1;
        console.warn(`[ROUTES] Skipped ${file} (invalid middleware export)`);
        return;
      }

      // Map file names to route paths
      // Special cases: documents uses "/" root path
      let routePath = `/${routeName}`;
      if (routeName === "documents") {
        routePath = "/";
      }

      app.use(routePath, routes);
      routeLoadSummary.registered += 1;
      registeredRouteLines.push(`${routePath} <= ${file}`);

      if (LOG_ROUTES_VERBOSE) {
        console.log(`[ROUTES] Registered ${routePath} <= ${file}`);
      }
    } catch (error) {
      routeLoadSummary.errors.push({ file, message: error.message });
      logError("ROUTES", error, `Error loading ${file}`);
    }
  });

console.log(
  `[ROUTES] Processed=${routeLoadSummary.processed}, Registered=${routeLoadSummary.registered}, SkippedAuth=${routeLoadSummary.skippedAuth}, SkippedEmpty=${routeLoadSummary.skippedEmpty}, SkippedInvalid=${routeLoadSummary.skippedInvalid}, Errors=${routeLoadSummary.errors.length}`,
);

if (LOG_ROUTES_VERBOSE) {
  registeredRouteLines.forEach((line) => {
    console.log(`[ROUTES] ${line}`);
  });
} else {
  console.log("[ROUTES] Set LOG_ROUTES_VERBOSE=true for per-route details.");
}

if (routeLoadSummary.errors.length > 0) {
  routeLoadSummary.errors.forEach((entry) => {
    logError("ROUTES", entry.message, `Failed ${entry.file}`);
  });
}

// Load auth routes separately (typically middleware)
try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
} catch (error) {
  logError("AUTH", error, "Error loading auth routes");
}

process.on("unhandledRejection", (reason) => {
  logError("UNHANDLED_REJECTION", reason, "Promise rejection was not caught");
});

process.on("uncaughtException", (error) => {
  logError(
    "UNCAUGHT_EXCEPTION",
    error,
    "Unhandled exception reached process scope",
  );
});

// Load cert3 routes (new certificate search with drill-down)
// try {
//   const cert3Routes = require("./routes/cert3");
//   app.use("/cert3", cert3Routes);
//   console.log(`Loaded route: /cert3 from cert3.js`);
// } catch (error) {
//   console.error(`Error loading cert3 routes:`, error.message);
// }

// Serve training files from a dedicated directory
const trainingFilesPath =
  process.env.TRAINING_FILES_PATH || path.join(__dirname, "training-files");
app.use("/training-files", express.static(trainingFilesPath));

// Use environment variable for input files path
const inputFilesPath =
  process.env.INPUT_FILES_PATH ||
  "\\\\fs1\\Common\\Quality\\00000_Work Instructions";
app.use("/input-files", express.static(inputFilesPath));

// Use environment variable for document files path
const documentFilesPath =
  process.env.DOCUMENT_FILES_PATH || "\\\\fs1\\Common\\Quality";
app.use("/document-files", express.static(documentFilesPath));

// Use environment variable for device images path
const hostname = os.hostname();
let baseDeviceImagesPath;
if (hostname === "QUALITY-MGR") {
  baseDeviceImagesPath = "C:\\Quality - Records\\7150 - Calibration";
} else {
  baseDeviceImagesPath =
    process.env.DEVICE_IMAGES_PATH ||
    "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration";
}
const deviceImagesPath = path.join(baseDeviceImagesPath, "_device-images");
app.use("/_device-images", express.static(deviceImagesPath));

// Use environment variable for equipment images path
let baseEquipmentImagesPath;
if (hostname === "QUALITY-MGR") {
  baseEquipmentImagesPath = "C:\\Quality - Records\\8511 - Equipment\\";
} else {
  baseEquipmentImagesPath =
    process.env.EQUIPMENT_IMAGES_PATH ||
    "\\\\fs1\\Common\\Quality - Records\\8511 - Equipment\\";
}
const equipmentImagesPath = path.join(
  baseEquipmentImagesPath,
  "_equipment_images",
);
app.use("/_equipment-images", express.static(equipmentImagesPath));

// Catch-all 404 handler for debugging
app.use((req, res) => {
  const isBrowserMetaRequest = browserMetaPaths.some((path) =>
    req.path.startsWith(path),
  );

  if (!isBrowserMetaRequest) {
    console.log(`[404] ${req.method} ${req.path} - No matching route found`);
  }

  res
    .status(404)
    .json({ error: "Not found", path: req.path, method: req.method });
});

app.listen(port, "0.0.0.0", async () => {
  console.log(`\n========================================`);
  console.log(`CIQMS Server is running`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Port: ${port}`);
  console.log(`Localhost: http://localhost:${port}`);
  console.log(`Network: http://192.168.1.10:${port}`);
  console.log(`========================================\n`);
});
