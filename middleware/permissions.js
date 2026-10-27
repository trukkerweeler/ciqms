const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "qms.config.json");

function loadPermissionConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.permissions || {};
  } catch (error) {
    return {};
  }
}

function normalizePage(page) {
  return String(page || "").trim().toLowerCase();
}

function normalizeAction(action) {
  return String(action || "").trim().toLowerCase();
}

function getIdentityCandidates(req) {
  const identities = new Set();

  const explicitUser =
    req?.session?.user?.username ||
    req?.session?.user_id ||
    req?.user ||
    null;

  if (explicitUser) {
    identities.add(String(explicitUser).trim());
    identities.add(String(explicitUser).trim().toUpperCase());
  }

  if (req?.ip) {
    identities.add(String(req.ip).trim());
    identities.add(String(req.ip).trim().replace(/^::ffff:/, ""));
  }

  if (req?.socket?.remoteAddress) {
    identities.add(String(req.socket.remoteAddress).trim());
    identities.add(
      String(req.socket.remoteAddress).trim().replace(/^::ffff:/, ""),
    );
  }

  if (req?.connection?.remoteAddress) {
    identities.add(String(req.connection.remoteAddress).trim());
    identities.add(
      String(req.connection.remoteAddress).trim().replace(/^::ffff:/, ""),
    );
  }

  return [...identities].filter(Boolean);
}

function buildPermissionState(req) {
  const config = loadPermissionConfig();
  const enabled = Boolean(config.enabled);
  const defaultDeny = config.defaultDeny !== false;
  const pages = config.pages || {};
  const identityCandidates = getIdentityCandidates(req);

  const pagePermissions = {};
  Object.entries(pages).forEach(([pageName, actions]) => {
    const normalizedPage = normalizePage(pageName);
    pagePermissions[normalizedPage] = {};

    if (!actions || typeof actions !== "object") {
      return;
    }

    Object.entries(actions).forEach(([actionName, value]) => {
      const normalizedAction = normalizeAction(actionName);
      const allowedValues = Array.isArray(value)
        ? value
        : typeof value === "string"
          ? [value]
          : [];

      pagePermissions[normalizedPage][normalizedAction] = {
        allowed:
          value === true ||
          allowedValues.some((entry) => {
            if (!entry) {
              return false;
            }

            const normalized = String(entry).trim();
            if (normalized === "*") {
              return true;
            }

            return identityCandidates.some(
              (candidate) =>
                candidate === normalized ||
                candidate.toUpperCase() === normalized.toUpperCase(),
            );
          }),
        principalList: allowedValues.map((entry) => String(entry).trim()),
      };
    });
  });

  return {
    enabled,
    defaultDeny,
    user: identityCandidates[0] || null,
    pages: pagePermissions,
  };
}

function authorizeRequest(req, page, action) {
  const config = loadPermissionConfig();
  const pageName = normalizePage(page);
  const actionName = normalizeAction(action);

  if (!config.enabled) {
    return {
      allowed: true,
      reason: "permissions-disabled",
      page: pageName,
      action: actionName,
      user: getIdentityCandidates(req)[0] || null,
    };
  }

  const pageRules = (config.pages && config.pages[pageName]) || {};
  const actionSetting = pageRules[actionName];
  const identityCandidates = getIdentityCandidates(req);

  if (actionSetting === true) {
    return {
      allowed: true,
      reason: "explicit-allow",
      page: pageName,
      action: actionName,
      user: identityCandidates[0] || null,
    };
  }

  if (actionSetting === false) {
    return {
      allowed: false,
      reason: "explicit-deny",
      page: pageName,
      action: actionName,
      user: identityCandidates[0] || null,
    };
  }

  const allowedValues = Array.isArray(actionSetting)
    ? actionSetting
    : typeof actionSetting === "string"
      ? [actionSetting]
      : [];

  const matchedPrincipal = allowedValues.some((entry) => {
    const value = String(entry).trim();
    if (!value) {
      return false;
    }

    if (value === "*") {
      return true;
    }

    return identityCandidates.some(
      (candidate) =>
        candidate === value || candidate.toUpperCase() === value.toUpperCase(),
    );
  });

  if (matchedPrincipal) {
    return {
      allowed: true,
      reason: "principal-match",
      page: pageName,
      action: actionName,
      user: identityCandidates[0] || null,
    };
  }

  if (config.defaultDeny !== false && !allowedValues.length) {
    return {
      allowed: false,
      reason: "page-or-action-not-configured",
      page: pageName,
      action: actionName,
      user: identityCandidates[0] || null,
    };
  }

  return {
    allowed: true,
    reason: "default-allow",
    page: pageName,
    action: actionName,
    user: identityCandidates[0] || null,
  };
}

function requirePermission(page, action) {
  return (req, res, next) => {
    const decision = authorizeRequest(req, page, action);

    if (decision.allowed) {
      req.permissionDecision = decision;
      return next();
    }

    return res.status(403).json({
      error: "Forbidden",
      page,
      action,
      user: decision.user || null,
      reason: decision.reason,
    });
  };
}

function attachPermissions(req, res, next) {
  req.permissions = buildPermissionState(req);
  req.can = (page, action) => authorizeRequest(req, page, action).allowed;
  next();
}

module.exports = {
  attachPermissions,
  authorizeRequest,
  buildPermissionState,
  getIdentityCandidates,
  requirePermission,
};
