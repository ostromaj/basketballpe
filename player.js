const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
const n1=v=>v==null||isNaN(v)?"—":Number(v).toFixed(1);
function initials(name=""){const p=String(name).replace(/[^A-Za-z' .-]/g," ").trim().split(/\s+/).filter(Boolean);if(!p.length)return"??";return p.length===1?p[0][0].toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();}
const posName=g=>({G:"guards",F:"forwards",C:"centers"})[g]||"this position";

function metric(cls,label,v,r,unit){
  return `<div class="player-metric ${cls}-metric"><span>${label}</span><strong>${n1(v)}</strong><small>${unit}</small><em class="rng">${r&&r.length===2?`80% range ${n1(r[0])}–${n1(r[1])}`:""}</em></div>`;
}
function avg(o,k){if(!o)return null;if(k==="pra"){const v=["pts","reb","ast"].map(z=>o[z]);return v.some(z=>z==null)?null:v.reduce((a,b)=>a+b,0);}return o[k];}

function render(x,payload){
  document.title=`${x.player} projection: ${n1(x.points)} pts, ${n1(x.rebounds)} reb, ${n1(x.assists)} ast — Basketball Prop Edge`;
  const tip=x.game_start?new Date(x.game_start).toLocaleString("en-US",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/New_York"})+" ET":"Tip time pending";
  const alerts=[];
  if(x.injury_status) alerts.push(`<div class="player-alert ${x.injury_status==="Doubtful"?"danger":"warn"}"><p><b>${esc(x.injury_status)}</b>${x.injury_detail?" · "+esc(x.injury_detail):""}</p>${x.injury_comment?`<p>${esc(x.injury_comment)}</p>`:""}<p>The projection assumes he plays. If he sits, it won't be graded.</p></div>`);
  if(x.games_this_season===0) alerts.push(`<div class="player-alert info"><p>No games yet this season, so this leans on last season and his most recent games.</p></div>`);
  if((x.teammates_out||[]).length) alerts.push(`<div class="player-alert info"><p>Rotation teammates out or doubtful: <b>${esc(x.teammates_out.join(", "))}</b> (${n1(x.missing_minutes)} minutes a game). The model accounts for the extra opportunity.</p></div>`);
  const ranks=["pts","reb","ast"].map(s=>{const r=x.opp_rank?.[s];const label={pts:"Points allowed",reb:"Rebounds allowed",ast:"Assists allowed"}[s];return `<div><span>${label}</span><strong>${r?"#"+r:"—"}</strong><small>of ${x.opp_rank_total||"—"} on the slate · 1 = toughest</small></div>`;}).join("");
  const log=(x.recent_games||[]).map(g=>{
    const d=new Date(g.date+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
    const cmp=(v,p)=>v>p?"hit":"miss";
    return `<tr><td>${d}${g.season!==x.season_year?` <small class="muted">${g.season-1}-${String(g.season).slice(-2)}</small>`:""}</td><td>${g.home?"vs":"@"} ${esc(g.opp)}</td><td>${n1(g.min)}</td><td class="${cmp(g.pts,x.points)}">${g.pts}</td><td class="${cmp(g.reb,x.rebounds)}">${g.reb}</td><td class="${cmp(g.ast,x.assists)}">${g.ast}</td><td class="${cmp(g.pra,x.pra)}">${g.pra}</td></tr>`;
  }).join("");
  const ss=(o,label)=>`<div><span>${label}</span><strong>${o&&o.pts!=null?`${n1(o.pts)} pts · ${n1(o.reb)} reb · ${n1(o.ast)} ast · ${n1(o.min)} min`:"—"}</strong></div>`;
  document.getElementById("player").innerHTML=`
  <section class="player-hero"><div class="player-identity"><span class="avatar player-avatar">${initials(x.player)}</span><div><p class="eyebrow">${esc(x.position)} • ${esc(x.team)}</p><h1>${esc(x.player)}</h1><p>${esc(x.team)} ${x.home?"vs":"@"} ${esc(x.opponent)} · ${tip}</p></div></div>
  <div class="player-status"><span>${x.injury_status?esc(x.injury_status):"Projected to play"}</span><strong>${n1(x.minutes)} projected minutes</strong></div></section>
  ${alerts.join("")}
  <section class="player-metrics-grid four">${metric("pts","Points",x.points,x.points_range_80,"projected points")}${metric("reb","Rebounds",x.rebounds,x.rebounds_range_80,"projected rebounds")}${metric("ast","Assists",x.assists,x.assists_range_80,"projected assists")}${metric("pra","PRA",x.pra,x.pra_range_80,"points + rebounds + assists")}</section>
  <section class="detail-grid">
    <div class="detail-panel"><div class="panel-head"><h2>Game context</h2><span>Inputs the model saw</span></div><div class="detail-list">
      <div><span>Projected minutes</span><strong>${n1(x.minutes)} (${n1(x.minutes_range_80?.[0])}–${n1(x.minutes_range_80?.[1])})</strong></div>
      <div><span>Rest</span><strong>${x.back_to_back?"Back-to-back":x.days_rest==null?"—":x.days_rest>=10?"First game in a while":x.days_rest+" days"}</strong></div>
      <div><span>Started</span><strong>${x.starter_rate_l5==null?"—":x.starter_rate_l5+"% of last 5"}</strong></div>
      <div><span>Games missed before this one</span><strong>${x.games_missed||0}</strong></div>
      <div><span>Matchup pace</span><strong>${x.pace==null?"—":x.pace+" (100 = league average)"}</strong></div>
      <div><span>Reliability</span><strong>${x.reliability}/100</strong></div>
    </div></div>
    <div class="detail-panel"><div class="panel-head"><h2>Opponent vs ${posName(x.pos_group)}</h2><span>Last 15 games, per minute</span></div><div class="defense-rank-grid">${ranks}</div>
      <div class="season-season">${ss(x.season_avg,"This season")}${ss(x.prev_season_avg,"Last season")}</div></div>
  </section>
  <section class="detail-panel trends-panel"><div class="panel-head"><h2>Last 10 games</h2><span>Green = above tonight's projection</span></div>
    <div class="gamelog-wrap"><table class="gamelog"><thead><tr><th>Date</th><th>Opp</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>PRA</th></tr></thead><tbody>${log||'<tr><td colspan="7">No recent games.</td></tr>'}</tbody></table></div>
    <div class="season-averages"><span>L5 PTS <b>${n1(x.recent?.pts)}</b></span><span>L5 REB <b>${n1(x.recent?.reb)}</b></span><span>L5 AST <b>${n1(x.recent?.ast)}</b></span><span>L5 PRA <b>${n1(avg(x.recent,"pra"))}</b></span><span>L10 PRA <b>${n1(avg(x.recent_10,"pra"))}</b></span></div></section>
  <details class="explain-panel"><summary>How this projection is built</summary><p>Separate gradient-boosted models project minutes, points, rebounds and assists from recent and season form, per-minute rates, last season's numbers, rest, home court, team and opponent pace, how the opponent defends this position group, and how many rotation minutes his teammates are missing tonight. PRA is the sum of the three stat projections. The 80% range comes from the model's real walk-forward misses on similar projections.</p></details>`;
}

(async()=>{
  const id=new URLSearchParams(location.search).get("id");
  const box=document.getElementById("player");
  try{
    const r=await fetch("data/predictions.json?x="+Date.now(),{cache:"no-store"});const payload=await r.json();
    const x=(payload.players||[]).find(p=>String(p.player_id)===String(id));
    if(!x){const out=(payload.ruled_out||[]).find(p=>String(p.player_id)===String(id));
      box.innerHTML=`<div class="player-empty"><h1>${out?esc(out.player)+" is ruled out":"Not on tonight's board"}</h1><p>${out?`Listed ${esc(out.status)}${out.detail?" ("+esc(out.detail)+")":""} for ${esc(out.team)} vs ${esc(out.opponent)}.`:"This player isn't playing on the current slate, or is projected under 12 minutes."}</p><a class="primary-btn" href="./#all">Back to the board</a></div>`;return;}
    x.season_year=payload.season;render(x,payload);
  }catch(e){box.innerHTML=`<div class="player-empty"><h1>Couldn't load this player</h1><p>Please try again in a minute.</p></div>`;}
})();
