require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');

const faqCommand = require('./commands/faq');
const refreshFaqCommand = require('./commands/refreshFaq');

function parseList(value) {
  return (value || '').split(',').map((v) => v.trim()).filter(Boolean);
}

const config = {
  publicFaqChannels: parseList(process.env.PUBLIC_FAQ_CHANNELS),
  whitelistedRoles: parseList(process.env.WHITELISTED_ROLES),
  refreshFaqChannels: parseList(process.env.REFRESH_FAQ_CHANNELS),
  helpChannelLink: process.env.HELP_CHANNEL_LINK,
};

const commands = new Map([
  [faqCommand.data.name, faqCommand],
  [refreshFaqCommand.data.name, refreshFaqCommand],
]);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await client.application.commands.set(
    [faqCommand.data.toJSON(), refreshFaqCommand.data.toJSON()],
    process.env.GUILD_ID
  );
});

client.on('interactionCreate', async (interaction) => {
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    if (interaction.isAutocomplete()) {
      if (typeof command.autocomplete === 'function') {
        await command.autocomplete(interaction, config);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      await command.execute(interaction, config);
    }
  } catch (err) {
    console.error(`Error handling /${interaction.commandName}:`, err);
    const reply = { content: 'Something went wrong running that command.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
