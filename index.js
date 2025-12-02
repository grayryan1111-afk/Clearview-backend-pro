import express from "express";
import cors from "cors";
import analyzeRoute from "./routes/analyzeRoute.js";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("ClearView Backend is running");
});

// AI ROUTE
app.use("/api/analyze-house", analyzeRoute);

// START SERVER
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
