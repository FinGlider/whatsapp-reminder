const DoctorSchedule = require("../../models/Appointment/doctorSchedule");
const moment = require("moment");
const Doctor = require("../../models/Appointment/doctor");
const Department = require("../../models/Appointment/department");
const Booking = require("../../models/Appointment/Booking");
const Patient = require("../../models/Appointment/patient");

exports.createDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const {
      startDate,
      endDate,
      startTime,
      endTime,
      recurringPattern,
      bookingType,
      availableTokens,
      slotInterval,
      days, // 👈 NEW
    } = req.body;

    const schedule = await DoctorSchedule.create({
      doctorId,
      startDate,
      endDate: recurringPattern === "none" ? null : endDate,
      startTime,
      endTime,
      recurringPattern,
      bookingType,
      availableTokens: bookingType === "token" ? availableTokens : null,
      slotInterval: bookingType === "interval" ? slotInterval : null,
      days: Array.isArray(days) ? days.join(",") : days, // Ensure it's stored as comma-separated string
    });

    return res.status(201).json(schedule);
  } catch (error) {
    console.error("Error creating schedule:", error);
    return res
      .status(400)
      .json({ error: error.message || "Schedule creation failed" });
  }
};

exports.getExpandedSchedules = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const schedules = await DoctorSchedule.findAll({
      where: { doctorId },
    });

    const expanded = [];

    for (const sch of schedules) {
      const start = moment(sch.startDate);
      const end =
        sch.recurringPattern === "none"
          ? start
          : sch.endDate
          ? moment(sch.endDate)
          : moment(start).add(30, "days");

      const rawDays = sch.days || [];
      const selectedDaysArray = Array.isArray(rawDays)
        ? rawDays
        : typeof rawDays === "string"
        ? rawDays.split(",")
        : [];

      const selectedDaySet = new Set(
        selectedDaysArray.map((d) => d.trim().toLowerCase())
      );

      const current = start.clone();

      while (current.isSameOrBefore(end)) {
        const dayShort = current.format("ddd").toLowerCase();

        const isMatch =
          (sch.recurringPattern === "none" && current.isSame(start, "day")) ||
          sch.recurringPattern === "daily" ||
          (sch.recurringPattern !== "none" && selectedDaySet.has(dayShort));

        if (!isMatch) {
          current.add(1, "day");
          continue;
        }

        // 🟢 INTERVAL-BASED: Just show the time range
        if (
          sch.bookingType === "interval" &&
          sch.startTime &&
          sch.endTime &&
          sch.slotInterval
        ) {
          expanded.push({
            date: current.format("YYYY-MM-DD"),
            startTime: sch.startTime,
            endTime: sch.endTime,
            bookingType: sch.bookingType,
            slotInterval: sch.slotInterval,
          });
        }

        // 🟢 TOKEN-BASED
        else if (
          sch.bookingType === "token" &&
          sch.startTime &&
          sch.endTime &&
          sch.availableTokens
        ) {
          expanded.push({
            date: current.format("YYYY-MM-DD"),
            startTime: sch.startTime,
            endTime: sch.endTime,
            bookingType: sch.bookingType,
            availableTokens: sch.availableTokens,
          });
        }

        current.add(1, "day");
      }
    }

    res.json(expanded);
  } catch (error) {
    console.error("Failed to expand schedule:", error);
    res.status(500).json({ error: "Schedule expansion failed." });
  }
};

