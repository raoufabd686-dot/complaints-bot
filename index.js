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

const SUPPORT_CHANNEL = "PUT_CHANNEL_ID";
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
    .setDescription("⚖️ نظام الشكاوى الرسمي\n🎯 اختر نوع الشكوى");

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

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("name").setLabel("اسمك").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("target").setLabel("المشكو عليه").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("server").setLabel("السيرفر").setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("proof").setLabel("الدليل").setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // CREATE
  if (interaction.isModalSubmit()) {

    const userId = interaction.user.id;

    if (db.cooldown[userId] && Date.now() - db.cooldown[userId] < 300000) {
      return interaction.reply({ content: "⛔ انتظر 5 دقائق", ephemeral: true });
    }

    db.cooldown[userId] = Date.now();

    const id = ++db.count;
    const ticketID = `شكوى${id}`; // 🔥 المطلوب

    const data = {
      id: ticketID,
      userId: interaction.user.id,
      name: interaction.fields.getTextInputValue("name"),
      target: interaction.fields.getTextInputValue("target"),
      server: interaction.fields.getTextInputValue("server"),
      proof: interaction.fields.getTextInputValue("proof"),
      status: "OPEN",
      time: new Date().toLocaleString("ar-DZ")
    };

    db.tickets[ticketID] = data;
    saveDB();

    const guild = interaction.guild;

    const ticket = await guild.channels.create({
      name: ticketID,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    // 📩 DM للمواطن عند الإنشاء
    interaction.user.send(`📨 تم إنشاء ${ticketID} بنجاح`).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle(`📩 ${ticketID}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🎯 ضد", value: data.target },
        { name: "📌 الحالة", value: data.status }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`close_${ticketID}`).setLabel("إغلاق").setStyle(ButtonStyle.Danger)
    );

    await ticket.send({ embeds: [embed], components: [row] });

    interaction.reply({ content: `✅ تم إنشاء ${ticketID}`, ephemeral: true });
  }

  // CLOSE
  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ لا صلاحية", ephemeral: true });
    }

    if (action === "close") {

      ticket.status = "CLOSED";
      saveDB();

      // 🔒 قفل الروم
      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: false
      }).catch(() => {});

      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        ViewChannel: false
      }).catch(() => {});

      // 📁 أرشيف
      const archive = await client.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);

      if (archive) {
        archive.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setTitle(`📁 ${id}`)
              .addFields(
                { name: "👤 الاسم", value: ticket.name },
                { name: "🎯 ضد", value: ticket.target },
                { name: "📌 الحالة", value: "CLOSED" }
              )
          ]
        });
      }

      // ⭐ تقييم للمواطن
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rate_1_${id}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_2_${id}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_3_${id}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_4_${id}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`rate_5_${id}`).setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
      );

      const user = await client.users.fetch(ticket.userId).catch(() => null);

      if (user) {
        user.send({
          content: `📨 تم إغلاق ${ticketID}\n⭐ قيّم الشكوى`,
          components: [ratingRow]
        }).catch(() => {});
      }

      return interaction.reply({ content: "🔒 تم الإغلاق", ephemeral: true });
    }

    // ⭐ RATE
    if (action === "rate") {

      const stars = id;

      db.ratings[interaction.customId] = {
        stars,
        user: interaction.user.id
      };

      saveDB();

      return interaction.reply({ content: "شكراً لتقييمك ⭐", ephemeral: true });
    }
  }
});

// KEEP ALIVE
http.createServer((req, res) => {
  res.end("Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
