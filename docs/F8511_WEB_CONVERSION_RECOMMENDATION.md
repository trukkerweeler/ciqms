# F8511 Web Conversion Recommendation

## Scope

This is a greenfield assessment of the ten remaining F8511-xx XPS forms in this directory. It does not depend on, or recommend reusing, the existing special-processes implementation.

The forms are preventive-maintenance service logs. Their common paper interaction is:

1. Select or identify the equipment.
2. Record the date.
3. Complete one or more maintenance actions at the required frequency.
4. Enter an operator initial for each completed action.
5. Preserve an audit record of who submitted the log and when.

## Recommendation

Start with a generic **Preventive Maintenance Log** webpage driven by JSON definitions. Store each form as data, not as a separate page. The renderer should create the action rows and the appropriate entry controls from the definition.

The initial renderer only needs these controls:

- Date input
- Operator identity from the signed-in user
- One completion control per action and occurrence
- Optional AM/PM occurrence controls
- Optional notes field
- Submit, validation, and read-only history views

The JSON definition should describe the controlled form revision and its actions. It should not contain database-specific SQL or HTML.

## Conversion ranking

| Rank | Form                                 | Recommendation                    | Reason                                                                                                                                               |
| ---: | ------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | F8511-22 Spot Welder                 | First pilot                       | Five short actions, one occurrence per frequency, and a single initial per action. No AM/PM grid or measurement.                                     |
|    2 | F8511-6 Brake Amada HFE 100-3s       | First production candidate        | Only three actions. Monthly and two-year frequencies are simple scheduled rows.                                                                      |
|    3 | F8511-3 Amada Mechanical Shear       | First production candidate        | Five checklist actions with daily, weekly, and quarterly frequencies. No AM/PM matrix.                                                               |
|    4 | F8511-20 SuperMax Mill               | Reusable template candidate       | Four actions with daily/weekly/yearly frequencies. Straightforward checklist.                                                                        |
|    5 | F8511-26 Acer Mill                   | Reuse the mill definition pattern | Same four action structure as F8511-20, with equipment-specific labeling. Validate whether the shared text is intentional before deduplicating JSON. |
|    6 | F8511-7 Amada RG-50                  | Reusable brake-family candidate   | Four actions, but includes a daily AM/PM entry pattern and a two-year task. More occurrence handling than the first candidates.                      |
|    7 | F8511-11 Grieve Oven                 | Good second wave                  | Four actions with when-in-use, daily, weekly, monthly, and annual language. The schedule semantics need an explicit policy.                          |
|    8 | F8511-23 Timesaver                   | Good second wave                  | Four actions and daily AM/PM entries, plus a monthly reservoir task. Similar to the generic renderer but needs occurrence rules.                     |
|    9 | F8511-12 Hypress 60 Ton Guided Press | Later                             | Five actions with multiple AM/PM columns and a separate annual task. The paper grid is substantially denser than a simple checklist.                 |
|   10 | F8511-28 Okuma M560V                 | Later                             | Five actions, several daily entries, AM/PM occurrence handling, and an annual preventive-maintenance row.                                            |

## Suggested pilot

Use F8511-22 as the pilot because it minimizes renderer behavior while still proving the complete workflow. The pilot should support:

- A JSON form definition
- One date-based log submission
- Five action rows
- Required completion and initials/identity
- Read-only submitted-log display
- Revision shown on the form and stored with the submission

After that, implement F8511-6 and F8511-3 without changing the renderer. If those two forms require form-specific code, the JSON contract is too weak or the renderer boundary is wrong.

## JSON definition shape

Example for the F8511-22 pilot:

```json
{
  "id": "F8511-22",
  "title": "Spot Welder Service Log",
  "revision": "01",
  "formType": "maintenance-log",
  "equipment": {
    "id": "spot-welder",
    "label": "Spot Welder"
  },
  "schedule": {
    "entryPolicy": "one-log-per-date",
    "operatorIdentity": "signed-in-user"
  },
  "actions": [
    {
      "id": "clean-work-area",
      "label": "Remove and clean excess metal, shavings, and parts from the machine and work station.",
      "frequency": "daily",
      "input": "complete"
    },
    {
      "id": "start-supplies-and-cycle",
      "label": "Start air and water supply, adjust air pressure as necessary, lubricate daily points, and dry cycle the machine to test.",
      "frequency": "daily",
      "input": "complete"
    },
    {
      "id": "weekly-maintenance",
      "label": "Perform weekly preventative maintenance; see the service log.",
      "frequency": "weekly",
      "input": "complete"
    },
    {
      "id": "quarterly-maintenance",
      "label": "Perform quarterly preventative maintenance; see the service log.",
      "frequency": "quarterly",
      "input": "complete"
    },
    {
      "id": "annual-maintenance",
      "label": "Perform annual preventative maintenance; see the service log.",
      "frequency": "annual",
      "input": "complete"
    }
  ]
}
```

## JSON action types

The renderer should begin with a deliberately small vocabulary:

- `complete`: required checkbox or completion button
- `initial`: explicit initials text field when the workflow cannot use the signed-in identity
- `am-pm`: two completion values for AM and PM occurrences
- `text`: short note or exception description

Frequency is data, but it is not enough by itself to generate occurrences. The definition must also specify the entry policy, for example `one-log-per-date`, `one-log-per-shift`, or `scheduled-occurrence`. This prevents the AM/PM forms from being ambiguously represented.

## Important workflow decisions

### Completion versus inspection result

The checklist-style logs mainly document that an action was performed. A completion control is appropriate for them, with an optional note for exceptions. Do not silently turn a completed checkbox into a quality result such as Pass.

### AM/PM rows

F8511-7, F8511-12, F8511-20, F8511-23, F8511-26, and F8511-28 contain AM/PM-style paper columns or repeated shift occurrences. Before converting them, decide whether the web log is submitted once per day with two values, or once per shift. Store the decision in the form definition and validate it in the UI.

### Long-interval actions

Monthly, quarterly, annual, and two-year actions should remain visible in the form but should not be treated as due every day. A later scheduling layer can calculate due occurrences. The first pilot can display the frequency and accept an explicitly selected completion date.

### Revision control

Store `id` and `revision` with every submission. Published definitions should be immutable. A revised paper form should produce a new JSON revision, and historical submissions should continue rendering from the revision under which they were completed.

## Suggested implementation sequence

1. Build the JSON schema and validator.
2. Implement the generic maintenance-log renderer.
3. Convert and test F8511-22.
4. Convert F8511-6 and F8511-3 using the same renderer.
5. Add occurrence policies for AM/PM and scheduled long-interval actions.
6. Convert the remaining checklist-style logs.

## Bottom line

The best first conversion is **F8511-22 Spot Welder**, followed by **F8511-6 Brake Amada HFE 100-3s** and **F8511-3 Amada Mechanical Shear**. They offer the highest confidence that a single JSON-driven webpage can replace the paper workflow without custom rendering logic.
