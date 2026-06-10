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

// 📦 DB
let db = fs.existsSync("./db.json")
  ? JSON.parse(fs.readFileSync("./db.json", "utf8"))
  : { count: 0, tickets: {}, cooldown: {} };

const saveDB = () =>
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));

// ================= READY (ONLY UI CHANGED) =================
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

  await channel.send({
    content: `🚨📜 نظام الشكاوى – One Mission RP
👮‍♂️ وزارة العدل – وحدة الشكاوى
👋 مرحباً بك أيها المواطن
تم إنشاء هذا النظام لضمان العدالة وحفظ الحقوق داخل السيرفر.
━━━━━━━━━━━━━━
📌 إرشادات مهمة:
يجب تقديم معلومات صحيحة ودقيقة
إرفاق دليل واضح (صورة / فيديو / رابط)
يمنع تقديم شكاوى كاذبة أو إساءة استخدام النظام
أي مخالفة قد تؤدي إلى رفض البلاغ أو عقوبة داخل السيرفر
━━━━━━━━━━━━━━
🎯 اختر نوع البلاغ:
🟢 بلاغ ضد مواطن (لاعب)
🔴 بلاغ ضد موظف حكومي (إداري)
🟡 بلاغ ضد مسؤول فصيل (قائد فصيل)
━━━━━━━━━━━━━━
📋 عند تقديم البلاغ سيتم طلب:
اسمك داخل السيرفر
اسم الشخص المشكو عليه
اسم السيرفر
الأدلة (صورة / فيديو / رابط)
━━━━━━━━━━━━━━
🕒 وقت الخدمة: ⚡ متاح 24/7 بدون توقف
📌 تتم مراجعة البلاغات حسب الأولوية
⏳ وقت الرد يختلف حسب ضغط العمل
━━━━━━━━━━━━━━
👮‍♂️ العدالة هدفنا، والنظام فوق الجميع
🙏 شكراً لتعاونكم معنا
One Mission Justice Department`,
    components: [row]
  });
});

// ================= INTERACTIONS (UNCHANGED) =================
client.on(Events.InteractionCreate, async (interaction) => {

  if (interaction.isStringSelectMenu()) {

    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(type)
      .setTitle("One Mission Complaint");

    const fields = [
      new TextInputBuilder().setCustomId("name").setLabel("اسمك في اللعبة").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("target").setLabel("اسم الشخص المشكو عليه").setStyle(TextInputStyle.Short),
      new TextInputBuilder().setCustomId("server").setLabel("اسم السيرفر").setStyle(TextInputStyle.Short),
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

  if (interaction.isModalSubmit()) {

    const userId = interaction.user.id;

    if (db.cooldown[userId] && Date.now() - db.cooldown[userId] < 300000) {
      return interaction.reply({
        content: "⛔ انتظر 5 دقائق قبل إرسال شكوى جديدة",
        ephemeral: true
      });
    }

    db.cooldown[userId] = Date.now();

    const id = ++db.count;
    const ticketID = `OM-${String(id).padStart(4, "0")}`;

    const data = {
      id: ticketID,
      type: interaction.customId,
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

    const ticketChannel = await guild.channels.create({
      name: `ticket-${ticketID}`,
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
      .setTitle(`📩 One Mission Ticket ${ticketID}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🎯 الهدف", value: data.target },
        { name: "🏠 السيرفر", value: data.server },
        { name: "📎 الدليل", value: data.proof },
        { name: "🕒 الوقت", value: data.time },
        { name: "📌 الحالة", value: data.status }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${ticketID}`).setLabel("قبول").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${ticketID}`).setLabel("رفض").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`close_${ticketID}`).setLabel("إغلاق").setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({
      content: `👋 مرحباً ${interaction.user}`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ تم إنشاء الشكوى: ${ticketID}`,
      ephemeral: true
    });

    const log = await client.channels.fetch(LOG_CHANNEL).catch(() => null);
    if (log) log.send(`📊 Ticket ${ticketID} opened by ${interaction.user.tag}`);
  }

  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية", ephemeral: true });
    }

    if (action === "close") ticket.status = "CLOSED";
    if (action === "accept") ticket.status = "ACCEPTED";
    if (action === "reject") ticket.status = "REJECTED";

    saveDB();

    await interaction.reply({
      content: `✅ تم ${action} الشكوى ${id}`,
      ephemeral: true
    });
  }
});

// ================= SERVER =================
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("One Mission Ultra Bot Running");
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
