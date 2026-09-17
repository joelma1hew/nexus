import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import Agent from "./Agent";

import { auth, db, GEMINI_API_KEY } from "./firebase";
import ResumeUpload from "./ResumeUpload";

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [embeddings, setEmbeddings] = useState([]);
  const [loadingEmbeddings, setLoadingEmbeddings] = useState(false);

  const user = auth.currentUser;



    useEffect(() => {
    async function fetchSavedJobs() {
      try {
        const jobsCollection = collection(db, "users" , user.uid, "saved");
        const jobsSnapshot = await getDocs(jobsCollection);

        const jobsData = jobsSnapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setSavedJobs(jobsData);

      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    }

    fetchSavedJobs();
  }, []);


  // Fetch jobs from Firestore
  useEffect(() => {
    async function fetchJobs() {
      try {
        const jobsCollection = collection(db, "jobs");
        const jobsSnapshot = await getDocs(jobsCollection);

        const jobsData = jobsSnapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));

        setJobs(jobsData);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    }

    fetchJobs();
  }, []);


  // Generate embeddings whenever jobs are loaded
  useEffect(() => {
    async function generateJobEmbeddings() {
      if (jobs.length === 0) {
        setEmbeddings([]);
        return;
      }

      try {
        setLoadingEmbeddings(true);

        const ai = new GoogleGenAI({
          apiKey: GEMINI_API_KEY,
        });

        const embeddingResults = await Promise.all(
          jobs.map(async (job) => {
            const response = await ai.models.embedContent({
              model: "gemini-embedding-2",
              contents: job.title,
            });

            return {
              jobId: job.id,
              values: response.embeddings[0].values,
            };
          })
        );

        setEmbeddings(embeddingResults);
      } catch (error) {
        console.error("Failed to generate job embeddings:", error);
      } finally {
        setLoadingEmbeddings(false);
      }
    }

    generateJobEmbeddings();
  }, [jobs]);


  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function getJobEmbedding(jobId) {
    return embeddings.find((embedding) => embedding.jobId === jobId);
  }



  return (
    <div>
      <h1>NEXUS</h1>

      <button onClick={handleLogout}>Logout</button>
        <Agent savedJobs={savedJobs}/>
      <ResumeUpload getJobEmbedding={getJobEmbedding}embeddings={embeddings} jobs={jobs} savedJobs={savedJobs}/>



      {loadingJobs && <p>Loading jobs...</p>}
      {loadingEmbeddings && <p>Loading embeddings...</p>}

      {!loadingJobs && jobs.length === 0 && (
        <p>No jobs found.</p>
    )} 
     {!loadingEmbeddings && embeddings.length === 0 && (
        <p>Embeddings not created. Please try again later.</p>
     )

     }
    </div>
  );
}

export default Dashboard;