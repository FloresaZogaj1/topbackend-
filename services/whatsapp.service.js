// services/whatsapp.service.js
const axios = require('axios');

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WA_TO = process.env.WHATSAPP_TO; // ku njoftohet (numri yt)

function formatOrderMessage(o) {
  const items = (o.items || []).map(i => `• ${i.name} x${i.qty} — €${Number(i.price).toFixed(2)}`).join('\n');
  return (
    `🛒 Porosi #${o.id}\n` +
    `👤 ${o.customer_name}  📞 ${o.phone}\n` +
    `📍 ${o.address || '-'} ${o.city ? '(' + o.city + ')' : ''}\n` +
    (o.note ? `📝 ${o.note}\n` : '') +
    `\n${items}\n` +
    `\nSubtotal: €${Number(o.subtotal).toFixed(2)}\n` +
    `Dërgesa: €${Number(o.delivery_fee).toFixed(2)}\n` +
    `Total: €${Number(o.total).toFixed(2)}\n` +
    `Status: ${o.status}`
  );
}

async function sendWhatsApp(text) {
  if (!WA_TOKEN || !WA_PHONE_ID || !WA_TO) return;
  const url = `https://graph.facebook.com/v20.0/${WA_PHONE_ID}/messages`;
  await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: WA_TO,
      type: 'text',
      text: { body: text }
    },
    { headers: { Authorization: `Bearer ${WA_TOKEN}` } }
  );
}

exports.notifyOrderWA = async (order) => {
  try {
    const msg = formatOrderMessage(order);
    await sendWhatsApp(msg);
  } catch (e) {
    console.warn('WhatsApp notify failed:', e?.response?.data || e.message);
  }
};
