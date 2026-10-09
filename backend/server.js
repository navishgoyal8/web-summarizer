import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { scrapeText } from "./scraper.js";
import { summarize } from "./summarizer.js";
import { UserError } from "./urlGuard.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.set("trust proxy", 1);                       // needed behind Render's proxy
app.use(express.json({ limit: "10kb" }));
app.use(cors({ origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(",") }));
app.use("/api/summarize", rateLimit({
  windowMs: 60_000,
  limit: 10,                                     // protects your free AI quota
  message: { error: "Too many requests. Please wait a minute and try again." },
}));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/summarize", async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
  if (!url) return res.status(400).json({ error: "Please provide a URL." });

  try {
    const { title, text, truncated } = await scrapeText(url);
    const summary = await summarize({ title, text });
    if (!summary) throw new UserError("The AI returned an empty summary. Please try again.", 502);
    res.json({ title, summary, truncated });
  } catch (err) {
    if (err instanceof UserError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
});

app.listen(PORT, () => console.log(`API listening on port ${PORT}`));