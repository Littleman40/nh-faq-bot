require('dotenv').config();
const { REST, Routes } = require('discord.js');
const faqCommand = require('./commands/faq');
const refreshFaqCommand = require('./commands/refreshFaq');

const commands = [faqCommand.data.toJSON(), refreshFaqCommand.data.toJSON()];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const { CLIENT_ID, GUILD_ID } = process.env;
    if (!CLIENT_ID) throw new Error('CLIENT_ID is not set in .env');
    if (!GUILD_ID) throw new Error('GUILD_ID is not set in .env');

    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log(`Registered ${commands.length} command(s) to guild ${GUILD_ID}.`);
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();