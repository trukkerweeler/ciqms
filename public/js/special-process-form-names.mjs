function normalizeSequence(value) {
  if (value == null) return "01";
  const text = String(value).trim();
  const match = text.match(/#?(\d+)/);
  if (!match) return "01";
  const num = Number.parseInt(match[1], 10);
  return String(num).padStart(2, "0");
}

export function normalizeFormId(series, sequence, slug) {
  const normalizedSeries = String(series || "").trim();
  const normalizedSequence = normalizeSequence(sequence);
  const normalizedSlug = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalizedSeries}-${normalizedSequence}${normalizedSlug ? `-${normalizedSlug}` : ""}`;
}

export function getFormDisplayName(form) {
  const series = String(form.series || "").trim();
  const sequence = normalizeSequence(form.sequence);
  const label = String(form.label || "").trim();
  return `${series}-${sequence} • ${label}`;
}

export function getDefaultTechnicianValue(user) {
  if (!user) return "";
  if (typeof user === "string") return user.toUpperCase();
  const raw = user.name || user.username || user.user || user.displayName || "";
  return String(raw).trim().toUpperCase();
}

export function getFormFieldGroups(form) {
  const isChemFilm = String(form?.kind || "").includes("chem");
  const passivationSpecs = [
    "AMS 2700E Method 2 Citric Acid",
    "AMS/QQ-P-35 Method 2 Citric Acid",
    "AMS 2700E Method 2 Citric Acid / AMS/QQ-P-35 Method 2 Citric Acid",
  ];
  const baseFields = [
    {
      key: "processSpecifications",
      label: "Process Specification(s)",
      type: isChemFilm ? "text" : "select",
      options: isChemFilm ? [] : passivationSpecs,
      value: isChemFilm
        ? "AMS/QQ-P-35 Type VI / AMS 2700 Method 1-Type 6"
        : passivationSpecs[0],
    },
    {
      key: "tank1Time",
      label: "Tank 1 Time (minutes)",
      type: "number",
      value: isChemFilm ? "" : "20",
    },
    {
      key: "tank1Temperature",
      label: "Tank 1 Temperature (°F)",
      type: "number",
      value: isChemFilm ? "" : "128",
    },
    {
      key: "waterRinse",
      label: "Water Rinse",
      type: "text",
      value: "Rinse thoroughly",
    },
    {
      key: "waterBreakFree",
      label: "Water Break Free",
      type: "select",
      options: ["Pass", "Fail"],
      value: "Pass",
    },
    {
      key: "passivationTime",
      label: "Passivation Time (minutes)",
      type: "number",
      value: isChemFilm ? "" : "40",
    },
    {
      key: "passivationTemperature",
      label: "Passivation Temperature",
      type: "text",
      value: isChemFilm ? "N/A" : "Below 100°F",
    },
    {
      key: "dryingOvenTemperature",
      label: "Drying Oven Temperature (°F)",
      type: "number",
      value: "130",
    },
    {
      key: "quantityPassivated",
      label: "Quantity Passivated",
      type: "number",
      value: "1",
    },
    {
      key: "quantityAccepted",
      label: "Quantity Accepted",
      type: "number",
      value: "1",
    },
    {
      key: "quantityRejected",
      label: "Quantity Rejected",
      type: "number",
      value: "0",
    },
    {
      key: "technician",
      label: "Chemical Processing Technician",
      type: "text",
      value: "",
    },
    {
      key: "dateCompleted",
      label: "Date Completed",
      type: "date",
      value: "",
    },
  ];

  return baseFields;
}

export function formatProcessRangeSummary(range) {
  if (!range) return "";
  if (!range.uom) return "";
  if (range.min === undefined || range.max === undefined) {
    return `${range.label}`;
  }
  return `${range.label}: ${range.min} - ${range.max} ${range.uom}`;
}

export function getStepRequirement(step) {
  if (!step) return "";
  return step.requirement || step.description || "";
}

export function shouldShowStepInput(step) {
  if (!step) return false;
  return !["tank 4", "tank 6", "tank 10"].includes(
    String(step.title || "")
      .trim()
      .toLowerCase(),
  );
}

export function getProcessTheme(definitionId) {
  if (definitionId === "9440-01") return "process-theme-citric";
  if (definitionId === "9440-03") return "process-theme-nitric";
  if (definitionId === "9450-17") return "process-theme-chemfilm-gold";
  if (["9450-13c", "9450-21", "9450-23"].includes(definitionId)) {
    return "process-theme-chemfilm-clear";
  }
  if (["9450-07", "9450-11"].includes(definitionId)) {
    return "process-theme-chemfilm";
  }
  return "";
}

function step(title, ranges, extra = {}) {
  return { title, ranges, ...extra };
}

function makeRange(label, min, max, uom, actualValueLabel) {
  return { label, min, max, uom, actualValueLabel };
}

function makeMinuteSecondRanges() {
  return [
    makeRange("Minutes", undefined, undefined, "", "Actual minutes"),
    makeRange("Seconds", undefined, undefined, "", "Actual seconds"),
  ];
}

function passFailWaterBreakStep(extra = {}) {
  return step(
    "Water Break Free",
    [makeRange("Time", 30, 0, "seconds", "Actual time")],
    {
      requirement: "30 Seconds Minimum",
      description: "30 Seconds Minimum",
      inputType: "pass-fail",
      ...extra,
    },
  );
}

function rinseStep(tankNumber, optional = false) {
  return step(
    `Tank ${tankNumber}`,
    [makeRange("Seconds", 0, 0, "", "Actual value")],
    {
      description: "Rinse",
      ...(optional ? { optional: true } : {}),
    },
  );
}

function typeIOpeningSteps() {
  return [
    step("Tank 1", [
      makeRange("Time", 5, 30, "minutes", "Actual value"),
      makeRange("Temperature", 120, 160, "deg F", "Actual temperature"),
    ]),
    step("Tank 2", [makeRange("Seconds", 0, 0, "", "Actual value")], {
      requirement: "Water Break Free 30 seconds minimum",
      description: "Water Break Free 30 seconds minimum",
    }),
  ];
}

function typeIOptionalCleaningSteps() {
  return [
    step(
      "Deoxalume (Tank 5)",
      [
        ...makeMinuteSecondRanges(),
        makeRange("Temperature", 0, 0, "deg F", "Actual temperature"),
      ],
      {
        optional: true,
        sectionLabel: "IF NEEDED",
        requirement: "30 seconds to 1 minute",
        description: "30 seconds to 1 minute",
      },
    ),
    rinseStep(6, true),
    step(
      "Aluminux Etch (Tank 3)",
      [
        ...makeMinuteSecondRanges(),
        makeRange("Temperature", 0, 0, "deg F", "Actual temperature"),
      ],
      {
        optional: true,
        requirement: "30 seconds to 5 minutes",
        description: "30 seconds to 5 minutes",
      },
    ),
    rinseStep(4, true),
    step(
      "Deoxalume (Tank 5)",
      [
        ...makeMinuteSecondRanges(),
        makeRange("Temperature", 0, 0, "deg F", "Actual temperature"),
      ],
      {
        optional: true,
        requirement: "2 to 6 minutes",
        description: "2 to 6 minutes",
      },
    ),
    rinseStep(6, true),
    passFailWaterBreakStep({ optional: true }),
  ];
}

function typeIRequiredTail({ tank8Min, tank8Max, tank8Uom }) {
  return [
    step(
      "Alodine 1600 (Tank 8)",
      [
        ...makeMinuteSecondRanges(),
        makeRange("Temperature", 60, 130, "deg F", "Actual temperature"),
      ],
      {
        requirement: `${tank8Min} to ${tank8Max} ${tank8Uom}`,
        description: `${tank8Min} to ${tank8Max} ${tank8Uom}`,
      },
    ),
    step("Oven drying", [makeRange("Temperature", 120, 130, "deg F", "")], {
      inputType: "yes-no",
      requirement: "Oven drying completed",
    }),
  ];
}

function createTypeIDefinition(id, title, tank8) {
  return {
    id,
    title,
    process: "stepped",
    steps: [
      ...typeIOpeningSteps(),
      ...typeIOptionalCleaningSteps(),
      ...typeIRequiredTail(tank8),
    ],
  };
}

function createTypeIIDefinition(id, title, tank11) {
  return {
    id,
    title,
    process: "stepped",
    steps: [
      step("Super Bee 300LF (Tank 1)", [
        makeRange("Time", 5, 30, "minutes", "Actual time"),
        makeRange("Temperature", 120, 160, "deg F", "Actual temperature"),
      ]),
      passFailWaterBreakStep(),
      step(
        "Deoxalume 2310 (Tank 5)",
        [
          ...makeMinuteSecondRanges(),
          makeRange("Temperature", 0, 0, "deg F", "Actual temperature"),
        ],
        {
          requirement: "2 to 6 minutes",
          description: "2 to 6 minutes",
        },
      ),
      passFailWaterBreakStep(),
      step("Chemeon TCP-HF® (Tank 11)", [
        makeRange("Time", tank11.min, tank11.max, "minutes", "Actual time"),
        makeRange("Temperature", 0, 0, "deg F", "Actual temperature"),
      ]),
      step("Oven drying", [makeRange("Temperature", 120, 130, "deg F", "")], {
        inputType: "yes-no",
        requirement: "Oven drying completed",
        description: "Oven drying completed",
      }),
    ],
  };
}

export const specialProcessFormDefinitions = {
  "9440-01": {
    id: "9440-01",
    title: "Citric Acid Passivation",
    process: "stepped",
    steps: [
      step("Tank 1", [
        makeRange("Time", 5, 30, "minutes", "Actual value"),
        makeRange("Temperature", 120, 160, "deg F", "Actual temperature"),
      ]),
      step("Tank 2", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        requirement: "Water Break Free 30 seconds minimum",
        description: "Water Break Free 30 seconds minimum",
      }),
      step("Tank 13", [
        makeRange("Time", 30, 60, "minutes", "Actual time"),
        makeRange("Temperature", 0, 100, "deg F", "Actual temperature"),
      ]),
      step("Tank 6", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        description: "Rinse thoroughly",
      }),
      step("Tank 10", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        description: "Rinse thoroughly",
      }),
      step("Oven drying", [makeRange("Temperature", 120, 130, "deg F", "")], {
        inputType: "yes-no",
        requirement: "Oven drying completed",
      }),
    ],
  },
  "9440-03": {
    id: "9440-03",
    title: "Nitric Acid Passivation",
    process: "stepped",
    steps: [
      step("Tank 1", [
        makeRange("Time", 5, 30, "minutes", "Actual value"),
        makeRange("Temperature", 120, 160, "deg F", "Actual temperature"),
      ]),
      step("Tank 2", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        requirement: "Water Break Free 30 seconds minimum",
        description: "Water Break Free 30 seconds minimum",
      }),
      step("Tank 7", [
        makeRange("Time", 30, 60, "minutes", "Actual time"),
        makeRange("Temperature", 70, 90, "deg F", "Actual temperature"),
      ]),
      step("Tank 6", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        description: "Rinse",
      }),
      step("Tank 10", [makeRange("Seconds", 0, 0, "", "Actual value")], {
        description: "Rinse",
      }),
      step("Oven drying", [makeRange("Temperature", 120, 130, "deg F", "")], {
        inputType: "yes-no",
        requirement: "Oven drying completed",
      }),
    ],
  },
  "9450-07": createTypeIDefinition("9450-07", "Chem Film", {
    tank8Min: 2,
    tank8Max: 5,
    tank8Uom: "minutes",
  }),
  "9450-11": createTypeIDefinition("9450-11", "Chem Film Type I Class 1A", {
    tank8Min: 2,
    tank8Max: 5,
    tank8Uom: "minutes",
  }),
  "9450-13c": createTypeIDefinition("9450-13c", "Chem Film Type I Class 3", {
    tank8Min: 3,
    tank8Max: 10,
    tank8Uom: "seconds",
  }),
  "9450-17": createTypeIDefinition("9450-17", "Chem Film Type I Class 3 Gold", {
    tank8Min: 1,
    tank8Max: 3,
    tank8Uom: "minutes",
  }),
  "9450-21": createTypeIIDefinition(
    "9450-21",
    "Chem Film Type II Class 1 Clear",
    {
      min: 3,
      max: 7,
    },
  ),
  "9450-23": createTypeIIDefinition(
    "9450-23",
    "Chem Film Type II Class 3 Clear",
    {
      min: 1,
      max: 4,
    },
  ),
};

export const specialProcessFormCatalog = [
  {
    id: "9440-01-citric-acid-passivation",
    series: "9440",
    sequence: "#1",
    label: "Citric Acid Passivation",
    file: "docs/+Form 9440 #1 CITRIC ACID PASSIVATION.xls",
    kind: "passivation",
    definitionId: "9440-01",
  },
  {
    id: "9440-03-nitric-acid-passivation",
    series: "9440",
    sequence: "#3",
    label: "Nitric Acid Passivation",
    file: "docs/+Form 9440 #3 NITRIC ACID PASSIVATION.xls",
    kind: "passivation",
    definitionId: "9440-03",
  },
  {
    id: "9450-07-chem-film",
    series: "9450",
    sequence: "#7",
    label: "Chem Film",
    file: "docs/+Form 9450 #7 CHEM FILM.xls",
    kind: "chem-film",
    definitionId: "9450-07",
  },
  {
    id: "9450-11-chem-film-type-i-class-1a",
    series: "9450",
    sequence: "#11",
    label: "Chem Film Type I Class 1A",
    kind: "chem-film",
    definitionId: "9450-11",
  },
  {
    id: "9450-13c-chem-film-type-i-class-3",
    series: "9450",
    sequence: "#13C",
    label: "Chem Film Type I Class 3",
    kind: "chem-film",
    definitionId: "9450-13c",
  },
  {
    id: "9450-17-chem-film-type-i-class-3-gold",
    series: "9450",
    sequence: "#17",
    label: "Chem Film Type I Class 3 Gold",
    kind: "chem-film",
    definitionId: "9450-17",
  },
  {
    id: "9450-21-chem-film-type-ii-class-1-clear",
    series: "9450",
    sequence: "#21",
    label: "Chem Film Type II Class 1 Clear",
    kind: "chem-film",
    definitionId: "9450-21",
  },
  {
    id: "9450-23-chem-film-type-ii-class-3-clear",
    series: "9450",
    sequence: "#23",
    label: "Chem Film Type II Class 3 Clear",
    kind: "chem-film",
    definitionId: "9450-23",
  },
];
