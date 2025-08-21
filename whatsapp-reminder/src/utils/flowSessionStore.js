const sessionStore = new Map();
const TTL_MS = 2 * 60 * 1000; // 1 minute

function setFlowSession(userWaId, flowToken, currentScreen) {
  sessionStore.set(userWaId, {
    flowToken,
    currentScreen,
    expiresAt: Date.now() + TTL_MS,
  });
}

function getFlowSession(userWaId) {
  const session = sessionStore.get(userWaId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessionStore.delete(userWaId); // 🔴 expired, remove it
    console.log(`⏰ Session expired for ${userWaId}`);
    return null;
  }

  return session; // ✅ still valid
}

function clearFlowSession(userWaId) {
  sessionStore.delete(userWaId);
}

module.exports = {
  setFlowSession,
  getFlowSession,
  clearFlowSession,
};
