
const exp = require("constants");
const cors = require("cors");
const express = require("express");
const app = express();
const port = process.env.APP_PORT || 3003;

app.use(cors());

app.use(express.static('public'));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

const inputRoutes = require("./routes/input");
app.use("/input", inputRoutes);

const projectRoutes = require("./routes/project");
app.use("/project", projectRoutes);

const userRoutes = require("./routes/user");
app.use("/user", userRoutes);

// const authRoutes = require("./routes/auth");
// app.use("/auth", authRoutes);

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

app.listen(port, async() => {
  console.log(`Example app listening at http://localhost:${port}`);
});
