from bs4 import BeautifulSoup
import requests
import csv 
from google import genai
from dotenv import load_dotenv
from datetime import datetime
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json

import hashlib
cred = credentials.Certificate(
    "firebase-service-account.json"
)

firebase_admin.initialize_app(cred)

db = firestore.client()


base_prompt = """
You are a job-listing data extraction assistant.

You will receive unorganized scraped text containing job listings from one or more sources.

The input is organized like this:

SOURCE URL 1, SCRAPED DATE/TIME 1
JOB 1
JOB 2
JOB 3
...

SOURCE URL 2, SCRAPED DATE/TIME 2
JOB 1
JOB 2
JOB 3
...

Your task is to convert the entire input into valid JSON.

Return ONLY valid JSON.
Do not return Markdown.
Do not return explanations.
Do not return comments.
Do not return code fences.

The output must be a JSON array.

Each job must be represented by an object with EXACTLY these fields, in this order:

{
  "source_url": "string",
  "scraped_at": "string",
  "title": "string or null",
  "job_type": "full-time, part-time, hybrid, or null",
  "location": "string or null",
  "salary": "string or null",
  "company": "string or null"
}

IMPORTANT:

1. The SOURCE URL and SCRAPED DATE/TIME appearing before a group of jobs belong to EVERY job in that group.

2. "source_url" must contain the source URL associated with that job.

3. "scraped_at" must contain the exact date and time associated with that source group.

4. Extract the actual job title.
   Remove labels such as:
   - Promoted
   - Featured
   - New
   - EarlyBird
   - Early bird
   - Easy Apply
   - See more
   - Job hidden
   - Undo

5. Extract the company name.
   For Reed listings, this is often the company or recruitment agency appearing after "by".

6. Extract the salary exactly as written.
   Examples:
   - "$150K - $200K"
   - "£45,000 - £55,000 per annum"
   - "Competitive salary"
   - "£600 - £700 per day, negotiable"

7. Extract the location exactly as written.

8. Determine "job_type" ONLY from the actual employment arrangement:
   - "full-time" if the listing says full-time
   - "part-time" if the listing says part-time
   - "hybrid" if the listing explicitly says hybrid and neither full-time nor part-time is being requested as the location/work-mode value
   - null if none of these can be determined

9. Do NOT confuse:
   - Permanent
   - Contract
   - Temporary
   - Internship
   - Freelance
   with full-time or part-time unless the text explicitly says full-time or part-time.

10. Do not confuse "Remote", "On-site", or "Hybrid" as the job type when the field refers to work location/mode.
    However, if "Hybrid" is explicitly the requested job_type according to the schema, use "hybrid".

11. Do not invent missing information.
    Use null when a field cannot be determined.

12. Ignore unrelated text such as:
   - equity percentages
   - role categories
   - experience requirements
   - visa requirements
   - skills
   - application instructions
   - founder information
   - promotional text

13. A source header applies to all job listings until the next source header appears.

14. Preserve the source URL and scraped timestamp exactly as provided.

15. Make sure the output can be parsed directly with Python:
    json.loads()

16. Return one JSON object per job listing.

Example input:

https://example.com/jobs,15 September 2026 00:19
"Senior Engineer £80,000 - £100,000 London Permanent, full-time"
"Accountant £40,000 - £50,000 Manchester Permanent, part-time"

https://example2.com/jobs,15 September 2026 00:20
"Backend Engineer $120K - $160K Remote Job typeFull-time"

Example output:

[
  {
    "source_url": "https://example.com/jobs",
    "scraped_at": "15 September 2026 00:19",
    "title": "Senior Engineer",
    "job_type": "full-time",
    "location": "London",
    "salary": "£80,000 - £100,000",
    "company": null
  },
  {
    "source_url": "https://example.com/jobs",
    "scraped_at": "15 September 2026 00:19",
    "title": "Accountant",
    "job_type": "part-time",
    "location": "Manchester",
    "salary": "£40,000 - £50,000",
    "company": null
  },
  {
    "source_url": "https://example2.com/jobs",
    "scraped_at": "15 September 2026 00:20",
    "title": "Backend Engineer",
    "job_type": "full-time",
    "location": "Remote",
    "salary": "$120K - $160K",
    "company": null
  }
]
"""

load_dotenv()

client = genai.Client()

with open("jobs.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow([
        "https://www.reed.co.uk/jobs/accountancy-qualified-jobs" , 
        datetime.now().strftime("%d %B %Y %H:%M")
    ])

url1 = "https://www.reed.co.uk/jobs/accountancy-qualified-jobs"

res1 = requests.get(url1, timeout=15)
soup1 = BeautifulSoup(res1.content, "html.parser")

jobs = soup1.find_all("article", class_="card")

with open('jobs.csv', 'a', newline='') as txt: 
    writer = csv.writer(txt)
    for job in jobs:
        content = job.get_text(" ", strip=True)
        writer.writerow([content[17:-9]])



with open("jobs.csv", "a", newline="") as file:
    writer = csv.writer(file)
    writer.writerow([
        "https://news.ycombinator.com/jobs" , 
        datetime.now().strftime("%d %B %Y %H:%M")
    ])

url = "https://news.ycombinator.com/jobs"

response = requests.get(url)
soup = BeautifulSoup(response.text, "html.parser")

job_links = [
    link["href"]
    for link in soup.select("tr.athing span.titleline > a")
    if link["href"].startswith("https://www.ycombinator.com/")
]

for job_url in job_links:
    try:
        response = requests.get(
            job_url,
            timeout=20
        )

        soup = BeautifulSoup(response.text, "html.parser")
        card = soup.find("div", class_="ycdc-card")
        with open("jobs.csv", "a", newline="") as file:
            writer = csv.writer(file)

            writer.writerow([card.text])

    except Exception as error:
        print("ERROR:", job_url, error)


with open("jobs.csv", "r") as file:
    content = file.read()

    final_json = client.interactions.create(
        model="gemini-3.6-flash",
        input=f"{base_prompt} {content}"
    )

with open("jobs.csv", "w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow([final_json.output_text])   

jobs = json.loads(final_json.output_text)


def create_job_id(job):
    unique_text = "|".join([
        str(job.get("source_url") or ""),
        str(job.get("title") or ""),
        str(job.get("company") or ""),
        str(job.get("location") or "")
    ])

    return hashlib.sha256(
        unique_text.encode("utf-8")
    ).hexdigest()


# Upload jobs to the shared collection
jobs_collection = db.collection("jobs")

for job in jobs:
    job_id = create_job_id(job)

    # Check whether this job already exists
    existing_job = jobs_collection.document(job_id).get()

    if existing_job.exists:
        print(f"Skipped duplicate job: {job.get('title')}")
        continue

    # Upload only if the document does not already exist
    jobs_collection.document(job_id).set(job)

    print(
        f"Uploaded: {job.get('title')} "
        f"- {job.get('company')}"
    )