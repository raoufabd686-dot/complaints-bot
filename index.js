const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const COMPLAINTS_CHANNEL_ID = "1514233580115591250";

client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

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
      content: `🚨 شكاوى One Mission

👋 مرحباً بك في نظام الشكاوى

يرجى تقديم الشكوى بشكل واضح مع الأدلة إن وجدت.

🙏 شكراً لتعاونك معنا

━━━━━━━━━━━━━━

📌 النتيجة داخل اللعبة:

🟢 شكوى ضد لاعب  
🔴 شكوى ضد إداري  
🟡 شكوى ضد قائد فصيل`,
      components: [row]
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const channel = interaction.guild.channels.cache.get(COMPLAINTS_CHANNEL_ID);

  if (!channel) {
    return interaction.reply({ content: "❌ روم الشكاوى غير موجود", ephemeral: true });
  }

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

  channel.send({
    content: `📩 شكوى جديدة

👤 من: ${interaction.user.tag}
📌 النوع: ${type}
🕒 الوقت: ${new Date().toLocaleString()}`
  });

  interaction.reply({
    content: "✅ تم إرسال شكواك بنجاح",
    ephemeral: true
  });
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
