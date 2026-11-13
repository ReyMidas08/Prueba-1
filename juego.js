// WORLD CUP 1.13 · REVISIÓN DE 840 PREGUNTAS ACCESIBLES, COFRES VISUALES, INVENTARIO Y MÓVIL
// Base local integrada: 3.515 futbolistas + 21.343 movimientos.
// 840 preguntas en cuatro modos. Cada intento sortea 2 fáciles, 3 medias y 2 difíciles. Sin bloqueo diario.

const homeScreen=document.querySelector('#home-screen');
const modeScreen=document.querySelector('#mode-screen');
const modeContent=document.querySelector('#mode-content');
const profileModal=document.querySelector('#profile-modal');
const PROFILE_KEY='worldcup_profile_v12';
const ZONE='Europe/Madrid';
let players=[],questionBank=[],demoQuestions=[],timer=null,transitionTimeout=null,currentMode='home',demoState=null;
let lastQuestionIds={};
let playerById=new Map(),aliasIndex=new Map();
let profile={name:'Jugador invitado',xp:0,club:'',avatar:'10',history:[],modeStats:{},streak:0,lastPlayedDay:'',lastXpAward:''};
let profileTab='resumen';

const normalize=s=>String(s??'').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

const zones=[
 {name:'Champions League',short:'CHAMPIONS',desc:'La élite europea',icon:'✦'},
 {name:'Europa League',short:'EUROPA',desc:'La segunda gran noche europea',icon:'★'},
 {name:'Conference League',short:'CONFERENCE',desc:'Europa sigue aquí',icon:'◆'},
 {name:'Primera División',short:'PRIMERA',desc:'La máxima categoría nacional',icon:'10'},
 {name:'Segunda División',short:'SEGUNDA',desc:'La lucha por subir',icon:'◈'},
 {name:'Fútbol Modesto',short:'MODESTO',desc:'Clubes y estadios humildes',icon:'⚑'},
 {name:'Semiprofesional',short:'SEMIPRO',desc:'El fútbol de cada fin de semana',icon:'◇'},
 {name:'Regional',short:'REGIONAL',desc:'Fútbol local',icon:'⌂'},
 {name:'Cantera',short:'CANTERA',desc:'Donde empiezan los jugadores',icon:'✚'},
 {name:'Barrio',short:'BARRIO',desc:'El fútbol más puro',icon:'10'}
];
const pastStages=[
 {name:'2020–2026 · Fútbol actual',short:'ACTUALIDAD',desc:'La era del VAR y las pantallas LED'},
 {name:'2010–2019 · Grandes estrellas',short:'DÉCADA 2010',desc:'Estadios llenos y fútbol televisado'},
 {name:'2000–2009 · Cambio de siglo',short:'DÉCADA 2000',desc:'Publicidad clásica y grandes noches'},
 {name:'1990–1999 · Los noventa',short:'LOS 90',desc:'Equipaciones anchas y marcadores antiguos'},
 {name:'1980–1989 · Los ochenta',short:'LOS 80',desc:'Retransmisiones analógicas'},
 {name:'1970–1979 · Fútbol clásico',short:'LOS 70',desc:'Gradas y balones históricos'},
 {name:'1950–1969 · Primeras leyendas',short:'1950–1969',desc:'La era de las viejas tribunas'},
 {name:'1930–1949 · Primeros Mundiales',short:'1930–1949',desc:'El nacimiento de los Mundiales'},
 {name:'1900–1929 · Los pioneros',short:'1900–1929',desc:'Los orígenes del fútbol organizado'}
];
const futureStages=[
 {name:'2026 · El presente',short:'2026',desc:'El fútbol de hoy'},
 {name:'2030 · Nueva generación',short:'2030',desc:'Grandes pantallas y nuevos talentos'},
 {name:'2040 · Estadios inteligentes',short:'2040',desc:'Techos interactivos'},
 {name:'2050 · Revolución tecnológica',short:'2050',desc:'Marcadores holográficos'},
 {name:'2075 · Fútbol del mañana',short:'2075',desc:'Ciudades y estadios conectados'},
 {name:'2100 · El nuevo siglo',short:'2100',desc:'Gigantescas cúpulas deportivas'},
 {name:'2200 · Entre las nubes',short:'2200',desc:'Estadios suspendidos, ficción'},
 {name:'2500 · Fútbol espacial',short:'2500',desc:'El fútbol llega a la Luna, ficción'},
 {name:'3000 · El último estadio',short:'3000',desc:'Final imaginario entre las estrellas'}
];
const isTemporal=()=>currentMode==='futuro'||currentMode==='pasado';
const isPast=()=>currentMode==='pasado';
const isFuture=()=>currentMode==='futuro';
const stageList=()=>isPast()?pastStages:isFuture()?futureStages:zones;
const stagePosition=total=>Math.min(stageList().length-1,Math.floor(Math.min(699,total)/700*stageList().length));
const travelValue=total=>isPast()?Math.round(2026-126*total/700):isFuture()?Math.round(2026+974*total/700):total;
const travelUnit=()=>isTemporal()?'AÑO':'METROS';
const travelLabel=()=>isPast()?'AÑO HISTÓRICO':isFuture()?'AÑO FUTURO':isCima()?'ALTURA':'PROFUNDIDAD';
const travelDelta=(before,after)=>Math.abs(travelValue(after)-travelValue(before));
const travelImage=i=>isPast()?`fondos-pasado/etapa-${String(i+1).padStart(2,'0')}.svg`:isFuture()?`fondos-futuro/etapa-${String(i+1).padStart(2,'0')}.svg`:phaseImage(i);
const stageName=i=>stageList()[i]?.name||'';
const stageNumber=i=>isTemporal()?i+1:isCima()?10-i:i+1;
const tiers={
 10:{label:'FLOJO',color:'red',message:'Has sumado unos pocos puntos. ¡Puedes bajar mucho más!'},
 30:{label:'REGULAR',color:'orange',message:'No está mal, pero todavía hay margen para mejorar.'},
 60:{label:'¡BIEN!',color:'blue',message:'Buena respuesta. ¡Sigue descendiendo!'},
 80:{label:'¡GENIAL!',color:'green',message:'¡Gran elección! El descenso se acelera.'},
 100:{label:'¡GOLAZO!',color:'gold',message:'¡Respuesta espectacular! Todo el estadio lo celebra.'}
};

const modeConfig={
 abismo:{label:'EL DESCENSO',sub:'El Descenso',asset:'abismo',info:'Responde siete preguntas de fútbol y avanza por diez escenarios, desde la Champions League hasta el fútbol de barrio. Cuanto más inesperada sea tu respuesta, más puntos consigues.'},
 cielo:{label:'LA CIMA',sub:'La Cima',asset:'cielo',info:'El objetivo es llegar a lo más alto acertando las respuestas más populares. Piensa qué respondería la mayoría de aficionados.'},
 futuro:{label:'FUTURAS PROMESAS',sub:'Futuras Promesas',asset:'futuro',info:'Pon a prueba tu intuición sobre el fútbol que está por llegar: jóvenes talentos, pronósticos y posibles protagonistas del mañana.'},
 pasado:{label:'GLORIAS ETERNAS',sub:'Glorias Eternas',asset:'pasado',info:'Viaja por la historia del fútbol y descubre quién conoce mejor a sus grandes leyendas, equipos y momentos inolvidables.'}
};

