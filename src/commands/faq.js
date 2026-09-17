const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { searchByTitle, findByTitle } = require('../cache');
const { canUseFaqHere } = require('../access');

const TITLE_OPTIONS = ['title', 'title2', 'title3', 'title4', 'title5'];

const data = new SlashCommandBuilder()
  .setName('faq')
  .setDescription('Get a link to a FAQ')
  .addStringOption((option) =>
    option
      .setName('title')
      .setDescription('The FAQ you\'re looking for')
      .setRequired(true)
      .setAutocomplete(true)
  );

for (let i = 2; i <= TITLE_OPTIONS.length; i += 1) {
  data.addStringOption((option) =>
    option
      .setName(`title${i}`)
      .setDescription('Include another FAQ (optional)')
      .setRequired(false)
      .setAutocomplete(true)
  );
}

async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const matches = searchByTitle(focusedValue, 25);
  await interaction.respond(matches.map((f) => ({ name: f.title, value: f.title })));
}

function formatFaqLine(faq) {
  return `**[${faq.title} (click to see faq)](<${faq.url}>)**`;
}

async function execute(interaction, config) {
  const allowed = canUseFaqHere(interaction, config);

  if (!allowed) {
    await interaction.reply({
      content: `FAQ commands only work in help channels, please visit: ${config.helpChannelLink}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const requestedTitles = TITLE_OPTIONS.map((name) => interaction.options.getString(name)).filter(Boolean);

  const found = [];
  const missing = [];
  for (const title of requestedTitles) {
    const faq = findByTitle(title);
    if (faq) found.push(faq);
    else missing.push(title);
  }

  if (found.length === 0) {
    await interaction.reply({
      content: `Couldn't find ${missing.length === 1 ? `an FAQ called "${missing[0]}"` : 'any of those FAQs'}. Please pick from the autocomplete list.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Publicly visible, no pings. Links are wrapped in <> to suppress Discord's embed preview.
  const content = found.length === 1 ? `> ${formatFaqLine(found[0])}` : found.map((faq) => `> * ${formatFaqLine(faq)}`).join('\n');

  await interaction.reply({
    content,
    allowedMentions: { parse: [] },
  });
}

module.exports = { data, execute, autocomplete };