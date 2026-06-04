const { VALID_MEMBER_STATUSES } = require('../constants');

async function getChatMemberStatus(telegram, channelId, telegramUserId) {
  try {
    const member = await telegram.getChatMember(channelId, telegramUserId);
    return member?.status || 'left';
  } catch (err) {
    console.error('getChatMember error:', err.message);
    return 'left';
  }
}

function isValidChannelMember(status) {
  return VALID_MEMBER_STATUSES.has(status);
}

async function checkChannelMembership(telegram, channelId, telegramUserId) {
  const status = await getChatMemberStatus(telegram, channelId, telegramUserId);
  return {
    status,
    isMember: isValidChannelMember(status),
  };
}

module.exports = {
  getChatMemberStatus,
  isValidChannelMember,
  checkChannelMembership,
};
