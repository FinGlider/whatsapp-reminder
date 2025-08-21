// // models/BlockedDate.js
// const { DataTypes } = require("sequelize");
// const sequelize = require("../../config/db");

// const BlockedDate = sequelize.define("BlockedDate", {
//   blockedDate: {
//     type: DataTypes.DATE,
//     allowNull: false,
//   },
//   reason: {
//     type: DataTypes.STRING,
//     allowNull: true,
//   },
//   scheduleId: {
//     type: DataTypes.INTEGER, // This ensures we have a valid scheduleId
//     allowNull: false,
//     references: {
//       model: "DoctorSchedules", // Make sure this is pointing to the correct table
//       key: "id",
//     },
//   },
// });

// module.exports = BlockedDate;
