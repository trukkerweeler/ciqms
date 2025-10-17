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
    const configPath = path.join(__dirname, "ncm.config.json");
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

const inputRoutes = require("./routes/input");
app.use("/input", inputRoutes);

const projectRoutes = require("./routes/project");
app.use("/project", projectRoutes);

const userRoutes = require("./routes/user");
app.use("/user", userRoutes);

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const recurRoutes = require("./routes/recur");
app.use("/recur", recurRoutes);

const todoRoutes = require("./routes/todo");
app.use("/todo", todoRoutes);

const csrRoutes = require("./routes/csr");
app.use("/csr", csrRoutes);

const ssrRoutes = require("./routes/ssr");
app.use("/ssr", ssrRoutes);

const reportRoutes = require("./routes/reports");
app.use("/reports", reportRoutes);

const pmReportRoutes = require("./routes/pmReport");
app.use("/pmReport", pmReportRoutes);

const ncmRoutes = require("./routes/ncm");
app.use("/ncm", ncmRoutes);

const correctiveRoutes = require("./routes/corrective");
app.use("/corrective", correctiveRoutes);

const sysdocRoutes = require("./routes/sysdocs");
app.use("/sysdocs", sysdocRoutes);

const dcrRoutes = require("./routes/requests");
app.use("/requests", dcrRoutes);

const supplierRoutes = require("./routes/suppliers");
app.use("/suppliers", supplierRoutes);

const supplierlistRoutes = require("./routes/supplierlist");
app.use("/supplierlist", supplierlistRoutes);

const customerRoutes = require("./routes/customer");
app.use("/customer", customerRoutes);

const attendanceRoutes = require("./routes/attendance");
app.use("/attendance", attendanceRoutes);

const trendRoutes = require("./routes/trend");
app.use("/trend", trendRoutes);

const mgmtRoutes = require("./routes/mgmt");
app.use("/mgmt", mgmtRoutes);

const expiryRoutes = require("./routes/expiry");
app.use("/expiry", expiryRoutes);
const rmaRoutes = require("./routes/rmahistory");
app.use("/rmahistory", rmaRoutes);

const rmaWipRoutes = require("./routes/rmawip");
app.use("/rmawip", rmaWipRoutes);

const apoiRoutes = require("./routes/apoi");
app.use("/apoi", apoiRoutes);

const searcherRoutes = require("./routes/searcher");
app.use("/searcher", searcherRoutes);

const certRoutes = require("./routes/cert");
app.use("/cert", certRoutes);

const idsRoutes = require("./routes/ids");
app.use("/ids", idsRoutes);

const calibrateRoutes = require("./routes/calibrate");
app.use("/calibrate", calibrateRoutes);

const deviceRoutes = require("./routes/device");
app.use("/device", deviceRoutes);

const imageRoutes = require("./routes/image");
app.use("/image", imageRoutes);

const receiverRoutes = require("./routes/receiver");
app.use("/receiver", receiverRoutes);

const opcodesGlobalRoutes = require("./routes/opcodesGlobal");
app.use("/opcodesGlobal", opcodesGlobalRoutes);

const opcodesRoutes = require("./routes/opcodes");
app.use("/opcodes", opcodesRoutes);

const invoiceRoutes = require("./routes/invoice");
app.use("/invoice", invoiceRoutes);

const continuationRoutes = require("./routes/continuation");
app.use("/continuation", continuationRoutes);

const subjectmaintRoutes = require("./routes/subjectmaint");
app.use("/subjectmaint", subjectmaintRoutes);

const causemaintRoutes = require("./routes/causemaint");
app.use("/causemaint", causemaintRoutes);

// Serve training files from a dedicated directory
const path = require("path");
// Use a network path that all users can access, or fallback to local
const trainingFilesPath =
  process.env.TRAINING_FILES_PATH || path.join(__dirname, "training-files");
app.use("/training-files", express.static(trainingFilesPath));

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
