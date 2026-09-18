import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from "./firebase";
import ShortList from "./ShortList";
import Job from "./Job"
import {DEEPGRAM_API_KEY} from "./firebase"




pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function ResumeUpload({ jobs, savedJobs , setSavedJobs}) {
  const [audioUrl, setAudioUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false)
  const userInputRef = useRef()
  const [cosl, setCosl] = useState([]);
  const [showSaved, setShowSaved] = useState(false)
  const [showAll, setShowAll] = useState(false)  
  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY}); 
  const [hide , setHide] = useState(false)

  function cosineSimilarity(a, b) {
    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magnitudeA += a[i] ** 2;
        magnitudeB += b[i] ** 2;
    }

    return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}


  function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }

    setPdfFile(file);
  }

  async function search(text) {
    setHide(false)
    try {
        const response = await ai.models.embedContent({
            model: "gemini-embedding-2",
            contents: text,
            config: {
                outputDimensionality: 3072,
            },
    });

        setCosl([])

     let newCosl = [];

    for(let i = 0; i < jobs.length; i++) {
        let score = cosineSimilarity(
            jobs[i].embedding,
            response.embeddings[0].values
        );

    newCosl.push(score);

    console.log("Cosine similarity for job", i, ":", score);
}

    setCosl(newCosl);
    

    const indices = newCosl
    .map((num, index) => ({ num, index }))
    .sort((a, b) => b.num - a.num)
    .map((item) => item.index);

    let jobTitles = indices
        .slice(0, 5)
        .map(index => jobs[index].title);

    console.log(jobTitles);

    }
    catch(error) {
        console.log(error)
    } finally {
        setLoading(false)
    }

  }

  async function extractText() {
    if (!pdfFile) {
      alert("Please select a PDF first.");
      return;
    }

    setLoading(true);

    try {
      // Read the selected PDF file in the browser
      const arrayBuffer = await pdfFile.arrayBuffer();
      // Load the PDF
      const pdf = await pdfjsLib.getDocument({
        data: arrayBuffer
      }).promise;

      let extractedText = "";

      // Extract text from every page
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item) => item.str)
          .join(" ");

        extractedText += pageText + "\n";
      }

      search(extractedText)
    } catch (error) {
      console.error("PDF extraction error:", error);
      alert("Could not extract text from this PDF.");
    } 


  }

  async function semanticSearch() {
    const input = userInputRef.current.value
    if(!input) {
        alert("please enter some input")
        return 
    }
    setLoading(true)
    await search(input)
    userInputRef.current.value = null
  }

  function handleHideShortList() {
    setHide(!hide)
  }

  function handleSaved() {
    setShowSaved(!showSaved)
  }

  function handleAll() {
    setShowAll(!showAll)
  }

  async function generateAudio(text) {
  const response = await fetch(
    "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en",
    {
      method: "POST",
      headers: {
        "Authorization": `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text
      })
    }
  );

  if (!response.ok) {
    throw new Error("Failed to generate audio");
  }

  const audioBlob = await response.blob();

  const audioUrl = URL.createObjectURL(audioBlob);

  return audioUrl;
}

async function handleGenerateAudio() {
  setGenerating(true)
  let sortedJobs =(savedJobs.sort((a,b) => b.match - a.match)).slice(0,3)

  const interaction = await ai.interactions.create({
    model: "gemini-3.6-flash",
    input: `I need you to make me a minute long script about my top 3 job opportunities. Im going to write the list as Job Number , title, company , salary and location. Job 1 : ${sortedJobs[0].title}, ${sortedJobs[0].company},${sortedJobs[0].salary}and ${sortedJobs[0].location}. Job 1 : ${sortedJobs[1].title}, ${sortedJobs[1].company},${sortedJobs[1].salary}and ${sortedJobs[1].location}. Job 3 : ${sortedJobs[2].title}, ${sortedJobs[2].company},${sortedJobs[2].salary}and ${sortedJobs[2].location}.Important instruction: return just the script and nothing else. I am playing this on my frontend code so dont use any special characters or digits in the script it should all be words.`, 
  });  
  const url = await generateAudio(interaction.output_text);

  setAudioUrl(url);
  setGenerating(false)
}

  return (
    <div>
      <input ref={userInputRef} type="text"></input>
      <button onClick={semanticSearch} disabled={loading}>
        Semantic Search
      </button>
      <button onClick={extractText} disabled={loading}>
        Find Jobs
      </button>

      <button onClick={() => handleSaved()}>
        {showSaved ? "Hide Saved Jobs" : "Show Saved Jobs"}
      </button>
      <button onClick = {() => handleAll()}>
        {showAll ? "Hide All Jobs": "Show All Jobs"}
      </button>
      <button onClick = {() => handleHideShortList()}>
        {hide ? "Show ShortList" : "Hide ShortList"}
</button>
{
  savedJobs.length > 2 ? (
            <button onClick={handleGenerateAudio}>
              {generating? "Calculating your best choices.." : "Listen to your top matches"}
      </button>
 
) : <></> 

}

      {audioUrl && (
  <audio controls src={audioUrl} />
  )}


            <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        name="Upload Resume"
      />


      {pdfFile && (
        <p>
          Selected file: {pdfFile.name}
        </p>
      )}
      {
        loading ? "Loading optimal shortlist" : !hide && (
        <div> 
            <ShortList jobs ={jobs} cosl={cosl} savedJobs={savedJobs} setSavedJobs={setSavedJobs}  />
        </div>
        )
      }

      {showSaved && (
        <div>
            
            {
              savedJobs.map(job => {
                return (
                  <div>
                    <Job key={job.id} job={job}/>
                    <p>Match: {(job.match).toFixed(2)} %</p>
                  </div>
                )
              })
            }
        </div>

      )
      }
        
      
      {
        (<h2>All Jobs</h2>) &&
      showAll &&
        jobs.map((job) => {
          return (
            <div>
                <Job key={job.id} job={job}/>
            </div>
          );
        })}

      

      
    </div>
  );
}

export default ResumeUpload;
