const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const Doctor = require("./doctor");

const DoctorSchedule = sequelize.define(
  "DoctorSchedule",
  {
    doctorId: {
      type: DataTypes.INTEGER,
      references: {
        model: Doctor,
        key: "id",
      },
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true, // Required for recurring
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    recurringPattern: {
      type: DataTypes.ENUM("none", "daily", "weekly", "monthly"),
      allowNull: false,
    },

    bookingType: {
      type: DataTypes.ENUM("token", "interval"),
      allowNull: false,
    },
    availableTokens: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        hasTokens(value) {
          if (this.bookingType === "token" && (!value || value <= 0)) {
            throw new Error(
              "availableTokens must be > 0 when bookingType is 'token'"
            );
          }
        },
      },
    },
    slotInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        hasInterval(value) {
          if (this.bookingType === "interval" && (!value || value <= 0)) {
            throw new Error(
              "slotInterval must be > 0 when bookingType is 'interval'"
            );
          }
        },
      },
    },
    days: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("days");
        return rawValue ? rawValue.split(",") : [];
      },
      set(value) {
        this.setDataValue(
          "days",
          Array.isArray(value) ? value.join(",") : value
        );
      },
      validate: {
        isValidDays(value) {
          if (value) {
            const allowedDays = [
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
              "Sun",
            ];
            const selectedDays = Array.isArray(value)
              ? value
              : value.split(",");
            selectedDays.forEach((day) => {
              if (!allowedDays.includes(day.trim())) {
                throw new Error(`Invalid day: ${day}`);
              }
            });
          }
        },
      },
    },
  },
  {
    validate: {
      validateBookingType() {
        if (
          this.bookingType === "token" &&
          (!this.availableTokens || this.availableTokens <= 0)
        ) {
          throw new Error(
            "availableTokens must be set and > 0 for token bookingType."
          );
        }
        if (
          this.bookingType === "interval" &&
          (!this.slotInterval || this.slotInterval <= 0)
        ) {
          throw new Error(
            "slotInterval must be set and > 0 for interval bookingType."
          );
        }
      },
    },
    timestamps: true,
  }
);

module.exports = DoctorSchedule;
