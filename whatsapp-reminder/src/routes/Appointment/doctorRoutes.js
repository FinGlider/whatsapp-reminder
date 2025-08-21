// // routes/doctorRoutes.js
// const express = require("express");
// const upload = require("../../middleware/upload");
// const {
//   createDoctorWithSchedule,
//   getDoctorWithSchedules,
//   //   updateDoctorAvailability,
//   //   getAllDoctors,
//   //   deleteDoctor,
//   //   updateDoctorStatus,
// } = require("../../controllers/Appointment/doctorController");

// const router = express.Router();

// // POST /doctors/availability - Create a doctor with availability
// router.post(
//   "/createDoctorWithSchedule",
//   upload.single("image"), // Handles single image file upload with the field name 'image'
//   createDoctorWithSchedule
// );
// router.put("/:id/status");

// // PUT /doctors/:id/availability - Update a doctor's availability
// router.put("/:id/availability");
// router.get("/schedules", getDoctorWithSchedules);
// router.delete("/:id");

// module.exports = router;
