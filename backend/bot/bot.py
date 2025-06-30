import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
import os

API_URL = "http://localhost:8000/menu"  # URL FastAPI
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "8091995124:AAE_vPaQflv9AG0B1ig13b2UEMS9XwsxIyU")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Вітаю у кав'ярні! Напишіть /menu, щоб побачити меню.")

async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    resp = requests.get(API_URL)
    if resp.status_code == 200:
        menu = resp.json()
        text = "\n".join([f"{item['emoji']} {item['name']} — ${item['price']}" for item in menu])
        await update.message.reply_text(f"Меню:\n{text}")
    else:
        await update.message.reply_text("Не вдалося отримати меню :(")

if __name__ == "__main__":
    app = ApplicationBuilder().token("8091995124:AAE_vPaQflv9AG0B1ig13b2UEMS9XwsxIyU").build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("menu", menu))
    print("Бот запущено!")
    app.run_polling() 