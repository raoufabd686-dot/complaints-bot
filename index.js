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
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", (message) => {
  if (message.content === "!ping") {
    message.reply("البوت يعمل بنجاح ✅");
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
