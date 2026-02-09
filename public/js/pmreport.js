import { loadHeaderFooter, getApiUrl } from "./utils.mjs";
// loadHeaderFooter();

(async () => {
  const apiUrl = await getApiUrl();
  const url = `${apiUrl}/reports/pm`;

  const months = [];
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

  // create a dictionary of PM Form Names from the pmforms.json in json folder
  let PMFormNames = {};

  fetch("./json/pmforms.json")
    .then((response) => response.json())
    .then((data) => {
      PMFormNames = data;
    });

  function exesAndOhs(newResponse) {
    if (newResponse === null) {
      newResponse = "";
    } else {
      // Normalize to lower case for matching
      const lowerResponse = newResponse.toLowerCase();

      if (/inop/.test(lowerResponse)) {
        newResponse = "I";
      } else if (/scan/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/not[e]{0,1} done/.test(lowerResponse)) {
        newResponse = "O";
      } else if (/got it/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/on file/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/implementing/.test(lowerResponse)) {
        newResponse = "O";
      } else if (/no record/.test(lowerResponse)) {
        newResponse = "O";
      } else if (/no use/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/not being used/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/filed,/.test(lowerResponse)) {
        newResponse = "X";
      } else if (/no entry/.test(lowerResponse)) {
        newResponse = "&#9651;";
      } else if (/no entries/.test(lowerResponse)) {
        newResponse = "&#9651;"; // Unicode white triangle (delta)
      } else if (/no service/.test(lowerResponse)) {
        newResponse = "&#9651;";
      } else if (/inop\./.test(lowerResponse)) {
        // Match "inop." exactly (with period)
        newResponse = "I";
      } else if (/retrieved/.test(lowerResponse)) {
        newResponse = "X";
      } else {
        newResponse = newResponse;
      }
    }
    return newResponse;
  }

  function convertDateToSemiYear(date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    if (month <= 6) {
      return `${year}H1`;
    } else {
      return `${year}H2`;
    }
  }

  for (let i = 12; i > 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    let month = monthNames[date.getMonth()];
    if (month === "Jan") {
      month += ` '${date.getFullYear().toString().slice(-2)}`;
    }
    months.push(month);
  }

  // console.log(months);
  // Create a table with the months as headers, with the first column as the subject
  const main = document.getElementById("main");
  // create a table element
  const table = document.createElement("table");
  // set the id of the table
  table.id = "report-table";
  // append the table to the main element
  const h1 = document.createElement("h1");
  h1.innerText = "Preventive Maintenance";
  main.appendChild(h1);

  // Fetch the data from the server
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
      // filter out any INPUT_DATE that is newer than the last day of last month
      const lastDayOfLastMonth = new Date(currentYear, currentMonth, 0);
      // console.log(lastDayOfLastMonth);
      data = data.filter(
        (report) => new Date(report.INPUT_DATE) <= lastDayOfLastMonth,
      );
      // filter out those that are not Monthly PMs
      let monthlydata = data.filter((report) => report.FREQUENCY === "M");
      // console.log(monthlydata);
      let monthlySubjects = monthlydata.map((report) => report.SUBJECT);
      // console.log(monthlySubjects);
      let uMonthlySubjects = [...new Set(monthlySubjects)];

      let quarterlydata = data.filter((report) => report.FREQUENCY === "Q");
      // console.log(quarterlydata);
      let quarterlysubjects = quarterlydata.map((report) => report.SUBJECT);
      // console.log(quarterlysubjects);
      let uQuarterlySubjects = [...new Set(quarterlysubjects)];

      let halfyearlydata = data.filter((report) => report.FREQUENCY === "H");
      // console.log(halfyearlydata);
      let halfyearlysubjects = halfyearlydata.map((report) => report.SUBJECT);
      // console.log(halfyearlysubjects);
      let uHalfyearlySubjects = [...new Set(halfyearlysubjects)];

      let yearlydata = data.filter((report) => report.FREQUENCY === "A");
      // console.log(yearlydata);
      let yearlysubjects = yearlydata.map((report) => report.SUBJECT);
      // console.log(yearlysubjects);
      let uYearlySubjects = [...new Set(yearlysubjects)];

      // console.log(uniqueSubjects);

      const monthlyCheckbox = document.getElementById("month");
      const quarterlyCheckbox = document.getElementById("quarter");
      const halfyearlyCheckbox = document.getElementById("semi-yearly");
      const annualCheckbox = document.getElementById("annual");
      // if the monthly checkbox is not checked, hide the monthly table
      if (monthlyCheckbox.checked === true) {
        // Monthly PM Report Heading and Legend
        const h2 = document.createElement("h2");
        h2.innerText = "Monthly PM Report";
        main.appendChild(h2);
        const p = document.createElement("p");
        p.innerHTML = "X = Done, O = Not Done, I = Inop, &#9651; = No entries";
        main.appendChild(p);

        // Table setup
        main.appendChild(table);
        const header = table.createTHead();
        const headerRow = header.insertRow(0);
        headerRow.insertCell(0).innerHTML = "Subject";
        months.forEach((date) => {
          headerRow.insertCell(-1).innerHTML = date;
        });

        // Populate table rows
        uMonthlySubjects.forEach((subject) => {
          const row = table.insertRow(-1);
          let assignedTo = "";
          try {
            assignedTo =
              "<br>" +
              monthlydata.find((report) => report.SUBJECT === subject)
                .ASSIGNED_TO;
          } catch (error) {
            assignedTo = "";
          }
          row.insertCell(0).innerHTML =
            subject + " " + (PMFormNames[subject] || "") + assignedTo;

          months.forEach((shortmonth) => {
            const monthIdx = monthNames.indexOf(shortmonth.split(" ")[0]);
            const report = data.find(
              (report) =>
                report.SUBJECT === subject &&
                new Date(report.INPUT_DATE).getMonth() === monthIdx,
            );
            let newResponse = report ? report.RESPONSE_TEXT : "";
            newResponse = exesAndOhs(newResponse);
            row.insertCell(-1).innerHTML = report ? newResponse : "";
          });
        });
      }

      if (quarterlyCheckbox.checked === true) {
        // Make a table for Quarterly PMs
        const quarterlyTable = document.createElement("table");
        quarterlyTable.id = "quarterly-table";
        // Quarterly Heading
        const quarterlyH2 = document.createElement("h2");
        quarterlyH2.innerText = "Quarterly PM Report";
        main.appendChild(quarterlyH2);
        main.appendChild(quarterlyTable);
        const quarterlyHeader = quarterlyTable.createTHead();
        const quarterlyHeaderRow = quarterlyHeader.insertRow(0);
        quarterlyHeaderRow.insertCell(0).innerHTML = "Subject";

        // Determine previous 4 quarters
        const today = new Date();
        // const currentMonth = today.getMonth();
        // const currentYear = today.getFullYear();
        const quarter = Math.floor(currentMonth / 3);
        const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
        const currentQuarter = quarterNames[quarter];
        const currentQuarterIndex = quarter;
        const previousQuarters = [];
        for (let i = 1; i < 5; i++) {
          previousQuarters.push(
            quarterNames[(currentQuarterIndex - i + 4) % 4],
          );
        }
        const quarterlyDates = previousQuarters.map((quarter) => {
          return quarter + " " + currentYear;
        });
        quarterlyDates.forEach((date) => {
          quarterlyHeaderRow.insertCell(-1).innerHTML = date;
        });
      }

      if (halfyearlyCheckbox.checked === true) {
        // Make a table for Half Yearly PMs=====================================================
        const halfyearlyTable = document.createElement("table");
        halfyearlyTable.id = "halfyearly-table";
        // Half Yearly Heading
        const halfyearlyH2 = document.createElement("h2");
        halfyearlyH2.innerText = "Half Yearly PM Report";
        main.appendChild(halfyearlyH2);
        main.appendChild(halfyearlyTable);
        const halfyearlyHeader = halfyearlyTable.createTHead();
        const halfyearlyHeaderRow = halfyearlyHeader.insertRow(0);
        halfyearlyHeaderRow.insertCell(0).innerHTML = "Subject";

        let myhalves = [];
        const lastDayOfJune = new Date(currentYear, 5, 30);
        const lastDayOfDecember = new Date(currentYear, 11, 31);
        let lastTranspiredDate = today;
        if (today < lastDayOfJune) {
          lastTranspiredDate = lastDayOfDecember;
        } else if (today < lastDayOfDecember) {
          lastTranspiredDate = lastDayOfJune;
        }
        myhalves.push(convertDateToSemiYear(lastTranspiredDate));
        // from lastTranspiredDate, go back 7 more 6-month iterations to get the last 8 semi-annual periods
        for (let i = 0; i < 7; i++) {
          myhalves.push(
            convertDateToSemiYear(
              new Date(
                lastTranspiredDate.setMonth(lastTranspiredDate.getMonth() - 6),
              ),
            ),
          );
        }
        // console.log(myhalves);
        myhalves = myhalves.reverse();

        myhalves.forEach((date) => {
          halfyearlyHeaderRow.insertCell(-1).innerHTML = date;
        });

        uHalfyearlySubjects.forEach((halfyearlysubject) => {
          const row = halfyearlyTable.insertRow(-1);
          try {
            row.insertCell(0).innerHTML =
              halfyearlysubject +
              " " +
              PMFormNames[halfyearlysubject] +
              "<br>" +
              halfyearlydata.find(
                (report) => report.SUBJECT === halfyearlysubject,
              ).ASSIGNED_TO;
          } catch (error) {
            console.log(error);
            console.log(halfyearlysubject);
            row.insertCell(0).innerHTML =
              halfyearlysubject + " " + PMFormNames[halfyearlysubject];
          }

          myhalves.forEach((halfyear) => {
            const report = data.find(
              (report) =>
                report.SUBJECT === halfyearlysubject &&
                convertDateToSemiYear(new Date(report.INPUT_DATE)) === halfyear,
            );

            let newResponse = report ? report.RESPONSE_TEXT : "";
            newResponse = exesAndOhs(newResponse);
            row.insertCell(-1).innerHTML = report ? newResponse : "";
          });
        });
      }

      if (annualCheckbox.checked === true) {
        // Make a table for Yearly PMs =====================================================
        const yearlyTable = document.createElement("table");
        yearlyTable.id = "yearly-table";
        // Yearly Heading
        const yearlyH2 = document.createElement("h2");
        yearlyH2.innerText = "Yearly PM Report";
        main.appendChild(yearlyH2);
        main.appendChild(yearlyTable);
        const yearlyHeader = yearlyTable.createTHead();
        const yearlyHeaderRow = yearlyHeader.insertRow(0);
        yearlyHeaderRow.insertCell(0).innerHTML = "Subject";

        // Determine previous 4 years
        const previousYears = [];
        for (let i = 1; i < 5; i++) {
          previousYears.push(currentYear - i);
        }
        let yearlyDates = previousYears.map((year) => {
          return year;
        });

        // Reverse the array
        yearlyDates = yearlyDates.reverse();
        // previousYears = previousYears.reverse();

        yearlyDates.forEach((date) => {
          yearlyHeaderRow.insertCell(-1).innerHTML = date;
        });

        uYearlySubjects.forEach((yearlysubject) => {
          const row = yearlyTable.insertRow(-1);
          try {
            row.insertCell(0).innerHTML =
              yearlysubject +
              " " +
              PMFormNames[yearlysubject] +
              "<br>" +
              yearlydata.find((report) => report.SUBJECT === yearlysubject)
                .ASSIGNED_TO;
          } catch (error) {
            console.log(error);
            console.log(yearlysubject);
            row.insertCell(0).innerHTML =
              yearlysubject + " " + PMFormNames[yearlysubject];
          }

          yearlyDates.forEach((year) => {
            const report = data.find(
              (report) =>
                report.SUBJECT === yearlysubject &&
                new Date(report.INPUT_DATE).getFullYear() === year,
            );
            let newResponse = report ? report.RESPONSE_TEXT : "";
            newResponse = exesAndOhs(newResponse);
            row.insertCell(-1).innerHTML = report ? newResponse : "";
          });
        });
      }
    });

  // Add event listeners to the checkboxes
  const checkboxes = [
    document.getElementById("month"),
    document.getElementById("quarter"),
    document.getElementById("semi-yearly"),
    document.getElementById("annual"),
  ];

  // Save checkbox states to localStorage
  function saveCheckboxStates() {
    checkboxes.forEach((checkbox) => {
      if (checkbox) {
        localStorage.setItem(checkbox.id, checkbox.checked);
      }
    });
  }

  // Load checkbox states from localStorage
  function loadCheckboxStates() {
    checkboxes.forEach((checkbox) => {
      if (checkbox && localStorage.getItem(checkbox.id) !== null) {
        checkbox.checked = localStorage.getItem(checkbox.id) === "true";
      }
    });
  }

  // Add event listeners
  checkboxes.forEach((checkbox) => {
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        saveCheckboxStates();
        location.reload();
      });
    }
  });

  // On page load, restore checkbox states
  loadCheckboxStates();
})();
