import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setResult(data);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not reach the server. If it was idle, wait a minute and try again."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Web Page Summarizer</h1>
      <p className="sub">Paste a link and get a short AI summary.</p>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="url"
          required
          placeholder="https://example.com/article"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Loading..." : "Summarize"}
        </button>
      </form>

      {loading && (
        <p className="status">
          Loading... reading the page and writing the summary. The first request can take up to a minute.
        </p>
      )}
      {error && <div className="error" role="alert">{error}</div>}

      {result && (
        <article className="card">
          {result.title && <h2>{result.title}</h2>}
          <p className="summary">{result.summary}</p>
          {result.truncated && <p className="note">Long page: only the first part was summarized.</p>}
        </article>
      )}
    </main>
  );
}