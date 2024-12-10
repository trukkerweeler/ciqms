const dates = [];
const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

for (let i = 0; i < 12; i++) {
  const date = new Date(currentYear, currentMonth - i, 1);
  dates.push(date);
}

console.log(dates);