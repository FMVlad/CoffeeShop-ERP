import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Універсальний компонент картки меню
 * @param {Object} props
 * @param {string} props.title - Заголовок картки
 * @param {string} props.icon - Іконка (емодзі)
 * @param {string} props.hint - Опис/підказка
 * @param {string} props.route - Маршрут для навігації
 * @param {string} props.buttonColor - Кольор кнопки (Tailwind класи)
 * @param {string} props.buttonText - Текст кнопки (за замовчуванням "🚀 Перейти")
 * @param {boolean} props.isExternal - Чи є зовнішнім посиланням
 * @param {string} props.externalUrl - URL для зовнішнього посилання
 * @param {Function} props.onClick - Callback функція при кліку
 */
export default function MenuCard({ 
  title, 
  icon, 
  hint, 
  route, 
  buttonColor = "from-blue-500 to-indigo-600",
  buttonText = "🚀 Перейти",
  isExternal = false,
  externalUrl = "",
  onClick = null
}) {
  const cardContent = (
    <>
      {/* Назва зверху */}
      <div className="p-8 pb-4">
        <h3 className="text-4xl font-bold text-gray-800 mb-4 text-center leading-tight group-hover:text-blue-600 transition-colors duration-300">
          {title}
        </h3>
      </div>
      
      {/* Картинка та опис по центру */}
      <div className="px-8 pb-6 flex flex-col items-center">
        <div className="text-8xl mb-6 opacity-80 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <p className="text-xl text-gray-600 text-center leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
          {hint}
        </p>
      </div>
      
      {/* Кнопка внизу */}
      <div className="p-8 pt-4 mt-auto">
        <div className={`bg-gradient-to-r ${buttonColor} rounded-3xl py-3 text-center group-hover:shadow-lg transition-all duration-300`}>
          <span className="text-lg font-semibold text-white">
            {buttonText}
          </span>
        </div>
      </div>
    </>
  );

  // Якщо є onClick функція, використовуємо button
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-4xl shadow-4xl border-2 border-gray-100 bg-white hover:shadow-5xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer transform-gpu w-full text-left flex flex-col h-full"
      >
        {cardContent}
      </button>
    );
  }

  // Якщо зовнішнє посилання
  if (isExternal) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-4xl shadow-4xl border-2 border-gray-100 bg-white hover:shadow-5xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer transform-gpu block flex flex-col h-full"
      >
        {cardContent}
      </a>
    );
  }

  // Звичайне внутрішнє посилання
  return (
    <Link
      to={route}
      className="group relative overflow-hidden rounded-4xl shadow-4xl border-2 border-gray-100 bg-white hover:shadow-5xl hover:scale-105 hover:-translate-y-2 transition-all duration-500 cursor-pointer transform-gpu block flex flex-col h-full"
    >
      {cardContent}
    </Link>
  );
}






