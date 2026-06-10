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
    GatewayIntentBits.DirectMessages
  ]
});

// 📌 ROOMS (جاهزة من عندك)
const SUPPORT_CHANNEL = "1514233580115591250";
const ARCHIVE_CHANNEL = "1513629044241993839";
const STATS_CHANNEL = "1514328191525716129";
const LOG_CHANNEL = "1513629108184154282";

// 💾 DATABASE
let db = fs.existsSync("./db.json")
  ? JSON.parse(fs.readFileSync("./db.json"))
  : { count: 0, tickets: {}, ratings: {} };

const saveDB = () =>
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} ONLINE`);

  const channel = await client.channels.fetch(SUPPORT_CHANNEL);

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("⚖️ ONE MISSION RP")
    .setDescription(`
╔════════════════════════════╗
      ✦ ONE MISSION RP ✦
      ⚖️ MINISTRY OF JUSTICE ⚖️
╚════════════════════════════╝

👮 أهلاً وسهلاً أيها المواطنين

🎯 اختر نوع الشكوى:
🟢 لاعب
🔴 إداري
🟡 قائد فصيل
    `);

  const menu = new StringSelectMenuBuilder()
    .setCustomId("complaint_menu")
    .setPlaceholder("اختيار نوع الشكوى")
    .addOptions([
      { label: "شكوى ضد لاعب", value: "player", emoji: "🟢" },
      { label: "شكوى ضد إداري", value: "admin", emoji: "🔴" },
      { label: "شكوى ضد قائد فصيل", value: "leader", emoji: "🟡" }
    ]);

  await channel.send({
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(menu)]
  });
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {

  // MENU
  if (interaction.isStringSelectMenu()) {

    await interaction.reply({
      content: "⏳ يتم فتح الشكوى خلال ثواني...",
      ephemeral: true
    });

    const type = interaction.values[0];

    setTimeout(async () => {

      const modal = new ModalBuilder()
        .setCustomId(type)
        .setTitle("تقديم شكوى");

      const inputs = [
        new TextInputBuilder().setCustomId("name").setLabel("اسمك").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("server").setLabel("اسم السيرفر").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("target").setLabel("المشكو عليه").setStyle(TextInputStyle.Short),
        new TextInputBuilder().setCustomId("proof").setLabel("الدليل").setStyle(TextInputStyle.Paragraph)
      ];

      modal.addComponents(
        new ActionRowBuilder().addComponents(inputs[0]),
        new ActionRowBuilder().addComponents(inputs[1]),
        new ActionRowBuilder().addComponents(inputs[2]),
        new ActionRowBuilder().addComponents(inputs[3])
      );

      await interaction.showModal(modal);

    }, 2000);
  }

  // CREATE TICKET
  if (interaction.isModalSubmit()) {

    const id = ++db.count;
    const ticketID = `شكوى-${id}`;

    const data = {
      id: ticketID,
      userId: interaction.user.id,
      name: interaction.fields.getTextInputValue("name"),
      server: interaction.fields.getTextInputValue("server"),
      target: interaction.fields.getTextInputValue("target"),
      proof: interaction.fields.getTextInputValue("proof"),
      status: "PENDING"
    };

    db.tickets[ticketID] = data;
    saveDB();

    const guild = interaction.guild;

    const channel = await guild.channels.create({
      name: ticketID,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ]
    });

    // DM
    interaction.user.send(`📩 تم إنشاء ${ticketID}`).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle(`📩 ${ticketID}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🏷️ السيرفر", value: data.server },
        { name: "🎯 المشكو عليه", value: data.target },
        { name: "📎 الدليل", value: data.proof },
        { name: "📌 الحالة", value: data.status }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${ticketID}`).setLabel("قبول").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`close_${ticketID}`).setLabel("إغلاق").setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({ content: `✅ تم إنشاء ${ticketID}`, ephemeral: true });
  }

  // BUTTONS
  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return interaction.reply({ content: "❌ لا صلاحية", ephemeral: true });

    // ACCEPT
    if (action === "accept") {

      ticket.status = "OPEN";
      saveDB();

      const user = await client.users.fetch(ticket.userId).catch(() => null);
      if (user) user.send(`✅ تم قبول شكواك ${id}`);

      return interaction.reply({ content: "تم القبول", ephemeral: true });
    }

    // CLOSE + ARCHIVE + LOG + RATING
    if (action === "close") {

      ticket.status = "CLOSED";
      saveDB();

      const user = await client.users.fetch(ticket.userId).catch(() => null);

      // 📂 ARCHIVE
      const archive = await client.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);
      if (archive) archive.send(`📦 ${id} تم إغلاقها`);

      // 📜 LOG
      const log = await client.channels.fetch(LOG_CHANNEL).catch(() => null);
      if (log) log.send(`📜 ${id} CLOSED`);

      // ⭐ RATING DM
      if (user) {

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`rate_1_${id}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_2_${id}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_3_${id}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_4_${id}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`rate_5_${id}`).setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
        );

        user.send({
          content: `🔒 تم إغلاق ${id}\n⭐ قيّم تجربتك`,
          components: [row]
        }).catch(() => {});
      }

      return interaction.reply({ content: "🔒 تم الإغلاق", ephemeral: true });
    }

    // ⭐ SAVE RATING
    if (action === "rate") {

      const stars = Number(id);

      if (!db.ratings[ticket.userId]) db.ratings[ticket.userId] = [];

      db.ratings[ticket.userId].push({
        ticket: ticket.id,
        stars,
        time: new Date().toLocaleString("ar-DZ")
      });

      saveDB();

      return interaction.reply({
        content: `⭐ شكراً لتقييمك (${stars})`,
        ephemeral: true
      });
    }
  }
});

// 📊 STATS
setInterval(async () => {

  const channel = await client.channels.fetch(STATS_CHANNEL).catch(() => null);
  if (!channel) return;

  const total = Object.keys(db.tickets).length;

  channel.send(`
📊 WEEKLY REPORT

🧾 الشكاوى: ${total}
⭐ التقييمات: ${Object.keys(db.ratings).length}

🏛️ ONE MISSION RP
  `);

}, 7 * 24 * 60 * 60 * 1000);

// SERVER
http.createServer((req, res) => res.end("Bot Running"))
  .listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
