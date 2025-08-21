// const { DataTypes } = require("sequelize");
// const sequelize = require("../config/db");
// const Student = require("./student");

// const Enrollment = sequelize.define("Enrollment", {
//   id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
//   studentId: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     references: { model: Student, key: "id" },
//   },
//   classId: { type: DataTypes.INTEGER, allowNull: false },
//   className: { type: DataTypes.STRING, allowNull: false },
//   classStartTime: { type: DataTypes.DATE, allowNull: false },
// });

// Student.hasMany(Enrollment, { foreignKey: "studentId" });
// Enrollment.belongsTo(Student, { foreignKey: "studentId" });

// module.exports = Enrollment;
