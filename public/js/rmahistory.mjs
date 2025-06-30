import { myport } from "./utils.mjs";

const port = myport() || 3003;
const btnSearch = document.getElementById("btnSearch");
const rmaNo = document.getElementById("rmaNo"); // Assuming this is the input field for Work Order No

btnSearch.addEventListener("click", async function (event) {
  event.preventDefault(); // Prevent the default form submission

  let rmaNumber = rmaNo.value.trim(); // Get the value of the input field

  if (!rmaNumber) {
    console.error("RMA No is empty");
    return;
  }
  while (rmaNumber.length < 7) {
    rmaNumber = "0" + rmaNumber;
  }
  const url = `http://localhost:${port}/rmahistory/${rmaNumber}`;
  // console.log("Fetching data from URL:", url); // Log the URL for debugging
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok " + response.statusText);
    }

    const data = await response.json();
    // console.log(data); // Handle the data as needed
    const searchResults = document.getElementById("searchResults");
    searchResults.innerHTML = ""; // Clear previous results

    // const rmaData = data.rmaData; // Assuming the response contains an array of RMA data
    // Create and append the main RMA details
    const rmaHeader = document.createElement("h1");
    rmaHeader.textContent = `RMA ID: ${data[0].RMA_ID}`;
    searchResults.appendChild(rmaHeader);

    const dateIssued = document.createElement("p");
    const formattedDate = `${data[0].DATE_ISSUED.substring(0, 4)}-${data[0].DATE_ISSUED.substring(4, 6)}-${data[0].DATE_ISSUED.substring(6, 8)}`;
    dateIssued.textContent = `Date Issued: ${formattedDate}`;
    dateIssued.classList.add("headerinfo");
    searchResults.appendChild(dateIssued);

    const orderNo = document.createElement("p");
    orderNo.textContent = `Order No: ${data[0].CUSTOMER_PO}`;
    orderNo.classList.add("headerinfo");
    searchResults.appendChild(orderNo);

    const customerName = document.createElement("p");
    customerName.textContent = `Customer: ${data[0].NAME_CUSTOMER}`;
    customerName.classList.add("headerinfo");
    searchResults.appendChild(customerName);

  
  // Iterate through each record in the data array
  data.forEach(record => {
    const section = document.createElement("section");
    section.classList.add("record-section");

    // Add a header for the section using RMA_LINE
    const sectionHeader = document.createElement("h2");
    sectionHeader.textContent = `RMA Line: ${record.RMA_LINE}`;
    section.appendChild(sectionHeader);

    // Add PART_NO
    const partNo = document.createElement("p");
    partNo.textContent = `Part No: ${record.PART}`;
    section.appendChild(partNo);

    // // Add PART_REV
    // const partRev = document.createElement("p");
    // partRev.textContent = `Part Rev: ${record.PART_REV}`;
    // section.appendChild(partRev);

    // Add PART_DESC
    const partDesc = document.createElement("p");
    partDesc.textContent = `Part Desc: ${record.PART_DESCRIPTION}`;
    section.appendChild(partDesc);

    // Add REQ_TEXT label and paragraph
    const reqTextLabel = document.createElement("label");
    reqTextLabel.textContent = "Requested:";
    section.appendChild(reqTextLabel);

    const reqTextParagraph = document.createElement("p");
    reqTextParagraph.textContent = `${record.REQ_TEXT?.trim() || "No text found"}`;
    section.appendChild(reqTextParagraph);

    // Add PFR_TEXT label and paragraph
    const pfrTextLabel = document.createElement("label");
    pfrTextLabel.textContent = "Performed:";
    section.appendChild(pfrTextLabel);

    const pfrTextParagraph = document.createElement("p");
    pfrTextParagraph.textContent = `${record.PFR_TEXT?.trim() || "No text found"}`;
    section.appendChild(pfrTextParagraph);

    // Append the section to searchResults
    searchResults.appendChild(section);
  });

    

  } catch (error) {
    console.error("Error fetching RMA data:", error);
  }
  
});

