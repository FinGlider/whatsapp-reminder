// const express = require("express");
// const { getStudentsForClass } = require("../services/reminderService");

// const router = express.Router();

// router.get("/reminders/:classId", async (req, res) => {
//   try {
//     const students = await getStudentsForClass(req.params.classId);
//     res.json({ students });
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ message: "Error fetching students" });
//   }
// });

// module.exports = router;
