# gera index.html a partir do template oficial do produtor (pack Drive "Pagina HTML"):
# links cpa do afiliado, pixel proprio, imagens locais; tira o R$97 sem plano na Braip e numeros/depoimentos sem fonte
import re
s = open('work/template-oficial.html', encoding='utf-8').read()
CPA = {'2': 'https://ev.braip.com/campanhas/cpa/camk75y5o', '4': 'https://ev.braip.com/campanhas/cpa/cam442g2e', '6': 'https://ev.braip.com/campanhas/cpa/camj2v5vv'}
def rep(old, new, count=None):
    global s
    n = s.count(old)
    assert n, f'nao achei: {old[:60]}'
    if count: assert n == count, (old[:60], n)
    s = s.replace(old, new)
# pixel
rep('SEU_PIXEL_ID', '1441557431231612')
# links por kit
s, n = re.subn(r'href="Kit com (\d) T[oô]nicos" data-checkout="(\d)"', lambda m: f'href="{CPA[m.group(2)]}" data-checkout="{m.group(2)}"', s)
assert n == 14, n
# imagens: locais (sem hotlink); foto de clinica e miniatura do Google trocadas por cenas nossas
s = re.sub(r'https://cdn\.shopify\.com/s/files/1/0947/5090/0540/files/([^"?]+)(\?v=\d+)?', lambda m: 'img/oficial/' + m.group(1).replace('.png', '.jpg') if m.group(1).startswith('ChatGPT') else 'img/oficial/' + m.group(1), s)
s, n = re.subn(r'https://www\.carumoreno\.com\.br/[^"]+', 'img/oficial/escova.jpg', s); assert n == 1
s, n = re.subn(r'https://encrypted-tbn0\.gstatic\.com/images\?[^"]+', 'img/oficial/ralo.jpg', s); assert n == 1
# preco do topo: o kit de 2 custa R$127 no checkout (nao ha plano de R$97 do tonico)
rep('<strong>12x de R$ 9,83</strong>ou R$ 97,00 à vista', '<strong>R$ 127</strong>kit com 2 tônicos, no cartão ou Pix')
# notas/contagens sem fonte publica
s = re.sub(r'<div class="rating-chip">.*?</div>', '', s, count=1, flags=re.S)
s = re.sub(r'<div><strong>7\.880\+</strong><span>unidades vendidas</span></div>', '', s)
s = re.sub(r'<div><strong>4,9/5</strong><span>média nas avaliações</span></div>', '', s)
# depoimentos copiados ("reproduzidos da pagina original") saem: a secao inteira de reviews
s, n = re.subn(r'<section[^>]*>(?:(?!</section>).)*?reviews-head.*?</section>', '', s, flags=re.S); assert n == 1, n
# rastreio + utm: InitiateCheckout no clique, ViewContent a 50% do scroll
JS = '''<script>
(function(){
  var V={"2":127,"4":197,"6":247},vc=false;
  window.addEventListener('scroll',function(){var d=document.documentElement,h=d.scrollHeight-innerHeight;if(!vc&&h>0&&scrollY/h>=.5){vc=true;window.fbq&&fbq('track','ViewContent')}},{passive:true});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a[data-checkout]');if(!a)return;
    e.preventDefault();var k=a.getAttribute('data-checkout'),u=a.href,q=new URLSearchParams(location.search),keep=[];
    q.forEach(function(v,n){if(n.indexOf('utm_')===0||n==='fbclid')keep.push(encodeURIComponent(n)+'='+encodeURIComponent(v))});
    if(keep.length)u+=(u.indexOf('?')>-1?'&':'?')+keep.join('&');
    window.fbq&&fbq('track','InitiateCheckout',{value:V[k]||127,currency:'BRL',content_name:'tonico-'+k});
    setTimeout(function(){location.href=u},180);
  },true);
})();
</script>
<footer style="text-align:center;font-size:12px;color:#777;padding:18px 16px 90px">Este site é de um afiliado independente e não é o site oficial do fabricante. Este site não é afiliado ao Facebook. <a href="privacidade.html">Privacidade</a> · <a href="termos.html">Termos</a></footer>
</body>'''
rep('</body>', JS, count=1)
if '<meta name="robots"' not in s: s = s.replace('<head>', '<head>\n<meta name="robots" content="noindex">', 1)
open('index.html', 'w', encoding='utf-8').write(s)
print('ok', len(s))
