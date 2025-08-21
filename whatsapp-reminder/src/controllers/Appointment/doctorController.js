// const Doctor = require("../../models/Appointment/doctor");
// const DoctorSchedule = require("../../models/Appointment/doctorSchedule");
// const Department = require("../../models/Appointment/department");
// const Booking = require("../../models/Appointment/Booking");
// const sequelize = require("../../config/db");
// const BlockedDate = require("../../models/Appointment/BlockedDate");
// const path = require("path");

// // Assuming you have a BlockedDate model
// const createDoctorWithSchedule = async (req, res) => {
//   const {
//     name,
//     departmentId,
//     startDate,
//     bookingCount,
//     status,
//     schedules,
//     blockedDates,
//   } = req.body;

//   const transaction = await sequelize.transaction();

//   try {
//     // Validate if the departmentId exists
//     const department = await Department.findByPk(departmentId);
//     if (!department) {
//       return res.status(404).json({ error: "Department not found" });
//     }

//     // Handle file upload for doctor image
//     const imagePath = req.file ? req.file.path : null;

//     // Create doctor with status and image
//     const doctor = await Doctor.create(
//       {
//         name,
//         departmentId,
//         startDate,
//         bookingCount: bookingCount || 7,
//         status: status || "active", // Default to 'active' if no status provided
//         image: imagePath, // Store image path
//       },
//       { transaction }
//     );

//     // Prepare the schedules
//     const preparedSchedules = JSON.parse(schedules).map((schedule) => {
//       // Parse the schedules as JSON
//       if (
//         schedule.recurringPattern === "monthly" &&
//         (!schedule.occurrences || schedule.occurrences.length === 0)
//       ) {
//         throw new Error(
//           "For monthly recurring schedules, occurrences (nthOccurrence and weekDay) must be provided."
//         );
//       }

//       if (
//         schedule.tokenBased &&
//         (!schedule.availableTokens || schedule.availableTokens <= 0)
//       ) {
//         throw new Error(
//           "availableTokens must be greater than 0 for token-based scheduling."
//         );
//       }

//       return {
//         doctorId: doctor.id,
//         startTime: schedule.startTime,
//         endTime: schedule.endTime,
//         recurringPattern: schedule.recurringPattern,
//         customDays: schedule.customDays || null,
//         slotInterval: schedule.slotInterval || null,
//         tokenBased: schedule.tokenBased,
//         availableTokens: schedule.availableTokens || null,
//         occurrences: schedule.occurrences || null,
//       };
//     });

//     // Create schedules in bulk
//     await DoctorSchedule.bulkCreate(preparedSchedules, { transaction });

//     // Block the specified dates
//     if (blockedDates && blockedDates.length > 0) {
//       const blockedDatesData = blockedDates.map((date) => ({
//         doctorId: doctor.id,
//         date,
//       }));
//       await BlockedDate.bulkCreate(blockedDatesData, { transaction });
//     }

//     // Commit the transaction
//     await transaction.commit();

//     res.status(201).json({
//       message: "Doctor and schedules created successfully",
//       doctor,
//       schedules: preparedSchedules,
//     });
//   } catch (error) {
//     await transaction.rollback();
//     console.error(error);
//     res.status(500).json({
//       error: error.message || "Failed to create doctor and schedules",
//     });
//   }
// };

// const getDoctorWithSchedules = async (req, res) => {
//   try {
//     const bookingCount = parseInt(req.query.bookingCount, 10) || 10;

//     const doctors = await Doctor.findAll({
//       include: [
//         {
//           model: DoctorSchedule,
//           as: "doctorSchedules",
//           include: [
//             {
//               model: Booking,
//               as: "bookedSlots",
//               attributes: [
//                 "startTime",
//                 "endTime",
//                 "tokenNumber",
//                 "patientName",
//                 "bookingDate",
//               ],
//             },
//             {
//               model: BlockedDate, // Include BlockedDate model
//               as: "blockedDates", // Alias for BlockedDate entries
//               attributes: ["blockedDate"], // Only the 'blockedDate' field
//             },
//           ],
//         },
//       ],
//     });

//     const formattedDoctors = doctors.map((doctor) => {
//       const schedules = doctor.doctorSchedules.map((schedule) => {
//         const recurringDates = calculateRecurringDates(
//           schedule,
//           doctor.startDate, // Ensure 'startDate' exists in your doctor model
//           bookingCount
//         );

