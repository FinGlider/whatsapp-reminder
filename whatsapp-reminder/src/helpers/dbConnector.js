require("dotenv").config();
const { Sequelize } = require("sequelize");

let sequelize;

const createSequelizeInstance = () => {
  return new Sequelize(
    process.env.CLIENT1_DB_NAME,
    process.env.CLIENT1_DB_USER,
    process.env.CLIENT1_DB_PASSWORD,
    {
      host: process.env.CLIENT1_DB_HOST || "82.112.230.168",
      port: process.env.CLIENT1_DB_PORT || 3306,
      dialect: "mysql",
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 60000, // 60 sec max time to get a connection
        idle: 720000, // Close connection if idle for 12 min
      },
      dialectOptions: {
        connectTimeout: 60000, // 60 sec timeout
      },
    }
  );
};

// **Initialize or Reconnect Database**
const initDatabase = async () => {
  if (!sequelize) {
    sequelize = createSequelizeInstance();
  }

  try {
    await sequelize.authenticate();
    console.log(
      `✅ Database '${process.env.CLIENT1_DB_NAME}' connected successfully!`
    );
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    await reconnect();
  }

  return sequelize;
};

// **Reconnection Logic**
const reconnect = async () => {
  console.error("⚠️ Lost connection to MySQL. Trying to reconnect...");

  let retries = 5;
  while (retries > 0) {
    try {
      sequelize = createSequelizeInstance();
      await sequelize.authenticate();
      console.log("✅ Database reconnected successfully!");
      return sequelize;
    } catch (error) {
      console.error(
        `❌ Reconnection failed. Retrying in 5 seconds... (${retries} attempts left)`
      );
      retries--;
      await new Promise((res) => setTimeout(res, 5000)); // Wait 5 sec before retrying
    }
  }
  console.error("🚨 Could not reconnect to the database. Exiting...");
  process.exit(1);
};

// **Export the function**
module.exports = initDatabase;