function buildIndex(){
 playerById=new Map(players.map(p=>[p.id,p]));
 const candidates=new Map();
 const append=(alias,id)=>{const k=normalize(alias);if(k.length<2)return;if(!candidates.has(k))candidates.set(k,new Set());candidates.get(k).add(id)};
 for(const p of players){
  append(p.name,p.id);
  for(const a of p.aliases||[])append(a,p.id);
  const tokens=p.name.trim().split(/\s+/); for(const token of tokens) if(token.length>=3)append(token,p.id);
  if(tokens.length>1){append(tokens[tokens.length-1],p.id);append(tokens[0],p.id);}
  // Full surname with particles and common two-word names.
  if(tokens.length>2){append(tokens.slice(-2).join(' '),p.id);append(tokens.slice(0,2).join(' '),p.id);}
  if(normalize(p.name)==='viniciusjunior'){append('vini',p.id);append('vinicius',p.id)}
  if(normalize(p.name)==='lionelmessi')append('leo',p.id);
  if(normalize(p.name)==='cristianoronaldo')append('cr7',p.id);
 }
 aliasIndex=new Map([...candidates].map(([k,v])=>[k,[...v]]));
}
const modeBankNames={abismo:'El Descenso',cielo:'La Cima',futuro:'Futuras Promesas',pasado:'Glorias Eternas'};
const difficultyOrder={'FÁCIL':0,'MEDIA':1,'DIFÍCIL':2};
function shuffle(array){
 const result=[...array];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
 return result;
}
function drawQuestions(mode){
 const pool=questionBank.filter(q=>q.MODO===modeBankNames[mode]);
 const previous=new Set(lastQuestionIds[mode]||[]);
 const picked=[];
 for(const [difficulty,count] of [['FÁCIL',2],['MEDIA',3],['DIFÍCIL',2]]){
  const all=pool.filter(q=>q.DIFICULTAD===difficulty);
  const fresh=shuffle(all.filter(q=>!previous.has(q['ID PREGUNTA'])));
  const candidates=fresh.concat(shuffle(all.filter(q=>previous.has(q['ID PREGUNTA']))));
  if(candidates.length<count)throw Error('Faltan preguntas '+difficulty+' de '+mode);
  picked.push(...candidates.slice(0,count));
 }
 const chosen=shuffle(picked);
 lastQuestionIds[mode]=chosen.map(q=>q['ID PREGUNTA']);
 return chosen.map(convertQuestion);
}
const FAMOUS_PLAYERS=new Set(['lionelmessi','cristianoronaldo','kylianmbappe','erlinghaaland','lamineyamal','judebellingham','viniciusjunior','mohamedsalah','kevindebruyne','harrykane','robertlewandowski','neymarjr','pedri','rodri','bukayosaka','colepalmer','jamalmusiala','florianwirtz','lautaromartinez','antoinegriezmann','raphinha','ousmanedembele','achrafhakimi','virgilvandijk','bernardosilva','brunofernandes']);
const FAMOUS_CLUBS=new Set(['Real Madrid','Barcelona','Manchester City','Manchester United','Liverpool','Arsenal','Chelsea','Bayern Munich','Paris Saint-Germain','Juventus','Internazionale','AC Milan','Borussia Dortmund','Atlético Madrid','Tottenham Hotspur','Napoli']);
function playerPopularity(p){
 let pop=0;
 if(FAMOUS_PLAYERS.has(normalize(p.name)))pop+=180;
 if(FAMOUS_CLUBS.has(p.club))pop+=47;
 if(['LaLiga','Premier League','Bundesliga','Serie A','Ligue 1'].includes(p.league))pop+=29;
 else if(['MLS','Saudi Pro League','Eredivisie'].includes(p.league))pop+=15;
 if(p.selection)pop+=12;
 pop+=Math.min(12,(p.clubs||[]).length*1.8);
 return pop;
}
function questionPoints(question,playerId){
 if(question.kind==='club-answer'){
  const k=normalize(playerId); const idx=question.validClubs.findIndex(c=>normalize(c)===k);
  if(idx<0)return 0;
  const n=question.validClubs.length;const pr=n===1?0:idx/(n-1);
  return pr<.18?10:pr<.38?30:pr<.65?60:pr<.85?80:100;
 }
 const ids=question.validIds;
 if(!question.scoreMap){
  const scored=ids.map(id=>playerById.get(id)).filter(Boolean).sort((a,b)=>currentMode==='futuro'?(Number((a.birth||'9999').slice(0,4))-Number((b.birth||'9999').slice(0,4))||playerPopularity(a)-playerPopularity(b)):playerPopularity(b)-playerPopularity(a)||a.name.localeCompare(b.name,'es'));
  question.scoreMap=new Map(scored.map((p,i)=>{
   const fraction=(i+.5)/scored.length;
   const base=fraction<=.15?10:fraction<=.35?30:fraction<=.65?60:fraction<=.85?80:100;
   return [p.id,currentMode==='cielo'?({10:100,30:80,60:60,80:30,100:10})[base]:base];
  }));
 }
 return question.scoreMap.get(playerId)||0;
}
function convertQuestion(raw){
 const ids=Array.isArray(raw.WC_ELIGIBLE_IDS)?raw.WC_ELIGIBLE_IDS:String(raw.RESPUESTAS_VALIDAS||'').split('|').filter(Boolean);
 const clubs=Array.isArray(raw.WC_ELIGIBLE_CLUBS)?raw.WC_ELIGIBLE_CLUBS:[];
 const clubAnswer=raw.WC_TYPE==='club_of_star';
 const q={id:raw['ID PREGUNTA'],text:raw.PREGUNTA,club:clubAnswer?'TRAYECTORIAS':raw.WC_TYPE==='player_country'?'SELECCIONES':raw.WC_TYPE==='player_career'?'TRAYECTORIAS':'FÚTBOL MUNDIAL',kind:clubAnswer?'club-answer':'player',type:raw.WC_TYPE||raw.TIPO,difficulty:raw.DIFICULTAD,validIds:ids,validSet:new Set(ids),validClubs:clubs,criterion:raw.CRITERIO||'',source:raw.FUENTE||'',status:raw.ESTADO||''};
 const source=clubAnswer?clubs:ids;
 q.answers=source.slice(0,5).map(id=>({playerId:id,name:clubAnswer?id:(playerById.get(id)?.name||''),points:questionPoints(q,id)}));
 return q;
}
function matchesCriterion(player,question){return question.validSet.has(player.id)}
function validCandidates(question,value){
 const key=normalize(value);if(!key)return [];
 const ids=new Set(aliasIndex.get(key)||[]);
 if(!ids.size&&key.length>=4){
  for(const candidate of players){const options=[candidate.name,...(candidate.aliases||[])];if(options.some(x=>normalize(x)===key))ids.add(candidate.id)}
 }
 return [...ids].map(id=>playerById.get(id)).filter(p=>p&&matchesCriterion(p,question));
}
function matchClub(name,validClubs){
 const aliases={'barca':'Barcelona','fcbarcelona':'Barcelona','psg':'Paris Saint-Germain','parissg':'Paris Saint-Germain','manutd':'Manchester United','manunited':'Manchester United','mancity':'Manchester City','inter':'Internazionale','intermiami':'Inter Miami CF','alnassr':'Al-Nassr','spurs':'Tottenham Hotspur','atleti':'Atlético Madrid','bayern':'Bayern Munich','dortmund':'Borussia Dortmund','sporting':'Sporting CP','real':'Real Madrid','madrid':'Real Madrid'};
 const key=normalize(name);const target=normalize(aliases[key]||name);
 return validClubs.find(c=>normalize(c)===target)||null;
}
function validateAnswer(question,value,selectedId=''){
 const key=normalize(value);
 if(!key)return {status:'empty',points:0,name:'',tier:'miss'};
 if(question.kind==='club-answer'){
  const name=matchClub(value,question.validClubs);
  if(!name)return {status:'incorrect',points:0,name:value.trim(),tier:'miss'};
  const points=questionPoints(question,name);
  return {status:'valid',points,name,playerId:name,tier:String(points),calibrated:true};
 }
 const selected=selectedId&&question.validSet.has(selectedId)?playerById.get(selectedId):null;
 const matches=selected?[selected]:validCandidates(question,value);
 if(matches.length>1)return {status:'ambiguous',points:0,name:value.trim(),tier:'miss'};
 if(matches.length===1){const player=matches[0],points=questionPoints(question,player.id);return {status:'valid',points,name:player.name,playerId:player.id,tier:String(points),calibrated:true}}
 if(aliasIndex.has(key))return {status:'incorrect',points:0,name:value.trim(),tier:'miss'};
 return {status:'unknown',points:0,name:value.trim(),tier:'miss'};
}
function suggestions(question,value){
 const key=normalize(value);if(key.length<2)return [];
 if(question.kind==='club-answer'){
  const all=[...new Set(players.map(p=>p.club).filter(Boolean).concat(question.validClubs))];
  return all.filter(name=>normalize(name).includes(key)).sort((a,b)=>Number(normalize(b).startsWith(key))-Number(normalize(a).startsWith(key))||a.localeCompare(b,'es')).slice(0,8).map(name=>({id:name,name,club:'CLUB DE FÚTBOL'}));
 }
 // Sugerencias de TODA la base, sin revelar si un futbolista cumple la pregunta.
 return players.filter(p=>[p.name,...(p.aliases||[]),...p.name.split(/\s+/)].some(n=>normalize(n).includes(key)))
 .sort((a,b)=>Number(normalize(b.name).startsWith(key))-Number(normalize(a.name).startsWith(key))||playerPopularity(b)-playerPopularity(a)||a.name.localeCompare(b.name,'es')).slice(0,8);
}
function wireSuggestions(question){
 const input=modeContent.querySelector('#dc-answer'),list=modeContent.querySelector('#dc-suggestions');if(!input||!list)return;
 const refresh=()=>{delete input.dataset.selectedPlayerId;const matches=suggestions(question,input.value);list.innerHTML=matches.map(p=>`<button type="button" data-player-id="${escapeHTML(p.id)}"><b>${escapeHTML(p.name)}</b><small>${escapeHTML(p.club||'')}</small></button>`).join('');list.classList.toggle('has-items',matches.length>0)};
 input.addEventListener('input',refresh);
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-player-id]');if(!b)return;const id=b.dataset.playerId,player=playerById.get(id);input.value=question.kind==='club-answer'?id:(player?.name||id);input.dataset.selectedPlayerId=id;list.innerHTML='';list.classList.remove('has-items');input.focus()});
}
const isCima=()=>currentMode==='cielo';
const activeZones=()=>isCima()?[...zones].reverse():zones;
const activeMode=()=>currentMode;
const modeName=()=>isPast()?'GLORIAS ETERNAS':isFuture()?'FUTURAS PROMESAS':isCima()?'LA CIMA':'EL DESCENSO';
const modeAction=()=>isPast()?'REGRESO AL PASADO':isFuture()?'VIAJE AL FUTURO':isCima()?'ASCENSO':'DESCENSO';
const activeLobby=()=>isTemporal()?renderTimeLobby(currentMode):isCima()?renderCimaLobby():renderDescentLobby();
function totalScore(){return (demoState?.results||[]).reduce((sum,r)=>sum+r.points,0)}
function clearDescentTransition(){if(transitionTimeout!==null){clearTimeout(transitionTimeout);transitionTimeout=null}}
function phaseImage(index){return `fondos-descenso/fase-${String(index+1).padStart(2,'0')}.svg`}
function currentZoneIndex(total=totalScore()){if(isTemporal())return stagePosition(total);const i=Math.min(9,Math.floor(total/700*10));return isCima()?9-i:i}
function progressPercent(total=totalScore()){return 5+(Math.min(700,total)/700)*88}

