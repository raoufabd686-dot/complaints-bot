import discord
from discord.ext import commands
import asyncio

intents = discord.Intents.default()
intents.guilds = True
intents.messages = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

CATEGORY_NAME = "Tickets"
LOG_CHANNEL_NAME = "ticket-logs"


class TicketView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="فتح شكوى", style=discord.ButtonStyle.green)
    async def open_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):

        guild = interaction.guild

        category = discord.utils.get(guild.categories, name=CATEGORY_NAME)
        if category is None:
            category = await guild.create_category(CATEGORY_NAME)

        channel = await guild.create_text_channel(
            name=f"ticket-{interaction.user.name}",
            category=category,
            overwrites={
                guild.default_role: discord.PermissionOverwrite(view_channel=False),
                interaction.user: discord.PermissionOverwrite(view_channel=True, send_messages=True),
                guild.me: discord.PermissionOverwrite(view_channel=True)
            }
        )

        await channel.send(
            f"🎫 تم فتح شكوى بواسطة {interaction.user.mention}",
            view=CloseView()
        )

        await interaction.response.send_message(
            f"تم فتح الشكوى هنا: {channel.mention}",
            ephemeral=True
        )


class CloseView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="إغلاق الشكوى", style=discord.ButtonStyle.red)
    async def close_ticket(self, interaction: discord.Interaction, button: discord.ui.Button):

        channel = interaction.channel

        log_channel = discord.utils.get(interaction.guild.text_channels, name=LOG_CHANNEL_NAME)

        messages = []
        async for msg in channel.history(limit=50):
            messages.append(f"{msg.author}: {msg.content}")

        if log_channel:
            await log_channel.send(
                f"📁 تم إغلاق الشكوى: {channel.name}\n\n" + "\n".join(messages[:20])
            )

        await interaction.response.send_message("جاري الإغلاق...", ephemeral=True)
        await asyncio.sleep(2)

        await channel.delete()


@bot.command()
async def panel(ctx):
    await ctx.send("🎫 اضغط الزر لفتح شكوى", view=TicketView())


@bot.event
async def on_ready():
    print(f"Bot is ready: {bot.user}")


bot.run("PUT_YOUR_TOKEN_HERE")
