import { auth, db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
import { useState } from 'react'
import Job from './Job'

export default function ShortList({jobs, cosl, savedJobs, setSavedJobs}) {
  const [saving, setSaving] = useState(false)

  const user = auth.currentUser;


  async function saveJob(job) {
    setSaving(true)
    let i = jobs.indexOf(job)
    let matchScore = cosl[i]
    job.match = matchScore*100

    if (!user) {
      console.log("User is not logged in");
      return;
    }

    await addDoc(
      collection(db, "users", user.uid, "saved"),
      job
    );

    console.log("Job saved!");
    console.log(job)
    setSavedJobs(prev => [...prev, job])
    setSaving(false)
  }



  const indices = cosl
    .map((num, index) => ({ num, index }))
    .sort((a, b) => Math.abs(b.num) - Math.abs(a.num))
    .map((item) => item.index);


  return (
    <>

      {!(indices.length == 0) && (<h3>Your Shortlist</h3>)
      }
      {indices.slice(0, 5).map((jobIndex) => {
        const job = jobs[jobIndex];

      const isSaved = savedJobs.some(
        savedJob =>
          savedJob.title === job.title &&
          savedJob.company === job.company &&
          savedJob.salary === job.salary
      );

        let i = indices.indexOf(jobIndex);

        return (
          <div key={job.id}>

            <Job job={job}/>
            <p>
              Match Score: {(cosl[jobIndex] * 100).toFixed(2)}%
            </p>
<button
  onClick={() => saveJob(job)}
  disabled={isSaved || saving}
>
  {isSaved ? "Saved" : saving ? "Saving Job..." : "Save Job"}
</button>
          </div>
        );
      })}
    </>
  );
}