const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('tabela_metropolitana')
    .setDescription('Abre o menu de seleção de ponto')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('📡 Registrando comandos de barra (/)...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // ou Routes.applicationGuildCommands(clientId, guildId) para dev
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
})();
