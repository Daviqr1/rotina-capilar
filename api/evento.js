// API de Conversoes do Meta: recebe o beacon da pagina e reenvia o evento pelo servidor,
// com o mesmo eventID do pixel para o Meta desduplicar. Sem META_CAPI_TOKEN vira no-op.
const PIXEL = '1441557431231612';
const PERMITIDOS = new Set(['PageView', 'ViewContent', 'InitiateCheckout', 'Rolou25', 'Rolou75', 'Rolou100',
  'Tempo15s', 'Tempo45s', 'Tempo90s', 'VoltouDoCheckout']);
// o endpoint e publico: so aceita chamada vinda do proprio dominio e nao confia em valor vindo do cliente
const HOSTS = new Set(['minharotinacapilar.com', 'www.minharotinacapilar.com']);
const PRECO = { '2': 127, '4': 197, '6': 247 };
const host = (u) => { try { return new URL(u).hostname; } catch { return ''; } };

// beacon vindo de outro dominio nao leva cookie: a pagina manda _fbp/_fbc no corpo, e so passa o formato fb.N.tempo.id
const fbCookie = (v) => (typeof v === 'string' && /^fb\.\d\.\d{10,13}\.[\w.-]{1,200}$/.test(v) ? v : undefined);

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
  const id = String(b.id || '');
  if (!id.startsWith(nome + '.') || !/^[a-z0-9]{6,24}$/.test(id.slice(nome.length + 1))) return res.status(400).end();
  const origem = host(req.headers.origin || req.headers.referer || '');
  if (!HOSTS.has(origem) || !HOSTS.has(host(String(b.u || '')))) return res.status(403).end();
  if (!token) return res.status(204).end();

  const url = new URL(String(b.u)).href;
  const fbclid = new URL(url).searchParams.get('fbclid');
  const fbc = cookie(req, '_fbc') || fbCookie(b.fbc) || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
  const d = b.d || {};
  const kit = PRECO[String(d.kit || '')] ? String(d.kit) : (/^tonico-(2|4|6)$/.test(String(d.content_name || '')) ? String(d.content_name).slice(7) : undefined);
  const custom = {};
  if (kit) custom.kit = kit;
  if (nome === 'InitiateCheckout') Object.assign(custom, { value: PRECO[kit || '2'], currency: 'BRL', content_name: 'tonico-' + (kit || '2') });
  for (const k of ['segundos_na_pagina', 'segundos_fora']) if (Number.isFinite(d[k])) custom[k] = Math.max(0, Math.min(86400, Math.round(d[k])));

  const evento = {
    event_name: nome,
    event_time: Math.floor(Date.now() / 1000),
    event_id: id,
    event_source_url: url,
    action_source: 'website',
    user_data: { client_ip_address: ip, client_user_agent: req.headers['user-agent'], fbp: cookie(req, '_fbp') || fbCookie(b.fbp), fbc },
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
