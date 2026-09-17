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
        const jobsCollection = collection(db, "test");
        const jobsSnapshot = await getDocs(jobsCollection);

        const jobsData = jobsSnapshot.docs.map((document) => ({
          docid: document.id,
          ...document.data(),
        }));
        console.log(jobsData)
        setJobs(jobsData);
      } catch (error) {
        console.error("Failed to fetch jobs:", error);
      } finally {
        setLoadingJobs(false);
      }
    }

    fetchJobs();

  }, []);



  async function handleLogout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }




  return (
    <div>
      <h1>NEXUS</h1>

      <button onClick={handleLogout}>Logout</button>
        <Agent savedJobs={savedJobs}/>
      <ResumeUpload jobs={jobs} savedJobs={savedJobs} setSavedJobs={setSavedJobs}/>



      {loadingJobs && <p>Loading jobs...</p>}

      {!loadingJobs && jobs.length === 0 && (
        <p>No jobs found.</p>
    )} 
    </div>
  );
}

export default Dashboard;