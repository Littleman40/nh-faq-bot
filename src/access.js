function channelIdsToCheck(interaction) {
  const ids = [interaction.channelId];
  const parentId = interaction.channel?.isThread?.() ? interaction.channel.parentId : null;
  if (parentId) ids.push(parentId);
  return ids;
}

function canUseFaqHere(interaction, config) {
  const memberRoles = interaction.member?.roles?.cache;
  const hasWhitelistedRole = memberRoles && config.whitelistedRoles.some((roleId) => memberRoles.has(roleId));
  if (hasWhitelistedRole) return true;
  return channelIdsToCheck(interaction).some((id) => config.publicFaqChannels.includes(id));
}

function canUseRefreshHere(interaction, config) {
  return channelIdsToCheck(interaction).some((id) => config.refreshFaqChannels.includes(id));
}

module.exports = { canUseFaqHere, canUseRefreshHere };