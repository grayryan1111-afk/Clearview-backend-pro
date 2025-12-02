import express from "express";
const router = express.Router();

// TEMP AI logic (works without Vision)
// Returns a rough window + house type estimate
router.post("/", async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: "Missing address" });
    }

    // VERY simple fake AI to make frontend work
    let data = {
      houseType: "Detached House",
      windowCount: 26,
    };

    const a = address.toLowerCase();

    if (a.includes("apt") || a.includes("#") || a.includes("unit")) {
      data.houseType = "Apartment";
      data.windowCount = 10;
    }

    if (a.includes("town") || a.includes("complex")) {
      data.houseType = "Townhouse";
      data.windowCount = 18;
    }

    return res.json(data);

  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

export default router;
