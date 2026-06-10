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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🎯 IDs
const SUPPORT_CHANNEL = "PUT_CHANNEL_ID";
const LOG_CHANNEL = "PUT_LOG_CHANNEL_ID";

// 💾 DB
let db = fs.existsSync("./db.json")
  ? JSON.parse(fs.readFileSync("./db.json", "utf8"))
  : { count: 0, tickets: {} };

const saveDB = () =>
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));

// ================= READY =================
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
    .setTitle("🚨📜 نظام الشكاوى – One Mission RP")
    .setDescription(`
👮‍♂️ وزارة العدل – وحدة الشكاوى

👋 مرحباً بك  
اختر نوع الشكوى من الأسفل

━━━━━━━━━━━━━━
🟢 لاعب | 🔴 إداري | 🟡 قائد فصيل
━━━━━━━━━━━━━━
⚡ النظام يعمل 24/7
    `);

  await channel.send({ embeds: [embed], components: [row] });
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async (interaction) => {

  // 🎯 اختيار نوع الشكوى
  if (interaction.isStringSelectMenu()) {
    const type = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(type)
      .setTitle("نموذج الشكوى");

    const name = new TextInputBuilder()
      .setCustomId("name")
      .setLabel("اسمك في اللعبة")
      .setStyle(TextInputStyle.Short);

    const target = new TextInputBuilder()
      .setCustomId("target")
      .setLabel("اسم الشخص المشكو عليه")
      .setStyle(TextInputStyle.Short);

    const server = new TextInputBuilder()
      .setCustomId("server")
      .setLabel("اسم السيرفر")
      .setStyle(TextInputStyle.Short);

    const proof = new TextInputBuilder()
      .setCustomId("proof")
      .setLabel("الدليل")
      .setStyle(TextInputStyle.Paragraph);

    modal.addComponents(
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(target),
      new ActionRowBuilder().addComponents(server),
      new ActionRowBuilder().addComponents(proof)
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
      time: new Date().toLocaleString("ar-DZ"),
      rating: null
    };

    db.tickets[id] = data;
    saveDB();

    const guild = interaction.guild;

    // 🎫 إنشاء تكت
    const ticket = await guild.channels.create({
      name: `ticket-${id}`,
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
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle(`📩 شكوى رقم #${id}`)
      .addFields(
        { name: "👤 الاسم", value: data.name },
        { name: "🎯 ضد", value: data.target },
        { name: "🏠 السيرفر", value: data.server },
        { name: "📎 الدليل", value: data.proof },
        { name: "🕒 الوقت", value: data.time },
        { name: "📌 الحالة", value: data.status }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`close_${id}`).setLabel("إغلاق").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`accept_${id}`).setLabel("قبول").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${id}`).setLabel("رفض").setStyle(ButtonStyle.Secondary)
    );

    await ticket.send({
      content: `👋 <@${interaction.user.id}>`,
      embeds: [embed],
      components: [row]
    });

    await interaction.reply({
      content: `✅ تم فتح الشكوى: ${ticket}`,
      ephemeral: true
    });

    const log = await client.channels.fetch(LOG_CHANNEL);
    log.send(`📊 شكوى جديدة #${id} من ${interaction.user.tag}`);
  }

  // 🔘 الأزرار
  if (interaction.isButton()) {

    const [action, id] = interaction.customId.split("_");
    const ticket = db.tickets[id];

    if (!ticket) return;

    // 👮 صلاحية الإدارة
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: "❌ ليس لديك صلاحية", ephemeral: true });
    }

    // 🔒 إغلاق
    if (action === "close") {
      ticket.status = "CLOSED";

      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false
      });

      await interaction.reply("🔒 تم إغلاق الشكوى");

      // ⭐ تقييم بعد الإغلاق
      const ratingMsg = await interaction.channel.send(
        "⭐ قيّم تجربتك من 1 إلى 5"
      );
    }

    if (action === "accept") ticket.status = "ACCEPTED";
    if (action === "reject") ticket.status = "REJECTED";

    saveDB();
  }
});

// ================= BOT =================
client.login(process.env.TOKEN);
