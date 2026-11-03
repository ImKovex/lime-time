// Lime Bar Book (build: I-Rock, look: Artis, recipes: Expo in recipes.json). Team code shared with Lime Time.
const TEAM_CODE='LIME2026';let R={drinks:[],batches:[]},tab='drinks',filter='',chip='All',back=null,deck=[],fi=0,flip=false,again=[];
const app=document.getElementById('app'),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),$=s=>app.querySelector(s);
const AMT=/^([\d.\/½¼¾,\s-]+\s*(?:oz|tbsp|tsp|ml|mL|L|qts?|Qts?|cups?|Cups?|dashes|Dashes|cans?|Cans?)?)\s+(.+)$/;
async function load(){try{R=await fetch('recipes.json',{cache:'no-store'}).then(r=>r.json())}catch(e){}}
function nav(){return`<nav class="tabs">${[['drinks','Drinks'],['prep','Prep'],['flash','Flash cards']].map(([k,l])=>`<a data-t="${k}" class="${tab===k?'is-on':''}">${l}</a>`).join('')}</nav>`}
function wire(){app.querySelectorAll('.tabs a').forEach(a=>a.onclick=()=>{tab=a.dataset.t;filter='';chip='All';tab==='flash'?startFlash():list();scrollTo(0,0)})}
function gate(){app.innerHTML=`<div class="gate"><img src="assets/logo-wordmark.svg" alt="Lime Time" style="width:100%;max-width:220px"><div class="title">Bar Book</div>
<input class="search" id="code" placeholder="Team code" autocapitalize="characters"><p class="err" id="err" hidden></p><button class="btn got" id="go">Open</button></div>`;
$('#go').onclick=()=>{if($('#code').value.trim().toUpperCase()===TEAM_CODE){localStorage.setItem('lq_code',TEAM_CODE);list()}else{const e=$('#err');e.hidden=false;e.textContent='Wrong team code. Ask your trainer.'}}}
function sub(d){return d.glass&&d.glass.length<=24?d.glass:(d.type||'').replace('|',' or ')||d.yield||''}
function tags(d){return(d.allergens||[]).map(a=>`<span class="tag allergy">${esc(a)}</span>`).join('')+(d.zero?'<span class="tag zero">0%</span>':'')}
function list(){const prep=tab==='prep',src=prep?R.batches:R.drinks,q=filter.toLowerCase();
const ok=d=>(!q||JSON.stringify(d).toLowerCase().includes(q))&&(prep||chip==='All'||(chip==='0% alcohol'?d.zero:(d.type||'').toLowerCase().includes(chip.toLowerCase())));
app.innerHTML=`<div class="top"><div class="title">${prep?'Prep':'Bar Book'}</div><input class="search" id="q" type="search" placeholder="Search a ${prep?'batch':'drink'} or ingredient" value="${esc(filter)}">
${prep?'':`<div class="filters">${['All','Rocks','Frozen','0% alcohol'].map(c=>`<button class="chip ${chip===c?'is-on':''}">${c}</button>`).join('')}</div>`}</div>
<div id="res">${src.map((d,i)=>ok(d)?`<button class="row" data-i="${i}"><div><b>${esc(d.name)}</b><small>${esc(sub(d))}</small></div><span>${tags(d)}</span></button>`:'').join('')||'<p class="stamp">No matches.</p>'}</div><p class="stamp" id="stamp"></p>${nav()}`;
wire();const s=$('#q');s.oninput=()=>{filter=s.value;const p=s.selectionStart;list();const n=$('#q');n.focus();n.setSelectionRange(p,p)};
app.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{chip=b.textContent;list()});app.querySelectorAll('#res .row').forEach(b=>b.onclick=()=>show(src[+b.dataset.i]));stamp()}
function spec(d){const ing=(d.ingredients||[]).map(x=>{const m=String(x).match(AMT);return`<li>${m?`<span class="amt">${esc(m[1].trim())}</span>${esc(m[2])}`:`<span class="amt"></span>${esc(x)}`}</li>`}).join('');
const meta=[['Glass',d.glass],['Ice',d.ice],['Rim',d.rim],['Garnish',(d.garnish||[]).join(', ')],['Tools',d.tools],['Yield',d.yield]].filter(x=>x[1]);
return`${meta.length?`<div class="meta">${meta.map(([k,v])=>`<div><span>${k}</span>${esc(v)}</div>`).join('')}</div>`:''}${ing?`<div class="spec"><h2>Build</h2><ul>${ing}</ul></div>`:''}
${d.method&&d.method.length?`<h3>Method</h3><ol>${d.method.map(m=>`<li>${esc(m)}</li>`).join('')}</ol>`:''}${d.notes?`<h3>Notes</h3><p class="note">${esc(d.notes)}</p>`:''}`}
function show(d){app.innerHTML=`<div class="top"><a id="bk" style="color:var(--lime);font-weight:900">‹ ${tab==='prep'?'Prep':'Drinks'}</a></div><div class="recipe"><h1>${esc(d.name)}</h1>
${d.zero?'<span class="tag zero">0% alcohol</span>':''}${(d.allergens||[]).map(a=>`<div class="warn">Contains ${esc(a.toLowerCase()==='egg'?'egg white':a)}</div>`).join('')}${spec(d)}</div>${nav()}`;$('#bk').onclick=list;wire();scrollTo(0,0)}
function startFlash(){deck=R.drinks.map((_,i)=>i).sort(()=>Math.random()-.5);again=[];fi=0;flip=false;card()}
function card(){if(fi>=deck.length&&again.length){deck=again;again=[];fi=0}
if(fi>=deck.length){app.innerHTML=`<div class="top"><div class="title">Flash cards</div></div><div class="fc"><h1>Deck done</h1><p>You got every drink.</p></div><div class="fc-btns"><button class="btn got" id="re">Shuffle again</button></div>${nav()}`;wire();$('#re').onclick=startFlash;return}
const d=R.drinks[deck[fi]],ing=(d.ingredients||[]).map(x=>`<li>${esc(x)}</li>`).join(''),end=[d.glass,(d.garnish||[]).join(', ')].filter(Boolean).join(' · ');
app.innerHTML=`<div class="top"><div class="title">Flash cards</div></div><div class="fc" id="fc"><div class="q">Tap to flip</div><h1>${esc(d.name)}</h1>
${flip?`<ul>${ing}${end?`<li>${esc(end)}</li>`:''}${d.rim?`<li>Rim: ${esc(d.rim)}</li>`:''}${(d.allergens||[]).map(a=>`<li><b>Contains ${esc(a)}</b></li>`).join('')}</ul><div class="hint">Back of card</div>`:`<div class="hint">Say the build, then tap</div>`}</div>
<div class="count">Card ${fi+1} of ${deck.length}${again.length?` · ${again.length} to review again`:''}</div>${flip?`<div class="fc-btns"><button class="btn again" id="ag">Again</button><button class="btn got" id="ok">Got it</button></div>`:''}${nav()}`;wire();
$('#fc').onclick=()=>{flip=!flip;card()};if(flip){$('#ok').onclick=()=>{fi++;flip=false;card()};$('#ag').onclick=()=>{again.push(deck[fi]);fi++;flip=false;card()}}}
let seen=null;async function ver(){try{const r=await fetch('version.json',{cache:'no-store'}).then(r=>r.json());if(seen===null){seen=r;return stamp()}if(r.v!==seen.v){if(tab==='flash'&&fi>0){seen=r;await load();return}location.reload()}}catch(e){}}
function stamp(){const s=document.getElementById('stamp');if(s&&seen&&seen.updated)s.textContent='Updated '+seen.updated}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ver()});setInterval(ver,60000);
load().then(()=>{localStorage.getItem('lq_code')===TEAM_CODE?list():gate();ver()});
