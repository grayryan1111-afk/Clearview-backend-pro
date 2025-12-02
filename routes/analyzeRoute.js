import express from "express";
const router = express.Router();

router.post("/", (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  const addr = address.toLowerCase();

  // SIMPLE fake AI that always returns stable values
  let houseType = "Detached House";
  let windows = 26;

  if (addr.includes("apt") || addr.includes("unit") || addr.includes("#")) {
    houseType = "Apartment";
    windows = 10;
  } else if (addr.includes("town") || addr.includes("complex")) {
    houseType = "Townhouse";
    windows = 18;
  }

  res.json({
    houseType,
    windowCount: windows,
  });
});

export default router;
