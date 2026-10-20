// API de Conversoes do Meta: recebe o beacon da pagina e reenvia o evento pelo servidor,
// com o mesmo eventID do pixel para o Meta desduplicar. Sem META_CAPI_TOKEN vira no-op.
const PIXEL = '1441557431231612';
const PERMITIDOS = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'Rolou25', 'Rolou75', 'Rolou100',
  'Tempo15s', 'Tempo45s', 'Tempo90s', 'VoltouDoCheckout']);

function cookie(req, nome) {
  const m = (req.headers.cookie || '').match(new RegExp('(?:^|; )' + nome + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : undefined;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const token = process.env.META_CAPI_TOKEN;
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const nome = b && String(b.n || '');
  if (!b || !(PERMITIDOS.has(nome) || /^Clique_(fixo|cta\d{1,2})$/.test(nome))) return res.status(400).end();
  if (!token) return res.status(204).end();

  let url = '';
  try { url = new URL(String(b.u || '')).href; } catch { url = 'https://minharotinacapilar.com/'; }
  const fbclid = new URL(url).searchParams.get('fbclid');
  const fbc = cookie(req, '_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
  const custom = {};
  for (const [k, v] of Object.entries(b.d || {})) if (typeof v === 'string' || typeof v === 'number') custom[k] = v;

  const evento = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(b.id || '').slice(0, 64),
    event_source_url: url,
    action_source: 'website',
    user_data: { client_ip_address: ip, client_user_agent: req.headers['user-agent'], fbp: cookie(req, '_fbp'), fbc },
    custom_data: custom,
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: [evento] }),
    });
    if (!r.ok) console.error('capi', r.status, (await r.text()).slice(0, 300));
  } catch (e) {
    console.error('capi falhou', String(e).slice(0, 200));
  }
  return res.status(204).end();
};
