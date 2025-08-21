const { Sequelize, DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OTP = require("./otp")(sequelize, DataTypes);
const WhatsAppCredential = require("./WhatsAppCredential");
const Patient = require("./Appointment/patient");
const User = require("./Appointment/user");

const db = { sequelize, OTP, WhatsAppCredential, Patient, User };

module.exports = db;
