import { auth, db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "./firebase";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});


// --------------------------------------------------
// GET CURRENT USER'S SAVED JOBS
// --------------------------------------------------

async function getSavedJobs() {

  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in");
  }

  const snapshot = await getDocs(
    collection(db, "users", user.uid, "saved")
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}


// --------------------------------------------------
// GET NUMERIC YEARLY SALARY
// --------------------------------------------------

async function getSalaries() {

  const jobs = await getSavedJobs();

  let salaries = jobs.map(job => job.salary);

  const salary_array = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: `
Here I have given you a list of salaries of some jobs.

Some jobs have a salary range and some jobs say negotiable.

For each salary:
- If there is a salary range, calculate the average of the range.
- Convert the result into yearly USD salary.
- If the salary is negotiable, competitive, missing, or otherwise does not contain a usable number, return 0.
- If "per day" is mentioned, convert it into yearly USD salary.
- If "per annum" is mentioned, treat it as yearly salary.
- If neither "per day" nor "per annum" is mentioned, assume it is yearly salary.
- Return the index of each salary.

Example input:
["Salary negotiable", "Competitive salary", "£300 - £600 per day", "€65,000 - €66,000 per annum"]

Example output:
[
  {"index": 0, "salary": 0},
  {"index": 1, "salary": 0},
  {"index": 2, "salary": 0},
  {"index": 3, "salary": 0}
]

Return ONLY the JSON array and nothing else.

Salaries:
${JSON.stringify(salaries)}
`
  });
  console.log(salary_array.output_text)
  let result = JSON.parse(salary_array.output_text);

  return result;
}


// --------------------------------------------------
// TOOL 1
// ORDER JOBS BY HIGHEST SALARY
// --------------------------------------------------

export async function getDescendingSalaries() {

  let salary_list = await getSalaries();

  let ordered_salary_list = salary_list
    .filter(item => item.salary > 0)
    .sort((a, b) => b.salary - a.salary);

  return ordered_salary_list;
}


// --------------------------------------------------
// GET LIVING EXPENSES
// --------------------------------------------------

async function getLivingExpenses() {

  const jobs = await getSavedJobs();

  let locations = jobs.map(job => job.location);

  const location_array = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: `
Here I have given you a list of job locations.

For each location, estimate the average yearly living expense
for one person in that location, in USD.

Return the result using the same index as the input.

If the location is missing, return 0.

Example input:
["London", "USA", "Germany"]

Example output:
[
  {"index": 0, "expenses": 30000},
  {"index": 1, "expenses": 40000},
  {"index": 2, "expenses": 25000}
]

Return ONLY the JSON array and nothing else.

Locations:
${JSON.stringify(locations)}
`
  });

  let result = JSON.parse(location_array.output_text);

  return result;
}


// --------------------------------------------------
// TOOL 2
// ORDER JOBS BY LOWEST LIVING EXPENSE
// --------------------------------------------------

export async function getAscendingLivingExpenses() {

  let living_expenses = await getLivingExpenses();

  let ordered_living_expenses = living_expenses
    .sort((a, b) => a.expenses - b.expenses);

  return ordered_living_expenses;
}


// --------------------------------------------------
// TOOL 3
// ORDER JOBS BY HIGHEST NET INCOME
// salary - living expense
// --------------------------------------------------

export async function getHighestNetIncome() {

  let salaries = await getSalaries();
  let expenses = await getLivingExpenses();

  let n = salaries.length;
  let results = [];

  for (let i = 0; i < n; i++) {


    if (salaries[i].salary === 0 || expenses[i].expenses === 0) {
      results.push({index: i, netIncome: 0})
    }
    else {
    results.push({
      index: i,
      netIncome: salaries[i].salary - expenses[i].expenses
    });
    }


  }

  let ordered_list = results
    .sort((a, b) => b.netIncome - a.netIncome);

  return ordered_list;
}