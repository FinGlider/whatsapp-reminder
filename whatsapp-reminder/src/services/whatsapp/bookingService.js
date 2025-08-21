const { Op } = require("sequelize");
const Booking = require("../../models/Appointment/Booking");
const Patient = require("../../models/Appointment/patient");
const DoctorSchedule = require("../../models/Appointment/doctorSchedule");
const Doctor = require("../../models/Appointment/doctor");
const Department = require("../../models/Appointment/department");
const User = require("../../models/Appointment/user");

async function getBookingsForUser(userWaId) {
  const today = new Date();

  const bookings = await Booking.findAll({
    where: {
      status: "booked",
      bookingDate: {
        [Op.gte]: today,
      },
    },
    include: [
      {
        model: Patient,
        required: true,
        include: [
          {
            model: User,
            where: { waId: userWaId },
            attributes: [],
          },
        ],
      },
      {
        model: DoctorSchedule,
        include: [
          {
            model: Doctor,
            attributes: ["name"],
            include: [
              {
                model: Department,
                attributes: ["name"],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ["bookingDate", "ASC"],
      ["startTime", "ASC"],
    ],
  });

  return bookings;
}

module.exports = { getBookingsForUser };
