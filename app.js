let payload={players:[]}, metrics={}, performance={}, sortKey="pra", visibleRows=40;
const $=id=>document.getElementById(id);
const setText=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
const setHTML=(id,v)=>{const el=$(id); if(el) el.innerHTML=v;};
const valueOf=id=>{const el=$(id); return el?el.value:"";};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
const n1=v=>v==null||isNaN(v)?"—":Number(v).toFixed(1);
const STAT={
  points:{label:"Points",short:"PTS",cls:"pts",range:"points_range_80",unit:"pts"},
  rebounds:{label:"Rebounds",short:"REB",cls:"reb",range:"rebounds_range_80",unit:"reb"},
  assists:{label:"Assists",short:"AST",cls:"ast",range:"assists_range_80",unit:"ast"},
  pra:{label:"PRA",short:"PRA",cls:"pra",range:"pra_range_80",unit:"PRA"}
};
const isStarted=x=>x.game_start?new Date(x.game_start)<=new Date():false;
const gameLabel=x=>x.game_start?new Date(x.game_start).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})+" ET"+(isStarted(x)?" • started":""):"Tip time pending";
const matchup=x=>`${esc(x.team)} ${x.home?"vs":"@"} ${esc(x.opponent)}`;
const topEligible=x=>x.injury_status!=="Doubtful"&&Number(x.games_missed||0)<3;
const playerUrl=x=>`player.html?id=${encodeURIComponent(x.player_id)}`;
function initials(name=""){const p=String(name).replace(/[^A-Za-z' .-]/g," ").trim().split(/\s+/).filter(Boolean);if(!p.length)return"??";return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}
const avatar=(x,cls)=>`<span class="avatar ${cls}" aria-hidden="true">${initials(x.player)}</span>`;
const posName=g=>({G:"Guard",F:"Forward",C:"Center"})[g]||"";

function badges(x){
  const out=[];
  if(x.injury_status){
    const tone=x.injury_status==="Doubtful"?"danger":"warn";
    out.push(`<span class="badge ${tone}" title="League injury report">${esc(x.injury_status)}${x.injury_detail?" · "+esc(x.injury_detail):""}</span>`);
  }else if(Number(x.games_missed||0)>0){
    const n=Number(x.games_missed);out.push(`<span class="badge muted">Missed last ${n} game${n===1?"":"s"}</span>`);
  }
  if(x.back_to_back) out.push(`<span class="badge info" title="Team played yesterday">Back-to-back</span>`);
  if((x.teammates_out||[]).length) out.push(`<span class="badge up" title="Rotation teammates out: ${esc(x.teammates_out.join(", "))}">${x.teammates_out.length} teammate${x.teammates_out.length===1?"":"s"} out</span>`);
  if(Number(x.games_this_season||0)===0) out.push(`<span class="badge muted" title="No games yet this season; uses last season and recent form">Season debut</span>`);
  return out.length?`<div class="badge-row">${out.join("")}</div>`:"";
}

function rankText(x,s){const r=x.opp_rank?.[s];return r?`#${r} of ${x.opp_rank_total}`:"—";}

function bestCard(x,i,key){
  const st=STAT[key], rng=x[st.range]||[];
  const statRank=key==="pra"?null:({points:"pts",rebounds:"reb",assists:"ast"})[key];
  const chips=[`${n1(x.minutes)} min proj`,
    statRank?`vs ${posName(x.pos_group).toLowerCase()}s: ${rankText(x,statRank)}`:null,
    `Reliability ${x.reliability}/100`,
    `L5 avg ${n1(avgOf(x.recent,key))}`
  ].filter(Boolean);
  const split=key==="pra"?`<div class="split-row"><div class="s-pts"><span>PTS</span><strong>${n1(x.points)}</strong></div><div class="s-reb"><span>REB</span><strong>${n1(x.rebounds)}</strong></div><div class="s-ast"><span>AST</span><strong>${n1(x.assists)}</strong></div></div>`:"";
  const details=`<div class="quick-grid">
      <div><span>Season avg</span><strong>${seasonText(x,key)}</strong></div>
      <div><span>Last 5 avg</span><strong>${recentText(x,key)}</strong></div>
      <div><span>Rest</span><strong>${x.back_to_back?"Back-to-back":x.days_rest==null?"—":x.days_rest>=10?"Season debut":x.days_rest+" days"}</strong></div>
    </div>`;
  return `<article class="prediction-card ${st.cls}">
    <div class="card-top"><div class="player-line">${avatar(x,st.cls)}<div class="player-copy"><h3><a class="player-name-link" href="${playerUrl(x)}">${esc(x.player)}</a></h3><div class="meta">${esc(x.position)} • ${matchup(x)}</div></div></div><div class="rank">#${i+1}</div></div>
    ${badges(x)}
    <div class="projection">${n1(x[key])}<small> projected ${st.unit}</small></div>
    ${rng.length===2?`<div class="prediction-range"><span>80% model range</span><strong>${n1(rng[0])}–${n1(rng[1])}</strong></div>`:""}
    ${split}
    <div class="game-date">${gameLabel(x)}</div>
    <div class="chip-row">${chips.map(c=>`<span class="chip">${esc(c)}</span>`).join("")}</div>
    <button class="expand-btn" type="button" aria-expanded="false"><span>Quick look</span><b>＋</b></button>
    <div class="card-details" hidden>${details}<a class="detail-link" href="${playerUrl(x)}">View full player breakdown →</a></div>
  </article>`;
}

function avgOf(obj,key){
  if(!obj) return null;
  if(key==="pra"){const v=["pts","reb","ast"].map(k=>obj[k]);return v.some(z=>z==null)?null:v.reduce((a,b)=>a+b,0);}
  return obj[({points:"pts",rebounds:"reb",assists:"ast",minutes:"min"})[key]];
}
function seasonText(x,key){
  const cur=avgOf(x.season_avg,key);
  if(cur!=null) return n1(cur)+` (${x.games_this_season} g)`;
  const prev=avgOf(x.prev_season_avg,key);
  return prev!=null?n1(prev)+" last season":"—";
}
function recentText(x,key){const v=avgOf(x.recent,key);return v==null?"—":n1(v);}

async function fetchJSON(url){const r=await fetch(url+"?x="+Date.now(),{cache:"no-store"});if(!r.ok)throw new Error(`${url} HTTP ${r.status}`);return r.json();}

async function load(){
  const [p,m,r]=await Promise.all([
    fetchJSON("data/predictions.json"),
    fetchJSON("data/model_metrics.json").catch(()=>({})),
    fetchJSON("data/performance.json").catch(()=>({}))
  ]);
  payload=p||{players:[]};
  payload.players=Array.isArray(payload.players)?payload.players:[];
  payload.ruled_out=Array.isArray(payload.ruled_out)?payload.ruled_out:[];
  metrics=m||{};performance=r||{};
  setup();renderBest();render();renderRuledOut();renderResults();renderMetrics();
}

function slateLabel(){
  if(!payload.slate_date) return "No games";
  return new Date(payload.slate_date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"});
}

function setup(){
  setText("slate",slateLabel());
  setText("navSlate",payload.slate_date?slateLabel():"Off day");
  setText("slateNote",`${payload.games||0} NBA game${payload.games===1?"":"s"}`);
  setText("season",payload.season_label||"—");
  setText("count",payload.players.length);
  const out=payload.ruled_out.length;
  setText("countNote",out?`active projections • ${out} ruled out`:"active projections");
  setText("updated","Updated "+new Date(payload.generated_at).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}));
  const age=(Date.now()-new Date(payload.generated_at).getTime())/3600000;
  const fr=$("freshness");
  if(fr&&age>30){fr.hidden=false;fr.textContent=`Last model run was ${Math.floor(age/24)} day(s) ago. Check current injury news before using these estimates.`;}
  const notes=[];
  if(payload.injury_report_players) notes.push(`Checked against the league injury report (${payload.injury_report_players} players listed).`);
  if(payload.no_history_count) notes.push(`${payload.no_history_count} rostered players with no NBA games yet (mostly rookies) get projections after their first game.`);
  notes.push("Players projected under 12 minutes are left off.");
  setHTML("availabilityNote",esc(notes.join(" ")));

  const teams=[...new Set(payload.players.map(x=>x.team).filter(Boolean))].sort();
  teams.forEach(t=>$("team")?.insertAdjacentHTML("beforeend",`<option>${esc(t)}</option>`));
  ["search","position","team","metric"].forEach(id=>{const el=$(id);if(!el)return;el.addEventListener(id==="search"?"input":"change",()=>{if(id==="metric")sortKey=valueOf("metric")||"pra";visibleRows=40;render();});});
  $("upcomingOnly")?.addEventListener("change",()=>{visibleRows=40;render();});
  $("loadMore")?.addEventListener("click",()=>{visibleRows+=40;render();});
  $("filterToggle")?.addEventListener("click",e=>{const open=$("boardControls")?.classList.toggle("open");const b=e.currentTarget;b.setAttribute("aria-expanded",String(Boolean(open)));b.querySelector("span").textContent=open?"−":"＋";});
  document.addEventListener("click",ev=>{
    const all=ev.target.closest(".show-all-graded"); if(all){showAllGraded(all);return;}
    const b=ev.target.closest(".expand-btn"); if(!b)return;
    const d=b.nextElementSibling, open=b.getAttribute("aria-expanded")==="true";
    b.setAttribute("aria-expanded",String(!open)); b.querySelector("b").textContent=open?"＋":"−"; if(d)d.hidden=open;
  });
}

function renderBest(){
  const pool=payload.players.filter(x=>!isStarted(x)&&topEligible(x));
  const empty=payload.slate_date
    ?'<div class="results-empty"><strong>Tonight\'s games have started.</strong><p>The next slate appears after tomorrow morning\'s model run.</p></div>'
    :'<div class="empty-slate"><strong>No NBA games on the schedule right now.</strong><p>Projections return automatically on the next game day.</p></div>';
  for(const [key,id] of [["points","ptsCards"],["rebounds","rebCards"],["assists","astCards"],["pra","praCards"]]){
    const top=[...pool].sort((a,b)=>b[key]-a[key]).slice(0,6);
    setHTML(id,top.map((x,i)=>bestCard(x,i,key)).join("")||empty);
  }
}

function render(){
  const q=valueOf("search").toLowerCase(), pos=valueOf("position"), team=valueOf("team");
  let rows=payload.players.filter(x=>(!q||`${x.player} ${x.team} ${x.opponent}`.toLowerCase().includes(q))&&(!pos||x.pos_group===pos)&&(!team||x.team===team)&&(!$("upcomingOnly")?.checked||!isStarted(x)));
  rows.sort((a,b)=>Number(b[sortKey]||0)-Number(a[sortKey]||0));
  const cell=(x,k)=>{const st=STAT[k],r=x[st.range]||[];return `<div class="board-stat ${st.cls}"><span>${st.short}</span><strong>${n1(x[k])}</strong><small class="rng">${r.length===2?n1(r[0])+"–"+n1(r[1]):""}</small></div>`;};
  const html=rows.slice(0,visibleRows).map(x=>`<a class="board-row${isStarted(x)?" is-past":""}" href="${playerUrl(x)}" aria-label="View ${esc(x.player)} details">
      <div class="board-player">${avatar(x,"table-avatar")}<div><strong>${esc(x.player)}</strong><span>${esc(x.position)} • ${matchup(x)}<small class="board-game-date">${gameLabel(x)}</small></span>${badges(x)}</div></div>
      ${cell(x,"points")}${cell(x,"rebounds")}${cell(x,"assists")}${cell(x,"pra")}
      <div class="board-usage"><span>${n1(x.minutes)} min</span>${x.starter_rate_l5!=null?`<span>${x.starter_rate_l5>=60?"Starter":"Bench"}</span>`:""}<small>projected minutes</small></div>
      <div class="board-open">View <b>→</b></div></a>`).join("")
    ||(payload.slate_date?`<div class="results-empty"><strong>No players match these filters.</strong><p>Try clearing one of the filters above.</p></div>`:`<div class="empty-slate"><strong>No games scheduled.</strong><p>The board fills in on the next game day.</p></div>`);
  setHTML("rows",html);
  setText("boardCount",`${Math.min(visibleRows,rows.length)} of ${rows.length} players shown`);
  const more=$("loadMore"); if(more) more.hidden=rows.length<=visibleRows;
}

function renderRuledOut(){
  const list=payload.ruled_out;const box=$("ruledOut");if(!box)return;box.hidden=!list.length;if(!list.length)return;
  setText("ruledOutCount",list.length);
  setHTML("ruledOutList",list.map(x=>`<div class="ruled-row"><div><strong>${esc(x.player)}</strong><small>${esc(x.position)} • ${matchup(x)}</small></div><span class="badge danger">${esc(x.status||"Out")}${x.detail?" · "+esc(x.detail):""}</span></div>`).join(""));
}

const pct=v=>v==null?"—":`${Number(v).toFixed(0)}%`;
const mark=v=>v==null?"":`<i class="range-mark ${v?"hit":"miss"}" title="${v?"Inside":"Outside"} the 80% range">${v?"✓":"✗"}</i>`;
let detailCache=null;
function gradedRow(x){
  const c=(s,l)=>`<div><span>${l}</span><b>${n1(x["proj_"+s])} → ${x["actual_"+s]} ${mark(x[s+"_in_range"])}</b></div>`;
  return `<div class="graded-row"><div class="graded-player"><span class="avatar table-avatar">${initials(x.player)}</span><div><b>${esc(x.player)}</b><small>${esc(x.team)} vs ${esc(x.opponent)} • ${n1(x.minutes)} min</small></div></div>${c("pts","PTS")}${c("reb","REB")}${c("ast","AST")}${c("pra","PRA")}</div>`;
}
async function showAllGraded(btn){
  const day=btn.dataset.day, list=btn.closest(".week-result-card")?.querySelector(".graded-list");if(!list)return;
  btn.disabled=true;btn.textContent="Loading…";
  try{detailCache=detailCache||await fetchJSON("data/results_detail.json");const d=(detailCache.days||[]).find(z=>z.date===day);list.innerHTML=(d?.players||[]).map(gradedRow).join("");btn.remove();}
  catch(e){btn.disabled=false;btn.textContent="Couldn’t load — try again";}
}
function renderResults(){
  const p=performance, days=Array.isArray(p.daily_results)?p.daily_results:[];
  const stat=(s,l,cls)=>`<div class="result-stat ${cls}"><span>${l}</span><strong>${p[s+"_mae"]==null?"—":p[s+"_mae"]}</strong><small>avg miss • ${pct(p[s+"_range_hit_rate"])} in 80% range${p[s+"_baseline_mae"]!=null?` • L10 avg: ${p[s+"_baseline_mae"]}`:""}</small></div>`;
  setHTML("resultsSummary",`<div class="result-stat"><span>Graded days</span><strong>${p.graded_days??0}</strong><small>${p.graded_predictions??0} player grades</small></div>${stat("pts","Points","pts-result")}${stat("reb","Rebounds","reb-result")}${stat("ast","Assists","ast-result")}${stat("pra","PRA","pra-result")}`);
  if(!days.length){setHTML("dailyResults",`<div class="results-empty"><strong>Tracking starts with the first published slate.</strong><p>${esc(p.note||"Results fill in automatically the morning after each slate.")}</p></div>`);return;}
  setHTML("dailyResults",days.slice(0,5).map(d=>{
    const label=new Date(d.date+"T12:00:00Z").toLocaleDateString("en-US",{weekday:"long",month:"short",day:"numeric",timeZone:"UTC"});
    return `<article class="week-result-card"><div class="week-result-head"><div><span class="week-label">${esc(label.toUpperCase())}</span><h3>${d.graded_players} graded players</h3><small class="week-counts">${d.did_not_play?d.did_not_play+" did not play (not graded)":""}</small></div>
      <div class="week-metrics"><span>PTS MAE <b>${d.pts_mae??"—"}</b></span><span>REB MAE <b>${d.reb_mae??"—"}</b></span><span>AST MAE <b>${d.ast_mae??"—"}</b></span><span>PRA MAE <b>${d.pra_mae??"—"}</b></span><span>PRA in range <b>${pct(d.pra_range_hit_rate)}</b></span></div></div>
      <div class="graded-list">${(d.sample_predictions||[]).map(gradedRow).join("")}</div>
      ${d.graded_players>(d.sample_predictions||[]).length?`<button class="show-all-graded" type="button" data-day="${esc(d.date)}">Show all ${d.graded_players} graded players</button>`:""}</article>`;
  }).join(""));
}

function renderMetrics(){
  const order=["pts","reb","ast","pra"];
  setHTML("metrics",order.filter(k=>metrics[k]).map(k=>{const v=metrics[k];return `<div class="metric-box"><b>${esc(v.label)}</b><span>${esc(v.model)}<br>Walk-forward MAE: ${v.mae}<br>${v.range_80_hit_rate}% inside the 80% range<br>${(v.samples||0).toLocaleString()} test games</span></div>`;}).join("")||`<div class="muted">Validation appears after the first model run.</div>`);
  const names={last_5:"Last 5 average",last_10:"Last 10 average",season_average:"Season average"};
  setHTML("benchmarks",order.filter(k=>metrics[k]?.benchmark).map(k=>{const v=metrics[k],b=v.benchmark;return `<article class="benchmark-card"><div class="benchmark-title">${esc(v.label)}</div><div class="benchmark-values"><div><span>Model MAE</span><strong>${Number(b.model_mae).toFixed(2)}</strong></div><div><span>Best baseline</span><strong>${Number(b.best_baseline_mae).toFixed(2)}</strong></div></div><div class="benchmark-foot"><span>${esc(names[b.best_baseline]||b.best_baseline)}</span>${b.beats_best_baseline?`<span class="benchmark-win">Model better by ${Math.abs(b.model_improvement_pct).toFixed(1)}%</span>`:`<span class="benchmark-loss">Baseline better by ${Math.abs(b.model_improvement_pct).toFixed(1)}%</span>`}</div></article>`;}).join(""));
  const imp=metrics._importance||{}, nice=f=>({min_l10:"Minutes, last 10",min_l5:"Minutes, last 5",min_l3:"Minutes, last 3",min_szn:"Minutes, season",min_prev:"Minutes, last season",starter_l5:"Starting rate",missing_min:"Teammates' missing minutes",missing_pts:"Teammates' missing points",missing_ast:"Teammates' missing assists",missing_reb:"Teammates' missing rebounds",team_games_missed:"Games missed",days_rest:"Days of rest",b2b:"Back-to-back",team_pace:"Team pace",opp_pace:"Opponent pace",home:"Home court"})[f]||f.replace(/_p36_/,"/36 ").replace(/_l(\d+)/," last $1").replace(/_szn/," season").replace(/_prev/," last season").replace(/^opp_pos_/,"Opp vs position: ").replace(/^opp_def_/,"Opp allows: ").replace(/^pts/,"Points").replace(/^reb/,"Rebounds").replace(/^ast/,"Assists").replace(/^fga/,"FG attempts").replace(/^fta/,"FT attempts").replace(/^fg3a/,"3PT attempts").replace(/^oreb/,"Off. rebounds").replace(/^tov/,"Turnovers").replace(/^stl/,"Steals").replace(/^blk/,"Blocks");
  setHTML("importance",["pts","reb","ast"].filter(k=>imp[k]).map(k=>`<div><b>${({pts:"Points",reb:"Rebounds",ast:"Assists"})[k]}</b><ol>${imp[k].slice(0,6).map(f=>`<li>${esc(nice(f.feature))}</li>`).join("")}</ol></div>`).join(""));
}

load().catch(e=>{
  console.error("Basketball Prop Edge:",e);
  const down='<div class="results-empty"><strong>Projections are temporarily unavailable.</strong><p>Please try again in a few minutes.</p></div>';
  ["rows","ptsCards","rebCards","astCards","praCards"].forEach(id=>setHTML(id,down));
  setText("boardCount","");setText("updated","Couldn’t load the latest model run");
});
