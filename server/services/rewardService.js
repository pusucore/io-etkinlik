const { query } = require('../db');
const { checkChannelMembership } = require('./channelService');

async function refreshUserRewardStatus(userId, telegram, channelId) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) return null;

  let isMember = user.is_channel_member;
  if (telegram && channelId) {
    const check = await checkChannelMembership(telegram, channelId, user.telegram_id);
    isMember = check.isMember;
  }

  let disqualificationReason = user.disqualification_reason;
  let disqualified = user.disqualified;

  if (!isMember && user.reward_eligible) {
    disqualificationReason = disqualificationReason || 'channel_unfollowed';
    await query(
      `UPDATE users SET is_channel_member = FALSE, reward_eligible = FALSE,
       disqualification_reason = COALESCE(disqualification_reason, 'channel_unfollowed'),
       channel_checked_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  } else {
    const { rows: pred } = await query(
      `SELECT locked, submitted_at FROM predictions WHERE user_id = $1`,
      [userId]
    );
    const predictionComplete = pred[0]?.locked === true;
    const depositOk = user.deposit_eligible === true;
    const eligible = isMember && predictionComplete && depositOk && !disqualified;

    await query(
      `UPDATE users SET is_channel_member = $1, reward_eligible = $2, channel_checked_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [isMember, eligible, userId]
    );
  }

  const { rows: updated } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  return formatRewardStatus(updated[0], await getPredictionFlags(userId));
}

async function getPredictionFlags(userId) {
  const { rows } = await query(
    'SELECT locked, submitted_at FROM predictions WHERE user_id = $1',
    [userId]
  );
  return {
    predictionCompleted: rows[0]?.locked === true,
    predictionLocked: rows[0]?.locked === true,
    submittedAt: rows[0]?.submitted_at,
  };
}

function formatRewardStatus(user, predFlags = {}) {
  const channelActive = user.is_channel_member && !user.disqualified;
  const depositStatus = user.deposit_eligible ? 'Onaylandı' : 'Beklemede';
  const bracketDone = predFlags.predictionCompleted ? 'Evet' : 'Hayır';

  let rewardEligible = user.reward_eligible && !user.disqualified;
  let rewardLabel = rewardEligible ? 'Uygun' : 'Uygun değil';

  if (user.disqualified) rewardLabel = 'Uygun değil';
  else if (!channelActive) rewardLabel = 'Uygun değil';
  else if (!predFlags.predictionCompleted) rewardLabel = 'Uygun değil';
  else if (!user.deposit_eligible) rewardLabel = 'Uygun değil';

  return {
    channelFollow: channelActive ? 'Aktif' : 'Pasif',
    bracketCompleted: bracketDone,
    depositRequirement: depositStatus,
    rewardEligibility: rewardLabel,
    rewardEligible,
    disqualified: user.disqualified,
    disqualificationReason: user.disqualification_reason,
    depositEligible: user.deposit_eligible,
    isChannelMember: user.is_channel_member,
    predictionCompleted: predFlags.predictionCompleted,
    predictionLocked: predFlags.predictionLocked,
  };
}

module.exports = { refreshUserRewardStatus, formatRewardStatus, getPredictionFlags };
