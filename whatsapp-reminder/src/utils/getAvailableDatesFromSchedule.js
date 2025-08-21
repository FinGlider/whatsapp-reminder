const moment = require("moment");

function getAvailableDatesFromSchedule(schedule) {
  const { startDate, endDate, recurringPattern, days } = schedule;
  const availableDates = [];
  const start = moment(startDate);
  const end = recurringPattern === "none" ? moment(startDate) : moment(endDate);

  const dayList = Array.isArray(days)
    ? days.map((d) => moment(d, ["ddd", "dddd"]).format("ddd"))
    : typeof days === "string"
    ? days
        .split(",")
        .map((d) => moment(d.trim(), ["ddd", "dddd"]).format("ddd"))
    : [];

  const current = moment(start);
  while (current.isSameOrBefore(end)) {
    const dayName = current.format("ddd");
    const shouldInclude =
      recurringPattern === "daily" ||
      (recurringPattern === "weekly" && dayList.includes(dayName)) ||
      (recurringPattern === "none" && current.isSame(start, "day"));

    if (shouldInclude) {
      availableDates.push(current.format("YYYY-MM-DD"));
    }

    if (recurringPattern === "none") break;
    current.add(1, "day");
  }

  return availableDates;
}

module.exports = { getAvailableDatesFromSchedule };
