const Doctor = require("./doctor");
const DoctorSchedule = require("./doctorSchedule");
const Booking = require("./Booking");
const Patient = require("./patient");
const User = require("./user");

const setupAssociations = () => {
  // Doctor and DoctorSchedule
  Doctor.hasMany(DoctorSchedule, {
    foreignKey: "doctorId",
    as: "doctorSchedules",
  });
  DoctorSchedule.belongsTo(Doctor, { foreignKey: "doctorId" });

  // DoctorSchedule and Booking
  DoctorSchedule.hasMany(Booking, {
    foreignKey: "doctorScheduleId",
    as: "bookedSlots",
  });
  Booking.belongsTo(DoctorSchedule, { foreignKey: "doctorScheduleId" });

  // Patient and Booking
  Patient.hasMany(Booking, { foreignKey: "patientId", as: "bookings" });
  Booking.belongsTo(Patient, { foreignKey: "patientId" });

  // User and Patient
  User.hasMany(Patient, {
    foreignKey: "userId",
    as: "patients",
  });
  Patient.belongsTo(User, { foreignKey: "userId" });
};

module.exports = setupAssociations;
