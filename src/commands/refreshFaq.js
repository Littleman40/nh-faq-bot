const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { fetchFaqsFromGitBook } = require('../gitbook');
const { writeCache } = require('../cache');
const { canUseRefreshHere } = require('../access');

const data = new SlashCommandBuilder()
  .setName('refresh-faq')
  .setDescription('Manually rebuild the cached FAQ list from GitBook');

async function execute(interaction, config) {
  if (!canUseRefreshHere(interaction, config)) {
    await interaction.reply({
      content: 'This command can only be used in designated admin channels.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const faqs = await fetchFaqsFromGitBook();
    const cache = writeCache(faqs);
    await interaction.editReply(
      `FAQ cache refreshed - ${cache.faqs.length} FAQ${cache.faqs.length === 1 ? '' : 's'} loaded from GitBook.`
    );
  } catch (err) {
    console.error('/refresh-faq failed:', err);
    await interaction.deleteReply().catch(() => {});
    await interaction
      .followUp({
        content: 'Failed to refresh the FAQ cache. The existing cache has not been changed.',
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
}

module.exports = { data, execute };