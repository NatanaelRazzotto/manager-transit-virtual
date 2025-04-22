const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  MessageFlags
} = require('discord.js');

require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Estruturas de dados
const pontosAbertos = new Map();
const mensagensFluxo = new Map(); // Armazena todas as mensagens do fluxo

// Produtos disponíveis por projeto
const produtosPorProjeto = {
    ME01: [
        { label: '[TR01] - Metro Transit Bus', value: 'TR01' }      
    ],
    ME02: [
      { label: '[TR01] - Metro Transit Bus', value: 'TR01' }      
    ],
    ME03: [
      { label: '[TR01] - Metro Transit Bus', value: 'TR01' }      
    ],
    ME04: [
      { label: '[TR01] - Metro Transit Bus', value: 'TR01' }      
    ]
};

// Função para deletar mensagens fisicamente do chat
async function deletarMensagensDoChat(userId) {
  const userMessages = mensagensFluxo.get(userId);
  if (!userMessages) return;

  try {
    // Deleta a mensagem original do comando !ponto
    if (userMessages.original && userMessages.original.deletable) {
      await userMessages.original.delete();
    }

    // Deleta todas as respostas do bot
    for (const resposta of userMessages.respostas) {
      try {
        // Verifica diferentes formatos de resposta
        if (resposta?.delete) {
          await resposta.delete();
        } else if (resposta?.message?.delete) {
          await resposta.message.delete();
        } else if (resposta?.id) {
          const msg = await resposta.channel?.messages.fetch(resposta.id);
          if (msg?.deletable) await msg.delete();
        }
      } catch (error) {
        console.error('Erro ao deletar mensagem específica:', error);
      }
    }
  } catch (error) {
    console.error('Erro geral ao deletar mensagens:', error);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);
});

// Comando para exibir o botão "Abrir Ponto"
client.on('messageCreate', async message => {
  if (message.content === '!tabela_metropolitana') {
    const button = new ButtonBuilder()
      .setCustomId('bater_ponto')
      .setLabel('Abrir Ponto')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const reply = await message.reply({ 
      content: 'Clique abaixo para abrir OPERAÇÃO:', 
      components: [row] 
    });
    
    // Armazena a mensagem original e a resposta
    mensagensFluxo.set(message.author.id, {
      original: message,
      respostas: [reply]
    });
  }
});

// Lógica de interações
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Clique no botão → exibe o menu de seleção de projeto
    if (interaction.isButton() && interaction.customId === 'bater_ponto') {
      const select = new StringSelectMenuBuilder()
        .setCustomId('selecionar_trecho')
        .setPlaceholder('Escolha o trajeto...')
        .addOptions(
          { label: '[ME01] - RIVER CITY -> SPRING FIELD', value: 'ME01' },
          { label: '[ME02] - SPRING FIELD -> RIVER CITY', value: 'ME02' },
          { label: '[ME03] - SUBURB CONNECTOR -> SPRING', value: 'ME03' },
          { label: '[ME04] - SUBURB CONNECTOR -> RIVER', value: 'ME04' }
        );

      const row = new ActionRowBuilder().addComponents(select);

      const reply = await interaction.reply({
        content: 'Selecione o TRAJETO para bater o ponto:',
        components: [row],
      
      });
      
      // Atualiza o histórico de mensagens
      const userMessages = mensagensFluxo.get(interaction.user.id) || {respostas: []};
      userMessages.respostas.push(reply);
      mensagensFluxo.set(interaction.user.id, userMessages);
    }

    // Seleciona o projeto → exibe o menu de produtos
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_trecho') {
      const projeto = interaction.values[0];
      
      const selectProduto = new StringSelectMenuBuilder()
        .setCustomId('selecionar_veiculo')
        .setPlaceholder('Escolha o VEÍCULO...')
        .addOptions(produtosPorProjeto[projeto]);

      const row = new ActionRowBuilder().addComponents(selectProduto);

      const reply = await interaction.update({
        content: `Você selecionou o TRAJETO **${projeto}**. Agora escolha o VEÍCULO:`,
        components: [row],

      });
      
      // Armazena o projeto selecionado
      pontosAbertos.set(interaction.user.id, {
        projeto,
        produto: null,
        horarioEntrada: null
      });
    }

    // Seleciona o produto → abre o ponto
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_veiculo') {
      const produto = interaction.values[0];
      const horarioEntrada = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // Atualiza as informações de ponto
      const ponto = pontosAbertos.get(interaction.user.id);
      ponto.produto = produto;
      ponto.horarioEntrada = horarioEntrada;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('fechar_ponto')
          .setLabel('Fechar Ponto')
          .setStyle(ButtonStyle.Danger)
      );

      const reply = await interaction.update({
        content: `✅ Tabela aberta!\n**🗒LINHA: ** ${ponto.projeto}\n**🚍VEÍCULO: ** ${produto}\n**Horário de partida:** ${horarioEntrada}\nClique no botão abaixo para fechar.`,
        components: [row],

      });
    }

    // Clique no botão "Fechar Ponto" → mostra o modal para descrição final
    if (interaction.isButton() && interaction.customId === 'fechar_ponto') {

      
      const projeto = pontosAbertos.get(interaction.user.id).projeto;

      const modal = new ModalBuilder()
        .setCustomId('modal_comentario_fechamento')
        .setTitle(`Fechar OPERAÇÃO para ${projeto}`);

      const input = new TextInputBuilder()
        .setCustomId('descricao_final')
        .setLabel('Digite a descrição final:')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // Quando o usuário envia o modal → atualiza o ponto e responde com resumo
    if (interaction.isModalSubmit() && interaction.customId === 'modal_comentario_fechamento') {
      const descricaoFinal = interaction.fields.getTextInputValue('descricao_final');
      const horarioSaida = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const ponto = pontosAbertos.get(interaction.user.id);
      
      // DELETA FISICAMENTE TODAS AS MENSAGENS ANTERIORES DO CHAT
      await deletarMensagensDoChat(interaction.user.id);

      // Envia a mensagem final (única visível)
      await interaction.reply({
        content: `✅ **TRAJETO CONCLUIDO**\n👤 Motorista: ${interaction.user.username}\n🗒 LINHA: ${ponto.projeto}\n🚍 VEÍCULO: ${ponto.produto}\n⏰ Partida: ${ponto.horarioEntrada}\n⏱️ Chegada: ${horarioSaida}\n📝 Descrição: ${descricaoFinal}`,
       
      });

      // Limpa os dados
      pontosAbertos.delete(interaction.user.id);
      mensagensFluxo.delete(interaction.user.id);
    }
  } catch (error) {
    console.error('Erro ao processar interação:', error);
    if (interaction.isRepliable()) {
      await interaction.reply({
        content: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.',
        flags: [MessageFlags.Ephemeral]
      });
    }
  }
});

client.login(process.env.TOKEN);