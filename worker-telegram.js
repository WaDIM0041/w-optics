// Cloudflare Worker: заказы с сайта woptic.annakam.ru → Telegram
// Секреты Worker (Settings → Variables and Secrets → Secrets):
//   BOT_TOKEN — токен бота от @BotFather
//   CHAT_ID   — id вашего чата с ботом
// Инструкция по развёртыванию: TELEGRAM-SETUP.md

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('W OPTICS orders endpoint', { headers: cors });

    try {
      const d = await request.json();
      const lines = [
        '🛒 НОВЫЙ ЗАКАЗ ' + (d.oid || ''),
        '',
        '👤 Имя: ' + (d.name || ''),
        '📞 Телефон: ' + (d.phone || ''),
        d.email ? '📧 Email: ' + d.email : null,
        '👓 Диоптрии: ' + (d.dioUnknown ? 'не знает, нужна помощь' : 'правый ' + (d.dioR || '0.00') + ' D, левый ' + (d.dioL || '0.00') + ' D'),
        '📦 Комплектов: ' + (d.qty || 1),
        '🚚 Доставка: ' + (d.delivery || ''),
        d.addr ? '📍 Адрес: ' + d.addr : null,
        d.consent ? '✅ Согласие на ПД: да, ' + (d.consentTs || '') : '⚠️ Согласие на ПД: нет',
      ].filter(Boolean);
      if (d.comment) lines.push('💬 Комментарий: ' + d.comment);
      lines.push('💰 Сумма (товары): ' + (d.total || 0) + ' ₽');
      if (d.ts) lines.push('🕐 ' + d.ts);

      const tg = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.CHAT_ID, text: lines.join('\n') }),
      });
      if (!tg.ok) return new Response('telegram error', { status: 502, headers: cors });
      return new Response('ok', { headers: cors });
    } catch (e) {
      return new Response('bad request', { status: 400, headers: cors });
    }
  },
};
