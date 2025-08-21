const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const DoctorSchedule = require("./doctorSchedule");
const Patient = require("./patient");

const Booking = sequelize.define("Booking", {
  doctorScheduleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: DoctorSchedule,
      key: "id",
    },
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Patient,
      key: "id",
    },
  },
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  startTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  endTime: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("booked", "cancelled", "completed", "reserved"),
    defaultValue: "booked",
  },
  tokenNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

// Associations
Booking.belongsTo(DoctorSchedule, { foreignKey: "doctorScheduleId" });
DoctorSchedule.hasMany(Booking, { foreignKey: "doctorScheduleId" });

Booking.belongsTo(Patient, { foreignKey: "patientId" });
Patient.hasMany(Booking, { foreignKey: "patientId" });

module.exports = Booking;
