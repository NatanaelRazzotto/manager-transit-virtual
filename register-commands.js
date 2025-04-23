const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// Configure seu bot
const commands = [
  new SlashCommandBuilder()
    .setName('tabela_metropolitana')
    .setDescription('Inicia o processo de operação de linhas metropolitanas.'),

  new SlashCommandBuilder()
    .setName('gerenciamento_taximetro')
    .setDescription('Calcula o valor de uma corrida com base no tempo.')
    .addStringOption(option =>
      option.setName('tempo_inicial')
        .setDescription('Tempo inicial em minutos HH:MM')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('tempo_final')
        .setDescription('Tempo encerramento em minutos HH:MM')
        .setRequired(true))
]
  .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('📡 Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, "1358984602424709292"), // Para testes
      // Routes.applicationCommands(CLIENT_ID), // Para uso global
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
