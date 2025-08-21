const express = require("express");
const {
  postDepartment,
  getDepartments,
  deleteDepartment,
  updateDepartment,
} = require("../../controllers/Appointment/departmentController");

const router = express.Router();

router.post("/addDepartment", postDepartment);
router.get("/", getDepartments);
router.delete("/:id", deleteDepartment);
router.put("/:id", updateDepartment);

module.exports = router;
