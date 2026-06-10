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

const SUPPORT_CHANNEL = "1514233580115591250";
const LOG_CHANNEL = "1514233580115591250";

// 📦 Database
let db = fs.existsSync("./db.json")
  ? JSON.parse(fs.readFileSync("./db.json", "utf8"))
  : { count: 0, tickets: {} };

const saveDB = () => fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));

// ================= READY =================
client.once("ready", async () => {
  console.log(`✅ ${client.user.tag} is ONLINE`);

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

  await channel.send({
    content: `🚨 **ONE MISSION | REAL RP SYSTEM**

👋 مرحباً بك في نظام الشكاوى الرسمي

🟢 ضد لاعب  
🔴 ضد إداري  
🟡 ضد قائد فصيل  

👇 اختر نوع الشكوى`,
    components: [row]
  });
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {

  // 🎯 اختيار النوع
  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(type)
      .setTitle("One Mission Complaint Form");

    const fields = [
      new TextInputBuilder().setCustomId("name").setLabel("اسمك في اللعبة").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("target").setLabel("اسم الشخص المشكو عليه").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("server").setLabel("اسم السيرفر").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("proof").setLabel("الدليل (صورة / رابط)").setStyle(TextInputStyle.Paragraph)
    ];

    modal.addComponents(
      new ActionRowBuilder().addComponents(fields[0]),
      new ActionRowBuilder().addComponents(fields[1]),
      new ActionRowBuilder().addComponents(fields[2]),
      new ActionRowBuilder().addComponents(fields[3])
    );

    return interaction.showModal(modal);
  }

  // 📩 إرسال الشكوى
  if (interaction.isModalSubmit()) {

    const id = ++db.count;

    const data = {
      id,
      type: interaction.customId,
      name: interaction.fields.getTextInputValue("name"),
      target: interaction.fields.getTextInputValue("target"),
      server: interaction.fields.getTextInputValue("server"),
      proof: interaction.fields.getTextInputValue("proof"),
      status: "OPEN",
      time: new Date().toLocaleString("ar-DZ")
    };

    db.tickets[id] = data;
    saveDB();

    const guild = interaction.guild;

    // 🎫 إنشاء روم تكت
    const ticketChannel = await guild.channels.create({
      name: `om-ticket-${id}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`📩 ONE MISSION TICKET #${id}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🎯 الهدف", value: data.target },
        { name: "🏠 السيرفر", value: data.server },
        { name: "📎 الدليل", value: data.proof },
        { name: "🕒 الوقت", value: data.time },
        { name: "📌 الحالة", value: data.status }
      )
      .setFooter({ text: "One Mission RP System" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${id}`)
        .setLabel("قبول")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${id}`)
        .setLabel("رفض")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`close_${id}`)
        .setLabel("إغلاق")
        .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({
      content: `👋 مرحباً ${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ تم فتح التكت: ${ticketChannel}`,
      ephemeral: true
    });

    const log = await client.channels.fetch(LOG_CHANNEL).catch(() => null);
    if (log) log.send(`📊 Ticket #${id} opened by ${interaction.user.tag}`);
  }

  // ⚙️ أزرار الإدارة
  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية", ephemeral: true });
    }

    if (action === "accept") ticket.status = "ACCEPTED";
    if (action === "reject") ticket.status = "REJECTED";
    if (action === "close") ticket.status = "CLOSED";

    saveDB();

    await interaction.reply({
      content: `✅ تم ${action} التكت #${id}`,
      ephemeral: true
    });
  }
});

// ================= SERVER =================
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("One Mission Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
