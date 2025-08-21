const { Patient } = require("../models"); // Import the Patient model

async function savePatientDetails(patientDetails, userId) {
  try {
    if (!patientDetails || !userId) {
      console.error("❌ Patient details or userId is missing.");
      return null;
    }

    const newPatient = await Patient.create({
      name: patientDetails.name,
      age: parseInt(patientDetails.age),
      gender: patientDetails.gender,
      phoneNumber: patientDetails.phone, // Assuming 'phone' in form data
      userId: userId, // ✅ Link patient to user
    });

    console.log("✅ Patient saved:", newPatient.toJSON());
    return newPatient;
  } catch (error) {
    console.error("❌ Error saving patient details:", error);
    return null;
  }
}

module.exports = { savePatientDetails };