//         return {
//           id: schedule.id,
//           startTime: schedule.startTime,
//           endTime: schedule.endTime,
//           recurringPattern: schedule.recurringPattern,
//           customDays: schedule.customDays,
//           tokenBased: schedule.tokenBased,
//           availableTokens: schedule.availableTokens,
//           recurringDates: recurringDates.map((date) => {
//             const bookedSlots = schedule.bookedSlots.filter(
//               (slot) => slot.bookingDate === date
//             );

//             // Check if the date is blocked
//             const isBlocked = schedule.blockedDates.some(
//               (blockedDate) =>
//                 new Date(blockedDate.blockedDate)
//                   .toISOString()
//                   .split("T")[0] === date // Ensure date comparison is done correctly
//             );

//             return {
//               date,
//               dayOfWeek: new Date(date).toLocaleString("en-US", {
//                 weekday: "long",
//               }),
//               remainingTokens: schedule.tokenBased
//                 ? schedule.availableTokens - bookedSlots.length
//                 : null,
//               bookedSlotsCount: bookedSlots.length,
//               isBlocked: isBlocked,
//             };
//           }),
//         };
//       });

//       return {
//         id: doctor.id,
//         name: doctor.name,
//         departmentId: doctor.departmentId,
//         status: doctor.status,
//         image: doctor.image
//           ? //  `http://localhost:3015/uploads/${path.basename(doctor.image)}`
//             // :
//             `https://metaapi.finglider.com/uploads/${path.basename(
//               doctor.image
//             )}`
//           : null, // Ensure correct image path
//         schedules,
//       };
//     });

//     res.status(200).json(formattedDoctors);
//   } catch (error) {
//     console.error("Error fetching doctor schedules:", error.message);
//     res.status(500).json({ error: "Failed to fetch doctor schedules" });
//   }
// };

// // Helper function to format date as yyyy-mm-dd
// function formatDate(date) {
//   const year = date.getFullYear();
//   const month = (date.getMonth() + 1).toString().padStart(2, "0");
//   const day = date.getDate().toString().padStart(2, "0");
//   return `${year}-${month}-${day}`;
// }

// // Function to calculate recurring dates
// function calculateRecurringDates(schedule, startDate, bookingCount) {
//   const recurringDates = [];
//   const { recurringPattern, customDays, occurrences } = schedule;

//   let currentDate = new Date(startDate);

//   while (recurringDates.length < bookingCount) {
//     if (recurringPattern === "daily") {
//       recurringDates.push(formatDate(currentDate));
//       currentDate.setDate(currentDate.getDate() + 1);
//     } else if (recurringPattern === "weekly" && customDays) {
//       const dayOfWeek = currentDate.getDay();
//       if (customDays[dayOfWeek] === "1") {
//         recurringDates.push(formatDate(currentDate));
//       }
//       currentDate.setDate(currentDate.getDate() + 1);
//     } else if (recurringPattern === "monthly" && occurrences) {
//       occurrences.forEach(({ nthOccurrence, weekDay }) => {
//         const dates = generateMonthlyDates(
//           nthOccurrence,
//           weekDay,
//           currentDate,
//           bookingCount
//         );
//         recurringDates.push(...dates);
//       });
//       break; // Monthly schedules are added once
//     }
//   }

//   return recurringDates;
// }

// // Helper to generate monthly dates for nth occurrence of a weekday
// function generateMonthlyDates(nthOccurrence, weekDay, startDate, limit) {
//   const dates = [];
//   let currentMonth = startDate.getMonth();
//   const weekDayIndex = [
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//     "Saturday",
//   ].indexOf(weekDay);

//   while (dates.length < limit) {
//     const monthStart = new Date(startDate.getFullYear(), currentMonth, 1);
//     const days = [];
//     for (let i = 0; i < 31; i++) {
//       const day = new Date(monthStart);
//       day.setDate(i + 1);
//       if (day.getDay() === weekDayIndex) {
//         days.push(day);
//       }
//     }

//     if (nthOccurrence === "last") {
//       dates.push(formatDate(days[days.length - 1]));
//     } else if (parseInt(nthOccurrence, 10) <= days.length) {
//       dates.push(formatDate(days[parseInt(nthOccurrence, 10) - 1]));
//     }

//     currentMonth++;
//   }

//   return dates;
// }

// module.exports = { createDoctorWithSchedule, getDoctorWithSchedules };
