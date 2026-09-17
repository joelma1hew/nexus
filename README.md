# Nexus

Here is the link of the webiste : https://nexus-guild.netlify.app/

Setup
git clone https://github.com/joelma1hew/nexus
cd nexus
cd frontend
npm install

Create a firebase.js file inside the frontend directory and export the following variables as well as put your firebase config:

GEMINI_API_KEY=
DEEPGRAM_API_KEY=

Create a .env outside the frontend directory as well and include
GEMINI_API_KEY=

Do not commit the firebase.js file or .env or firebase-service-account.json

Start the application:
npm run dev

Open the local URL provided by Vite in your browser.

Architecture
                  Public Job Sources
                         |
                         v
                    Web Scraper
                         |
                         v
                    Firestore
                         |
                         v
                  React Frontend
                    /    |    \
                   /     |     \
                  v      v      v
            Firebase   Gemini  Deepgram
              Auth       |
                         |
                +--------+--------+
                |                 |
           Embeddings          AI Agent
                |                 |
                v        +--------+--------+
        Semantic Matching |        |       |
                          v        v       v
                       Salary   Living   Net Income
                       Ranking  Expense   Ranking
                                Ranking

The scraper collects job listings from public web sources and stores them in Firestore. The React frontend retrieves the jobs and provides authentication, saved jobs, semantic matching, and the AI agent.

Gemini is used for AI processing, job analysis, and embeddings. The AI agent can rank saved jobs by salary, living expenses, and estimated net income. Deepgram is used to convert the generated job briefing into audio.

Deduplication Strategy

Each job is assigned a unique ID using a SHA-256 hash of its source_url, title, company, and location.

Before uploading a job to Firestore, Nexus checks whether a document with that ID already exists. If it exists, the job is skipped as a duplicate; otherwise, it is uploaded.

This prevents repeated scraper runs from creating duplicate job listings.

This prevents repeated scraper runs from creating duplicate copies of the same job listing.

Unfinished / Limitations
The briefing currently generates audio rather than video.
The scraper currently supports the implemented public job sources and is not a universal job-site scraper.
Salary and living-expense information may require AI estimation when the original job listing does not provide standardized values.
Gemini API usage is subject to API rate limits and quotas.
Embeddings can require additional API requests when generated repeatedly.
The Deepgram API key is currently accessed from the frontend for simplicity. A production version should move this API call to a backend or serverless function so the API key is not exposed to the client.


