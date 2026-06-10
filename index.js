const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ✅ ID روم الشكاوى جاهز
const COMPLAINTS_CHANNEL_ID = "1514233580115591250";

client.once("ready", () => {
  console.log(`${client.user.tag} is online`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  // 🟢 ping
  if (message.content === "!ping") {
    return message.reply("🟢 البوت يعمل بنجاح");
  }

  // 📋 help
  if (message.content === "!help") {
    return message.reply(`
📋 أوامر البوت:

!ping - اختبار البوت
!help - عرض الأوامر
!complaint <نص الشكوى>
    `);
  }

  // 🎫 نظام الشكاوى
  if (message.content.startsWith("!complaint")) {
    const text = message.content.replace("!complaint", "").trim();

    if (!text) {
      return message.reply("❌ اكتب الشكوى بعد الأمر");
    }

    const channel = message.guild.channels.cache.get(COMPLAINTS_CHANNEL_ID);

    if (!channel) {
      return message.reply("❌ روم الشكاوى غير موجود أو البوت ما عنده صلاحية");
    }

    channel.send(
      `📩 شكوى جديدة\n👤 من: ${message.author.tag}\n📝 الشكوى: ${text}`
    );

    return message.reply("✅ تم إرسال الشكوى بنجاح");
  }
});

// 🌐 سيرفر Render
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
