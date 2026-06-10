const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("clientReady", () => {
  console.log(`${client.user.tag} is online`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("🟢 البوت يعمل بنجاح");
  }

  if (message.content === "!server") {
    message.reply(
      `🏠 اسم السيرفر: ${message.guild.name}\n👥 عدد الأعضاء: ${message.guild.memberCount}`
    );
  }

  if (message.content === "!user") {
    message.reply(
      `👤 اسم المستخدم: ${message.author.username}\n🆔 المعرف: ${message.author.id}`
    );
  }

  if (message.content === "!help") {
    message.reply(`
📋 أوامر البوت:

🟢 !ping - اختبار البوت
👤 !user - معلومات المستخدم
🏠 !server - معلومات السيرفر
📖 !help - عرض الأوامر
    `);
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Web server started");
});

client.login(process.env.TOKEN);
