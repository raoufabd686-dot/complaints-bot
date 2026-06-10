const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const COMPLAINTS_CHANNEL_ID = "1514233580115591250";

// رقم الشكاوى
let complaintID = 0;

client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

// فتح النظام
client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!report") {

    const menu = new StringSelectMenuBuilder()
      .setCustomId("complaint_menu")
      .setPlaceholder("📌 اختر نوع الشكوى")
      .addOptions([
        { label: "شكوى ضد لاعب", value: "player", emoji: "🟢" },
        { label: "شكوى ضد إداري", value: "admin", emoji: "🔴" },
        { label: "شكوى ضد قائد فصيل", value: "leader", emoji: "🟡" }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    message.reply({
      content: `🚨 **نظام الشكاوى - One Mission**

👋 مرحباً بك

اختر نوع الشكوى من القائمة 👇`,
      components: [row]
    });
  }
});

// التفاعل
client.on("interactionCreate", async (interaction) => {

  // اختيار الشكوى
  if (interaction.isStringSelectMenu()) {

    const channel = interaction.guild.channels.cache.get(COMPLAINTS_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({ content: "❌ روم الشكاوى غير موجود", ephemeral: true });
    }

    complaintID++;
    const id = `#${complaintID}`;

    let type = "";

    switch (interaction.values[0]) {
      case "player":
        type = "🟢 شكوى ضد لاعب";
        break;
      case "admin":
        type = "🔴 شكوى ضد إداري";
        break;
      case "leader":
        type = "🟡 شكوى ضد قائد فصيل";
        break;
    }

    // أزرار التحكم
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`close_${id}`)
        .setLabel("إغلاق")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`accept_${id}`)
        .setLabel("قبول")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`reject_${id}`)
        .setLabel("رفض")
        .setStyle(ButtonStyle.Secondary)
    );

    channel.send({
      content: `📩 **شكوى جديدة ${id}**

👤 من: ${interaction.user.tag}
📌 النوع: ${type}
🕒 الوقت: ${new Date().toLocaleString("ar-DZ")}

━━━━━━━━━━━━━━`,
      components: [row]
    });

    return interaction.reply({
      content: "✅ تم إرسال شكواك بنجاح",
      ephemeral: true
    });
  }

  // أزرار التحكم
  if (interaction.isButton()) {

    if (interaction.customId.startsWith("close")) {
      return interaction.reply({
        content: "🔒 تم إغلاق الشكوى",
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith("accept")) {
      return interaction.reply({
        content: "✅ تم قبول الشكوى",
        ephemeral: true
      });
    }

    if (interaction.customId.startsWith("reject")) {
      return interaction.reply({
        content: "❌ تم رفض الشكوى",
        ephemeral: true
      });
    }
  }
});

// سيرفر Render
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