exports.getSlotsForDate = async (req, res) => {
  const { doctorId, date } = req.params;
  try {
    const targetDate = moment(date, "YYYY-MM-DD");
    const dayShort = targetDate.format("ddd").toLowerCase();

    const schedules = await DoctorSchedule.findAll({
      where: { doctorId },
      include: [
        {
          model: Doctor,
          attributes: ["name"],
          include: [{ model: Department, attributes: ["name"] }],
        },
      ],
    });

    const allBookings = await Booking.findAll({
      where: {
        doctorScheduleId: schedules.map((s) => s.id),
        bookingDate: date,
      },
      include: [
        {
          model: Patient,
          attributes: ["id", "name", "phoneNumber", "age"],
        },
      ],
    });

    const bookingsMap = new Map();
    for (const b of allBookings) {
      if (!bookingsMap.has(b.doctorScheduleId)) {
        bookingsMap.set(b.doctorScheduleId, []);
      }
      bookingsMap.get(b.doctorScheduleId).push(b);
    }

    const slots = [];

    for (const sch of schedules) {
      const scheduleStart = moment(sch.startDate);
      const scheduleEnd =
        sch.recurringPattern === "none"
          ? scheduleStart
          : sch.endDate
          ? moment(sch.endDate)
          : moment(scheduleStart).add(30, "days");

      const rawDays = sch.days || [];
      const selectedDaysArray = Array.isArray(rawDays)
        ? rawDays
        : typeof rawDays === "string"
        ? rawDays.split(",")
        : [];

      const selectedDaySet = new Set(
        selectedDaysArray.map((d) => d.trim().toLowerCase())
      );

      const isValidForDate =
        (sch.recurringPattern === "none" &&
          targetDate.isSame(scheduleStart, "day")) ||
        (sch.recurringPattern === "daily" &&
          targetDate.isSameOrAfter(scheduleStart, "day") &&
          targetDate.isSameOrBefore(scheduleEnd, "day")) ||
        (selectedDaySet.has(dayShort) &&
          targetDate.isSameOrAfter(scheduleStart, "day") &&
          targetDate.isSameOrBefore(scheduleEnd, "day"));

      if (!isValidForDate) continue;

      const startTime = moment(`${date} ${sch.startTime}`, "YYYY-MM-DD HH:mm");
      const endTime = moment(`${date} ${sch.endTime}`, "YYYY-MM-DD HH:mm");

      if (
        !startTime.isValid() ||
        !endTime.isValid() ||
        endTime.isSameOrBefore(startTime)
      ) {
        continue;
      }

      const doctorName = sch.Doctor?.name || "";
      const departmentName = sch.Doctor?.Department?.name || "";
      const scheduleBookings = bookingsMap.get(sch.id) || [];

      if (sch.bookingType === "interval" && sch.slotInterval) {
        let current = startTime.clone();
        while (current.isBefore(endTime)) {
          const slotEnd = current.clone().add(sch.slotInterval, "minutes");
          if (slotEnd.isAfter(endTime)) break;

          const matchedBooking = scheduleBookings.find((b) => {
            const bStart = moment(`${date} ${b.startTime}`, "YYYY-MM-DD HH:mm");
            const bEnd = moment(`${date} ${b.endTime}`, "YYYY-MM-DD HH:mm");
            return bStart.isSame(current) && bEnd.isSame(slotEnd);
          });

          const isBooked = Boolean(matchedBooking);

          slots.push({
            doctorScheduleId: sch.id,
            startTime: current.format("HH:mm"),
            endTime: slotEnd.format("HH:mm"),
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
        sch.bookingType === "token" &&
        sch.availableTokens &&
        sch.availableTokens > 0
      ) {
        const totalMinutes = endTime.diff(startTime, "minutes");
        const totalTokens = sch.availableTokens;

        if (totalMinutes >= totalTokens) {
          const tokenDuration = totalMinutes / totalTokens;
          let current = startTime.clone();

          for (let i = 1; i <= totalTokens; i++) {
            const matchedBooking = scheduleBookings.find(
              (b) => b.tokenNumber === i
            );
            const isBooked = Boolean(matchedBooking);
            const slotEnd = current.clone().add(tokenDuration, "minutes");

            slots.push({
              doctorScheduleId: sch.id,
              startTime: current.format("HH:mm"),
              endTime: slotEnd.format("HH:mm"),
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
    }

    return res.json(slots);
  } catch (err) {
    console.error("Failed to generate slots:", err);
    res.status(500).json({ error: "Failed to generate slots" });
  }
};
