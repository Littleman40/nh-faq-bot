require('dotenv').config();
const path = require('path');
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');

const config = require(path.join(__dirname, '..', 'config.json'));
const faqCommand = require('./commands/faq');
const refreshFaqCommand = require('./commands/refreshFaq');

const commands = new Map([
  [faqCommand.data.name, faqCommand],
  [refreshFaqCommand.data.name, refreshFaqCommand],
]);

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
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
