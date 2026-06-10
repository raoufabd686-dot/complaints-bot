const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ضع ID روم الشكاوى هنا
const COMPLAINTS_CHANNEL_ID = "PUT_CHANNEL_ID_HERE";

client.once("clientReady", () => {
  console.log(`${client.user.tag} is online`);
});

client.on("messageCreate", (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith("!complaint")) {
    const text = message.content.replace("!complaint", "").trim();

    if (!text) {
      return message.reply("❌ اكتب الشكوى بعد الأمر");
    }

    const channel = message.guild.channels.cache.get(COMPLAINTS_CHANNEL_ID);

    if (!channel) {
      return message.reply("❌ روم الشكاوى غير موجود");
    }

    channel.send(
      `📩 شكوى جديدة\n👤 من: ${message.author.tag}\n📝: ${text}`
    );

    message.reply("✅ تم إرسال الشكوى");
  }

  if (message.content === "!ping") {
    message.reply("🟢 البوت يعمل بنجاح");
  }

  if (message.content === "!help") {
    message.reply("!ping | !help | !complaint");
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bot is running!");
});

server.listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
