const express = require("express");
const path = require("path");
const router = express.Router();
const { spawn } = require("child_process");

// ==================================================
// Get record
router.get("/", (_req, res) => {
  // console.log("Received request for OP_CODES");
  const vbsFilePath = path.join(__dirname, "opcodesGlobal.vbs");
  const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly

  // Use spawn to avoid buffer limits
  let output = "";
  let errorOutput = "";
  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

  child.stdout.on("data", (data) => {
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  child.on("close", (code) => {
    if (code !== 0 || errorOutput) {
      console.error(`VBScript stderr: ${errorOutput}`);
      console.error(`VBScript exit code: ${code}`);
      return res
        .status(500)
        .json({ error: "Error retrieving data from global database." });
    }

    // Check if we got any output
    if (!output || output.trim() === "") {
      console.error("VBScript returned empty output");
      return res
        .status(500)
        .json({ error: "No data returned from global database." });
    }

    try {
      // Clean up output and handle potential encoding issues
      const sanitizedOutput = output
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "") // Remove control characters but preserve tab, LF, CR
        .replace(/�/g, "°") // Replace corrupted degree symbol with proper one
        .replace(/\u00B0/g, "°") // Ensure degree symbol is consistent
        .trim(); // Remove leading/trailing whitespace

      // Log only summary information to avoid overwhelming logs
      console.log(
        `VBScript output length: ${sanitizedOutput.length} characters`
      );
      console.log(
        `Output starts with: ${sanitizedOutput.substring(0, 100)}...`
      );
      console.log(
        `Output ends with: ...${sanitizedOutput.substring(
          sanitizedOutput.length - 100
        )}`
      );

      // Validate JSON structure before parsing
      if (!sanitizedOutput.startsWith("[") || !sanitizedOutput.endsWith("]")) {
        console.error("VBScript output does not appear to be valid JSON array");
        console.error(`First 500 chars: ${sanitizedOutput.substring(0, 500)}`);
        console.error(
          `Last 500 chars: ${sanitizedOutput.substring(
            sanitizedOutput.length - 500
          )}`
        );
        return res
          .status(500)
          .json({ error: "Invalid JSON format from global database." });
      }

      const data = JSON.parse(sanitizedOutput);

      // Check if the VBScript returned an error object
      if (data.error) {
        console.error(`VBScript error: ${data.error}`);
        return res.status(500).json({ error: data.error });
      }

      // Log successful result
      console.log(
        `Successfully parsed ${
          Array.isArray(data) ? data.length : "unknown"
        } opcodes from global database`
      );
      res.json(data);
    } catch (parseError) {
      console.error(`Error parsing VBScript output: ${parseError.message}`);
      console.error(
        `Parse error at position: ${
          parseError.message.match(/position (\d+)/)?.[1] || "unknown"
        }`
      );

      // Show context around error position if available
      const errorPos = parseError.message.match(/position (\d+)/)?.[1];
      if (errorPos) {
        const pos = parseInt(errorPos);
        const start = Math.max(0, pos - 100);
        const end = Math.min(output.length, pos + 100);
        console.error(`Context around error: ${output.substring(start, end)}`);
      }

      res
        .status(500)
        .json({ error: "Error processing data from global database." });
    }
  });

  child.on("error", (err) => {
    console.error(`Error executing VBScript: ${err.message}`);
    res.status(500).json({ error: "Error executing global database query." });
  });
});

module.exports = router;
