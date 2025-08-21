const Department = require("../../models/Appointment/department");

// Controller to post a department
const postDepartment = async (req, res) => {
  const { name, description } = req.body;

  // Validate input
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }

  try {
    const department = await Department.create({ name, description });
    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (err) {
    console.error("Error creating department:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Controller to get all departments
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      attributes: ["id", "name"], // Fetch only necessary fields
    });

    // Transform data to match WhatsApp Flow's "data-source" format
    const formattedDepartments = departments.map((dept) => ({
      id: `${dept.id}_${dept.name}`, // WhatsApp expects an ID
      title: dept.name, // Display name in the UI
    }));

    res.status(200).json({
      success: true,
      message: "Departments fetched successfully",
      departments: formattedDepartments, // Send formatted response
    });
  } catch (err) {
    console.error("Error fetching departments:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Controller to delete a department by ID
const deleteDepartment = async (req, res) => {
  const { id } = req.params; // Get department ID from URL parameter

  try {
    // Use Sequelize directly to delete the department by ID
    const result = await Department.destroy({
      where: { id },
    });

    // If result is 1, deletion was successful
    if (result) {
      res.status(200).json({
        success: true,
        message: "Department deleted successfully.",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }
  } catch (error) {
    console.error("Error deleting department:", error.message); // Log the error for better debugging
    res.status(500).json({
      success: false,
      message: "Error deleting department.",
      error: error.message,
    });
  }
};
const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }

  // Check if department name already exists (if updating to an existing name)
  const existingDepartment = await Department.findOne({ where: { name } });
  if (existingDepartment && existingDepartment.id !== id) {
    return res.status(400).json({
      success: false,
      message: "Department with this name already exists.",
    });
  }

  try {
    const department = await Department.findByPk(id);
    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    // Update department fields
    department.name = name;
    department.description = description;
    await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department,
    });
  } catch (err) {
    console.error("Error updating department:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  postDepartment,
  getDepartments,
  deleteDepartment,
  updateDepartment,
};
