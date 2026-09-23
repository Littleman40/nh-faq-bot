const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { searchByTitle, findByTitle } = require('../faqData');

const TITLE_OPTIONS = ['faq_title', 'faq_title2', 'faq_title3'];

function hasWhitelistedRole(interaction, config) {
  const memberRoles = interaction.member?.roles?.cache;
  return Boolean(memberRoles && config.whitelistedRoles.some((roleId) => memberRoles.has(roleId)));
}

function canUseFaqHere(interaction, config) {
  if (hasWhitelistedRole(interaction, config)) return true;
  const ids = [interaction.channelId];
  if (interaction.channel?.isThread?.()) ids.push(interaction.channel.parentId);
  return ids.some((id) => config.publicFaqChannels.includes(id));
}

const data = new SlashCommandBuilder()
  .setName('faq')
  .setDescription('Get a link to a FAQ')
  .addStringOption((option) =>
    option
      .setName('faq_title')
      .setDescription('The FAQ you\'re looking for')
      .setRequired(true)
      .setAutocomplete(true)
  );

for (let i = 2; i <= TITLE_OPTIONS.length; i += 1) {
  data.addStringOption((option) =>
    option
      .setName(`faq_title${i}`)
      .setDescription('Include another FAQ (optional)')
      .setRequired(false)
      .setAutocomplete(true)
  );
}

data.addStringOption((option) =>
  option
    .setName('ping')
    .setDescription('Ping someone who recently chatted here (optional)')
    .setRequired(false)
    .setAutocomplete(true)
);

data.addStringOption((option) =>
  option
    .setName('message')
    .setDescription('Add a custom message (whitelisted roles only)')
    .setRequired(false)
);

const USER_ID_PATTERN = /^\d{17,20}$/;

async function getRecentChatters(interaction) {
  if (!interaction.channel?.isTextBased?.()) return new Map();

  let messages;
  try {
    messages = await interaction.channel.messages.fetch({ limit: 50 });
  } catch (err) {
    console.error('Failed to fetch recent messages for ping lookup:', err);
    return new Map();
  }

  const seen = new Map();
  for (const message of messages.values()) {
    if (message.author.bot || seen.has(message.author.id)) continue;
    seen.set(message.author.id, message.member?.displayName || message.author.username);
  }
  return seen;
}

async function getRecentChatterChoices(interaction, query) {
  const seen = await getRecentChatters(interaction);
  const q = (query || '').toLowerCase();
  return Array.from(seen, ([id, name]) => ({ id, name }))
    .filter((entry) => entry.name.toLowerCase().includes(q))
    .slice(0, 25);
}

async function autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === 'ping') {
    const choices = await getRecentChatterChoices(interaction, focused.value);
    await interaction.respond(choices.map((c) => ({ name: c.name, value: c.id })));
    return;
  }

  const matches = searchByTitle(focused.value, 25);
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

  const messageText = interaction.options.getString('message');
  if (messageText && !hasWhitelistedRole(interaction, config)) {
    await interaction.reply({
      content: 'Only whitelisted roles can add a custom message.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const faqContent = found.length === 1 ? `> ${formatFaqLine(found[0])}` : found.map((faq) => `> * ${formatFaqLine(faq)}`).join('\n');

  const pingUserId = interaction.options.getString('ping');
  const validPing = pingUserId && USER_ID_PATTERN.test(pingUserId) ? pingUserId : null;
  const pingMention = validPing ? `<@${validPing}>` : null;

  let content;
  if (messageText && pingMention) {
    content = `${pingMention}: ${messageText}\n\n${faqContent}`;
  } else if (messageText) {
    content = `${messageText}\n\n${faqContent}`;
  } else if (pingMention) {
    content = `${faqContent}\n\n${pingMention}`;
  } else {
    content = faqContent;
  }

  await interaction.reply({
    content,
    allowedMentions: { parse: [], users: validPing ? [validPing] : [] },
  });
}

module.exports = { data, execute, autocomplete };