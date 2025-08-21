const moment = require("moment");
const DoctorSchedule = require("../models/Appointment/doctorSchedule");
const Booking = require("../models/Appointment/Booking");
const Doctor = require("../models/Appointment/doctor");
const Department = require("../models/Appointment/department");
const Patient = require("../models/Appointment/patient");

const generateSlots = async (doctorScheduleId, date) => {
  const targetDate = moment(date, "YYYY-MM-DD");
  const dayShort = targetDate.format("ddd").toLowerCase();

  const schedule = await DoctorSchedule.findByPk(doctorScheduleId, {
    include: [
      {
        model: Doctor,
        attributes: ["name"],
        include: [{ model: Department, attributes: ["name"] }],
      },
    ],
  });

  if (!schedule) throw new Error("Schedule not found");

  const scheduleStart = moment(schedule.startDate);
  const scheduleEnd =
    schedule.recurringPattern === "none"
      ? scheduleStart
      : schedule.endDate
      ? moment(schedule.endDate)
      : moment(scheduleStart).add(30, "days");

  const rawDays = schedule.days || [];
  const selectedDaysArray = Array.isArray(rawDays)
    ? rawDays
    : typeof rawDays === "string"
    ? rawDays.split(",")
    : [];

  const selectedDaySet = new Set(
    selectedDaysArray.map((d) => d.trim().toLowerCase())
  );

  const isValidForDate =
    (schedule.recurringPattern === "none" &&
      targetDate.isSame(scheduleStart, "day")) ||
    (schedule.recurringPattern === "daily" &&
      targetDate.isSameOrAfter(scheduleStart, "day") &&
      targetDate.isSameOrBefore(scheduleEnd, "day")) ||
    (selectedDaySet.has(dayShort) &&
      targetDate.isSameOrAfter(scheduleStart, "day") &&
      targetDate.isSameOrBefore(scheduleEnd, "day"));

  if (!isValidForDate) return [];

  const startTime = moment(`${date} ${schedule.startTime}`, "YYYY-MM-DD HH:mm");
  const endTime = moment(`${date} ${schedule.endTime}`, "YYYY-MM-DD HH:mm");

  if (
    !startTime.isValid() ||
    !endTime.isValid() ||
    endTime.isSameOrBefore(startTime)
  ) {
    return [];
  }

  const doctorName = schedule.Doctor?.name || "";
  const departmentName = schedule.Doctor?.Department?.name || "";

  const bookings = await Booking.findAll({
    where: {
      doctorScheduleId: schedule.id,
      bookingDate: date,
      status: "booked",
    },
    include: [
      {
        model: Patient,
        attributes: ["id", "name", "phoneNumber", "age"],
      },
    ],
  });

  const slots = [];

  if (schedule.bookingType === "interval" && schedule.slotInterval) {
    let current = startTime.clone();
    while (current.isBefore(endTime)) {
      const slotEnd = current.clone().add(schedule.slotInterval, "minutes");
      if (slotEnd.isAfter(endTime)) break;

      const matchedBooking = bookings.find((b) => {
        const bStart = moment(`${date} ${b.startTime}`, "YYYY-MM-DD HH:mm");
        const bEnd = moment(`${date} ${b.endTime}`, "YYYY-MM-DD HH:mm");
        return bStart.isSame(current) && bEnd.isSame(slotEnd);
      });

      const isBooked = Boolean(matchedBooking);

      slots.push({
        doctorScheduleId: schedule.id,
        startTime: current.format("hh:mm A"), // AM/PM format
        endTime: slotEnd.format("hh:mm A"), // AM/PM format
        type: "interval",
        doctorName,
        departmentName,
        booked: isBooked,
        patient: isBooked
          ? {
              id: matchedBooking.Patient?.id,
              name: matchedBooking.Patient?.name,
              phoneNumber: matchedBooking.Patient?.phoneNumber,
              age: matchedBooking.Patient?.age,
            }
          : null,
      });

      current = slotEnd;
    }
  } else if (
    schedule.bookingType === "token" &&
    schedule.availableTokens &&
    schedule.availableTokens > 0
  ) {
    const totalMinutes = endTime.diff(startTime, "minutes");
    const totalTokens = schedule.availableTokens;

    if (totalMinutes >= totalTokens) {
      const tokenDuration = totalMinutes / totalTokens;
      let current = startTime.clone();

      for (let i = 1; i <= totalTokens; i++) {
        const matchedBooking = bookings.find((b) => b.tokenNumber === i);
        const isBooked = Boolean(matchedBooking);
        const slotEnd = current.clone().add(tokenDuration, "minutes");

        slots.push({
          doctorScheduleId: schedule.id,
          startTime: current.format("hh:mm A"), // AM/PM format
          endTime: slotEnd.format("hh:mm A"), // AM/PM format
          tokenNumber: i,
          type: "token",
          doctorName,
          departmentName,
          booked: isBooked,
          patient: isBooked
            ? {
                id: matchedBooking.Patient?.id,
                name: matchedBooking.Patient?.name,
                phoneNumber: matchedBooking.Patient?.phoneNumber,
                age: matchedBooking.Patient?.age,
              }
            : null,
        });

        current = slotEnd;
      }
    }
  }

  return slots;
};

module.exports = { generateSlots };
