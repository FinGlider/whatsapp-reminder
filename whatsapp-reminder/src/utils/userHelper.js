// utils/userHelper.js
function getUserDetails(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value || {};
  const userContact = value.contacts?.[0];
  const waIdFromContact = userContact?.wa_id;
  const waIdFromMessage = value.messages?.[0]?.from;

  let waIdFromFlowData = null;
  try {
    const rawJson = value?.messages?.[0]?.interactive?.nfm_reply?.response_json;
    waIdFromFlowData = rawJson ? JSON.parse(rawJson)?.userWaId : null;
  } catch (e) {
    console.warn("⚠️ Failed to parse userWaId from response_json:", e.message);
  }

  const userWaId = waIdFromContact || waIdFromFlowData || waIdFromMessage || "";
  const userName = userContact?.profile?.name || "there";

  return { userName, userWaId };
}

module.exports = { getUserDetails };
