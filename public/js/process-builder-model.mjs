export function createEmptyField() {
  return {
    name: "",
    label: "",
    type: "number",
    required: true,
    unit: "",
  };
}

export function createEmptyStep() {
  return {
    title: "",
    description: "",
    fields: [createEmptyField()],
  };
}

export function createDefaultProcessState() {
  return {
    processId: "",
    name: "",
    areaNumber: "1",
    activityNo: "1",
    elementNo: "1",
    processLevel: "1",
    employeeId: "",
    jobCode: "",
    functionCode: "",
    createBy: "",
    createDate: new Date().toISOString().slice(0, 10),
    steps: [createEmptyStep()],
  };
}
