const messageQueue = require("../queue");
const initDatabase = require("../helpers/dbConnector");
const { QueryTypes } = require("sequelize");

let sequelize;

const getUpcomingClasses = async () => {
  try {
    if (!sequelize) {
      sequelize = await initDatabase();
    }

    if (!sequelize) {
      throw new Error("Database connection is not established.");
    }

    const query = `
      SELECT 
          CONCAT(sd.first_name, ' ', sd.last_name) AS contact_name,
          u.mobile AS student_mobile,
          cd.country_name,
          cd.country_code,
          bd.batch_id,
          bd.batch_name,
          co.subject AS course_subject,
          bd.start_date,
          bd.end_date,
          bd.start_time,
          bd.end_time,
          bd.utc_start_time,
          bd.class_days
      FROM student_details sd
      JOIN users u ON sd.user_id = u.user_id
      JOIN country_details cd ON u.country_id = cd.country_id
      JOIN batch_students bs ON sd.student_id = bs.student_id
      JOIN batch_details bd ON bs.batch_id = bd.batch_id
      JOIN course_offering co ON bd.course_id = co.course_id
      WHERE sd.status_id = 2
        AND bd.status_id = 2
        AND CURDATE() BETWEEN bd.start_date AND bd.end_date
        AND FIND_IN_SET(DAYNAME(CURDATE()), bd.class_days)
        AND bd.utc_start_time BETWEEN UTC_TIME() + INTERVAL 50 MINUTE
                                 AND UTC_TIME() + INTERVAL 1 HOUR;
    `;

    const students = await sequelize.query(query, {
      type: QueryTypes.SELECT,
    });

    console.log(`🔍 Found ${students.length} upcoming classes in next 1 hr.`);
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

    await Promise.all(
      students.map(async (student) => {
        const formatTime = (timeString) => {
          if (!timeString) return "";
          const [hours, minutes] = timeString.split(":").map(Number);
          const suffix = hours >= 12 ? "PM" : "AM";
          const formattedHours = hours % 12 || 12;
          return `${formattedHours}:${minutes
            .toString()
            .padStart(2, "0")} ${suffix}`;
        };

        const formattedTime = formatTime(student.start_time);

        const templateComponents = [
          {
            type: "body",
            parameters: [
              { type: "text", text: student.contact_name },
              { type: "text", text: student.course_subject },
              { type: "text", text: formattedTime },
            ],
          },
        ];

        const phoneNumber =
          process.env.NODE_ENV === "development"
            ? process.env.DEMO_PHONE_NUMBER
            : student.student_mobile;

        await messageQueue.add("sendReminder", {
          phoneNumber,
          templateName: "gg_class_reminder_2",
          templateComponents,
        });

        console.log(
          `✅ Scheduled reminder for: ${student.contact_name} (${student.course_subject}) at ${formattedTime} to ${student.student_mobile}`
        );
      })
    );

    console.log(`📢 Scheduled ${students.length} WhatsApp reminders.`);
  } catch (error) {
    console.error("❌ Error in scheduling reminders:", error.message);
  }
};

// Run the scheduler every 10 minutes
setInterval(scheduleReminders, 10 * 60 * 1000);

module.exports = { scheduleReminders };
