const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/db.js"); // Ensure correct import

class WhatsAppCredential extends Model {}

WhatsAppCredential.init(
  {
    projectName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Ensures each project has unique credentials
    },
    phoneNumberId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    accessToken: {
      type: DataTypes.TEXT, // Long text for API tokens
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("Active", "Inactive"),
      defaultValue: "Active",
    },
  },
  {
    sequelize, // Pass the sequelize instance
    modelName: "WhatsAppCredential", // Model name
    tableName: "whatsapp_credentials", // Table name
    timestamps: true, // Enables createdAt & updatedAt
  }
);

module.exports = WhatsAppCredential;
