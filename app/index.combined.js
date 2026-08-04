
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORAGE='greenway_mvp_v1';
const defaults={
  started:false,points:420,lifetimePoints:420,carbon:8.4,streak:4,trips:7,rewardsRedeemed:0,rank:28,
  selectedPriority:'Balanced',selectedRoute:'balanced',previousScreen:'home',savedOpportunity:false,referrals:0,communityJoined:false,academicJoined:false,sponsoredJoined:false,cityReports:0,merchantRedemptions:48,
  challenges:{transit:{joined:true,progress:2,target:5,claimed:false},walk:{joined:false,progress:1.4,target:5,claimed:false},recycle:{joined:false,progress:0,target:3,claimed:false}},
  transactions:[
    {title:'Transit trip verified',date:'Today · 08:20',points:20,type:'plus',icon:'🚌'},
    {title:'Daily walking goal',date:'Yesterday · 19:10',points:25,type:'plus',icon:'🚶'},
    {title:'EV charging discount',date:'Jul 30 · 17:40',points:120,type:'minus',icon:'⚡'}
  ],
  redeemed:[],notifications:2
};
let S=load();
let current=S.started?'home':'splash';
let tripTimer=null,tripProgress=0,selectedRouteId=S.selectedRoute||'balanced',rewardFilter='All',sortAscending=true;
const activities=[
  {id:'walk',icon:'🚶',name:'Walking',desc:'+5 pts / km',points:15,carbon:.45,challenge:'walk',inc:1},
  {id:'cycle',icon:'🚲',name:'Cycling',desc:'+6 pts / km',points:24,carbon:.9,challenge:'walk',inc:1.5},
  {id:'transit',icon:'🚌',name:'Public Transit',desc:'+20 pts / trip',points:20,carbon:1.6,challenge:'transit',inc:1},
  {id:'ev',icon:'⚡',name:'EV Charging',desc:'+25 pts / charge',points:25,carbon:.8},
  {id:'recycle',icon:'♻️',name:'Recycling',desc:'+20 pts / drop',points:20,carbon:.55,challenge:'recycle',inc:1},
  {id:'purchase',icon:'🛍️',name:'Green Purchase',desc:'+15 pts / receipt',points:15,carbon:.3}
];
const challengeDefs={
  transit:{title:'Transit Week',desc:'Use public transport 5 times this week.',reward:150,unit:'trips'},
  walk:{title:'Move Without Fuel',desc:'Walk or cycle 5 km before Sunday.',reward:100,unit:'km'},
  recycle:{title:'Recycle Three',desc:'Verify 3 recycling drops in the city.',reward:80,unit:'drops'}
};
const rewards=[
  {id:'bus',category:'Transport',title:'Free Bus Ride',partner:'Abu Dhabi Mobility',cost:180,icon:'🚌'},
  {id:'ev10',category:'EV',title:'10% EV Charging',partner:'GreenCharge',cost:220,icon:'⚡'},
  {id:'coffee',category:'Food',title:'Green Coffee',partner:'Root Café',cost:140,icon:'☕'},
  {id:'market',category:'Retail',title:'AED 10 Voucher',partner:'Eco Market',cost:300,icon:'🛍️'},
  {id:'metro',category:'Transport',title:'Transit Day Pass',partner:'City Mobility',cost:360,icon:'🎫'},
  {id:'tree',category:'Retail',title:'Plant a Tree',partner:'Green Abu Dhabi',cost:250,icon:'🌳'}
];
const routeBase=[
  {id:'fast',name:'Fastest Route',modes:'Car + short walk',time:31,cost:28,carbon:4.8,saved:.4,points:8,reliability:84,icon:'🚗'},
  {id:'green',name:'Greenest Route',modes:'Walk + bus + walk',time:49,cost:4,carbon:.5,saved:4.7,points:45,reliability:91,icon:'🌿'},
  {id:'balanced',name:'Balanced Route',modes:'Walk + bus + EV shuttle',time:42,cost:7,carbon:1.2,saved:2.6,points:35,reliability:94,icon:'🚌'}
];
function load(){try{return {...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch(e){return structuredClone(defaults)}}
function save(){localStorage.setItem(STORAGE,JSON.stringify(S))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(t._x);t._x=setTimeout(()=>t.classList.remove('show'),2400)}
function fmt(n){return Number(n).toLocaleString(undefined,{maximumFractionDigits:1})}
function openScreen(name,keepPrev=false){
  if(name==='map'||name==='admin'){if(!keepPrev) S.previousScreen=current}
  current=name;if(name==='map')setTimeout(initGreenMap,60);$$('.screen').forEach(x=>x.classList.toggle('active',x.id==='screen-'+name));
  const navNames=['home','route','challenges','wallet','discover','community','smartcity','merchant'];
  $('#bottomNav').style.display=navNames.includes(name)?'grid':'none';
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  $('#sideMenu').classList.remove('show');
  renderAll();save();
}
function openModal(html){$('#modalContent').innerHTML=html;$('#modalBg').classList.add('show')}
function closeModal(){ $('#modalBg').classList.remove('show') }
$('#modalBg').addEventListener('click',e=>{if(e.target.id==='modalBg') closeModal()});

function injectTopProfiles(){
  $$('.topbar').forEach(bar=>{
    if(bar.closest('#screen-profile')||bar.querySelector('.profile-top')) return;
    const b=document.createElement('button');b.className='profile-top';b.dataset.nav='profile';b.setAttribute('aria-label','Open profile');b.textContent='AK';bar.appendChild(b);
  });
}

function bindNav(){
  $$('[data-nav]').forEach(b=>b.onclick=()=>openScreen(b.dataset.nav));
  $$('[data-open-menu]').forEach(b=>b.onclick=()=>$('#sideMenu').classList.add('show'));
  $$('[data-open-map]').forEach(b=>b.onclick=()=>openScreen('map'));
}
function renderAll(){updateStats();renderRoutes();renderActivities();renderChallenges();renderRewards();renderTransactions();renderHeatGrid();renderChargers();renderHomeRewards();}
function updateStats(){
  ['homePoints','walletPoints'].forEach(id=>$('#'+id).textContent=Math.round(S.points));
  $('#homeCarbon').textContent=fmt(S.carbon);$('#homeStreak').textContent=S.streak;$('#walletCarbon').textContent=fmt(S.carbon)+' kg CO₂ saved';$('#walletLifetime').textContent=Math.round(S.lifetimePoints)+' lifetime pts';
  $('#profilePoints').textContent=Math.round(S.points)+' POINTS';$('#profileRank').textContent='#'+S.rank+' CITY';$('#profileTrips').textContent=S.trips;$('#profileCarbon').textContent=fmt(S.carbon);$('#profileRewards').textContent=S.rewardsRedeemed;
  $('#levelProgress').style.width=Math.min(100,(S.lifetimePoints%500)/5)+'%';$('#notifBadge').textContent=S.notifications;$('#notifBadge').style.display=S.notifications?'grid':'none';
  const c=S.challenges.transit;$('#homeChallengeText').textContent=fmt(c.progress)+' of '+c.target+' trips';$('#homeChallengeProgress').style.width=Math.min(100,c.progress/c.target*100)+'%';
  const rc=$('#referralCount');if(rc)rc.textContent=S.referrals||0;const mr=$('#merchantRedemptions');if(mr)mr.textContent=(S.merchantRedemptions||48)+' REDEMPTIONS';
}
function routeHash(){const str=$('#originInput').value+$('#destinationInput').value;return [...str].reduce((a,c)=>a+c.charCodeAt(0),0)%7}
function computedRoutes(){
  const h=routeHash();return routeBase.map(r=>{let rr={...r};rr.time+=h-3;rr.cost=Math.max(0,rr.cost+(h%3)-1);if(S.selectedPriority==='Greenest'&&r.id==='green')rr.reliability+=3;if(S.selectedPriority==='Fastest'&&r.id==='fast')rr.reliability+=3;if(S.selectedPriority==='Cheapest'&&r.id==='green')rr.cost=Math.max(1,rr.cost-1);return rr})
}
function renderRoutes(){const host=$('#routeResults');if(!host)return;const routes=computedRoutes();host.innerHTML=routes.map(r=>`<div class="route-option glass ${r.id===selectedRouteId?'active':''}" data-route="${r.id}"><div class="route-icon">${r.icon}</div><div><h4>${r.name}</h4><p>${r.modes} · AED ${r.cost} · ${r.carbon} kg CO₂</p><div class="route-meta" style="margin-top:6px"><span class="pill">${r.time} min</span><span class="pill green">+${r.points} pts</span><span class="pill">${r.saved} kg saved</span></div></div><div class="route-score"><b>${r.reliability}</b><span>reliability</span></div></div>`).join('');
  $$('.route-option',host).forEach(el=>el.onclick=()=>{selectedRouteId=el.dataset.route;S.selectedRoute=selectedRouteId;const r=routes.find(x=>x.id===selectedRouteId);$('#mapLabel').textContent=r.name.replace(' Route','')+' route · '+r.time+' min';renderRoutes();save()});
}
function renderActivities(){const host=$('#activityGrid');if(!host)return;host.innerHTML=activities.slice(0,4).map(a=>`<button class="activity-card glass" data-activity="${a.id}"><span class="act-icon">${a.icon}</span><b>${a.name}</b><small>${a.desc}</small></button>`).join('');$$('[data-activity]',host).forEach(b=>b.onclick=()=>logActivity(b.dataset.activity));}
function logActivity(id){const a=activities.find(x=>x.id===id);if(!a)return;openModal(`<h3>${a.icon} Log ${a.name}</h3><p>This demo verifies the activity instantly. A live deployment would use GPS, QR, receipt or partner confirmation.</p><div class="route-card glass"><div class="route-title">Verified demo activity</div><div class="route-meta"><span class="pill green">+${a.points} points</span><span class="pill">+${a.carbon} kg CO₂ saved</span></div></div><button class="primary-btn" id="confirmActivity">Verify & Add</button>`);$('#confirmActivity').onclick=()=>{S.points+=a.points;S.lifetimePoints+=a.points;S.carbon=+(S.carbon+a.carbon).toFixed(2);S.transactions.unshift({title:a.name+' verified',date:'Just now',points:a.points,type:'plus',icon:a.icon});if(a.challenge){const c=S.challenges[a.challenge];c.progress=Math.min(c.target,c.progress+(a.inc||1))}save();closeModal();renderAll();toast(a.name+' verified · +'+a.points+' points')};}
function renderChallenges(){const host=$('#challengeList');if(!host)return;host.innerHTML=Object.entries(challengeDefs).map(([id,d])=>{const c=S.challenges[id],done=c.progress>=c.target;return `<div class="challenge-card glass"><h4>${d.title}</h4><p>${d.desc}</p><div class="challenge-meta"><span>${fmt(c.progress)} / ${c.target} ${d.unit}</span><span>+${d.reward} pts</span></div><div class="progress"><i style="width:${Math.min(100,c.progress/c.target*100)}%"></i></div><div class="card-actions">${!c.joined?`<button class="primary-btn" data-join="${id}">Join Challenge</button>`:done&&!c.claimed?`<button class="primary-btn" data-claim="${id}">Claim Reward</button>`:`<button class="secondary-btn" data-log-for="${id}">${c.claimed?'Completed ✓':'Log Activity'}</button>`}</div></div>`}).join('');
  $$('[data-join]',host).forEach(b=>b.onclick=()=>{S.challenges[b.dataset.join].joined=true;save();renderChallenges();toast('Challenge joined')});
  $$('[data-claim]',host).forEach(b=>b.onclick=()=>{const id=b.dataset.claim,c=S.challenges[id],d=challengeDefs[id];if(c.claimed)return;c.claimed=true;S.points+=d.reward;S.lifetimePoints+=d.reward;S.transactions.unshift({title:d.title+' reward',date:'Just now',points:d.reward,type:'plus',icon:'🏆'});save();renderAll();toast('Challenge reward claimed · +'+d.reward)});
  $$('[data-log-for]',host).forEach(b=>b.onclick=()=>{const id=b.dataset.logFor;if(S.challenges[id].claimed)return;const map={transit:'transit',walk:'walk',recycle:'recycle'};logActivity(map[id])});
}
function filteredRewards(){let list=rewards.filter(r=>rewardFilter==='All'||r.category===rewardFilter);if(sortAscending)list.sort((a,b)=>a.cost-b.cost);return list}
function rewardCard(r){const can=S.points>=r.cost;return `<div class="reward-card glass"><div class="reward-art">${r.icon}</div><h4>${r.title}</h4><p>${r.partner}</p><div class="cost"><b>${r.cost} pts</b><button class="secondary-btn" data-redeem="${r.id}" ${can?'':'disabled style="opacity:.45"'}>Redeem</button></div></div>`}
function renderRewards(){const host=$('#rewardGrid');if(!host)return;host.innerHTML=filteredRewards().map(rewardCard).join('');$$('[data-redeem]',host).forEach(b=>b.onclick=()=>redeemReward(b.dataset.redeem));}
function renderHomeRewards(){const host=$('#homeRewards');if(host)host.innerHTML=rewards.slice(0,2).map(rewardCard).join('');$$('[data-redeem]',host).forEach(b=>b.onclick=()=>redeemReward(b.dataset.redeem));}
function redeemReward(id){const r=rewards.find(x=>x.id===id);if(!r||S.points<r.cost){toast('Not enough points');return}openModal(`<h3>${r.icon} ${r.title}</h3><p>Redeem ${r.cost} Green Points for this reward from ${r.partner}?</p><button class="primary-btn" id="confirmRedeem">Redeem Reward</button>`);$('#confirmRedeem').onclick=()=>{S.points-=r.cost;S.rewardsRedeemed++;S.redeemed.push({id:r.id,code:'GW-'+Math.random().toString(36).slice(2,8).toUpperCase()});S.transactions.unshift({title:r.title,date:'Just now',points:r.cost,type:'minus',icon:r.icon});save();closeModal();renderAll();openModal(`<h3>Reward ready</h3><p>Show this one-time demo voucher to the partner.</p><div class="route-card glass" style="text-align:center"><div style="font-size:34px;letter-spacing:5px;color:var(--lime);font-weight:800">${S.redeemed.at(-1).code}</div></div><button class="primary-btn" id="closeVoucher">Done</button>`);$('#closeVoucher').onclick=closeModal};}
function renderTransactions(){const host=$('#transactionList');if(!host)return;if(!S.transactions.length){host.innerHTML='<div class="empty">No transactions yet.</div>';return}host.innerHTML=S.transactions.slice(0,8).map(t=>`<div class="row"><div class="tx-icon">${t.icon}</div><div class="tx-copy"><b>${t.title}</b><span>${t.date}</span></div><div class="tx-points ${t.type==='minus'?'minus':''}">${t.type==='minus'?'-':'+'}${t.points}</div></div>`).join('')}
function startTrip(){const r=computedRoutes().find(x=>x.id===selectedRouteId)||computedRoutes()[2];tripProgress=0;$('#liveRouteName').textContent=r.name;$('#liveTrip').classList.add('show');updateTrip(r);clearInterval(tripTimer);tripTimer=setInterval(()=>{tripProgress=Math.min(100,tripProgress+10);updateTrip(r);if(tripProgress>=100)clearInterval(tripTimer)},900)}
function updateTrip(r){$('#tripPercent').textContent=tripProgress+'%';$('#tripRing').style.setProperty('--progress',tripProgress+'%');const steps=['Walk to the nearest transit stop','Board the electric bus','Transfer to the EV shuttle','Walk 180 m to destination','Destination reached'];const idx=Math.min(4,Math.floor(tripProgress/25));$('#liveInstruction').textContent=steps[idx];$('#liveDetails').textContent=Math.max(1,Math.round(r.time*(100-tripProgress)/100))+' min remaining · '+(r.saved*tripProgress/100).toFixed(1)+' kg CO₂ saved'}
function finishTrip(){clearInterval(tripTimer);const r=computedRoutes().find(x=>x.id===selectedRouteId)||computedRoutes()[2];S.points+=r.points;S.lifetimePoints+=r.points;S.carbon=+(S.carbon+r.saved).toFixed(2);S.trips++;if(r.id!=='fast')S.challenges.transit.progress=Math.min(S.challenges.transit.target,S.challenges.transit.progress+1);S.transactions.unshift({title:r.name+' completed',date:'Just now',points:r.points,type:'plus',icon:r.icon});save();$('#liveTrip').classList.remove('show');renderAll();openModal(`<h3>Trip completed</h3><p>Your low-carbon trip was verified.</p><div class="stats"><div class="stat glass"><b>+${r.points}</b><span>Points</span></div><div class="stat glass"><b>${r.saved}</b><span>kg CO₂ saved</span></div><div class="stat glass"><b>${r.time}</b><span>Minutes</span></div></div><button class="primary-btn" id="tripDone">Collect & Continue</button>`);$('#tripDone').onclick=closeModal}
function renderHeatGrid(){const h=$('#heatGrid');if(!h)return;const vals=[.12,.18,.22,.14,.30,.42,.55,.20,.28,.36,.62,.78,.55,.32,.12,.15,.33,.71,.86,.64,.39,.08,.17,.25,.44,.73,.58,.28,.10,.21,.31,.48,.60,.43,.18];h.innerHTML=vals.map(v=>`<i class="heat-cell" style="--heat:${v}"></i>`).join('')}
function renderChargers(){const h=$('#chargerList');if(!h)return;const data=[['Masdar South Hub',92,'3.8 km gap'],['Reem Transit Centre',86,'High commuter demand'],['Yas Retail District',79,'Strong commercial activity']];h.innerHTML=data.map((x,i)=>`<div class="route-option glass"><div class="route-icon">⚡</div><div><h4>${x[0]}</h4><p>${x[2]} · 150 kW candidate</p></div><div class="route-score"><b>${x[1]}</b><span>site score</span></div></div>`).join('')}
function exportData(){const blob=new Blob([JSON.stringify({product:'GreenLoop MVP',exportedAt:new Date().toISOString(),user:{points:S.points,carbonSaved:S.carbon,trips:S.trips,rewards:S.redeemed},transactions:S.transactions,challenges:S.challenges},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='greenloop-impact-report.json';a.click();URL.revokeObjectURL(a.href);toast('Impact report downloaded')}

$('#getStarted').onclick=()=>{S.started=true;save();openScreen('home')};
$('#closeMenu').onclick=()=>$('#sideMenu').classList.remove('show');$('#sideMenu').onclick=e=>{if(e.target.id==='sideMenu')$('#sideMenu').classList.remove('show')};
$('#openMerchantDashboard').onclick=()=>location.href='../merchant/';$('#openCommunityDashboard').onclick=()=>location.href='../community/';
$('#mapBack').onclick=()=>openScreen(S.previousScreen||'home',true);$('#adminBack').onclick=()=>openScreen(S.previousScreen||'profile',true);$('#sideAdmin').onclick=()=>openScreen('admin');$('#openCityDashboard').onclick=()=>openScreen('admin');
$('#findRoutesBtn').onclick=()=>{renderRoutes();const r=computedRoutes().find(x=>x.id===selectedRouteId);$('#mapLabel').textContent=r.name.replace(' Route','')+' route · '+r.time+' min';toast('3 live demo routes calculated')};
$$('[data-priority]').forEach(b=>b.onclick=()=>{S.selectedPriority=b.dataset.priority;$$('[data-priority]').forEach(x=>x.classList.toggle('active',x===b));renderRoutes();save()});
$('#locateBtn').onclick=()=>{$('#originInput').value='My Current Location';toast('Demo location set to Al Reem Island')};
$('#startSelectedTrip').onclick=startTrip;$('#quickStartTrip').onclick=()=>{selectedRouteId='balanced';startTrip()};$('#endTrip').onclick=finishTrip;$('#closeLiveTrip').onclick=()=>{$('#liveTrip').classList.remove('show');clearInterval(tripTimer)};$('#rerouteTrip').onclick=()=>{tripProgress=Math.max(0,tripProgress-10);toast('Route recalculated around congestion')};$('#reportIssue').onclick=()=>openModal('<h3>Report an issue</h3><p>Select an issue to help improve city mobility data.</p><div class="chips"><button class="chip active" id="issueDelay">Delay</button><button class="chip" id="issueClosure">Road closure</button><button class="chip" id="issueAccess">Accessibility</button></div><button class="primary-btn" id="sendIssue">Send Report</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='sendIssue'){closeModal();toast('Issue sent to the mobility team')}});
$('#scanQrBtn').onclick=()=>openModal('<h3>▦ Scan Green QR</h3><p>Demo scanner: verify a recycling station or partner purchase.</p><div class="route-card glass" style="text-align:center;font-size:70px">▦</div><button class="primary-btn" id="demoScan">Simulate QR Scan</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='demoScan'){closeModal();logActivity('recycle')}});
$('#activityModalBtn').onclick=$('#showAllActivity').onclick=()=>openModal(`<h3>Log a green activity</h3><p>Choose one activity to verify in demo mode.</p><div class="activity-grid">${activities.map(a=>`<button class="activity-card glass" data-modal-activity="${a.id}"><span class="act-icon">${a.icon}</span><b>${a.name}</b><small>${a.desc}</small></button>`).join('')}</div>`);
$('#modalContent').addEventListener('click',e=>{const b=e.target.closest('[data-modal-activity]');if(b){closeModal();setTimeout(()=>logActivity(b.dataset.modalActivity),80)}});
$('#refreshChallenges').onclick=()=>{renderChallenges();toast('Challenge status refreshed')};
$$('#rewardFilters .chip').forEach(b=>b.onclick=()=>{rewardFilter=b.dataset.filter;$$('#rewardFilters .chip').forEach(x=>x.classList.toggle('active',x===b));renderRewards()});
$('#sortRewards').onclick=()=>{sortAscending=!sortAscending;$('#sortRewards').textContent=sortAscending?'Sort by points':'Highest first';renderRewards()};
$('#clearTransactions').onclick=()=>{S.transactions=[];save();renderTransactions();toast('Transaction list cleared')};
$('#walletInfo').onclick=()=>openModal('<h3>Green Points</h3><p>Points are a city engagement reward, not money or an investment asset. They can only be redeemed with participating partners.</p><button class="primary-btn" id="closeInfo">Understood</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='closeInfo')closeModal()});
$('#notifBtn').onclick=()=>{S.notifications=0;save();updateStats();openModal('<h3>Notifications</h3><p>Transit Week ends in 3 days.<br><br>A new EV charging reward is available near Masdar City.</p><button class="primary-btn" id="closeNotif">Done</button>')};
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='closeNotif')closeModal()});
$('#settingsBtn').onclick=()=>openModal('<h3>Settings</h3><p>Demo settings are stored locally in your browser.</p><div class="field"><span>City</span><select><option>Abu Dhabi</option><option>Dubai</option><option>Riyadh</option></select></div><button class="primary-btn" id="saveSettings">Save Settings</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='saveSettings'){closeModal();toast('Settings saved')}});
$('#badgeInfo').onclick=()=>openModal('<h3>Badge rules</h3><p>Complete verified trips, recycling drops, EV charges and city challenges to unlock badges.</p><button class="primary-btn" id="closeBadge">Done</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='closeBadge')closeModal()});
$('#exportImpact').onclick=exportData;$('#resetDemo').onclick=()=>openModal('<h3>Reset demo?</h3><p>This will remove your local progress and restore the original MVP state.</p><button class="primary-btn" id="confirmReset">Reset Data</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='confirmReset'){localStorage.removeItem(STORAGE);S=structuredClone(defaults);closeModal();renderAll();toast('Demo data reset')}});
let greenMapInstance=null;const greenLayerGroups={};
const greenMapData={
 ev:[['Masdar City Fast Charge',24.4302,54.6173,'150 kW candidate'],['Yas Gateway Charger',24.4862,54.6071,'High visitor demand'],['Al Reem Mobility Hub',24.4974,54.4075,'Transit-linked charging']],
 recycle:[['Al Reem Smart Bin',24.4949,54.4070,'QR recycling point'],['Corniche E-Waste Drop',24.4710,54.3375,'Electronics collection'],['Masdar Circular Hub',24.4311,54.6160,'Materials recovery']],
 store:[['Root Green Café',24.4942,54.4058,'GreenLoop reward partner'],['Eco Market Yas',24.4872,54.6080,'Low-waste retail'],['Refill Station Corniche',24.4700,54.3440,'Refill and reuse partner']],
 transit:[['Al Reem Transit Stop',24.4970,54.4090,'Bus and shared mobility'],['Masdar Transit Hub',24.4296,54.6150,'Bus and autonomous shuttle'],['Yas Mobility Centre',24.4850,54.6050,'Multimodal interchange']]
};
function initGreenMap(){if(greenMapInstance){setTimeout(()=>greenMapInstance.invalidateSize(),40);return}greenMapInstance=L.map('greenMap',{zoomControl:true}).setView([24.4539,54.3773],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(greenMapInstance);Object.entries(greenMapData).forEach(([type,items])=>{const group=L.layerGroup().addTo(greenMapInstance);greenLayerGroups[type]=group;items.forEach(([name,lat,lng,meta])=>L.circleMarker([lat,lng],{radius:8,color:type==='ev'?'#d8f99b':type==='recycle'?'#75d6a4':type==='store'?'#ffd98e':'#8dcde2',weight:3,fillOpacity:.9}).bindPopup(`<b>${name}</b><br>${meta}`).addTo(group))});L.circle([24.4539,54.3773],{radius:6200,color:'#ffbd73',fillColor:'#ffbd73',fillOpacity:.07,weight:1}).addTo(greenMapInstance)}
$('#centerMap').onclick=()=>{initGreenMap();greenMapInstance.setView([24.4539,54.3773],11);toast('Map centered on Abu Dhabi')};
$$('#mapFilters .chip').forEach(b=>b.onclick=()=>{initGreenMap();const layer=b.dataset.layer;if(layer==='all'){Object.values(greenLayerGroups).forEach(g=>{if(!greenMapInstance.hasLayer(g))g.addTo(greenMapInstance)});$$('#mapFilters .chip').forEach(x=>x.classList.add('active'))}else if(layer==='heat'){b.classList.toggle('active');toast('Emissions opportunity overlay '+(b.classList.contains('active')?'enabled':'disabled'))}else{b.classList.toggle('active');const g=greenLayerGroups[layer];if(b.classList.contains('active'))g.addTo(greenMapInstance);else greenMapInstance.removeLayer(g)}const visible=Object.values(greenLayerGroups).filter(g=>greenMapInstance.hasLayer(g)).length;$('#greenMapLabel').textContent=(visible*3)+' green locations nearby'});
$('#saveCityOpportunity').onclick=()=>{S.savedOpportunity=true;save();toast('EV opportunity saved to city workspace')};
$('#adminRefresh').onclick=()=>{$('#adminTrips').textContent=(12.8+Math.random()*.3).toFixed(1)+'K';$('#adminCarbon').textContent=(18.6+Math.random()*.5).toFixed(1)+'t';toast('Municipal dashboard refreshed')};
$('#heatRandomize').onclick=()=>{$$('.heat-cell').forEach(x=>x.style.setProperty('--heat',(Math.random()*.8+.08).toFixed(2)));toast('Heatmap updated')};
$('#modeToggle').onclick=()=>{$('#modeToggle').textContent=$('#modeToggle').textContent==='Weekly'?'Monthly':'Weekly';toast('Mode-share period changed')};
$('#compareChargers').onclick=()=>openModal('<h3>EV site comparison</h3><p>Masdar South Hub leads with a score of 92 due to charger scarcity, commuter demand and grid access.</p><button class="primary-btn" id="closeCompare">Done</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='closeCompare')closeModal()});
$('#newCampaign').onclick=()=>openModal('<h3>Create city campaign</h3><div class="field"><input id="campaignName" placeholder="Campaign name" value="Car-Free Friday"></div><div class="field"><input id="campaignReward" type="number" value="100" placeholder="Reward points"></div><button class="primary-btn" id="createCampaign">Launch Demo Campaign</button>');
$('#modalContent').addEventListener('click',e=>{if(e.target.id==='createCampaign'){const name=$('#campaignName').value||'New Campaign';$('#campaignCard').innerHTML=`<h4 style="margin:0 0 6px">${name}</h4><p style="font-size:11px;color:var(--muted)">Campaign launched · 0 citizens joined · 100 point reward</p><div class="progress"><i style="width:2%"></i></div>`;closeModal();toast('Campaign launched')}});
injectTopProfiles();

// Discovery
$('#discoverStores').onclick=()=>openModal('<h3>Green stores nearby</h3><p>12 verified partners offer points, refill services and low-waste products within 5 km.</p><button class="primary-btn" id="discDone">View on Green Map</button>');
$('#discoverEvents').onclick=()=>openModal('<h3>Green events</h3><p>Urban Garden Weekend, E-Waste Drop Day and the Reem Cycling Challenge are open this week.</p><button class="primary-btn" id="discClose">Done</button>');
$('#discoverEcoRoutes').onclick=()=>openScreen('route');$('#discoverNavigate').onclick=()=>openScreen('route');$('#discoverSave').onclick=()=>toast('Location saved');
$('#joinGreenEvent').onclick=()=>{S.points+=20;S.lifetimePoints+=20;save();renderAll();toast('Event joined · +20 early-action points')};

// Community
function copyReferral(){const link='https://t.me/greenway_demo_bot?start=armin';if(navigator.clipboard)navigator.clipboard.writeText(link);openModal('<h3>Referral link ready</h3><p>'+link+'</p><button class="primary-btn" id="refDone">Copied</button>')}
$('#copyReferral').onclick=copyReferral;$('#communityInviteTop').onclick=copyReferral;
$('#simulateReferral').onclick=()=>{S.referrals=(S.referrals||0)+1;S.points+=100;S.lifetimePoints+=100;S.transactions.unshift({title:'Verified referral reward',date:'Just now',points:100,type:'plus',icon:'⇧'});save();renderAll();toast('Friend completed first action · +100 points')};
$('#joinGreenCommunity').onclick=()=>{S.communityJoined=true;save();toast('Joined Reem Green Community')};
$('#viewCommunityBoard').onclick=()=>openModal('<h3>Neighbourhood leaderboard</h3><p>1. Masdar · 18,240 pts<br>2. Al Reem · 16,880 pts<br>3. Yas · 13,420 pts</p><button class="primary-btn" id="boardDone">Done</button>');
$('#joinAcademic').onclick=()=>{S.academicJoined=true;save();toast('Joined Academic & University Network')};
$('#academicProjects').onclick=()=>openModal('<h3>Campus projects</h3><p>Solar Shade Lab, Zero-Waste Campus and AI Mobility Research are accepting collaborators.</p><button class="primary-btn" id="academicDone">Done</button>');
$('#joinSponsored').onclick=()=>{S.sponsoredJoined=true;save();toast('Joined Car-Free Friday campaign')};
$('#sponsorInfo').onclick=()=>openModal('<h3>Sponsored campaigns</h3><p>Brands fund rewards while the platform measures verified participation, visits and avoided emissions.</p><button class="primary-btn" id="sponsorDone">Done</button>');

// Smart City
$('#smartCityDashboard').onclick=()=>openScreen('admin');
$('#reportCityIssue').onclick=()=>openModal('<h3>Report a city problem</h3><div class="field"><select id="cityIssueType"><option>Broken streetlight</option><option>Waste or smart-bin issue</option><option>Water leak</option><option>Unsafe cycling route</option><option>EV charger fault</option><option>Accessibility issue</option></select></div><div class="field"><input id="cityIssueNote" placeholder="Describe the problem"></div><button class="primary-btn" id="submitCityIssue">Submit Report</button>');
$('#myCityReports').onclick=()=>openModal('<h3>My city reports</h3><p>'+(S.cityReports||0)+' reports submitted. Demo reports are marked as received by the municipal service desk.</p><button class="primary-btn" id="reportsDone">Done</button>');
$('#runPropTech').onclick=()=>openModal('<h3>Green PropTech AI</h3><p><b>Masdar South Investment Signal: 84/100</b><br><br>Strong transit access, charger shortage, green-building demand and lower heat exposure. Main risk: high near-term land pricing.</p><button class="primary-btn" id="savePropTech">Save Opportunity</button>');
$('#propTechWatchlist').onclick=()=>toast(S.savedOpportunity?'1 green property opportunity saved':'Watchlist is empty');
$('#scanSmartBin').onclick=()=>logActivity('recycle');
$('#bookEWaste').onclick=()=>openModal('<h3>E-waste pickup</h3><p>Demo booking: Tuesday, 10:00–12:00, Al Reem Island.</p><button class="primary-btn" id="confirmEWaste">Confirm Booking</button>');
$('#browseCourses').onclick=()=>openModal('<h3>ScienceTech courses</h3><p>Green Building Basics · Carbon Reporting · Smart Waste Operations · Urban Heat Mitigation</p><button class="primary-btn" id="courseDone">Start Course</button>');
$('#certificateStatus').onclick=()=>openModal('<h3>Certificate progress</h3><p>Green Building Foundation: 60% complete. Finish two modules and the assessment to issue the demo certificate.</p><button class="primary-btn" id="certDone">Continue Learning</button>');
$('#openGreenFinance').onclick=()=>openModal('<h3>Green Finance Wallet</h3><p>Demo options: mobility cashback, employer commute credit and opt-in micro-savings for verified local climate projects.</p><button class="primary-btn" id="financeDone">Activate Demo Wallet</button>');
$('#fintechRules').onclick=()=>openModal('<h3>Green FinTech rules</h3><p>Green Points are non-cash rewards. Financial products require licensed partners, user consent, KYC and separate regulated accounts.</p><button class="primary-btn" id="rulesDone">Understood</button>');

// Merchant Portal
$('#merchantSettings').onclick=$('#editMerchantProfile').onclick=()=>toast('Merchant profile editor opened in demo mode');
$('#createMerchantOffer').onclick=()=>openModal('<h3>Create merchant offer</h3><div class="field"><input id="merchantOfferTitle" value="15% off reusable cups"></div><div class="field"><input id="merchantOfferCost" type="number" value="120"></div><button class="primary-btn" id="publishMerchantOffer">Publish Offer</button>');
$('#manageMerchantOffers').onclick=()=>openModal('<h3>Active offers</h3><p>Reusable Cup Discount · 42 redemptions<br>Plant-Based Lunch · 18 redemptions</p><button class="primary-btn" id="offersDone">Done</button>');
$('#merchantScan').onclick=()=>openModal('<h3>Scan customer voucher</h3><div class="route-card glass" style="text-align:center;font-size:68px">▦</div><button class="primary-btn" id="verifyMerchantVoucher">Simulate Scan</button>');
$('#redemptionHistory').onclick=()=>openModal('<h3>Redemption history</h3><p>48 verified vouchers · 0 duplicate attempts · 18% offer conversion.</p><button class="primary-btn" id="historyDone">Done</button>');
$('#merchantCampaign').onclick=()=>openModal('<h3>Campaign builder</h3><p>Sponsor a verified walking, transit or recycling challenge and define budget, audience and reward inventory.</p><button class="primary-btn" id="launchMerchantCampaign">Launch Demo Campaign</button>');
$('#merchantCertification').onclick=()=>openModal('<h3>Green certification</h3><p>Current level: Gold. Next actions: packaging audit, electricity baseline and staff course completion.</p><button class="primary-btn" id="assessmentDone">Open Assessment</button>');

// Delegated modal actions for new modules
$('#modalContent').addEventListener('click',e=>{
  if(e.target.id==='submitCityIssue'){S.cityReports=(S.cityReports||0)+1;S.points+=15;S.lifetimePoints+=15;save();closeModal();renderAll();toast('City report submitted · +15 points')}
  if(e.target.id==='savePropTech'){S.savedOpportunity=true;save();closeModal();toast('PropTech opportunity saved')}
  if(e.target.id==='confirmEWaste'){closeModal();toast('E-waste pickup booked')}
  if(e.target.id==='publishMerchantOffer'){closeModal();toast('Merchant offer published')}
  if(e.target.id==='verifyMerchantVoucher'){S.merchantRedemptions=(S.merchantRedemptions||48)+1;save();closeModal();renderAll();toast('Voucher verified successfully')}
  if(e.target.id==='launchMerchantCampaign'){closeModal();toast('Sponsored campaign launched')}
  if(['discDone'].includes(e.target.id)){closeModal();openScreen('map')}
  if(['discClose','refDone','boardDone','academicDone','sponsorDone','reportsDone','courseDone','certDone','financeDone','rulesDone','offersDone','historyDone','assessmentDone'].includes(e.target.id))closeModal();
});



/* ===== Rich module option engine ===== */
const MODULE_OPTIONS = {"discover-ev": [{"icon": "⚡", "name": "Masdar Fast-Charge Hub", "meta": "4 chargers available · 2.4 km", "points": 25, "trend": "+18%", "chart": [32, 49, 58, 43, 76, 92]}, {"icon": "⚡", "name": "Yas Mall Charge Lounge", "meta": "8 chargers · retail reward", "points": 35, "trend": "+26%", "chart": [28, 41, 55, 67, 74, 88]}, {"icon": "⚡", "name": "Reem Community Charger", "meta": "2 chargers · low congestion", "points": 20, "trend": "+11%", "chart": [18, 29, 36, 47, 55, 71]}], "discover-event": [{"icon": "🌿", "name": "Urban Garden Weekend", "meta": "Saturday · QR attendance", "points": 120, "trend": "+31%", "chart": [21, 35, 30, 52, 68, 83]}, {"icon": "♻", "name": "E-Waste Drop Day", "meta": "Thursday · electronics collection", "points": 90, "trend": "+17%", "chart": [14, 24, 39, 48, 59, 76]}, {"icon": "🚲", "name": "Reem Cycling Challenge", "meta": "Sunday · 8 km group ride", "points": 140, "trend": "+34%", "chart": [17, 31, 44, 58, 72, 91]}], "referral": [{"icon": "⇧", "name": "Invite 1 verified friend", "meta": "First green action required", "points": 100, "trend": "+28%", "chart": [12, 24, 31, 47, 63, 84]}, {"icon": "⇧", "name": "Build a 5-person circle", "meta": "All members complete one action", "points": 650, "trend": "+42%", "chart": [8, 19, 33, 52, 73, 95]}, {"icon": "⇧", "name": "Campus referral sprint", "meta": "Invite 3 university members", "points": 380, "trend": "+35%", "chart": [15, 29, 42, 61, 78, 90]}], "green-community": [{"icon": "🌱", "name": "Reem Beach Clean-up", "meta": "Neighbourhood mission · Saturday", "points": 85, "trend": "+19%", "chart": [28, 36, 42, 59, 71, 88]}, {"icon": "🌳", "name": "Masdar Shade Mapping", "meta": "Map heat and missing shade", "points": 110, "trend": "+23%", "chart": [22, 34, 47, 63, 72, 86]}, {"icon": "🚶", "name": "Corniche Walkability Audit", "meta": "Verify accessibility points", "points": 95, "trend": "+16%", "chart": [19, 31, 46, 57, 69, 79]}], "academic": [{"icon": "🎓", "name": "Masdar Campus Mobility Lab", "meta": "Research collaboration · 4 weeks", "points": 180, "trend": "+22%", "chart": [18, 29, 41, 49, 66, 79]}, {"icon": "☀", "name": "Solar Shade Design Sprint", "meta": "Student prototype challenge", "points": 220, "trend": "+27%", "chart": [21, 36, 48, 63, 74, 89]}, {"icon": "📊", "name": "Campus Carbon Data Team", "meta": "Publish a verified dataset", "points": 200, "trend": "+24%", "chart": [13, 28, 43, 58, 72, 85]}], "sponsored": [{"icon": "✦", "name": "Car-Free Friday", "meta": "Sponsor: City Mobility Fund", "points": 150, "trend": "68%", "chart": [24, 35, 49, 58, 68, 81]}, {"icon": "♻", "name": "Recycle & Recharge", "meta": "Sponsor: Green retail partner", "points": 130, "trend": "61%", "chart": [18, 29, 40, 53, 61, 74]}, {"icon": "⚡", "name": "EV Off-Peak Challenge", "meta": "Sponsor: Charging operator", "points": 170, "trend": "72%", "chart": [20, 33, 47, 60, 72, 86]}], "urban-report": [{"icon": "💧", "name": "Report a water leak", "meta": "GPS + photo verification", "points": 15, "trend": "92%", "chart": [38, 47, 56, 68, 82, 92]}, {"icon": "💡", "name": "Report a broken streetlight", "meta": "Location and night photo", "points": 12, "trend": "88%", "chart": [29, 41, 55, 66, 77, 88]}, {"icon": "♿", "name": "Report an accessibility issue", "meta": "Route and obstruction details", "points": 20, "trend": "84%", "chart": [23, 36, 49, 62, 73, 84]}], "proptech": [{"icon": "⌂", "name": "Masdar South Growth Zone", "meta": "Mobility + heat + green supply", "points": 40, "trend": "+16%", "chart": [42, 55, 51, 68, 76, 84]}, {"icon": "⌂", "name": "Al Reem Retrofit Cluster", "meta": "High retrofit demand · medium risk", "points": 35, "trend": "+11%", "chart": [35, 42, 54, 61, 70, 78]}, {"icon": "⌂", "name": "Yas Transit-Oriented Zone", "meta": "Strong access · high land cost", "points": 45, "trend": "+19%", "chart": [39, 50, 57, 65, 79, 87]}], "recycletech": [{"icon": "♻", "name": "Smart Bin QR · Al Reem", "meta": "Mixed recyclables · 0.8 km", "points": 20, "trend": "+37%", "chart": [19, 27, 39, 51, 69, 86]}, {"icon": "🔋", "name": "E-Waste Pickup Booking", "meta": "Electronics and batteries", "points": 45, "trend": "+24%", "chart": [14, 23, 37, 48, 61, 75]}, {"icon": "🧴", "name": "Refill Station Check-in", "meta": "Verified packaging avoided", "points": 18, "trend": "+18%", "chart": [16, 26, 34, 45, 57, 68]}], "sciencetech": [{"icon": "◇", "name": "Green Building Foundation", "meta": "4 modules + assessment", "points": 60, "trend": "60%", "chart": [10, 22, 34, 46, 55, 60]}, {"icon": "◇", "name": "Carbon Reporting Certificate", "meta": "Business reporting pathway", "points": 90, "trend": "42%", "chart": [8, 15, 23, 31, 37, 42]}, {"icon": "◇", "name": "Urban Heat Mitigation", "meta": "Design and operations course", "points": 75, "trend": "51%", "chart": [9, 18, 29, 38, 46, 51]}], "fintech": [{"icon": "₣", "name": "Mobility Micro-Savings", "meta": "Save AED 1 after green trips", "points": 25, "trend": "+24%", "chart": [14, 21, 33, 46, 62, 78]}, {"icon": "₣", "name": "Employer Commute Credit", "meta": "Monthly sustainable travel credit", "points": 40, "trend": "+31%", "chart": [12, 24, 38, 51, 69, 84]}, {"icon": "₣", "name": "Green Cashback Wallet", "meta": "Partner-funded verified cashback", "points": 30, "trend": "+27%", "chart": [11, 19, 32, 44, 59, 76]}], "merchant-profile": [{"icon": "◈", "name": "Add sustainability evidence", "meta": "Energy, waste and packaging proof", "points": 40, "trend": "+12%", "chart": [35, 42, 49, 60, 72, 82]}, {"icon": "◈", "name": "Verify second location", "meta": "Location and operating details", "points": 30, "trend": "+8%", "chart": [28, 35, 44, 53, 63, 71]}, {"icon": "◈", "name": "Publish impact statement", "meta": "Customer-facing verified summary", "points": 25, "trend": "+6%", "chart": [21, 29, 37, 45, 56, 64]}], "merchant-offer": [{"icon": "%", "name": "15% off reusable cups", "meta": "120 points · 100 inventory", "points": 30, "trend": "+6%", "chart": [8, 11, 13, 15, 17, 18]}, {"icon": "%", "name": "Plant-based lunch reward", "meta": "180 points · weekday offer", "points": 45, "trend": "+9%", "chart": [6, 9, 12, 16, 20, 24]}, {"icon": "%", "name": "Refill bonus hour", "meta": "80 points · 2-hour window", "points": 25, "trend": "+7%", "chart": [5, 8, 10, 13, 17, 21]}], "merchant-qr": [{"icon": "▦", "name": "Verify 1 customer voucher", "meta": "One-time secure redemption", "points": 15, "trend": "+21%", "chart": [4, 6, 5, 8, 10, 13]}, {"icon": "▦", "name": "Batch event validation", "meta": "Validate up to 20 attendee codes", "points": 50, "trend": "+29%", "chart": [8, 12, 16, 19, 24, 31]}, {"icon": "▦", "name": "Staff QR training", "meta": "Complete fraud-prevention tutorial", "points": 35, "trend": "+14%", "chart": [3, 5, 7, 9, 12, 15]}], "merchant-campaign": [{"icon": "✦", "name": "Transit Bonus Campaign", "meta": "AED 2,500 budget · 30 days", "points": 100, "trend": "68%", "chart": [15, 26, 37, 49, 58, 68]}, {"icon": "✦", "name": "Reusable Cup Week", "meta": "AED 1,200 budget · 7 days", "points": 75, "trend": "74%", "chart": [18, 29, 42, 55, 66, 74]}, {"icon": "✦", "name": "Neighbourhood Clean-up Sponsor", "meta": "AED 3,000 · community mission", "points": 120, "trend": "59%", "chart": [11, 22, 34, 47, 53, 59]}], "merchant-cert": [{"icon": "✓", "name": "Packaging & Energy Audit", "meta": "Next Gold-to-Champion action", "points": 80, "trend": "+9%", "chart": [32, 45, 51, 60, 68, 74]}, {"icon": "✓", "name": "Staff Sustainability Course", "meta": "6 staff members required", "points": 65, "trend": "+12%", "chart": [24, 35, 43, 52, 63, 71]}, {"icon": "✓", "name": "Waste Baseline Submission", "meta": "30-day verified material data", "points": 70, "trend": "+10%", "chart": [21, 31, 42, 55, 64, 73]}]};
S.moduleSelections = S.moduleSelections || {};
const MODULE_CHART_TYPES={
  'discover-ev':'gauge','discover-event':'line','referral':'funnel','green-community':'area',
  'academic':'donut','sponsored':'stacked','urban-report':'progress','proptech':'radar',
  'recycletech':'ring','sciencetech':'steps','fintech':'spark','merchant-profile':'score',
  'merchant-offer':'columns','merchant-qr':'dots','merchant-campaign':'donut','merchant-cert':'gauge'
};
function chartPoints(values,w=100,h=40,pad=3){
  const min=Math.min(...values),max=Math.max(...values),span=Math.max(1,max-min);
  return values.map((v,i)=>{
    const x=pad+i*((w-pad*2)/Math.max(1,values.length-1));
    const y=h-pad-((v-min)/span)*(h-pad*2);
    return [Number(x.toFixed(2)),Number(y.toFixed(2))];
  });
}
function renderModuleChart(card,key,values){
  const el=card.querySelector('[data-module-chart]'); if(!el)return;
  const type=MODULE_CHART_TYPES[key]||'columns';
  const vals=(values&&values.length?values:[20,35,50,45,70,85]).map(Number);
  el.className='mini-chart chart-'+type;
  const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
  if(type==='line'||type==='spark'||type==='area'){
    const pts=chartPoints(vals), line=pts.map(p=>p.join(',')).join(' '), area=`3,40 ${line} 97,40`;
    el.innerHTML=`<svg viewBox="0 0 100 40" preserveAspectRatio="none"><defs><linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f99b" stop-opacity=".45"/><stop offset="1" stop-color="#8ee0ae" stop-opacity="0"/></linearGradient></defs><path class="gridline" d="M0 10H100M0 20H100M0 30H100"/>${type==='area'?`<polygon class="chart-area" points="${area}"/>`:''}<polyline class="chart-line" points="${line}"/>${type==='spark'?pts.map(p=>`<circle class="chart-dot" cx="${p[0]}" cy="${p[1]}" r="1.6"/>`).join(''):''}</svg>`;
  }else if(type==='donut'||type==='ring'){
    const p=Math.max(8,Math.min(96,vals[vals.length-1]));
    el.innerHTML=`<div class="donut-wrap" style="--p:${p}"><b>${p}%</b></div>`;
  }else if(type==='gauge'){
    const p=Math.max(8,Math.min(100,vals[vals.length-1]));
    el.innerHTML=`<div class="gauge-shell" style="--p:${p}"><b>${p}</b></div>`;
  }else if(type==='funnel'){
    const max=Math.max(...vals);
    el.innerHTML=vals.slice(0,5).map((v,i)=>`<i style="width:${Math.max(28,Math.round(v/max*100))}%;opacity:${1-i*.1}"></i>`).join('');
  }else if(type==='stacked'){
    const total=vals.slice(0,4).reduce((a,b)=>a+b,0)||1;
    el.innerHTML=`<div class="stack">${vals.slice(0,4).map((v,i)=>`<i style="width:${v/total*100}%;background:${i%2?'var(--lime)':'var(--mint)'};opacity:${.45+i*.15}"></i>`).join('')}</div>`;
  }else if(type==='progress'){
    el.innerHTML=vals.slice(-3).map((v,i)=>`<div class="progress-row"><span>${['O','P','R'][i]}</span><div class="track"><div class="fill" style="width:${Math.min(100,v)}%"></div></div><b>${v}</b></div>`).join('');
  }else if(type==='radar'){
    const c=[25,25],n=5,r=20;
    const outer=Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)]});
    const data=Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n,rr=r*(Math.min(100,vals[i]||avg)/100);return [c[0]+rr*Math.cos(a),c[1]+rr*Math.sin(a)]});
    el.innerHTML=`<svg viewBox="0 0 50 50"><polygon class="radar-grid" points="${outer.map(p=>p.join(',')).join(' ')}"/><polygon class="radar-grid" points="${outer.map(p=>[(p[0]+25)/2,(p[1]+25)/2].join(',')).join(' ')}"/><polygon class="radar-shape" points="${data.map(p=>p.join(',')).join(' ')}"/></svg>`;
  }else if(type==='steps'){
    el.innerHTML=vals.map((v,i)=>`<i style="height:${Math.max(12,v)}%;width:${8+i*1.5}px"></i>`).join('');
  }else if(type==='dots'){
    el.innerHTML=vals.map(v=>`<i style="--s:${Math.max(1,Math.round(v/18))}"></i>`).join('');
  }else if(type==='score'){
    el.innerHTML=vals.slice(-3).map((v,i)=>`<div class="score-col"><i style="height:${Math.min(100,v)}%"></i><span>${v}</span></div>`).join('');
  }else{
    el.classList.add('chart-columns');
    el.innerHTML=vals.map(v=>`<i style="height:${Math.max(8,v)}%"></i>`).join('');
  }
}
function syncRichModules(){
  document.querySelectorAll('[data-module-card]').forEach(card=>{
    const key=card.dataset.moduleCard, opts=MODULE_OPTIONS[key]||[];
    const idx=Math.min(S.moduleSelections[key]||0, Math.max(0,opts.length-1));
    if(opts[idx]) applyModuleOption(card,key,idx,false);
  });
}
function applyModuleOption(card,key,idx,persist=true){
  const opt=(MODULE_OPTIONS[key]||[])[idx]; if(!opt||!card)return;
  const name=card.querySelector('[data-choice-name]'), pts=card.querySelector('[data-choice-points]'), trend=card.querySelector('[data-module-trend]');
  if(name)name.textContent=opt.name;if(pts)pts.textContent='+'+opt.points+' pts';if(trend)trend.textContent=opt.trend;
  renderModuleChart(card,key,opt.chart);
  if(persist){S.moduleSelections[key]=idx;save();toast(opt.name+' selected')}
}
function openModuleOptions(key){
  const opts=MODULE_OPTIONS[key]||[]; const selected=S.moduleSelections[key]||0;
  openModal(`<h3>More choices</h3><p>Select a real option. The selected choice, chart and point value will update on the card.</p><div class="option-list">${opts.map((o,i)=>`<button class="option-row ${i===selected?'selected':''}" data-option-key="${key}" data-option-index="${i}"><span class="opt-icon">${o.icon}</span><span class="opt-copy"><b>${o.name}</b><span>${o.meta}</span></span><span class="opt-points">+${o.points} pts</span></button>`).join('')}</div><button class="secondary-btn" style="width:100%" id="closeModuleOptions">Close</button>`)
}
document.addEventListener('click',e=>{
  const more=e.target.closest('[data-module-more]');if(more)openModuleOptions(more.dataset.moduleMore);
  const pick=e.target.closest('[data-option-key]');if(pick){const key=pick.dataset.optionKey,idx=Number(pick.dataset.optionIndex),card=document.querySelector(`[data-module-card="${key}"]`);applyModuleOption(card,key,idx,true);closeModal();}
  if(e.target.id==='closeModuleOptions')closeModal();
});
const _renderAllRich=renderAll;renderAll=function(){_renderAllRich();syncRichModules();};

bindNav();renderAll();openScreen(current,true);
})();
