import { useState, useRef} from "react";
import { GoogleGenAI } from "@google/genai";

import { GEMINI_API_KEY } from "./firebase";
import Job from "./Job"


import {
  getDescendingSalaries,
  getAscendingLivingExpenses,
  getHighestNetIncome
} from "./tools";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY
});

function Agent({savedJobs}) {
  const agentInputRef = useRef()
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState("");
  const [resultJobs, setResultJobs] = useState([])
async function askAgent() {
  try {
    setLoading(true)
  const input = agentInputRef.current.value
  agentInputRef.current.value = null
  const interaction = await ai.interactions.create({
    model: "gemini-3.6-flash",

    input: input,

    tools: [
      {
        type: "function",
        name: "getDescendingSalaries",
        description: "Order the user's saved jobs from highest salary to lowest salary.",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        type: "function",
        name: "getAscendingLivingExpenses",
        description: "Order the user's saved jobs from lowest living expense to highest living expense.",
        parameters: {
          type: "object",
          properties: {}
        }
      },
      {
        type: "function",
        name: "getHighestNetIncome",
        description: "Order the user's saved jobs from highest net income to lowest net income.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    ]
  });

  const functionCall = interaction.steps.find(
    step => step.type === "function_call"
  );

  console.log("Function Gemini wants:", functionCall.name);

  let result;

  if (functionCall.name === "getDescendingSalaries") {
    result = await getDescendingSalaries();
  }

  if (functionCall.name === "getAscendingLivingExpenses") {
    result = await getAscendingLivingExpenses();
  }

  if (functionCall.name === "getHighestNetIncome") {
    result = await getHighestNetIncome();
  }

  console.log("Tool result:", result);
  setResultJobs(result)

 const finalInteraction = await ai.interactions.create({
  model: "gemini-3.6-flash",

  previous_interaction_id: interaction.id,

  input: `
Give me ONLY one short introductory sentence explaining what the results represent.
Do not mention individual jobs, numbers, indexes, salaries, or any other details.
Do not use a numbered list.

Here are the tool results:
${JSON.stringify(result)}
`
});

console.log("Final answer:", finalInteraction.output_text);

setResponse(finalInteraction.output_text);}
catch(e) {
  alert("Rate limit reached. Please try again later.")
}finally {
  setLoading(false)
}
}

return (
    <div>

      <h2>Nexus Agent</h2>

      <input
        ref= {agentInputRef}
        placeholder="Ask about your saved jobs..."
      />

      <button onClick={askAgent}>
        Ask
      </button>

      <button onClick={() => {
        setResultJobs([])
        setResponse("")

      }}>Clear</button>


        <p>{loading ? "Loading your query" : response}</p>

        { !loading &&
          resultJobs.map(resultJob => {
            let job = savedJobs[resultJob.index]
            return (
              <Job job = {job}/>
            )

          })
        }
    </div>
  );
}

export default Agent;