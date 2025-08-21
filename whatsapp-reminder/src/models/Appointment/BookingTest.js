// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// const BookingTest = sequelize.define("BookingTest", {
//   doctorId: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: {
//       model: "Doctors", // Adjust to match the actual doctors table name
//       key: "id",
//     },
//   },
//   departmentId: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: {
//       model: "Departments", // Adjust to match the actual departments table name
//       key: "id",
//     },
//   },
//   bookingDate: {
//     type: DataTypes.DATEONLY,
//     allowNull: false,
//   },
//   tokenNumber: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//   },
//   patientId: {
//     type: DataTypes.INTEGER,
//     allowNull: true,
//     references: {
//       model: "Patients", // Adjust to match the actual patients table name
//       key: "id",
//     },
//   },
//   status: {
//     type: DataTypes.ENUM("booked", "cancelled", "completed"),
//     defaultValue: "booked",
//   },
// });

// module.exports = BookingTest;
