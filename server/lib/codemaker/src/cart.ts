// Pedido online dos sites gerados. A IA NÃO escreve script (cleanFragment remove): ela só marca o HTML com atributos
// data-* e este módulo, escrito e revisado aqui, entra na página quando algum botão de adicionar existe.
//
// Contrato de marcação (também descrito no prompt do modo livre):
//   <div data-cart-item> ... </div>                       contêiner do produto (opcional: extras e observação)
//   <button type="button" data-cart-add data-name="Nome" data-price="32.90">Adicionar</button>
//   <input type="checkbox" data-extra-name="Bacon" data-extra-price="6">     adicional opcional do produto
//   <input data-cart-note>                                observação do produto (ex.: sem cebola)
//   <button type="button" data-cart-open>Pedido (<span data-cart-count>0</span>)</button>
// O envio abre https://wa.me/<número>?text=<mensagem> com itens, quantidades, observações, modalidade e total. O número
// vem de plan.business.phone (sem ele, o WhatsApp deixa a pessoa escolher o contato). Nada de pagamento, gateway,
// frete ou confirmação automática: o pedido só vira conversa no WhatsApp.

const CART_JS = String.raw`(function(){
  var WA=__WA__, TITLE=__TITLE__, KEY='neva-cart:'+location.pathname;
  var items=[], mode='retirada', address='';
  try{ items=JSON.parse(localStorage.getItem(KEY)||'[]'); if(!Array.isArray(items)) items=[]; }catch(e){ items=[]; }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(items)); }catch(e){} }
  function money(n){ return 'R$ '+(Math.round(n*100)/100).toFixed(2).replace('.',','); }
  function price(v){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)&&n>=0?n:0; }
  function el(tag,cls,text){ var e=document.createElement(tag); if(cls) e.className=cls; if(text!=null) e.textContent=text; return e; }
  function unit(it){ return it.price+it.extras.reduce(function(s,x){ return s+x.price; },0); }
  function total(){ return items.reduce(function(s,it){ return s+unit(it)*it.qty; },0); }
  function count(){ return items.reduce(function(s,it){ return s+it.qty; },0); }

  var overlay=el('div','fixed inset-0 z-[90] bg-black/60 opacity-0 pointer-events-none transition-opacity duration-200 motion-reduce:transition-none');
  var panel=el('aside','fixed right-0 top-0 z-[91] flex h-full w-full max-w-md translate-x-full flex-col bg-paper text-ink shadow-2xl transition-transform duration-300 motion-reduce:transition-none');
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label','Seu pedido'); panel.setAttribute('aria-hidden','true');
  var head=el('div','flex items-center justify-between border-b border-ink/10 px-5 py-4');
  head.appendChild(el('h2','font-display text-2xl','Seu pedido'));
  var closeBtn=el('button','grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-xl focus-visible:outline focus-visible:outline-2','×');
  closeBtn.type='button'; closeBtn.setAttribute('aria-label','Fechar o pedido'); head.appendChild(closeBtn);
  var list=el('div','flex-1 space-y-4 overflow-y-auto px-5 py-4');
  var foot=el('div','space-y-3 border-t border-ink/10 px-5 py-4');
  var live=el('p','sr-only'); live.setAttribute('aria-live','polite');
  panel.appendChild(head); panel.appendChild(list); panel.appendChild(foot); panel.appendChild(live);

  var fab=null;
  var openers=[].slice.call(document.querySelectorAll('[data-cart-open]'));
  if(!openers.length){
    fab=el('button','fixed bottom-4 right-4 z-[80] flex min-h-12 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-paper shadow-xl focus-visible:outline focus-visible:outline-2','Pedido');
    fab.type='button'; fab.setAttribute('data-cart-open','');
    var badge=el('span','grid min-w-6 place-items-center rounded-full bg-paper px-1.5 text-xs font-bold text-ink','0'); badge.setAttribute('data-cart-count','');
    fab.appendChild(badge); document.body.appendChild(fab);
  }

  var lastFocus=null;
  function open(){ lastFocus=document.activeElement; render(); overlay.classList.remove('opacity-0','pointer-events-none'); panel.classList.remove('translate-x-full'); panel.setAttribute('aria-hidden','false'); closeBtn.focus(); }
  function close(){ overlay.classList.add('opacity-0','pointer-events-none'); panel.classList.add('translate-x-full'); panel.setAttribute('aria-hidden','true'); if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  function refreshCount(){ var n=count(); [].forEach.call(document.querySelectorAll('[data-cart-count]'),function(c){ c.textContent=String(n); }); }

  function message(){
    var lines=['*Novo pedido — '+TITLE+'*',''];
    items.forEach(function(it){
      var extras=it.extras.length?' ('+it.extras.map(function(x){ return '+ '+x.name; }).join(', ')+')':'';
      lines.push(it.qty+'x '+it.name+extras+' — '+money(unit(it)*it.qty));
      if(it.note) lines.push('   Obs: '+it.note);
    });
    lines.push('');
    lines.push('Modalidade: '+(mode==='entrega'?'Entrega':'Retirada'));
    if(mode==='entrega'&&address) lines.push('Endereço: '+address);
    lines.push('*Total: '+money(total())+'*');
    return lines.join('\n');
  }

  function render(){
    refreshCount(); save();
    while(list.firstChild) list.removeChild(list.firstChild);
    while(foot.firstChild) foot.removeChild(foot.firstChild);
    if(!items.length){ list.appendChild(el('p','py-10 text-center text-muted','Seu pedido está vazio. Adicione um item do cardápio.')); }
    items.forEach(function(it,i){
      var row=el('div','rounded-xl border border-ink/10 p-3');
      var top=el('div','flex items-start justify-between gap-3');
      var name=el('div','min-w-0'); name.appendChild(el('p','font-semibold',it.name));
      if(it.extras.length) name.appendChild(el('p','text-sm text-muted','+ '+it.extras.map(function(x){ return x.name; }).join(', ')));
      if(it.note) name.appendChild(el('p','text-sm text-muted','Obs: '+it.note));
      top.appendChild(name); top.appendChild(el('p','shrink-0 font-semibold',money(unit(it)*it.qty)));
      var ctl=el('div','mt-3 flex items-center gap-2');
      function btn(label,aria,fn){ var b=el('button','grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-lg focus-visible:outline focus-visible:outline-2',label); b.type='button'; b.setAttribute('aria-label',aria); b.addEventListener('click',fn); return b; }
      ctl.appendChild(btn('−','Diminuir '+it.name,function(){ it.qty-=1; if(it.qty<=0) items.splice(i,1); render(); }));
      ctl.appendChild(el('span','min-w-8 text-center font-semibold',String(it.qty)));
      ctl.appendChild(btn('+','Aumentar '+it.name,function(){ it.qty+=1; render(); }));
      var rm=el('button','ml-auto min-h-11 px-3 text-sm underline focus-visible:outline focus-visible:outline-2','Remover'); rm.type='button'; rm.addEventListener('click',function(){ items.splice(i,1); render(); });
      ctl.appendChild(rm);
      row.appendChild(top); row.appendChild(ctl); list.appendChild(row);
    });
    if(!items.length) return;
    var modeRow=el('div','flex gap-2'); modeRow.setAttribute('role','radiogroup'); modeRow.setAttribute('aria-label','Retirada ou entrega');
    [['retirada','Retirada'],['entrega','Entrega']].forEach(function(m){
      var b=el('button','min-h-11 flex-1 rounded-full border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 '+(mode===m[0]?'border-brand bg-brand text-paper':'border-ink/20'),m[1]);
      b.type='button'; b.setAttribute('role','radio'); b.setAttribute('aria-checked',mode===m[0]?'true':'false');
      b.addEventListener('click',function(){ mode=m[0]; render(); }); modeRow.appendChild(b);
    });
    foot.appendChild(modeRow);
    var addr=null, err=el('p','hidden text-sm text-brand','Informe o endereço de entrega.');
    if(mode==='entrega'){
      addr=el('textarea','w-full rounded-xl border border-ink/20 bg-transparent p-3 text-sm focus-visible:outline focus-visible:outline-2'); addr.rows=2; addr.placeholder='Endereço de entrega (rua, número, bairro)'; addr.value=address; addr.setAttribute('aria-label','Endereço de entrega');
      addr.addEventListener('input',function(){ address=addr.value; }); foot.appendChild(addr); foot.appendChild(err);
    }
    var sum=el('div','flex items-center justify-between text-lg'); sum.appendChild(el('span','','Total')); sum.appendChild(el('strong','font-display text-2xl',money(total()))); foot.appendChild(sum);
    var send=el('button','min-h-12 w-full rounded-full bg-brand px-6 font-semibold text-paper focus-visible:outline focus-visible:outline-2','Enviar pedido pelo WhatsApp'); send.type='button';
    send.addEventListener('click',function(){
      if(mode==='entrega'&&!address.trim()){ err.classList.remove('hidden'); if(addr) addr.focus(); return; }
      var url='https://wa.me/'+(WA||'')+'?text='+encodeURIComponent(message());
      var w=window.open(url,'_blank','noopener'); if(!w) location.href=url;
    });
    foot.appendChild(send);
    foot.appendChild(el('p','text-xs text-muted','O pedido é combinado pelo WhatsApp com o estabelecimento. Valores e disponibilidade são confirmados na conversa.'));
  }

  function add(btn){
    var box=btn.closest('[data-cart-item]')||btn.parentElement||document;
    var name=(btn.getAttribute('data-name')||'').trim(); if(!name) return;
    var extras=[].map.call(box.querySelectorAll('input[data-extra-name]:checked'),function(i){ return { name:i.getAttribute('data-extra-name')||'', price:price(i.getAttribute('data-extra-price')) }; }).filter(function(x){ return x.name; });
    var noteEl=box.querySelector('[data-cart-note]'); var note=noteEl&&noteEl.value?String(noteEl.value).trim().slice(0,200):'';
    var base=price(btn.getAttribute('data-price'));
    var sig=name+'|'+extras.map(function(x){ return x.name; }).sort().join(',')+'|'+note;
    var found=null; items.forEach(function(it){ if(it.sig===sig) found=it; });
    if(found) found.qty+=1; else items.push({ sig:sig, name:name, price:base, extras:extras, note:note, qty:1 });
    if(noteEl) noteEl.value=''; [].forEach.call(box.querySelectorAll('input[data-extra-name]:checked'),function(i){ i.checked=false; });
    save(); refreshCount(); live.textContent=name+' adicionado ao pedido. '+count()+' itens.';
    var old=btn.getAttribute('data-label')||btn.textContent; btn.setAttribute('data-label',old); btn.textContent='Adicionado ✓';
    setTimeout(function(){ btn.textContent=btn.getAttribute('data-label')||old; },1200);
  }

  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target:null; if(!t) return;
    var a=t.closest('[data-cart-add]'); if(a){ e.preventDefault(); add(a); return; }
    var o=t.closest('[data-cart-open]'); if(o){ e.preventDefault(); open(); }
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&panel.getAttribute('aria-hidden')==='false') close();
    if(e.key==='Tab'&&panel.getAttribute('aria-hidden')==='false'){
      var f=[].slice.call(panel.querySelectorAll('button,textarea,input,a[href]')).filter(function(x){ return !x.disabled&&x.offsetParent!==null; }); if(!f.length) return;
      var first=f[0], last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });
  overlay.addEventListener('click',close); closeBtn.addEventListener('click',close);
  document.body.appendChild(overlay); document.body.appendChild(panel);
  refreshCount();
})();`

