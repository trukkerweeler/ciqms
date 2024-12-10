import { loadHeaderFooter, exesAndOhs } from "./utils.mjs";
// loadHeaderFooter();
const url = "http://localhost:3003/reports";

const dates = [];
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// Get the first day of the month for the last 13 months, don't include the current month
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PMFormNames = {
  PM02: "Air Compressor",
  PM03: "Amada Shear",
  PM04: "Pneumatic (Assy)",
  PM05: "AutoSert",
  PM06: "100-3s Brake",
  PM07: "RG-50 Press Brake",
  PM09: "Air Filtration",
  PM10: "Despatch Oven",
  PM11: "Grieve Oven",
  PM12: "HyPress",
  PM13: "I-Mark",
  PM17: "Powder Coat",
  PM18: "Sanding",
  PM23: "Timesaver",
  PM24: "Tumbler",
  PM25: "Wisconsin Oven",
  PM26: "ACER Mill",
};

for (let i = 12; i > 0; i--) {
  const date = new Date(currentYear, currentMonth - i, 1);
  let month = monthNames[date.getMonth()];
  if (month === "Jan") {
    month += ` '${date.getFullYear().toString().slice(-2)}`;
  }
  dates.push(month);
}

// console.log(dates);
// Create a table with the dates as headers, with the first column as the subject
const main = document.getElementById("main");
// create a table element
const table = document.createElement("table");
// set the id of the table
table.id = "report-table";
// append the table to the main element
const h1 = document.createElement("h1");
h1.innerText = "Monthly PM Report";
main.appendChild(h1);
const p = document.createElement("p");
p.innerText = "X = Done, O = Not Done";
main.appendChild(p);
main.appendChild(table);
const header = table.createTHead();
// header.innerText = "Monthly PM Report";
const headerRow = header.insertRow(0);
headerRow.insertCell(0).innerHTML = "Subject";
dates.forEach((date) => {
  headerRow.insertCell(-1).innerHTML = date;
});

// Fetch the data from the server
fetch(url)
  .then((response) => response.json())
  .then((data) => {
    // console.log(data);
    // iterate unique subjects
    const subjects = data.map((report) => report.SUBJECT);
    const uniqueSubjects = [...new Set(subjects)];
    // filter out any INPUT_DATE that is newer than the last day of last month
    const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
    // console.log(lastDayOfLastMonth);
    data = data.filter(
      (report) => new Date(report.INPUT_DATE) <= lastDayOfLastMonth
    );
    // console.log(uniqueSubjects);
    // for each subject enter teh subjet as teh first column in the row and then populate the responses for the dates
    uniqueSubjects.forEach((subject) => {
      const row = table.insertRow(-1);
      row.insertCell(0).innerHTML =
        subject +
        " " +
        PMFormNames[subject] +
        "<br>" +
        data.find((report) => report.SUBJECT === subject).ASSIGNED_TO;
      dates.forEach((shortmonth) => {
        // console.log(shortmonth);

        const report = data.find(
          (report) =>
            report.SUBJECT === subject &&
            new Date(report.INPUT_DATE).getMonth() ===
              monthNames.indexOf(shortmonth.split(" ")[0])
        );
        // const report = data.find(report => report.SUBJECT === subject && report.INPUT_DATE === date);
        // console.log(report);
        let newResponse = report ? report.RESPONSE_TEXT : "";
        // if RESPONSE_TEXT is not null and contains the word 'scan' then replace the text with 'X'
        if (newResponse === null) {
          newResponse = "";
        } else {
          newResponse = newResponse;

          const regex = /scan/gi;
          if (newResponse.match(regex)) {
            newResponse = "X";
          } else if (newResponse.match(/not[e]{0,1} done/gi)) {
            newResponse = "O";
          } else if (newResponse.match(/got it/gi)) {
            newResponse = "X";
          } else if (newResponse.match(/on file/gi)) {
            newResponse = "X";
          } else if (newResponse.match(/implementing/gi)) {
            newResponse = "O";
          } else if (newResponse.match(/no record/gi)) {
            newResponse = "O";
          } else if (newResponse.match(/no use/gi)) {
            newResponse = "X";
          } else if (newResponse.match(/not being used/gi)) {
            newResponse = "X";
          } else if (newResponse.match(/Filed,/gi)) {
            newResponse = "X";
          } else {
            newResponse = newResponse;
          }
        }

        row.insertCell(-1).innerHTML = report ? newResponse : "";
        // row.insertCell(-1).innerHTML = 'X';
      });
    });
  });