function levelDetails(total){
 let level=1,remaining=Math.max(0,total);
 while(remaining>=Math.min(2300,300+100*(level-1))){remaining-=Math.min(2300,300+100*(level-1));level++}
 return {level,remaining,next:Math.min(2300,300+100*(level-1))};
}
const WC_MODES=[['abismo','EL DESCENSO'],['cielo','LA CIMA'],['futuro','FUTURAS PROMESAS'],['pasado','GLORIAS ETERNAS']];
const WC_AVATARS=['10','9','7','11','1','8','23','99'];
const WC_COSMETICS=[];
const addCos=(category,names,rarity,emoji,colors=[])=>names.forEach((name,i)=>WC_COSMETICS.push({id:`${category}-${WC_COSMETICS.length+1}`,name,category,rarity,emoji,color:colors[i]||''}));
addCos('camiseta',['Camiseta blanca','Camiseta negra','Camiseta roja','Camiseta azul','Camiseta verde','Camiseta amarilla'],'comun','👕',['#f7f4e9','#242424','#e54848','#367fea','#42b66d','#efca43']);
addCos('camiseta',['Camiseta naranja','Camiseta morada','Camiseta rosa','Camiseta celeste','Camiseta granate','Camiseta turquesa','Camiseta lima'],'raro','👕',['#ed8e34','#8655ca','#ef8ab4','#74c7ee','#87384b','#39c8c2','#b9e64c']);
addCos('camiseta',['Camiseta plateada','Camiseta retro rayas'],'epico','👕',['#c3ced7','#f1e7cf']);
addCos('camiseta',['Camiseta dorada'],'legendario','👕',['#edc451']);
addCos('botas',['Botas de bronce'],'comun','👟',['#b97743']);
addCos('botas',['Botas de plata'],'epico','👟',['#c9d4e0']);
addCos('botas',['Botas de oro'],'legendario','👟',['#f1c84a']);
addCos('balon',['Balón callejero'],'comun','10',['#92846c']);
addCos('balon',['Balón profesional','Balón de bronce'],'raro','10',['#f9f1da','#b77a47']);
addCos('balon',['Balón de plata'],'epico','10',['#c2d1e4']);
addCos('balon',['Balón de oro'],'legendario','10',['#f1cb52']);
addCos('aura',['Aura roja','Aura azul','Aura verde'],'raro','✨',['#ff6666','#529dff','#52df86']);
addCos('aura',['Aura morada','Aura blanca'],'epico','✨',['#ba76ec','#ffffff']);
addCos('aura',['Aura dorada'],'legendario','✨',['#f6c64b']);
addCos('celebracion',['Celebración brazos abiertos'],'raro','🙌');
addCos('celebracion',['Celebración deslizamiento','Celebración salto y puño'],'epico','🎉');
addCos('marco',['Marco bronce'],'comun','🖼️',['#a97945']);
addCos('marco',['Marco plata'],'raro','🖼️',['#bccad8']);
addCos('marco',['Marco oro'],'legendario','🖼️',['#edc451']);
addCos('insignia',['Insignia goleador','Insignia estratega'],'comun','🏅');
addCos('insignia',['Insignia leyenda'],'raro','🏅');
addCos('insignia',['Insignia mundial'],'epico','🏅');
const RARITY_LABEL={comun:'COMÚN',raro:'RARO',epico:'ÉPICO',legendario:'LEGENDARIO'};
const RARITY_WEIGHT=[['comun',55],['raro',30],['epico',12],['legendario',3]];
const FRAGMENT_DUPLICATES={comun:10,raro:25,epico:60,legendario:150};
const FRAGMENT_COST={comun:60,raro:150,epico:350,legendario:800};
const WC_EQUIP_CATEGORIES=['camiseta','botas','balon','aura','celebracion','marco','insignia'];
const WC_CATEGORY_LABEL={camiseta:'CAMISETAS',botas:'BOTAS',balon:'BALONES',aura:'AURAS',celebracion:'CELEBRACIONES',marco:'MARCOS',insignia:'INSIGNIAS'};
function defaultInventory(){return {owned:[],equipped:{},chests:[],fragments:0,opened:0,missEpic:0,missLegendary:0,claimedLevels:1,bonusKeys:[],countedDaily:[]}}
function safeInventory(v){const x=v&&typeof v==='object'?v:{};const d=defaultInventory();return {...d,owned:Array.isArray(x.owned)?x.owned.filter(id=>WC_COSMETICS.some(o=>o.id===id)):[],equipped:x.equipped&&typeof x.equipped==='object'?x.equipped:{},chests:Array.isArray(x.chests)?x.chests.filter(t=>RARITY_LABEL[t]).slice(0,400):[],fragments:Number.isFinite(x.fragments)?Math.max(0,Math.floor(x.fragments)):0,opened:Number.isFinite(x.opened)?x.opened:0,missEpic:Number.isFinite(x.missEpic)?x.missEpic:0,missLegendary:Number.isFinite(x.missLegendary)?x.missLegendary:0,claimedLevels:Number.isFinite(x.claimedLevels)?Math.max(1,x.claimedLevels):1,bonusKeys:Array.isArray(x.bonusKeys)?x.bonusKeys:[],countedDaily:Array.isArray(x.countedDaily)?x.countedDaily:[]}}
function inventory(){if(!profile.inventory)profile.inventory=defaultInventory();return profile.inventory}
function chestTypeForLevel(lvl){return lvl===50||lvl===100?'legendario':lvl===25?'epico':lvl===10?'raro':'comun'}
function awardLevelChests(){const inv=inventory(),level=levelDetails(profile.xp).level;for(let i=inv.claimedLevels+1;i<=level;i++)inv.chests.push(chestTypeForLevel(i));inv.claimedLevels=Math.max(inv.claimedLevels,level)}
function grantChest(type='comun'){inventory().chests.push(type);saveProfile()}
function chooseRarity(chest){const inv=inventory();let min=chest==='legendario'?3:chest==='epico'?2:chest==='raro'?1:0;let r=Math.random()*100,choice='comun';for(const [name,p] of RARITY_WEIGHT){r-=p;if(r<0){choice=name;break}}const order=['comun','raro','epico','legendario'];min=Math.max(min,inv.missLegendary>=40?3:inv.missEpic>=10?2:0);return order[Math.max(min,order.indexOf(choice))]}
function openChest(index){const inv=inventory();if(index<0||index>=inv.chests.length)return null;const type=inv.chests.splice(index,1)[0];const rarity=chooseRarity(type);const options=WC_COSMETICS.filter(o=>o.rarity===rarity);const item=options[Math.floor(Math.random()*options.length)];const duplicate=inv.owned.includes(item.id);if(duplicate)inv.fragments+=FRAGMENT_DUPLICATES[rarity];else inv.owned.push(item.id);inv.opened++;inv.missEpic=['epico','legendario'].includes(rarity)?0:inv.missEpic+1;inv.missLegendary=rarity==='legendario'?0:inv.missLegendary+1;saveProfile();return {item,duplicate,fragments:duplicate?FRAGMENT_DUPLICATES[rarity]:0,type}}
function equipCosmetic(id){const inv=inventory(),item=WC_COSMETICS.find(c=>c.id===id);if(!item||!inv.owned.includes(id))return false;inv.equipped[item.category]=id;saveProfile();return true}
function craftCosmetic(id){const inv=inventory(),item=WC_COSMETICS.find(c=>c.id===id);if(!item||inv.owned.includes(id)||inv.fragments<FRAGMENT_COST[item.rarity])return false;inv.fragments-=FRAGMENT_COST[item.rarity];inv.owned.push(id);saveProfile();return true}
function equipped(category){return WC_COSMETICS.find(c=>c.id===inventory().equipped[category])||null}
function rarityStyle(item){return `rarity-${item.rarity}`}
function safeProfile(input){
 const p=input&&typeof input==='object'?input:{};
 return {
  name:typeof p.name==='string'&&p.name.trim()?p.name.trim().slice(0,20):'Jugador invitado',
  xp:Number.isFinite(p.xp)?Math.max(0,Math.floor(p.xp)):0,
  club:typeof p.club==='string'?p.club.trim().slice(0,40):'',
  avatar:WC_AVATARS.includes(p.avatar)?p.avatar:'10',
  history:Array.isArray(p.history)?p.history.filter(x=>x&&WC_MODES.some(m=>m[0]===x.mode)&&Number.isFinite(x.score)).slice(0,120):[],
  modeStats:p.modeStats&&typeof p.modeStats==='object'?p.modeStats:{},
  streak:Number.isFinite(p.streak)?Math.max(0,p.streak):0,
  lastPlayedDay:typeof p.lastPlayedDay==='string'?p.lastPlayedDay:'',
  lastXpAward:typeof p.lastXpAward==='string'?p.lastXpAward:'',
  inventory:safeInventory(p.inventory)
 };
}
function saveProfile(){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}catch(e){console.warn('No se pudo guardar el perfil',e)}updateProfile()}
function updateProfile(){
 const {level,remaining,next}=levelDetails(profile.xp);
 const pct=Math.max(0,Math.min(100,remaining/next*100))+'%';
 const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value};
 set('#profile-name',profile.name);set('#profile-level',String(level).padStart(2,'0'));
 set('#profile-xp',`${remaining} / ${next} XP`);
 const bar=document.querySelector('#profile-bar');if(bar)bar.style.width=pct;
 set('#modal-title',profile.name);set('#modal-level',String(level).padStart(2,'0'));
 set('#modal-xp',`${remaining} / ${next} XP`);
 set('#profile-total-xp',`${profile.xp.toLocaleString('es-ES')} XP ACUMULADOS`);
 set('#profile-club-label',profile.club||'Sin equipo favorito');set('#profile-emblem',profile.avatar);
 const modalBar=document.querySelector('#modal-bar');if(modalBar)modalBar.style.width=pct;
 const headAvatar=document.querySelector('.profile-button .avatar');
 if(headAvatar){headAvatar.innerHTML=`<span aria-hidden="true">${profile.avatar}</span>`;headAvatar.style.borderColor=equipped('marco')?.color||'';headAvatar.style.boxShadow=equipped('marco')?'0 0 12px '+equipped('marco').color:'';}
 const bigAvatar=document.querySelector('#profile-emblem');if(bigAvatar){bigAvatar.style.borderColor=equipped('marco')?.color||'';bigAvatar.style.boxShadow=equipped('marco')?'0 0 24px '+equipped('marco').color+'65':'';}
 const profileBadge=equipped('insignia');const badgeEl=document.querySelector('#wc-profile-badge');if(badgeEl)badgeEl.textContent=profileBadge?profileBadge.name:'';
}
function recordedGames(){return profile.history.length}
function getModeStats(mode){
 const h=profile.history.filter(x=>x.mode===mode);
 return {count:h.length,best:Math.max(0,...h.map(x=>x.score)),avg:h.length?Math.round(h.reduce((s,x)=>s+x.score,0)/h.length):0};
}
function recordGame(){
 if(!demoState||demoState.recorded)return 0;
 demoState.recorded=true;
 const total=totalScore(),perfect=demoState.results.filter(r=>r.points===100).length;
 // XP: completar 50; habilidad hasta 70; Golazo 20 cada uno.
 const gain=50+Math.round(total/10)+perfect*20;
 const playedDay=day();
 if(profile.lastPlayedDay!==playedDay){
  const date=new Date(playedDay+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-1);
  const yesterday=date.toISOString().slice(0,10);
  profile.streak=profile.lastPlayedDay===yesterday?profile.streak+1:1;
  profile.lastPlayedDay=playedDay;
 }
 const entry={mode:activeMode(),score:total,xp:gain,perfect,day:playedDay,at:new Date().toISOString()};
 profile.history.unshift(entry);profile.history=profile.history.slice(0,120);
 const ms=profile.modeStats[entry.mode]||{games:0,sum:0,best:0,perfect:0};
 ms.games++;ms.sum+=total;ms.best=Math.max(ms.best,total);ms.perfect+=perfect;profile.modeStats[entry.mode]=ms;
 profile.xp+=gain;
 // Beta: repetir partidas da XP pero no permite explotar recompensas diarias.
 const inv=inventory(),dailyKey=playedDay+'|'+entry.mode;
 if(!inv.countedDaily.includes(dailyKey)){
  inv.countedDaily.push(dailyKey);inv.countedDaily=inv.countedDaily.slice(-120);
  const todayCount=inv.countedDaily.filter(k=>k.startsWith(playedDay+'|')).length;
  const trigger=(key,type)=>{if(!inv.bonusKeys.includes(key)){inv.bonusKeys.push(key);inv.chests.push(type)}};
  if(todayCount===3)trigger('three|'+playedDay,'comun');
  const weekly=inv.countedDaily.filter(k=>{const days=(Date.parse(playedDay)-Date.parse(k.slice(0,10)))/86400000;return days>=0&&days<7}).length;
  if(weekly>=10)trigger('ten|'+playedDay,'raro');
  if(profile.streak>=7)trigger('streak|'+Math.floor(Date.parse(playedDay)/86400000/7),'comun');
 }
 awardLevelChests();saveProfile();return gain;
}
let inventoryFilter='todos',inventorySelected=null,chestReveal=null;
function chestImage(kind){return `<img class="wc-chest-image" src="cofre-${kind}.webp" alt="Cofre ${RARITY_LABEL[kind]}" loading="lazy">`}
function trophyRoadHTML(){
 const lv=levelDetails(profile.xp).level,inv=inventory();
 let html=`<div class="wc-profile-section-label">CAMINO DE TROFEOS · NIVEL ${lv}</div><p class="wc-small-note">Cada nivel desde el 2 recompensa con un cofre. Nivel 10: raro · 25: épico · 50 y 100: legendario.</p><div class="wc-road">`;
 for(let n=1;n<=100;n++){
  const kind=n===1?'inicio':chestTypeForLevel(n),done=n<=lv;
  html+=`<div class="wc-road-node ${done?'achieved':''} rarity-${kind}"><b>NV. ${n}</b>${n===1?'<span class="wc-road-start">INICIO</span>':chestImage(kind)}<small>${n===1?'PUNTO DE PARTIDA':RARITY_LABEL[kind]}</small></div>`;
 }
 return html+'</div><button class="wc-action wc-action-gold" data-profile-go="cofres">ABRIR MIS COFRES ('+inv.chests.length+') ↗</button>';
}
function chestPanelHTML(){
 const inv=inventory();
 return `<div class="wc-profile-section-label">MIS COFRES · ${inv.chests.length} DISPONIBLES</div><p class="wc-small-note">Cofres instantáneos. Los duplicados dan fragmentos. Los cofres especiales garantizan al menos la rareza indicada.</p><div class="wc-chest-showcase">${['comun','raro','epico','legendario'].map(k=>`<div class="wc-chest-showcase-card rarity-${k}">${chestImage(k)}<b>${RARITY_LABEL[k]}</b><small>EN INVENTARIO: ${inv.chests.filter(x=>x===k).length}</small></div>`).join('')}</div>${chestReveal?`<div class="wc-reward-pop rarity-${chestReveal.item.rarity}"><div class="wc-reward-spark">RECOMPENSA DESBLOQUEADA</div>${cosmeticSVG(chestReveal.item)}<h3>${escapeHTML(chestReveal.item.name)}</h3><p>${RARITY_LABEL[chestReveal.item.rarity]} ${chestReveal.duplicate?'· REPETIDO · +'+chestReveal.fragments+' FRAGMENTOS':'· ¡DESBLOQUEADO!'}</p><button class="wc-action" data-close-reveal>CERRAR RECOMPENSA</button>${!chestReveal.duplicate?`<button class="wc-action wc-action-gold" data-equip="${chestReveal.item.id}">EQUIPAR AHORA</button>`:''}</div>`:''}<div class="wc-chests-grid">${inv.chests.map((kind,i)=>`<button class="wc-chest-card rarity-${kind}" data-open-chest="${i}" type="button">${chestImage(kind)}<span>COFRE ${RARITY_LABEL[kind]}</span><small>TOCA PARA ABRIR</small></button>`).join('')||'<p class="wc-empty">No tienes cofres pendientes. Sube de nivel para conseguir más.</p>'}</div><p class="wc-small-note">Cofres abiertos: ${inv.opened} · Fragmentos: ${inv.fragments}</p><button class="wc-action" data-profile-go="trofeos">VER CAMINO DE TROFEOS ↗</button>`;
}
function cosmeticSVG(o){
 const color=o.color||'#d7b66d'; const body={
 camiseta:`<path d="M34 18 17 26 7 49 25 58 32 47 32 90 88 90 88 47 95 58 113 49 103 26 86 18 75 30 45 30z" fill="${color}" stroke="#f2e7cf" stroke-width="3"/><path d="M45 30Q60 46 75 30" fill="none" stroke="#1a4030" stroke-width="4"/>`,
 botas:`<path d="M22 31h26v31l21 11 8 16-63 1-8-17 17-12z" fill="${color}" stroke="#e7e3d4" stroke-width="3"/><path d="m64 30 20-8 16 39 10 11-2 18H78L58 61z" fill="${color}" stroke="#e7e3d4" stroke-width="3"/>`,
 balon:`<circle cx="60" cy="54" r="37" fill="${color}" stroke="#e7e3d4" stroke-width="3"/><path d="m60 32 20 14-7 23H46L38 46z" fill="#183c2e" stroke="#e7e3d4" stroke-width="2"/><path d="M60 17v15M23 44l15 2M82 46l15-8M46 69l-8 17M73 69l10 15" stroke="#183c2e" stroke-width="4"/>`,
 aura:`<circle cx="60" cy="55" r="33" fill="${color}" opacity=".32"/><circle cx="60" cy="55" r="37" stroke="${color}" stroke-width="8" fill="none"/><circle cx="60" cy="55" r="21" stroke="${color}" stroke-width="3" fill="none"/><path d="M60 5V21M60 89V106M10 55H27M93 55h17" stroke="${color}" stroke-width="5"/>`,
 celebracion:`<circle cx="60" cy="20" r="11" fill="#dab18d"/><path d="M47 36H73L79 72H41z" fill="#d7b66d"/><path d="M47 45 14 15M73 45l33-30" stroke="#dab18d" stroke-width="9" stroke-linecap="round"/><path d="M50 71 36 103M70 71l14 32" stroke="#dab18d" stroke-width="9" stroke-linecap="round"/>`,
 marco:`<rect x="16" y="12" width="88" height="91" rx="6" fill="none" stroke="${color}" stroke-width="12"/><circle cx="60" cy="45" r="15" fill="#d7b18e"/><path d="M32 89Q33 63 60 65Q87 63 88 89" fill="#d7b66d"/>`,
 insignia:`<path d="M43 61 33 107 60 90 87 107 77 61" fill="${color}"/><path d="m60 8 13 9 16-1 5 16 12 12-9 14 2 16-16 5-12 13-15-9-17 1-5-16-12-12 9-14-2-16 16-5z" fill="${color}" stroke="#f1ddac" stroke-width="3"/><circle cx="60" cy="48" r="19" fill="#173d2c"/><path d="m60 32 5 12 13 1-10 8 3 13-11-7-11 7 3-13-10-8 13-1z" fill="#f7dd93"/>`
 }[o.category];
 return `<svg class="wc-cosmetic-art" viewBox="0 0 120 115" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
function inventoryPanelHTML(){
 const inv=inventory(),filtered=inventoryFilter==='todos'?WC_COSMETICS:WC_COSMETICS.filter(o=>o.category===inventoryFilter),item=WC_COSMETICS.find(o=>o.id===inventorySelected);
 return `<div class="wc-inventory-header"><div><div class="wc-profile-section-label">INVENTARIO · ${inv.owned.length}/40 OBJETOS</div><p class="wc-small-note">Todos los objetos tienen su silueta, incluso bloqueados. Toca EQUIPAR en cualquier objeto que hayas conseguido.</p></div><div class="wc-inventory-wallet">${inv.fragments} FRAGMENTOS<br>${inv.chests.length} COFRES</div></div><div class="wc-equipped-preview"><div class="wc-inventory-player">${footballerSVG()}</div><div class="wc-equipped-slots">${WC_EQUIP_CATEGORIES.map(cat=>`<div><small>${WC_CATEGORY_LABEL[cat]}</small><strong>${escapeHTML(equipped(cat)?.name||'Predeterminado')}</strong></div>`).join('')}</div></div><div class="wc-inventory-filters">${[['todos','TODOS'],...Object.entries(WC_CATEGORY_LABEL)].map(([cat,label])=>`<button class="${inventoryFilter===cat?'active':''}" data-inv-filter="${cat}">${label}</button>`).join('')}</div><div class="wc-collection-grid">${filtered.map(o=>{const owned=inv.owned.includes(o.id),active=inv.equipped[o.category]===o.id;return `<div class="wc-collection-item ${owned?'unlocked':'locked'} ${active?'is-equipped':''} rarity-${o.rarity}"><button type="button" class="wc-object-picker" data-cosmetic="${o.id}">${cosmeticSVG(o)}<span>${escapeHTML(o.name)}</span><small>${RARITY_LABEL[o.rarity]}${owned?' · DESBLOQUEADO':' · BLOQUEADO'}</small>${owned?'':`<span class="wc-object-lock">BLOQUEADO</span>`}</button>${owned?`<button type="button" class="wc-equip-direct ${active?'active':''}" data-equip="${o.id}">${active?'EQUIPADO':'EQUIPAR'}</button>`:''}</div>`}).join('')}</div>${item?`<div class="wc-cosmetic-detail rarity-${item.rarity}"><div class="wc-object-symbol">${cosmeticSVG(item)}</div><div><strong>${escapeHTML(item.name)}</strong><p>${RARITY_LABEL[item.rarity]} · ${inv.owned.includes(item.id)?'EN TU COLECCIÓN':'BLOQUEADO'}</p>${inv.owned.includes(item.id)?`<button type="button" class="wc-action wc-action-gold" data-equip="${item.id}">${inv.equipped[item.category]===item.id?'EQUIPADO':'EQUIPAR AHORA'}</button>`:`<button type="button" class="wc-action" data-craft="${item.id}" ${inv.fragments<FRAGMENT_COST[item.rarity]?'disabled':''}>CANJEAR ${FRAGMENT_COST[item.rarity]} FRAGMENTOS</button>`}</div></div>`:'<p class="wc-small-note">Pulsa un cosmético para conocer su rareza y conseguirlo con fragmentos.</p>'}<button class="wc-action wc-action-gold" data-profile-go="cofres">MIS COFRES (${inv.chests.length})</button><p class="wc-small-note">SKINS: PRÓXIMAMENTE · Nuevas apariencias del futbolista.</p>`;
}
function refreshFootballers(){document.querySelectorAll('.dc-avatar-zone .dc-footballer-svg,.dc-cinema-player .dc-footballer-svg,.dc-player-marker .dc-footballer-svg').forEach(el=>{const replacement=document.createElement('template');replacement.innerHTML=footballerSVG();el.replaceWith(replacement.content.firstChild)})}
function profileTabContent(){
 const games=Object.values(profile.modeStats).reduce((s,x)=>s+(x.games||0),0);
 const perfect=Object.values(profile.modeStats).reduce((s,x)=>s+(x.perfect||0),0);
 const best=Math.max(0,...Object.values(profile.modeStats).map(x=>x.best||0));
 if(profileTab==='resumen')return `<div class="wc-stat-grid">
  <div><strong>${games}</strong><small>PARTIDAS</small></div><div><strong>${best}</strong><small>RÉCORD · PTS</small></div><div><strong>${perfect}</strong><small>GOLAZOS</small></div><div><strong>${profile.streak}</strong><small>RACHA · DÍAS</small></div>
 </div><div class="wc-profile-section-label">ÚLTIMAS PARTIDAS</div>${profile.history.length?profile.history.slice(0,5).map(h=>`<div class="wc-match-row"><span>${escapeHTML(WC_MODES.find(m=>m[0]===h.mode)?.[1]||h.mode)}<small>${escapeHTML(h.day)}</small></span><b>${h.score} PTS · +${h.xp} XP</b></div>`).join(''):'<p class="wc-empty">Completa tu primera partida para ganar XP y ver tus resultados.</p>'}<button class="wc-action" type="button" data-profile-go="estadisticas">VER TODAS LAS ESTADÍSTICAS ↗</button>`;
 if(profileTab==='editar')return `<label for="nickname">NOMBRE DEL JUGADOR</label><input id="nickname" maxlength="20" value="${escapeHTML(profile.name==='Jugador invitado'?'':profile.name)}" placeholder="Tu nombre de usuario"><label for="club-favorite">EQUIPO FAVORITO</label><input id="club-favorite" maxlength="40" value="${escapeHTML(profile.club)}" placeholder="Ej.: FC Barcelona, Real Madrid…"><p class="wc-profile-section-label">ELIGE TU AVATAR</p><div class="wc-avatar-grid">${WC_AVATARS.map((a,i)=>`<button type="button" class="wc-avatar-choice ${profile.avatar===a?'selected':''}" data-avatar="${i}" aria-label="Avatar ${i+1}" aria-pressed="${profile.avatar===a}"><span class="wc-player-number">${a}</span></button>`).join('')}</div><button class="wc-action wc-action-gold" type="button" id="save-profile">GUARDAR CAMBIOS ✓</button>`;
 if(profileTab==='estadisticas')return `<p class="wc-profile-section-label">ESTADÍSTICAS POR MODALIDAD</p><div class="wc-mode-stats">${WC_MODES.map(([id,name])=>{let s=profile.modeStats[id]||{games:0,sum:0,best:0,perfect:0};return `<div class="wc-mode-stat"><h3>${name}</h3><div><span>PARTIDAS <b>${s.games}</b></span><span>MEJOR <b>${s.best} PTS</b></span><span>MEDIA <b>${s.games?Math.round(s.sum/s.games):0} PTS</b></span><span>GOLAZOS <b>${s.perfect}</b></span></div></div>`}).join('')}</div><p class="wc-small-note">Las partidas repetidas cuentan en este prototipo. La racha solo avanza una vez por día.</p>`;
 if(profileTab==='trofeos')return trophyRoadHTML();
 if(profileTab==='cofres')return chestPanelHTML();
 return inventoryPanelHTML();
}
function renderProfileTab(tab=profileTab){
 profileTab=tab;
 document.querySelectorAll('[data-profile-tab]').forEach(b=>{const active=b.dataset.profileTab===tab;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});
 const panel=document.querySelector('#profile-panel');if(!panel)return;
 panel.innerHTML=profileTabContent();
 panel.querySelectorAll('[data-profile-go]').forEach(b=>b.onclick=()=>renderProfileTab(b.dataset.profileGo));
 panel.querySelectorAll('[data-avatar]').forEach(b=>b.onclick=()=>{profile.avatar=WC_AVATARS[Number(b.dataset.avatar)];saveProfile();renderProfileTab('editar')});
 panel.querySelectorAll('[data-cosmetic]').forEach(b=>b.onclick=()=>{inventorySelected=b.dataset.cosmetic;renderProfileTab('coleccion')});
 panel.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{equipCosmetic(b.dataset.equip);renderProfileTab(profileTab);refreshFootballers()});
 panel.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>{craftCosmetic(b.dataset.craft);inventorySelected=b.dataset.craft;renderProfileTab('coleccion')});
 panel.querySelectorAll('[data-open-chest]').forEach(b=>b.onclick=()=>{const result=openChest(Number(b.dataset.openChest));if(result){chestReveal=result;renderProfileTab('cofres')}});
 panel.querySelectorAll('[data-close-reveal]').forEach(b=>b.onclick=()=>{chestReveal=null;renderProfileTab('cofres')});
 panel.querySelectorAll('[data-inv-filter]').forEach(b=>b.onclick=()=>{inventoryFilter=b.dataset.invFilter;inventorySelected=null;renderProfileTab('coleccion')});
 const save=panel.querySelector('#save-profile');if(save)save.onclick=()=>{const n=panel.querySelector('#nickname').value.trim();profile.name=n.slice(0,20)||'Jugador invitado';profile.club=panel.querySelector('#club-favorite').value.trim().slice(0,40);saveProfile();renderProfileTab('resumen')};
}
function showHome(){
 clearDescentTransition();
 if(timer)clearInterval(timer);
 timer=null;demoState=null;currentMode='home';
 homeScreen.classList.remove('hidden');modeScreen.classList.add('hidden');
 window.scrollTo({top:0,behavior:'instant'});
}
function modeNav(active){
 return `<nav class="mode-nav" aria-label="Modos de World Cup">
  <button class="mode-nav-home" data-mode-home aria-label="Volver al inicio">⌂ <span>INICIO</span></button>
  ${Object.entries(modeConfig).map(([id,c])=>`<button class="mode-nav-tab ${id===active?'active':''}" data-cover-mode="${id}" ${id===active?'aria-current="page"':''}>${c.sub}</button>`).join('')}
 </nav>`;
}
function wireModeNav(){
 modeContent.querySelectorAll('[data-cover-mode]').forEach(b=>b.onclick=()=>showMode(b.dataset.coverMode));
 const home=modeContent.querySelector('[data-mode-home]');if(home)home.onclick=showHome;
}
function showMode(mode){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;demoState=null;
 const config=modeConfig[mode];if(!config)return;
 currentMode=mode;
 homeScreen.classList.add('hidden');modeScreen.classList.remove('hidden');
 modeContent.innerHTML=`
  <nav class="mode-nav" aria-label="Modos de World Cup">
    <button class="mode-nav-home" id="mode-home" aria-label="Volver al inicio">⌂ <span>INICIO</span></button>
    ${Object.entries(modeConfig).map(([id,c])=>`<button class="mode-nav-tab ${id===mode?'active':''}" data-cover-mode="${id}" ${id===mode?'aria-current="page"':''}>${c.sub}</button>`).join('')}
  </nav>
  <section class="mode-hero mode-hero-${config.asset}" aria-labelledby="mode-heading" style="--banner-image:url('${(mode==='cielo'||mode==='futuro')?config.asset+'-cabecera-v11.webp':config.asset+'-cabecera-v10.webp'}')">
    <div class="hero-banner-image" aria-hidden="true"></div><div class="hero-banner-shade" aria-hidden="true"></div>
    <h1 class="mode-hero-title" id="mode-heading" tabindex="0" role="button" aria-label="Mostrar explicación de ${config.sub}">${config.label}</h1>
    <button class="hero-disclosure" type="button" aria-label="Mostrar explicación de ${config.sub}" aria-expanded="false" aria-controls="mode-description"><span aria-hidden="true">⌄</span></button>
  </section>
  <section id="mode-description" class="mode-description hidden" aria-live="polite"><p>${config.info}</p></section>
  <div class="mode-panels">
   <button class="game-panel panel-challenge" type="button" aria-label="${true?'Jugar desafío de prueba':'Tu desafío de hoy. Próximamente disponible'}" style="--panel-background:url('${config.asset}-estadio-v07.webp')">
      <h2>TU DESAFÍO DE HOY</h2><div class="panel-background-art" aria-hidden="true"></div>
      <span class="panel-icon panel-icon-tactics" aria-hidden="true"><svg viewBox="0 0 100 85" fill="none"><rect x="20" y="6" width="60" height="73" rx="5" stroke="currentColor" stroke-width="3"/><path d="M31 22h40M37 34l10 10m0-10L37 44m21 1 8 8m0-8-8 8M32 64l15-8 11 6 11-12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>
      <span class="panel-locked">${true?'<span aria-hidden="true">⚽</span> JUGAR DESAFÍO · DEMO REJUGABLE':'<span class="lock-css" aria-hidden="true"></span> PRÓXIMAMENTE DISPONIBLE'}</span>
   </button>
   <button class="game-panel panel-rankings" type="button" aria-label="Clasificaciones. Próximamente disponible">
      <h2>CLASIFICACIONES</h2><div class="panel-background-art panel-ranking-background" aria-hidden="true"></div>
      <span class="panel-locked"><span class="lock-css" aria-hidden="true"></span> PRÓXIMAMENTE DISPONIBLE</span>
   </button>
  </div>`;
 modeContent.querySelectorAll('[data-cover-mode]').forEach(b=>b.onclick=()=>showMode(b.dataset.coverMode));
 modeContent.querySelector('#mode-home').onclick=showHome;
 const disclosure=modeContent.querySelector('.hero-disclosure');
 const description=modeContent.querySelector('#mode-description');
 const hero=modeContent.querySelector('.mode-hero');
 function toggleDescription(force){
  const open=typeof force==='boolean'?force:disclosure.getAttribute('aria-expanded')!=='true';
  disclosure.setAttribute('aria-expanded',String(open));
  disclosure.setAttribute('aria-label',(open?'Ocultar':'Mostrar')+' explicación de '+config.sub);
  description.classList.toggle('hidden',!open);
 }
 disclosure.onclick=e=>{e.stopPropagation();toggleDescription()};
 const title=modeContent.querySelector('.mode-hero-title');
 title.addEventListener('click',e=>{e.stopPropagation();toggleDescription()});
 title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggleDescription()}});
 hero.addEventListener('click',e=>{if(e.target.closest('.hero-disclosure'))return;toggleDescription()});
 hero.setAttribute('tabindex','0');
 hero.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDescription()}});
 const challenge=modeContent.querySelector('.panel-challenge');
 if(['abismo','cielo','futuro','pasado'].includes(mode)){
  challenge.classList.add('panel-ready');
  challenge.addEventListener('click',()=>mode==='cielo'?renderCimaLobby():mode==='abismo'?renderDescentLobby():renderTimeLobby(mode));
 }else{
  challenge.addEventListener('click',()=>{challenge.classList.remove('attention');void challenge.offsetWidth;challenge.classList.add('attention');setTimeout(()=>challenge.classList.remove('attention'),700)});
 }
 modeContent.querySelectorAll('.panel-rankings').forEach(panel=>panel.addEventListener('click',()=>{panel.classList.remove('attention');void panel.offsetWidth;panel.classList.add('attention');setTimeout(()=>panel.classList.remove('attention'),700)}));
 window.scrollTo({top:0,behavior:'instant'});
}
function bannerMarkup(){
 return `<section class="mode-hero mode-hero-abismo dc-banner" aria-label="El Descenso" style="--banner-image:url('abismo-cabecera-v10.webp')">
  <div class="hero-banner-image" aria-hidden="true"></div><div class="hero-banner-shade" aria-hidden="true"></div>
  <h1 class="mode-hero-title">EL DESCENSO</h1>
 </section>`;
}
function renderDescentLobby(){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;currentMode='abismo';demoState=null;
 modeContent.innerHTML=modeNav('abismo')+bannerMarkup()+`
 <section class="dc-lobby">
  <div class="dc-lobby-copy">
   <p class="dc-kicker">MODO DE PRUEBAS · SIN LÍMITE DE PARTIDAS</p>
   <h2>¿HASTA DÓNDE PUEDES <span>BAJAR?</span></h2>
   <p>Responde siete preguntas de fútbol. Cada respuesta suma puntos y hace que tu futbolista descienda por los escenarios del fútbol europeo hasta llegar al fútbol de barrio.</p>
   <div class="dc-lobby-stats">
    <div><strong>07</strong><span>PREGUNTAS ALEATORIAS</span></div>
    <div><strong>05</strong><span>NIVELES DE PUNTOS</span></div>
    <div><strong>10</strong><span>ESCENARIOS</span></div>
   </div>
   <button class="dc-primary" id="dc-start">COMENZAR DESCENSO <span>↘</span></button>
   <p class="dc-demo-note">DEMO REJUGABLE · 2 FÁCILES · 3 MEDIAS · 2 DIFÍCILES · SIN XP NI BLOQUEO DIARIO</p>
  </div>
  <div class="dc-lobby-route" aria-label="Recorrido desde Champions League hasta Barrio">
   <div class="dc-lobby-route-title">TU RECORRIDO</div>
   <div class="dc-lobby-stages">${zones.map((z,i)=>`<div class="dc-lobby-stage" data-stage="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${z.name}</b><small>${z.desc}</small></div>`).join('')}</div>
  </div>
 </section>`;
 wireModeNav();
 modeContent.querySelector('#dc-start').onclick=startDemo;
 window.scrollTo({top:0,behavior:'instant'});
}
function bannerCimaMarkup(){
 return `<section class="mode-hero mode-hero-cielo dc-banner" aria-label="La Cima" style="--banner-image:url('cielo-cabecera-v11.webp')">
  <div class="hero-banner-image" aria-hidden="true"></div><div class="hero-banner-shade" aria-hidden="true"></div>
  <h1 class="mode-hero-title">LA CIMA</h1>
 </section>`;
}
function renderCimaLobby(){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;currentMode='cielo';demoState=null;
 modeContent.innerHTML=modeNav('cielo')+bannerCimaMarkup()+`
 <section class="dc-lobby">
  <div class="dc-lobby-copy">
   <p class="dc-kicker">MODO DE PRUEBAS · SIN LÍMITE DE PARTIDAS</p>
   <h2>¿HASTA DÓNDE PUEDES <span>SUBIR?</span></h2>
   <p>Responde siete preguntas de fútbol. Cada respuesta suma puntos y hace que tu futbolista ascienda desde los campos de barrio hasta llegar a la Champions League.</p>
   <div class="dc-lobby-stats">
    <div><strong>07</strong><span>PREGUNTAS ALEATORIAS</span></div>
    <div><strong>05</strong><span>NIVELES DE PUNTOS</span></div>
    <div><strong>10</strong><span>ESCENARIOS</span></div>
   </div>
   <button class="dc-primary" id="dc-start">COMENZAR ASCENSO <span>↗</span></button>
   <p class="dc-demo-note">DEMO REJUGABLE · 2 FÁCILES · 3 MEDIAS · 2 DIFÍCILES · SIN XP NI BLOQUEO DIARIO</p>
  </div>
  <div class="dc-lobby-route" aria-label="Recorrido desde Barrio hasta Champions League">
   <div class="dc-lobby-route-title">TU RECORRIDO</div>
   <div class="dc-lobby-stages">${[...zones].reverse().map((z,i)=>`<div class="dc-lobby-stage" data-stage="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${z.name}</b><small>${z.desc}</small></div>`).join('')}</div>
  </div>
 </section>`;
 wireModeNav();
 modeContent.querySelector('#dc-start').onclick=startDemo;
 window.scrollTo({top:0,behavior:'instant'});
}
function renderTimeLobby(mode){
 clearDescentTransition();if(timer)clearInterval(timer);timer=null;currentMode=mode;demoState=null;
 const past=mode==='pasado',stages=stageList(),label=modeName();
 modeContent.innerHTML=modeNav(mode)+`<section class="mode-hero mode-hero-${mode} dc-banner" style="--banner-image:url('${mode}-cabecera-${past?'v10':'v11'}.webp')"><div class="hero-banner-image" aria-hidden="true"></div><div class="hero-banner-shade" aria-hidden="true"></div><h1 class="mode-hero-title">${label}</h1></section>`+`
 <section class="dc-lobby"><div class="dc-lobby-copy">
 <p class="dc-kicker">WORLD CUP · VIAJE EN EL TIEMPO · DEMO REJUGABLE</p>
 <h2>${past?'VIAJA A LAS <span>LEYENDAS</span>':'DESCUBRE EL <span>MAÑANA</span>'}</h2>
 <p>${past?'Retrocede desde 2026 hasta los pioneros del fútbol.':'Avanza desde 2026 hacia estadios futuristas imaginarios.'} Responde las siete preguntas, contempla cómo cambia el estadio y sigue a tu futbolista durante el viaje.</p>
 <div class="dc-lobby-stats"><div><strong>07</strong><span>PREGUNTAS ALEATORIAS</span></div><div><strong>05</strong><span>VALORES</span></div><div><strong>09</strong><span>ÉPOCAS</span></div></div>
 <button class="dc-primary" id="dc-start">${past?'VIAJAR AL PASADO':'VIAJAR AL FUTURO'} <span>${past?'◀':'▶'}</span></button>
 <p class="dc-demo-note">PRUEBA REJUGABLE · PREGUNTAS NUEVAS EN CADA INTENTO · AMBIENTACIÓN TEMPORAL INDEPENDIENTE</p></div>
 <div class="dc-lobby-route"><div class="dc-lobby-route-title">LÍNEA DEL TIEMPO</div><div class="dc-lobby-stages">${stages.map((st,i)=>`<div class="dc-lobby-stage"><span>${String(i+1).padStart(2,'0')}</span><b>${escapeHTML(st.name)}</b><small>${escapeHTML(st.desc)}</small></div>`).join('')}</div></div></section>`;
 wireModeNav();modeContent.querySelector('#dc-start').onclick=startDemo;window.scrollTo({top:0,behavior:'instant'});
}
function startDemo(){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;
 demoQuestions=drawQuestions(currentMode);
 demoState={index:0,results:[],feedback:null,deadline:null,finished:false};
 renderQuestion();
}
function footballerSVG(){
 const shirt=equipped('camiseta')?.color||'#d8b35f',boots=equipped('botas')?.color||'#f6f0dc',ball=equipped('balon')?.color||'#f7f0dc',aura=equipped('aura')?.color||'transparent';
 return `<svg viewBox="0 0 76 100" class="dc-footballer-svg" role="img" aria-label="Futbolista avanzando por el descenso">
  <ellipse cx="37" cy="48" rx="30" ry="40" fill="${aura}" opacity=".22" class="wc-player-aura"/>
  <ellipse cx="37" cy="94" rx="23" ry="4" fill="#020c08" opacity=".48"/>
  <g class="dc-player-body">
   <circle cx="35" cy="13" r="9" fill="#d7a779" stroke="#3b2418" stroke-width="2"/>
   <path d="M27 10q2-10 14-5l3 6-5-3-8 3z" fill="#30251d"/>
   <path d="M25 25q10-6 21 0l5 25H20z" fill="${shirt}" stroke="#17291f" stroke-width="2"/>
   <path d="M26 29l-9 17 5 4 11-13M44 29l10 16-5 4-10-12" fill="none" stroke="#d7a779" stroke-width="5" stroke-linecap="round"/>
   <path d="M20 50h31l-3 13H24z" fill="#f1ead7" stroke="#17291f" stroke-width="2"/>
   <path class="dc-leg-a" d="M28 62l-5 20 10 3 6-20" fill="none" stroke="#d7a779" stroke-width="6" stroke-linecap="round"/>
   <path class="dc-leg-b" d="M43 62l4 18-8 5-5-20" fill="none" stroke="#d7a779" stroke-width="6" stroke-linecap="round"/>
   <path d="M19 85l12-2 2 6-17 2zM39 85l9-5 8 5-14 5z" fill="${boots}" stroke="#17291f" stroke-width="2" stroke-linejoin="round"/>
   <path d="M35 32v14" stroke="#1c4735" stroke-width="3"/><text x="35" y="42" font-size="9" font-weight="900" text-anchor="middle" fill="#1c4735">10</text>
  </g>
  <g class="dc-player-ball"><circle cx="62" cy="78" r="8" fill="${ball}" stroke="#14241c" stroke-width="2"/><path d="M62 73l4 3-2 5h-5l-2-5z" fill="#17271f"/></g>
 </svg>`;
}
function routeMarkup(total=0,impact=''){
 const zoneIndex=currentZoneIndex(total),progress=progressPercent(total);
 return `<aside class="dc-route-panel" data-zone="${zoneIndex}" aria-label="Progreso del descenso">
  <div class="dc-route-head"><div><span>PROGRESO DEL DESCENSO</span><strong>${Math.round(total/700*100)}%</strong></div><div class="dc-route-current">${zones[zoneIndex].name}</div></div>
  <div class="dc-route-track ${impact?`impact-${impact}`:''}">
   <div class="dc-route-line"></div>
   ${zones.map((z,i)=>`<div class="dc-route-node ${i===zoneIndex?'active':''} ${i<zoneIndex?'passed':''}" data-stage="${i}" style="top:${5+i*9.85}%"><span class="dc-node-dot">${i<zoneIndex?'✓':String(i+1).padStart(2,'0')}</span><b>${z.name}</b></div>`).join('')}
   <div class="dc-player-marker" style="top:${progress}%">${footballerSVG()}</div>
  </div>
  <div class="dc-route-foot"><span>ARRIBA · ÉLITE</span><span>ABAJO · BARRIO</span></div>
  <div class="dc-zone-caption"><strong>${zones[zoneIndex].name}</strong><span>${zones[zoneIndex].desc}</span></div>
 </aside>`;
}
function gradeSquares(){
 return `<div class="dc-mini-squares" aria-label="Puntuaciones por pregunta">${demoQuestions.map((_,i)=>{const r=demoState?.results[i];return `<span title="Pregunta ${i+1}${r?' · '+r.points+' puntos':''}" class="${r?'point-'+r.points:i===demoState?.index?'current':'pending'}">${r?r.points:''}</span>`}).join('')}</div>`;
}
function gameNav(){
 return `<div class="dc-game-top dc-game-top-immersive">
  <div class="dc-game-brand"><span class="dc-kicker">DESAFÍO DE PRUEBA</span><h2>${isPast()?'GLORIAS <b>ETERNAS</b>':isFuture()?'FUTURAS <b>PROMESAS</b>':isCima()?'LA <b>CIMA</b>':'EL <b>DESCENSO</b>'}</h2></div>
  ${gradeSquares()}
  <div class="dc-game-score"><span>PUNTUACIÓN</span><strong>${totalScore()} <small>/ 700</small></strong></div>
  <button class="dc-exit" id="dc-exit">SALIR</button>
 </div>`;
}
function gameWorld(total,inner,impact='',priorTotal=total){
 const zoneIndex=currentZoneIndex(total),zone=stageList()[zoneIndex];
 const prevIndex=currentZoneIndex(priorTotal);
 return `<section class="dc-world" data-zone="${zoneIndex}" style="--zone-image:url('${travelImage(zoneIndex)}')" aria-label="${escapeHTML(zone.name)}">
  <div class="dc-world-scene"></div><div class="dc-world-vignette"></div>
  <div class="dc-world-top"><span class="dc-zone-pill">FASE ${String(stageNumber(zoneIndex)).padStart(2,'0')} / ${isTemporal()?9:10} · ${escapeHTML(zone.name.toUpperCase())}</span><span class="dc-world-progress">${modeAction()} ${Math.round(total/700*100)}%</span></div><div class="dc-meter-hud" aria-label="Metros recorridos"><span class="dc-meter-label">${travelLabel()}</span><strong>${Math.round(travelValue(total))}<small>${isTemporal()?'':' m'}</small></strong><div class="dc-meter-line"></div><span class="dc-meter-phase">${escapeHTML(zone.name)}</span></div>
  <div class="dc-stage-progress"><div style="width:${total/7}%"></div></div>
  <div class="dc-world-layout">${inner}
   <div class="dc-avatar-zone ${impact?'avatar-impact impact-'+impact:''}" aria-label="Futbolista de World Cup">${footballerSVG()}<div class="dc-avatar-shadow"></div></div>
  </div>
  <div class="dc-depth-foot"><span>${isPast()?'2026':isFuture()?'2026':isCima()?'BARRIO':'ÉLITE'}</span><span>${isTemporal()?modeAction():isCima()?'↑ LA CIMA':'↓ EL DESCENSO'}</span><span>${isPast()?'1900':isFuture()?'3000':isCima()?'ÉLITE':'BARRIO'}</span></div>
 </section>`;
}
function renderQuestion(){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;
 if(!demoState||demoState.index>=demoQuestions.length){renderResults();return}
 const q=demoQuestions[demoState.index],total=totalScore();
 const content=`<div class="dc-question-panel dc-immersive-card" id="dc-question-panel">
   <div class="dc-question-meta"><span>PREGUNTA ${String(demoState.index+1).padStart(2,'0')} <i>/ 07</i></span><span class="dc-club-tag">${escapeHTML(q.club)}</span><span class="dc-timer" id="dc-timer">30s</span></div>
   <div class="dc-question-copy"><p>RETO ${String(demoState.index+1).padStart(2,'0')}</p><h3>${escapeHTML(q.text)}</h3><span>${q.kind==='club-answer'?'Escribe un club válido.':isCima()?'¡Busca una respuesta popular!':isTemporal()?'¡Elige un futbolista y viaja por el tiempo!':'¡Busca una respuesta poco común!'} · ${escapeHTML(q.difficulty)}</span></div>
  </div>
  <div class="dc-bottom-input"><form class="dc-answer-form" id="dc-answer-form">
   <label for="dc-answer">TU RESPUESTA</label><div class="dc-input-row"><input id="dc-answer" name="answer" maxlength="80" autocomplete="off" placeholder="${q.kind==='club-answer'?'Escribe un club...':'Nombre, apellido o apodo...'}" required><button type="submit">VALIDAR ↗</button></div>
   <div class="dc-autocomplete" id="dc-suggestions" aria-label="Jugadores sugeridos"></div>
  </form><p>7 preguntas abiertas y asequibles · Las respuestas menos obvias pueden valer más · Rejuega cuanto quieras</p></div>`;
 modeContent.innerHTML=modeNav(activeMode())+gameNav()+gameWorld(total,content);
 wireModeNav();modeContent.querySelector('#dc-exit').onclick=activeLobby;
 modeContent.querySelector('#dc-answer-form').addEventListener('submit',e=>{e.preventDefault();submitAnswer(modeContent.querySelector('#dc-answer').value,false,modeContent.querySelector('#dc-answer').dataset.selectedPlayerId||'')});
 wireSuggestions(q);
 const input=modeContent.querySelector('#dc-answer');if(input)input.focus();
 demoState.deadline=Date.now()+30000;
 timer=setInterval(()=>{
  if(!['abismo','cielo','pasado','futuro'].includes(currentMode)||!demoState||demoState.feedback){clearInterval(timer);return}
  const remaining=Math.max(0,Math.ceil((demoState.deadline-Date.now())/1000));
  const clock=modeContent.querySelector('#dc-timer');
  if(clock){clock.textContent=remaining+'s';clock.classList.toggle('danger',remaining<=10)}
  if(remaining===0){clearInterval(timer);submitAnswer('',true)}
 },200);
}
function submitAnswer(value,expired=false,selectedId=''){
 if(!demoState||demoState.feedback)return;
 if(timer)clearInterval(timer);timer=null;
 const q=demoQuestions[demoState.index];
 const result=expired?{status:'timeout',points:0,name:'Tiempo agotado',tier:'miss'}:validateAnswer(q,value,selectedId);
 demoState.results.push({question:q.text,club:q.club,answer:result.name,status:result.status,points:result.points,tier:result.tier,calibrated:result.calibrated??false});
 demoState.feedback=result;
 renderFeedback();
}
// Revelation uses only the five example answers actually supplied by the question bank.
// It is deliberately hidden until the answer has been submitted, to prevent spoilers.
function answerReveal(question,result){
 const pools=question.kind==='club-answer'?question.validClubs:question.validIds;
 const samples=[10,30,60,80,100].map(points=>{
  const id=pools.find(id=>questionPoints(question,id)===points);
  return {points,id,name:id?(question.kind==='club-answer'?id:(playerById.get(id)?.name||'')):'Sin ejemplo'};
 });
 const colors={10:'red',30:'orange',60:'blue',80:'green',100:'gold'};
 const items=samples.map(x=>`<div class="dc-reveal-answer dc-reveal-${colors[x.points]} ${x.id===result.playerId?'dc-reveal-selected':''}"><strong>${x.points}<small>PTS</small></strong><span>${escapeHTML(x.name)}</span>${x.id===result.playerId?'<em>TU RESPUESTA</em>':''}</div>`).join('');
 const outcome=result.status==='valid'?'Tu respuesta es válida. Los ejemplos reflejan el baremo provisional de popularidad.':result.status==='timeout'?'Se ha agotado el tiempo.':result.status==='ambiguous'?'Selecciona el futbolista concreto en el desplegable si hay varios con ese nombre.':'Esa respuesta no cumple la pregunta. Puedes intentar con otra en una nueva partida.';
 return `<aside class="dc-answer-reveal" id="dc-answer-reveal"><div class="dc-reveal-heading"><span>ASÍ PUNTUABAN LAS RESPUESTAS</span><b>5 NIVELES</b></div><div class="dc-reveal-answers">${items}</div><p>${escapeHTML(outcome)}</p><span class="dc-reveal-caveat">Puntuaciones estimadas por notoriedad; no son porcentajes medidos de usuarios.</span></aside>`;
}
function renderFeedback(){
 clearDescentTransition();
 const result=demoState.feedback,total=totalScore(),previous=total-result.points;
 const fromZone=currentZoneIndex(previous),toZone=currentZoneIndex(total);
 const tier=tiers[Number(result.points)]||null;
 const grade=tier?.label||(result.status==='timeout'?'TIEMPO AGOTADO':'SIN PUNTOS');
 const color=tier?.color||'miss';
 const delta=Math.max(0,result.points);
 // The cinematics are shown on the same immersive pitch; no question or answer panels remain.
 const content=`<section class="dc-world dc-cinematic ${isCima()?'dc-ascent':isPast()?'dc-time-past':isFuture()?'dc-time-future':''} dc-cinema-${color}" aria-label="Animación de ${modeAction().toLowerCase()} por ${delta} puntos">
  <div class="dc-cinema-scene dc-cinema-from" style="background-image:url('${travelImage(fromZone)}')"></div>
  <div class="dc-cinema-scene dc-cinema-next" style="background-image:url('${travelImage(toZone)}')"></div>
  <div class="dc-world-vignette"></div>
  <div class="dc-cinema-top"><span id="dc-cinema-zone">${escapeHTML(stageName(fromZone).toUpperCase())}</span><span>FASE <span id="dc-cinema-phase">${stageNumber(fromZone)}</span> / ${isTemporal()?9:10}</span></div>
  <div class="dc-cinema-meter" aria-live="off"><span>${travelLabel()}</span><strong id="dc-meter-live">${travelValue(previous)}</strong><em>${travelUnit()}</em><div class="dc-cinema-meter-rail"><div id="dc-meter-fill" style="height:${previous/7}%"></div></div></div>
  <div class="dc-cinema-celebration"><span class="dc-cinema-grade">${escapeHTML(grade)}</span><b>${isPast()?'−':isFuture()?'+':'+'}${isTemporal()?travelDelta(previous,total):delta} ${isTemporal()?'AÑOS':'METROS'}</b>${result.status==='valid'?`<small>${escapeHTML(result.name)}</small>`:''}</div>
  <div class="dc-cinema-player ${result.points>=80 && equipped('celebracion')?'wc-celebration-'+normalize(equipped('celebracion').name):''}">${footballerSVG()}<div class="dc-cinema-speed" aria-hidden="true"></div></div>
  <div class="dc-cinema-arrival" id="dc-cinema-arrival">${fromZone!==toZone?(isTemporal()?'NUEVA ÉPOCA · ':'NUEVO ESTADIO · '):''}${escapeHTML(stageName(toZone).toUpperCase())}</div>
  ${answerReveal(demoQuestions[demoState.index],result)}
  ${delta===100?`<div class="dc-cinema-sparks" aria-hidden="true">${Array.from({length:26},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>`:''}
  <button class="dc-cinema-skip" id="dc-cinema-skip" type="button">VER RESPUESTAS ▾</button>
 </section>`;
 modeContent.innerHTML=modeNav(activeMode())+gameNav()+content;
 wireModeNav();
 const scene=modeContent.querySelector('.dc-cinematic');
 const live=modeContent.querySelector('#dc-meter-live');
 const meterFill=modeContent.querySelector('#dc-meter-fill');
 const zoneText=modeContent.querySelector('#dc-cinema-zone');
 const phaseText=modeContent.querySelector('#dc-cinema-phase');
 const duration=delta>=80?2900:delta>=60?2450:delta>=30?2050:1600;
 let completed=false,revealed=false;
 const done=()=>{
  if(completed)return;completed=true;clearDescentTransition();
  demoState.index++;demoState.feedback=null;
  if(demoState.index>=demoQuestions.length)renderResults();else renderQuestion();
 };
 modeContent.querySelector('#dc-exit').onclick=()=>{clearDescentTransition();activeLobby()};
 const continueButton=modeContent.querySelector('#dc-cinema-skip');
 const showAnswers=()=>{
  if(revealed||completed)return;
  revealed=true;
  scene.classList.add('dc-cinema-show-answers','dc-cinema-complete');
  // Reveal the target stadium, meters and the examples before allowing another question.
  live.textContent=String(Math.round(travelValue(total)));meterFill.style.height=`${total/7}%`;
  zoneText.textContent=stageName(toZone).toUpperCase();phaseText.textContent=String(stageNumber(toZone));
  scene.classList.add('dc-cinema-crossed');
  continueButton.textContent=demoState.index===demoQuestions.length-1?'VER RESULTADOS ▶':'SIGUIENTE PREGUNTA ▶';
 };
 continueButton.onclick=()=>revealed?done():showAnswers();
 const startAt=performance.now();
 scene.style.setProperty('--fall-ms',`${duration}ms`);
 scene.style.setProperty('--fall-distance',`${delta?Math.round(55+delta*1.28):0}px`);
 scene.style.setProperty('--camera-travel',`${delta?Math.round(28+delta*1.16):0}px`);
 // A single fall animation also drives the counter; higher-value answers fall farther.
 function animate(now){
  if(completed||!scene.isConnected)return;
  const t=Math.min(1,(now-startAt)/duration);
  const eased=1-Math.pow(1-t,3);
  live.textContent=String(Math.round(travelValue(previous+delta*eased)));
  meterFill.style.height=`${(previous+delta*eased)/7}%`;
  if(fromZone!==toZone && currentZoneIndex(previous+delta*eased)!==fromZone){
   zoneText.textContent=stageName(toZone).toUpperCase();phaseText.textContent=String(stageNumber(toZone));
   scene.classList.add('dc-cinema-crossed');
  }
  if(t<1)requestAnimationFrame(animate);
  else showAnswers();
 }
 requestAnimationFrame(animate);
 // The reveal stays visible until the player presses continue; do not auto-skip the examples.
}
function renderResults(){
 clearDescentTransition();
 if(timer)clearInterval(timer);timer=null;
 if(!demoState)return;
 const earnedXP=recordGame();
 const total=totalScore(),zone=stageList()[currentZoneIndex(total)];
 const hits=demoState.results.filter(r=>r.status==='valid').length;
 const rows=demoState.results.map((r,i)=>{
  const t=tiers[Number(r.points)];
  return `<div class="dc-result-row"><span class="dc-result-num">${String(i+1).padStart(2,'0')}</span><div class="dc-result-info"><b>${escapeHTML(r.club)}</b><small>${escapeHTML(r.answer||'Sin respuesta')}</small></div><strong class="${t?`tier-text-${r.points}`:'tier-text-miss'}">${r.points} PTS</strong></div>`;
 }).join('');
 modeContent.innerHTML=modeNav(activeMode())+`<section class="dc-results">
  <p class="dc-kicker">DESAFÍO COMPLETADO · DEMO</p>
  <h2>${isTemporal()?'HAS VIAJADO HASTA':'HAS LLEGADO A'} <span>${escapeHTML(zone.name.toUpperCase())}</span></h2>
  <div class="dc-results-score"><strong>${total}</strong><span>/ 700 PUNTOS</span></div>
  <p class="wc-earned-xp">✦ +${earnedXP} XP GANADOS · NIVEL ${levelDetails(profile.xp).level}</p>
  <p class="dc-results-sub">${hits} de 7 respuestas válidas · Has completado el ${Math.round(total/700*100)}% del ${modeAction().toLowerCase()}.</p>
  <div class="dc-results-list">${rows}</div>
  <div class="dc-results-actions"><button class="dc-primary" id="dc-replay">VOLVER A JUGAR ↻</button><button class="dc-secondary" id="dc-lobby">VOLVER AL DESAFÍO</button></div>
  <p class="dc-demo-note">MODO DE PRUEBAS · 7 PREGUNTAS ALEATORIAS · PUEDES REPETIRLO TANTAS VECES COMO QUIERAS</p>
 </section>`;
 wireModeNav();
 modeContent.querySelector('#dc-replay').onclick=startDemo;
 modeContent.querySelector('#dc-lobby').onclick=activeLobby;
}
function openProfile(tab="resumen"){
 updateProfile();profileModal.classList.remove('hidden');renderProfileTab(tab);
 const firstTab=profileModal.querySelector('[data-profile-tab="'+tab+'"]');if(firstTab)firstTab.focus();
}
function closeProfile(){profileModal.classList.add('hidden')}
function wireUI(){
 document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>showMode(el.dataset.mode)));
 document.querySelector('#logo-home').addEventListener('click',showHome);
 document.querySelector('#back-home').addEventListener('click',showHome);
 document.querySelector('#profile-button').addEventListener('click',()=>openProfile());
 document.querySelector('#inventory-home-button').addEventListener('click',()=>openProfile('coleccion'));
 document.querySelector('#chests-home-button').addEventListener('click',()=>openProfile('cofres'));
 document.querySelector('#trophy-home-button').addEventListener('click',()=>openProfile('trofeos'));
 document.querySelector('#profile-close').addEventListener('click',closeProfile);
 profileModal.addEventListener('click',e=>{if(e.target===profileModal)closeProfile()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfile()});
 document.querySelectorAll('[data-profile-tab]').forEach(b=>b.addEventListener('click',()=>renderProfileTab(b.dataset.profileTab)));
 document.querySelectorAll('.daily-card').forEach(card=>card.addEventListener('click',()=>{card.classList.remove('attention');void card.offsetWidth;card.classList.add('attention');setTimeout(()=>card.classList.remove('attention'),650)}));
}
async function init(){
 wireUI();
 try{
  const stored=localStorage.getItem(PROFILE_KEY);
  if(stored){profile=safeProfile(JSON.parse(stored))}
  awardLevelChests();saveProfile();
  const [p,q]=await Promise.all([fetch('futbolistas.json'),fetch('banco-840-preguntas.json')]);
  if(!p.ok||!q.ok)throw Error('No se han podido cargar la base de futbolistas o el banco de 840 preguntas.');
  players=await p.json();questionBank=await q.json();buildIndex();
  if(questionBank.length!==840)throw Error(`El banco debe contener 840 preguntas y tiene ${questionBank.length}.`);
  if(players.length!==3515)throw Error(`La base debería contener 3.515 jugadores y contiene ${players.length}.`);
  console.info(`World Cup 1.11: ${players.length} futbolistas y ${questionBank.length} preguntas cargadas; selección 2/3/2 aleatoria en cada intento.`);
 }catch(e){
  console.error('World Cup: abre el proyecto con Live Server para cargar los datos.',e);
  const message=document.createElement('p');message.className='dc-load-error';message.textContent='No se ha podido cargar la base local. Abre index.html con Live Server.';
  document.querySelector('#mode-content')?.append(message);
 }
}
init();