/** Script do pedido, só se algum botão de adicionar existe no HTML montado. Número e título entram como JSON seguro. */
export function cartRuntime(body: string, plan: { title?: string; business?: { phone?: string | null } | null }): string {
  if (!/\bdata-cart-add\b/.test(body)) return ''
  const phone = String(plan.business?.phone ?? '').replace(/\D/g, '')
  const safe = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
  return `<script>${CART_JS.replace('__WA__', safe(phone.length >= 10 ? phone : '')).replace('__TITLE__', safe(String(plan.title ?? 'Pedido').slice(0, 80)))}</script>`
}

export const CART_PROMPT = `- Pedido online (cardápio, loja, produtos com PREÇO informado no pedido): cada produto fica dentro de um contêiner com o atributo data-cart-item e o botão de adicionar é <button type="button" data-cart-add data-name="Nome do produto" data-price="32.90">Adicionar</button> (preço com ponto; sem preço informado, NÃO use o carrinho). Adicionais opcionais do produto: <label><input type="checkbox" data-extra-name="Bacon" data-extra-price="6"> Bacon +R$ 6</label>. Observação do cliente: <input data-cart-note placeholder="Ex.: sem cebola">. O carrinho (lista, quantidades, retirada/entrega, total e envio pelo WhatsApp) já existe e é injetado pelo sistema: NÃO escreva script nem crie outro carrinho. Para o contador no topo da seção use <button type="button" data-cart-open>Ver pedido (<span data-cart-count>0</span>)</button>. O sistema também mostra um botão flutuante do pedido quando você não coloca um.`
