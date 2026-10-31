// Team code for the start screen. Change here.
const TEAM_CODE='LIME2026';
const $=s=>document.querySelector(s),app=$('#app');let Q,O,player=localStorage.getItem('lq_name')||'',timer,pending;
const stop=()=>{clearInterval(timer);clearTimeout(pending)};
const shuf=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const board=()=>JSON.parse(localStorage.getItem('lq_board')||'[]');
const draft='<p class="muted small" style="text-align:center">DRAFT content · Chloe\'s master list replaces this</p>';
function save(mode,score){const b=board();b.push({name:player,mode,score});b.sort((a,b)=>b.score-a.score);localStorage.setItem('lq_board',JSON.stringify(b.slice(0,25)))}
async function init(){[Q,O]=await Promise.all([fetch('questions.json').then(r=>r.json()),fetch('orders.json').then(r=>r.json())]);player&&localStorage.getItem('lq_code')===TEAM_CODE?home():nameScreen()}
function nameScreen(){app.innerHTML=`<div style="text-align:center;padding-top:24px"><img src="assets/logo-wordmark.svg" alt="Lime Time" style="width:100%;max-width:320px"></div>
<div class="card"><p class="eyebrow">FOH Training Game</p><h2>Pick a nickname</h2><p class="muted small">No sign-in. Scores stay on this device.</p></div>
<input class="input" id="nm" maxlength="20" placeholder="e.g. SalsaQueen">${localStorage.getItem('lq_code')===TEAM_CODE?'':'<input class="input" id="code" placeholder="Team code" autocapitalize="characters">'}<p class="banner no" id="err" hidden></p><div class="grow"></div><button class="btn btn-primary" id="go">Let's play</button>${draft}`;
$('#go').onclick=()=>{const v=$('#nm').value.trim(),c=$('#code');if(c&&c.value.trim().toUpperCase()!==TEAM_CODE){const e=$('#err');e.hidden=false;e.textContent='Wrong team code. Ask your trainer.';return}if(c)localStorage.setItem('lq_code',TEAM_CODE);if(!v){const e=$('#err');e.hidden=false;e.textContent='Add your name to play.';return}if(v){player=v;localStorage.setItem('lq_name',v);home()}}}
function home(){stop();app.className='screen';app.innerHTML=`<div style="text-align:center"><img src="assets/logo-wordmark.svg" alt="Lime Time" style="width:100%;max-width:240px"></div>
<div class="topbar"><span>Hey <b>${esc(player)}</b></span><button class="btn btn-secondary" id="chg" style="width:auto">Change name</button></div>
<p class="eyebrow">Quiz rounds</p>${Q.categories.map((c,i)=>`<button class="btn btn-primary" data-c="${i}">${c.icon?`<img class="tile-icon" src="${esc(c.icon)}" alt="">`:''}${esc(c.name)} <small>(${c.questions.length})</small></button>`).join('')}
<p class="eyebrow">Practice ordering</p><button class="btn btn-secondary" id="ring">Ring It In</button>
<button class="btn btn-secondary" id="lb">Leaderboard</button>${draft}`;
app.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>quiz(Q.categories[b.dataset.c]));$('#ring').onclick=ring;$('#lb').onclick=lb;$('#chg').onclick=nameScreen}
function quiz(cat){app.className='screen'+(cat.theme?' '+cat.theme:'');const qs=shuf(cat.questions).slice(0,10);let i=0,score=0,streak=0,missed=[];
 const next=()=>{if(i>=qs.length)return end();const q=qs[i];let t=15;
  app.innerHTML=`<div class="topbar"><button class="btn btn-icon" id="quit" aria-label="Quit">✕</button><span class="pill">★ ${score}${streak>=2?' 🔥'+streak:''}</span><div class="timer" id="tm" style="--p:1"><span>15</span></div></div>
  <div><p class="eyebrow">${esc(cat.name)} · DRAFT</p><div class="progress"><i style="width:${i/qs.length*100}%"></i></div><p class="muted small">Question ${i+1} of ${qs.length}</p></div>
  ${q.flag?`<p class="banner no">⚠ ${esc(q.flag)}</p>`:''}<h1 style="font-size:clamp(20px,6vw,26px)">${esc(q.q)}</h1>
  <div class="answers">${q.choices.map((c,k)=>`<button class="tile" data-k="${k}"><span class="key">${'ABCD'[k]}</span>${esc(c)}</button>`).join('')}</div>
  <p class="muted small" style="text-align:center">Source: ${esc(q.source)}</p>`;
  $('#quit').onclick=()=>{stop();home()};
  const pick=k=>{clearInterval(timer);const bs=app.querySelectorAll('[data-k]');bs.forEach((b,j)=>{b.disabled=true;if(j!==q.answer&&j!==k)b.classList.add('is-dim')});bs[q.answer].classList.add('is-correct');
   if(k===q.answer){streak++;score+=100+t*10+(streak>=3?50:0)}else{streak=0;if(k>=0)bs[k].classList.add('is-wrong');missed.push({src:q.source,q:q.q,your:k>=0?q.choices[k]:'(time ran out)',right:q.choices[q.answer]})}
   i++;if(q.story){app.querySelector('.answers').insertAdjacentHTML('afterend',`<div class="story-card"><span class="story-label">Tell it at the table</span>${esc(q.story)}</div><button class="btn btn-primary" id="nq">Next ➜</button>`);$('#nq').onclick=()=>{stop();next()}}else pending=setTimeout(next,1200)};
  app.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>pick(+b.dataset.k));
  timer=setInterval(()=>{t--;const tm=$('#tm');tm.style.setProperty('--p',t/15);tm.classList.toggle('is-low',t<=4);tm.querySelector('span').textContent=t;if(t<=0)pick(-1)},1000)};
 const end=()=>{save(cat.name,score);app.innerHTML=`<p class="eyebrow">${esc(cat.name)}</p><h1>Round over</h1><p class="eyebrow">DRAFT content</p><div class="card" style="text-align:center"><span class="pill">★ ${score}</span><p>${qs.length-missed.length}/${qs.length} correct</p></div>
  <p class="eyebrow">Review · DRAFT</p>${missed.length?missed.map(m=>`<div class="card"><b>${esc(m.q)}</b><p class="banner no">You: ${esc(m.your)}</p><p class="banner ok">Answer: ${esc(m.right)}</p>${/^https?:\/\//.test(m.src)?`<a class="src-link" href="${esc(m.src)}" target="_blank" rel="noopener noreferrer">Source: ${esc(m.src)}</a>`:''}</div>`).join(''):'<p class="banner ok">Perfect round!</p>'}
  <button class="btn btn-primary" id="h">Home</button>`;$('#h').onclick=home};next()}
function ring(){const os=shuf(O.orders).slice(0,5),cats=[...new Set(O.menu.map(m=>m.category))];let i=0,score=0;
 const next=()=>{if(i>=os.length){save('Ring It In',score);app.innerHTML=`<h1>Orders done</h1><div class="card" style="text-align:center"><span class="pill">★ ${score}</span></div><button class="btn btn-primary" id="h">Home</button>`;$('#h').onclick=home;return}
  const o=os[i],st={seat:null,item:null,mods:[],course:null,allergy:null};let graded=false;let cat=cats[0];
  const draw=()=>{if(graded)return;const it=O.menu.find(m=>m.name===st.item);
  app.innerHTML=`<div class="topbar"><div><p class="eyebrow">Ring It In · DRAFT</p><h2>Ticket ${i+1}/${os.length}</h2></div><span class="pill">★ ${score}</span><button class="btn btn-icon" id="quit" aria-label="Quit">✕</button></div>
  <div class="ticket">${esc(o.ticket)}</div>
  <p class="eyebrow">Seat</p><div class="seats">${[1,2,3,4].map(s=>`<button class="seat ${st.seat==s?'is-on':''}" data-seat="${s}">${s}</button>`).join('')}</div>
  <p class="eyebrow">Menu</p><div class="chips">${cats.map(c=>`<button class="chip ${c===cat?'is-on':''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  <div class="menu-grid">${O.menu.filter(m=>m.category===cat).map(m=>`<button class="item ${st.item===m.name?'is-on':''}" data-item="${esc(m.name)}">${esc(m.name)}<small>${esc(m.category)}</small></button>`).join('')}</div>
  <p class="eyebrow">Modifiers${st.item?' · '+esc(st.item):''}</p><div class="chips">${it&&it.modifiers.length?it.modifiers.map(x=>`<button class="chip ${st.mods.includes(x)?'is-on':''}" data-mod="${esc(x)}">${esc(x)}</button>`).join(''):'<span class="muted small">'+(it?'No modifiers for this item':'Pick an item')+'</span>'}</div>
  <p class="eyebrow">Guest allergy</p><div class="chips">${O.allergyOptions.map(a=>`<button class="chip ${a!=='None'?'allergy':''} ${st.allergy===a?'is-on':''}" data-al="${esc(a)}">${a==='None'?'No allergy':'⚠ '+esc(a)}</button>`).join('')}</div><p class="muted small">⚠ ${esc(O.allergyNote)}</p>
  <p class="eyebrow">Course</p><div class="chips">${O.courses.map(c=>`<button class="chip ${st.course===c?'is-on':''}" data-course="${c}">${c}</button>`).join('')}</div>
  <div id="fb"></div><div class="sticky-bottom"><button class="btn btn-send" id="send">Send order ➜</button></div>`;
  $('#quit').onclick=home;
  app.querySelectorAll('[data-seat]').forEach(b=>b.onclick=()=>{st.seat=+b.dataset.seat;draw()});
  app.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;draw()});
  app.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{st.item=b.dataset.item;st.mods=[];draw()});
  app.querySelectorAll('[data-mod]').forEach(b=>b.onclick=()=>{const v=b.dataset.mod,x=st.mods.indexOf(v);x<0?st.mods.push(v):st.mods.splice(x,1);draw()});
  app.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{st.allergy=b.dataset.al;draw()});
  app.querySelectorAll('[data-course]').forEach(b=>b.onclick=()=>{st.course=b.dataset.course;draw()});
  $('#send').onclick=()=>{if(graded)return;graded=true;app.querySelectorAll('.seat,.chip,.item').forEach(b=>b.disabled=true);const miss=[];
   if(st.seat!==o.seat)miss.push(`Seat should be ${o.seat}`);if(st.item!==o.item)miss.push(`Item should be ${o.item}`);
   if([...o.mods].sort().join('|')!==[...st.mods].sort().join('|'))miss.push(`Modifiers should be: ${o.mods.join(', ')||'none'}`);
   if(st.course!==o.course)miss.push(`Course should be ${o.course}`);
   const mi=O.menu.find(m=>m.name===o.item),ver=mi&&mi.allergenStatus==='verified';let max=4;
   if(ver){max=5;if((st.allergy||'None')!==o.allergy)miss.push(o.allergy==='None'?'No allergy on this ticket':`Flag the guest's ${o.allergy} allergy`)}
   const info=ver?`<p class="small"><b>${esc(o.item)} allergens (draft):</b> ${esc(mi.allergens.join(', ')||'none listed')}${Object.entries(mi.conditional).map(([k,v])=>`; ${esc(k)} ${esc(v)}`).join('')}${o.allergy!=='None'&&(mi.allergens.includes(o.allergy)||mi.conditional[o.allergy])?`<br>⚠ Contains or may contain ${esc(o.allergy)}: tell a manager.`:''}</p>`:'<p class="small muted">Allergen info for this item is not verified yet; allergy not graded.</p>';
   const pts=Math.round((max-miss.length)*200/max);score+=pts;$('.topbar .pill').textContent='★ '+score;$('.sticky-bottom').innerHTML='<button class="btn btn-primary" id="nx">Next ticket ➜</button>';
   $('#fb').innerHTML=miss.length?`<div class="banner no"><b>Missed (+${pts})</b>${miss.map(m=>`<br>• ${esc(m)}`).join('')}</div>`:`<div class="banner ok"><b>Perfect ticket! +${pts}</b></div>`;$('#fb').innerHTML+=info+`<p class="muted small">⚠ ${esc(O.allergyNote)}</p>`;
   $('#fb').scrollIntoView({block:'center'});$('#nx').onclick=()=>{i++;next()}}};draw()};next()}
function lb(){const b=board();app.innerHTML=`<div class="topbar"><h1>Leaderboard</h1><span class="pill lime">This device</span></div><p class="eyebrow">DRAFT content · scores on this device only</p>
<div class="board">${b.map((r,k)=>`<div class="row ${k===0?'is-first':''} ${r.name===player?'is-me':''}"><span class="rank">${k+1}</span><span class="name">${esc(r.name)}<small>${esc(r.mode)}</small></span><span class="pts">${r.score}</span></div>`).join('')||'<p class="muted">No scores yet</p>'}</div>
<button class="btn btn-primary" id="h">Home</button>`;$('#h').onclick=home}
init();
