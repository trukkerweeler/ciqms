
import { loadHeaderFooter, exesAndOhs, myport, getDocType } from "./utils.mjs";
// import {getComputerName} from './getComputerName.mjs';
loadHeaderFooter();
const port = myport() || 3003;
// console.log(getComputerName());
console.log(`Hostname: ${window.location.hostname}`);

// console.log(getUserValue1());

// const url = `http://localhost:${port}/reports`;

// const dates = [];
// const today = new Date();
// const currentMonth = today.getMonth();
// const currentYear = today.getFullYear();

// // Get the first day of the month for the last 13 months, don't include the current month
// const monthNames = [
//   "Jan",
//   "Feb",
//   "Mar",
//   "Apr",
//   "May",
//   "Jun",
//   "Jul",
//   "Aug",
//   "Sep",
//   "Oct",
//   "Nov",
//   "Dec",
// ];

// for (let i = 12; i > 0; i--) {
//   const date = new Date(currentYear, currentMonth - i, 1);
//   let month = monthNames[date.getMonth()];
//   if (month === "Jan") {
//     month += ` '${date.getFullYear().toString().slice(-2)}`;
//   }
//   dates.push(month);
// }

// // console.log(dates);
// // Create a table with the dates as headers, with the first column as the subject
// const table = document.getElementById("report-table");
// const header = table.createTHead();
// const headerRow = header.insertRow(0);
// headerRow.insertCell(0).innerHTML = "Subject";
// dates.forEach((date) => {
//   headerRow.insertCell(-1).innerHTML = date;
// });

// // Fetch the data from the server
// fetch(url)
//   .then((response) => response.json())
//   .then((data) => {
//     // console.log(data);
//     // iterate unique subjects
//     const subjects = data.map((report) => report.SUBJECT);
//     const uniqueSubjects = [...new Set(subjects)];
//     // filter out any INPUT_DATE that is newer than the last day of last month
//     const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
//     // console.log(lastDayOfLastMonth);
//     data = data.filter(
//       (report) => new Date(report.INPUT_DATE) <= lastDayOfLastMonth
//     );
//     // console.log(uniqueSubjects);
//     // for each subject enter teh subjet as teh first column in the row and then populate the responses for the dates
//     uniqueSubjects.forEach((subject) => {
//       const row = table.insertRow(-1);
//       row.insertCell(0).innerHTML =
//         subject +
//         "<br>" +
//         data.find((report) => report.SUBJECT === subject).ASSIGNED_TO;
//       dates.forEach((shortmonth) => {
//         // console.log(shortmonth);

//         const report = data.find(
//           (report) =>
//             report.SUBJECT === subject &&
//             new Date(report.INPUT_DATE).getMonth() ===
//               monthNames.indexOf(shortmonth.split(" ")[0])
//         );
//         // const report = data.find(report => report.SUBJECT === subject && report.INPUT_DATE === date);
//         // console.log(report);
//         let newResponse = report ? report.RESPONSE_TEXT : "";
//         // if RESPONSE_TEXT is not null and contains the word 'scan' then replace the text with 'X'
//         if (newResponse === null) {
//           newResponse = "";
//         } else {
//           newResponse = newResponse;

//           const regex = /scan/gi;
//           if (newResponse.match(regex)) {
//             newResponse = "X";
//           } else if (newResponse.match(/not[e]{0,1} done/gi)) {
//             newResponse = "O";
//           } else if (newResponse.match(/got it/gi)) {
//             newResponse = "X";
//           } else if (newResponse.match(/on file/gi)) {
//             newResponse = "X";
//           } else if (newResponse.match(/implementing/gi)) {
//             newResponse = "O";
//           } else if (newResponse.match(/no record/gi)) {
//             newResponse = "O";
//           } else if (newResponse.match(/no use/gi)) {
//             newResponse = "X";
//           } else if (newResponse.match(/not being used/gi)) {
//             newResponse = "X";
//           } else if (newResponse.match(/Filed,/gi)) {
//             newResponse = "X";
//           } else {
//             newResponse = newResponse;
//           }
//         }

//         row.insertCell(-1).innerHTML = report ? newResponse : "";
//         // row.insertCell(-1).innerHTML = 'X';
//       });
//     });

//     // iterate unique dates
//     // // Create a row for each subject
//     // data.forEach(subject => {
//     //     const row = table.insertRow(-1);
//     //     row.insertCell(0).innerHTML = subject.SUBJECT;
//     //     // dates.forEach(date => {
//     //     //     const report = subject.reports.find(report => report.date === date);
//     //     //     row.insertCell(-1).innerHTML = report ? report.hours : '';
//     //     // });
//   });
// // });

// // // Add a row for the total hours
// // const totalRow = table.insertRow(-1);
// // totalRow.insertCell(0).innerHTML = "Total";
// // dates.forEach(date => {
// //     totalRow.insertCell(-1).innerHTML = '';
// // });

// function convertDateToSemiYear(date) {
//   const month = date.getMonth();
//   const year = date.getFullYear();
//   if (month <= 6) {
//     return `${year}H1`;
//   } else {
//     return `${year}H2`;
//   }
// }


// // =========================
// // Determine the most recent transpired date either June 30 or December 31
// // =========================
// // const today = new Date();
// // const currentMonth = today.getMonth();
// // const currentYear = today.getFullYear();
// let myhalves = [];
// const lastDayOfJune = new Date(currentYear, 5, 30);
// const lastDayOfDecember = new Date(currentYear, 11, 31);
// let lastTranspiredDate = today;
// if (today < lastDayOfJune) {
//   lastTranspiredDate = lastDayOfDecember;
// } else if (today < lastDayOfDecember) {
//   lastTranspiredDate = lastDayOfJune;
// }
// myhalves.push(convertDateToSemiYear(lastTranspiredDate));
// // from lastTranspiredDate, go back 7 more 6-month iterations to get the last 8 semi-annual periods
// for (let i = 0; i < 7; i++) {
//   myhalves.push(convertDateToSemiYear(new Date(lastTranspiredDate.setMonth(lastTranspiredDate.getMonth() - 6))));
// }
// console.log(myhalves);

console.log('Document Type: ', getDocType('CI-WI-5080'));
