const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const fs = require("fs");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SUPPORT_CHANNEL = "PUT_SUPPORT_CHANNEL_ID";
const LOG_CHANNEL = "PUT_LOG_CHANNEL_ID";
const ARCHIVE_CHANNEL = "1513629219094007981";

// DB
let db = fs.existsSync("./db.json")
  ? JSON.parse(fs.readFileSync("./db.json", "utf8"))
  : { count: 0, tickets: {}, cooldown: {}, ratings: {} };

const saveDB = () =>
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));

// ================= PAGE =================
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} ONLINE`);

  const channel = await client.channels.fetch(SUPPORT_CHANNEL);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("complaint_menu")
    .setPlaceholder("📌 اختر نوع الشكوى")
    .addOptions([
      { label: "شكوى ضد لاعب", value: "player", emoji: "🟢" },
      { label: "شكوى ضد إداري", value: "admin", emoji: "🔴" },
      { label: "شكوى ضد قائد فصيل", value: "leader", emoji: "🟡" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("🚨 ONE MISSION RP")
    .setDescription(`
⚖️ وزارة العدل – نظام الشكاوى

🎯 اختر نوع الشكوى:
🟢 لاعب | 🔴 إداري | 🟡 قائد فصيل

⚡ العدالة فوق الجميع
`);

  channel.send({ embeds: [embed], components: [row] });
});

// ================= INTERACTION =================
client.on(Events.InteractionCreate, async (interaction) => {

  // MENU
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(type)
      .setTitle("تقديم شكوى");

    const fields = [
      new TextInputBuilder().setCustomId("name").setLabel("اسمك").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("target").setLabel("المشكو عليه").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("server").setLabel("السيرفر").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("proof").setLabel("الدليل").setStyle(TextInputStyle.Paragraph)
    ];

    modal.addComponents(
      new ActionRowBuilder().addComponents(fields[0]),
      new ActionRowBuilder().addComponents(fields[1]),
      new ActionRowBuilder().addComponents(fields[2]),
      new ActionRowBuilder().addComponents(fields[3])
    );

    return interaction.showModal(modal);
  }

  // CREATE TICKET
  if (interaction.isModalSubmit()) {

    const userId = interaction.user.id;

    if (db.cooldown[userId] && Date.now() - db.cooldown[userId] < 300000) {
      return interaction.reply({ content: "⛔ انتظر 5 دقائق", ephemeral: true });
    }

    db.cooldown[userId] = Date.now();

    const id = ++db.count;
    const ticketID = `شكوى-${id}`;

    const data = {
      id: ticketID,
      type: interaction.customId,
      name: interaction.fields.getTextInputValue("name"),
      target: interaction.fields.getTextInputValue("target"),
      server: interaction.fields.getTextInputValue("server"),
      proof: interaction.fields.getTextInputValue("proof"),
      status: "OPEN",
      userId: interaction.user.id,
      time: new Date().toLocaleString("ar-DZ")
    };

    db.tickets[ticketID] = data;
    saveDB();

    const guild = interaction.guild;

    const ticket = await guild.channels.create({
      name: ticketID,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle(`📩 ${ticketID}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🎯 ضد", value: data.target },
        { name: "🏠 السيرفر", value: data.server },
        { name: "📎 الدليل", value: data.proof },
        { name: "📌 الحالة", value: data.status }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${ticketID}`).setLabel("قبول").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${ticketID}`).setLabel("رفض").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`close_${ticketID}`).setLabel("إغلاق").setStyle(ButtonStyle.Secondary)
    );

    await ticket.send({ embeds: [embed], components: [row] });

    // DM للمواطن
    interaction.user.send(`📨 تم استلام شكواك ${ticketID}`).catch(() => {});

    interaction.reply({ content: `✅ تم إنشاء الشكوى: ${ticketID}`, ephemeral: true });
  }

  // BUTTONS
  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ لا صلاحية", ephemeral: true });
    }

    const logChannel = await client.channels.fetch(LOG_CHANNEL).catch(() => null);

    // ACCEPT
    if (action === "accept") {
      ticket.status = "ACCEPTED";
      saveDB();

      interaction.user.send(`✅ تم قبول شكواك ${id}`).catch(() => {});
      return interaction.reply({ content: "تم القبول", ephemeral: true });
    }

    // REJECT
    if (action === "reject") {
      ticket.status = "REJECTED";
      saveDB();

      interaction.user.send(`❌ تم رفض شكواك ${id}`).catch(() => {});
      return interaction.reply({ content: "تم الرفض", ephemeral: true });
    }

    // CLOSE + ARCHIVE + RATING
    if (action === "close") {

      ticket.status = "CLOSED";
      saveDB();

      // إخفاء الشكوى
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: false
      }).catch(() => {});

      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
      }).catch(() => {});

      // أرشيف
      const archive = await client.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);

      if (archive) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle(`📁 ${id}`)
          .addFields(
            { name: "👤 الاسم", value: ticket.name },
            { name: "🎯 ضد", value: ticket.target },
            { name: "🏠 السيرفر", value: ticket.server },
            { name: "📎 الدليل", value: ticket.proof },
            { name: "📌 الحالة", value: "CLOSED" }
          );

        archive.send({ embeds: [embed] });
      }

      // DM + تقييم
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rate_1_${id}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_2_${id}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_3_${id}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_4_${id}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_5_${id}`).setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
      );

      interaction.user.send({
        content: `📨 تم إغلاق شكواك ${id}\n⭐ قيّم تجربتك`,
        components: [ratingRow]
      }).catch(() => {});

      return interaction.reply({ content: "🔒 تم الإغلاق والأرشفة", ephemeral: true });
    }

    // RATING
    if (action === "rate") {

      const stars = id;
      const ticketId = interaction.customId.split("_")[2];

      db.ratings[ticketId] = {
        stars,
        user: interaction.user.id
      };

      saveDB();

      if (logChannel) {
        logChannel.send(`⭐ تقييم: ${ticketId} = ${stars}/5`);
      }

      return interaction.reply({ content: "شكراً لتقييمك ⭐", ephemeral: true });
    }
  }
});

// SERVER
http.createServer((req, res) => {
  res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
