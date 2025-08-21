const messageQueue = require("../queue");
const initDatabase = require("../helpers/dbConnector"); // Import init function
const { QueryTypes } = require("sequelize"); // ✅ Ensure proper QueryTypes import

let sequelize; // Store initialized instance
const getUpcomingClasses = async () => {
  try {
    if (!sequelize) {
      sequelize = await initDatabase();
    }

    if (!sequelize) {
      throw new Error("Database connection is not established.");
    }
    const query = `
      SELECT sp.*, s.mobile
      FROM \`glider-uat\`.samples s
      JOIN \`glider-uat\`.studentprofile sp
      ON s.student_id = sp.student_id
      WHERE s.role = 'Student'
      AND CURDATE() BETWEEN sp.start_date AND sp.end_date
      AND FIND_IN_SET(DAYNAME(CURDATE()), sp.class_days)
      AND sp.utc_times BETWEEN UTC_TIME() + INTERVAL 50 MINUTE 
                    AND UTC_TIME() + INTERVAL 1 HOUR;
    `;
    const students = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    console.log(`🔍 Found ${students.length} upcoming classes.`);
    return students;
  } catch (error) {
    console.error("❌ Error fetching upcoming classes:", error.message);
    return [];
  }
};

const scheduleReminders = async () => {
  try {
    const students = await getUpcomingClasses();

    if (students.length === 0) {
      console.log("⏳ No upcoming classes found in the next 1 hour.");
      return;
    }

    // const phoneNumbers = [917034073111]; // ✅ Add multiple numbers if needed

    // Schedule reminders in parallel using Promise.all
    await Promise.all(
      students.map(async (student) => {
        const formatTime = (timeString) => {
          const [hours, minutes] = timeString.split(":").map(Number);
          const suffix = hours >= 12 ? "PM" : "AM";
          const formattedHours = hours % 12 || 12;
          return `${formattedHours}:${minutes
            .toString()
            .padStart(2, "0")} ${suffix}`;
        };

        const formattedTime = formatTime(student.local_time);
        const templateComponents = [
          {
            type: "body",
            parameters: [
              { type: "text", text: student.first },
              { type: "text", text: student.language },
              { type: "text", text: formattedTime },
            ],
          },
        ];

        // Schedule for all phone numbers

        const phoneNumber =
          process.env.NODE_ENV === "development"
            ? process.env.DEMO_PHONE_NUMBER
            : student.mobile;

        await messageQueue.add("sendReminder", {
          phoneNumber,
          templateName: "gg_class_reminder_2",
          templateComponents,
        });

        console.log(
          `✅ Scheduled reminder for: ${student.first} at ${formattedTime} to ${student.mobile}`
        );
      })
    );

    console.log(`📢 Scheduled ${students.length} WhatsApp reminders.`);
  } catch (error) {
    console.error("❌ Error in scheduling reminders:", error.message); // ✅ Now properly inside catch block
  }
};

// Run the scheduler every 10 minutes
setInterval(scheduleReminders, 10 * 60 * 1000);

module.exports = { scheduleReminders };
