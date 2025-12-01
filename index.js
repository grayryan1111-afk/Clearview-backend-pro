import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "clearview-secret";
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_VISION_KEY = process.env.GOOGLE_VISION_API_KEY;
const CLEARVIEW_TECH_PIN = process.env.CLEARVIEW_TECH_PIN || "6969";

const quotes = []; // in-memory for now

app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "*"
  })
);

// --- helper: auth middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// --- Auth: technician login using PIN ---
app.post("/api/auth/login", (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: "PIN required" });
  if (String(pin) !== String(CLEARVIEW_TECH_PIN)) {
    return res.status(401).json({ message: "Wrong PIN" });
  }
  const token = jwt.sign({ techId: "tech-1" }, JWT_SECRET, {
    expiresIn: "12h"
  });
  res.json({ token });
});

// --- AI House / window detection ---
app.post("/api/maps/house-insights", auth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ message: "Address required" });
    }

    // 1. Geocode address
    const geoRes = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: { address, key: GOOGLE_MAPS_KEY }
      }
    );

    if (!geoRes.data.results?.length) {
      return res.status(404).json({ message: "Address not found" });
    }

    const place = geoRes.data.results[0];
    const { lat, lng } = place.geometry.location;

    // 2. Street View image (for displaying + AI)
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&fov=80&pitch=10&key=${GOOGLE_MAPS_KEY}`;

    // 3. Fetch image bytes for Vision API
    const imgRes = await axios.get(streetViewUrl, {
      responseType: "arraybuffer"
    });
    const imageBase64 = Buffer.from(imgRes.data, "binary").toString("base64");

    // 4. Call Vision API to detect windows (OBJECT_LOCALIZATION)
    const visionRes = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
      {
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "OBJECT_LOCALIZATION", maxResults: 200 }]
          }
        ]
      }
    );

    const annotations =
      visionRes.data.responses?.[0]?.localizedObjectAnnotations || [];

    const windowObjects = annotations.filter((o) =>
      o.name.toLowerCase().includes("window")
    );

    const windowCount = windowObjects.length;

    // 5. Rough house-type guess based on window count
    let houseType = "Unknown";
    if (windowCount <= 8) houseType = "Small house / townhouse";
    else if (windowCount <= 20) houseType = "Medium detached house";
    else if (windowCount <= 40) houseType = "Large house / duplex";
    else houseType = "Multi-unit / apartment";

    // 6. Suggest base pricing (you can tune these)
    const baseRatePerWindow = 7; // CAD
    const suggestedWindowPrice = windowCount * baseRatePerWindow;

    res.json({
      address: place.formatted_address,
      lat,
      lng,
      streetViewUrl,
      windowCount,
      houseType,
      suggested: {
        perWindow: baseRatePerWindow,
        totalWindowsAmount: suggestedWindowPrice
      }
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(
