const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../../config/db");

const Department = sequelize.define("Department", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Department;
