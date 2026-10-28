import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Click to check the backend.");

  async function checkBackend() {
    setMessage("Connecting...");

    try {
      const response = await fetch("/api/health");
      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();
      setMessage(data.status === "ok" ? "Backend is running!" : "Unexpected response");
    } catch (error) {
      console.error(error);
      setMessage("Could not connect. Check that the backend is running.");
    }
  }

  return (
    <main>
      <h1>MERN Exam Project</h1>
      <p>{message}</p>
      <button onClick={checkBackend}>Check backend</button>
    </main>
  );
}

export default App;