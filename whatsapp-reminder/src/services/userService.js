const User = require("../models/Appointment/user"); // Import the User model

async function saveUserDetails({ waId, name }) {
  try {
    let user = await User.findOne({ where: { waId } });

    if (!user) {
      user = await User.create({
        waId,
        name,
        interactionCount: 1,
        lastInteractionAt: new Date(),
      });
      console.log("✅ New user saved:", user.toJSON());
    } else {
      // Increment interaction count and update last interaction time
      await user.increment("interactionCount");
      await user.update({ lastInteractionAt: new Date() });

      console.log("ℹ️ User interaction updated:", {
        interactionCount: user.interactionCount + 1,
        lastInteractionAt: new Date(),
      });
    }

    return user;
  } catch (error) {
    console.error("❌ Error saving user details:", error);
    return null;
  }
}

module.exports = { saveUserDetails };
