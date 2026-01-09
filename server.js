const exp = require("constants");
const cors = require("cors");
const express = require("express");
const session = require("express-session");
const app = express();
const port = process.env.APP_PORT || 3003;

app.use(cors());

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(express.static("public"));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// Configuration endpoint
app.get("/config", (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const configPath = path.join(__dirname, "qms.config.json");
    const configData = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configData);
    res.json(config);
  } catch (error) {
    console.error("Error reading config file:", error);
    // Fallback configuration
    res.json({
      ui: { enableRowColors: false },
      table: { defaultSortOrder: "desc" },
      features: { enableEmailNotifications: true },
    });
  }
});

// Autoload routes from the routes directory
const fs = require("fs");
const path = require("path");
const os = require("os");

const routesDir = path.join(__dirname, "routes");

fs.readdirSync(routesDir)
  .filter((file) => file.endsWith(".js") && !file.includes(".vbs"))
  .sort()
  .forEach((file) => {
    const routeName = path.basename(file, ".js");

    // Skip files that are not route modules
    if (["auth"].includes(routeName)) {
      return;
    }

    try {
      const filePath = path.join(routesDir, file);
      const stats = require("fs").statSync(filePath);

      // Skip empty files
      if (stats.size === 0) {
        return;
      }

      const routes = require(filePath);

      // Skip if not a valid middleware function or router
      if (!routes || (typeof routes !== "function" && !routes.stack)) {
        console.warn(`Skipped route ${file}: does not export valid middleware`);
        return;
      }

      // Map file names to route paths
      // Special cases: documents uses "/" root path
      let routePath = `/${routeName}`;
      if (routeName === "documents") {
        routePath = "/";
      }

      app.use(routePath, routes);
      // console.log(`Loaded route: ${routePath} from ${file}`);
    } catch (error) {
      console.error(`Error loading route ${file}:`, error.message);
    }
  });

// Load auth routes separately (typically middleware)
try {
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
  // console.log(`Loaded route: /auth from auth.js`);
} catch (error) {
  console.error(`Error loading auth routes:`, error.message);
}

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
  baseDeviceImagesPath = "C:\\Quality - Records\\7150 - Calibration\\";
} else {
  baseDeviceImagesPath =
    process.env.DEVICE_IMAGES_PATH ||
    "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration\\";
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
  "_equipment_images"
);
app.use("/_equipment-images", express.static(equipmentImagesPath));

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
