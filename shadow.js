import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const STORAGE_KEY = 'observatory_shadow_v2';
const STATIONS = ['Observatory','Garden','Forge','Harbour','Resolve','Archive','Compost'];
const UTILITIES = ['useful-now','enabling','indeterminate','not-useful-now','obstructive'];

const colors = {
  Observatory:0xd9cfb5,
  Garden:0x7bbd73,
  Forge:0xd7a653,
  Harbour:0x6cc1de,
  Resolve:0xd58a6c,
  Archive:0x9182ab,
  Compost:0x7e6c58,
  Crossroads:0x8daef0
};

const stationPositions = {
  Observatory:[0,215,70],
  Garden:[-220,-135,120],
  Forge:[220,-30,210],
  Harbour:[-220,65,-220],
  Resolve:[165,-10,-235],
  Archive:[-120,-220,-110],
  Compost:[110,-235,-30],
  Crossroads:[0,0,0]
};

const stationDescriptions = {
  Observatory:'Primarily asks for observation, diagnosis, orientation or pattern recognition.',
  Garden:'Primarily asks for exploration, cultivation or experiment without a fixed completion state.',
  Forge:'Contains a bounded act, output, delivery or finish condition.',
  Harbour:'Protects a condition, relationship, routine or baseline required for continued functioning.',
  Resolve:'Contains a live obligation, repair, decision, claimant or closure condition.',
  Archive:'Worth retaining without keeping it active in the current order.',
  Compost:'Its present claim on attention may have ended; value may remain without obligation.'
};

const signalPatterns = {
  interest:/\binterest(?:ed|ing)?\b/i,
  curiosity:/\bcurious|curiosity|wonder(?:ing)?\b/i,
  conviction:/\bconviction|convinced|certain|believe strongly|sure that\b/i,
  uncertainty:/\buncertain|unsure|maybe|perhaps|don't know|do not know|question\b/i,
  obligation:/\bowe|must|should|obligation|promise|required|need to\b/i,
  pressure:/\bpressure|overwhelm|taking more attention|consum(?:e|ing)|burden\b/i,
  urgency:/\burgent|today|tonight|now|immediate|deadline|asap\b/i,
  aversion:/\bavoid|aversion|don't want|do not want|hate|resist\b/i,
  recurrence:/\bkeep returning|again|recurr|keeps coming back|can't stop thinking|cannot stop thinking\b/i,
  attraction:/\bdrawn to|pull(?:ed)? toward|attract(?:ed|ion)?\b/i
};

const statePatterns = [
  {state:'being', re:/\bbeing|to be|remain|staying|exist(?:ing)?\b/i, confidence:'possible'},
  {state:'considering', re:/\bconsider|thinking about|wonder|reflect|weigh(?:ing)?\b/i, confidence:'probable'},
  {state:'attempting', re:/\battempt|trying to|endeavou?r|working to\b/i, confidence:'probable'},
  {state:'trying', re:/\btry|trying|test|experiment|prototype\b/i, confidence:'probable'},
  {state:'deferred', re:/\bdefer|later|not now|pause|postpone|hold off|shelve\b/i, confidence:'probable'},
  {state:'hidden', re:/\bhide|hidden|conceal|avoid saying|keep from\b/i, confidence:'probable'},
  {state:'conferring', re:/\bconfer|give|grant|enable|support|bestow\b/i, confidence:'possible'},
  {state:'infecting', re:/\binfect|spread|transmit|contag|ripple|propagat\b/i, confidence:'possible'}
];

const stationRules = {
  Forge:[/\bmake|build|send|publish|finish|ship|deliver|draft|write|call|submit|launch|complete|fix\b/i, /\boutput|deadline|deliverable\b/i],
  Garden:[/\bexplore|experiment|prototype|idea|create|design|develop|curious|wonder|possibility|research\b/i],
  Harbour:[/\bsteady|protect|sleep|home|safe|health|rest|routine|family|friend|animal|food|water|stability\b/i],
  Resolve:[/\bresolve|repair|apolog|owe|promise|decision|closure|respond|unresolved|claimant|arrears|settle\b/i],
  Compost:[/\brelease|let go|finished|obsolete|resentment|dead|abandon|stop carrying|no longer\b/i],
  Archive:[/\barchive|retain|record|reference|precedent|keep for later|dormant\b/i],
  Observatory:[/\bobserve|understand|analyse|analyze|pattern|meaning|diagnos|orientation|reflect|signal|metacogn|why\b/i]
};

const lensLabels = {
  free:'Primary source',
  q1:'Bring into existence', q2:'Attention pressure', q3:'Returning material', q4:'Resolution',
  q5:'Possibly finished', q6:'Steadying condition', q7:'Concrete movement', q8:'Evidence of change'
};

let state = { sources:[], nodes:[], routes:[], corrections:{}, today:[] };
let scene, camera, renderer, controls, nodeGroup, routeGroup, raycaster, pointer;
let clickables = [];
let currentView = 'terrain';
let selectedNodeId = null;

const $ = id => document.getElementById(id);
const clean = s => (s || '').trim();
const lower = s => clean(s).toLowerCase();
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const isMobile = () => window.innerWidth <= 650;

function confidenceRank(c){ return ({explicit:4,probable:3,possible:2,unresolved:1})[c] || 0; }

function splitPrimary(text){
  return clean(text).split(/\n\s*\n+/).map(clean).filter(Boolean);
}

function collectSources(){
  const sources = [];
  splitPrimary($('freeCapture').value).forEach((text,i)=>sources.push(makeSource(`free-${i+1}`,'free',text)));
  for(let i=1;i<=8;i++){
    const text = clean($(`q${i}`).value);
    if(text) sources.push(makeSource(`q${i}`,`q${i}`,text));
  }
  return sources;
}

function makeSource(id,prompt,text){
  return {
    id,
    prompt,
    promptLabel:lensLabels[prompt] || prompt,
    rawText:text,
    createdAt:new Date().toISOString()
  };
}

function titleFor(text,index){
  const first = clean(text).replace(/\s+/g,' ').split(/[.!?]/)[0];
  if(!first) return `Source ${index+1}`;
  return first.length > 48 ? `${first.slice(0,45)}…` : first;
}

function detectSignals(text){
  const out = [];
  for(const [label,re] of Object.entries(signalPatterns)){
    const match = text.match(re);
    if(match) out.push({label,confidence:'explicit',evidence:match[0]});
  }
  return out;
}

function detectStates(text){
  const out = [];
  for(const rule of statePatterns){
    const match = text.match(rule.re);
    if(match) out.push({label:rule.state,confidence:rule.confidence,evidence:match[0]});
  }
  if(!out.length) out.push({label:'being',confidence:'unresolved',evidence:'No action-state language detected; retained as unresolved rather than forced.'});
  return out;
}

function stationCandidates(text){
  const scores = {};
  for(const station of STATIONS){
    scores[station] = stationRules[station].reduce((sum,re)=>sum + (re.test(text) ? 1 : 0),0);
  }
  const ranked = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  if(ranked[0][1] === 0){
    return {
      station:'Observatory',
      confidence:'unresolved',
      reason:'No terrain rule is strong enough to establish placement. Observatory is used as a holding perspective, not a conclusion.',
      alternatives:['Garden','Forge']
    };
  }
  const [first,second] = ranked;
  const confidence = first[1] >= 2 && first[1] > second[1] ? 'probable' : first[1] > second[1] ? 'possible' : 'unresolved';
  const alts = ranked.slice(1,3).filter(x=>x[1] > 0 || confidence==='unresolved').map(x=>x[0]);
  return {
    station:first[0],
    confidence,
    reason:`Candidate placement is based on material language associated with ${first[0]}, not on which prompt produced the source.`,
    alternatives:alts
  };
}

function utilityFor(text, signals, states, placement){
  const t = lower(text);
  const explicitNow = /\btoday|tonight|now|urgent|deadline|immediate|asap\b/i.test(text);
  const explicitMove = /\b(send|submit|call|finish|deliver|pay|repair|respond|publish|complete|do now|begin now)\b/i.test(text);
  const deferred = states.some(s=>['deferred','hidden'].includes(s.label));
  const exploratory = states.some(s=>['considering','trying','attempting'].includes(s.label)) || signals.some(s=>['curiosity','uncertainty','interest'].includes(s.label));
  const obstructive = /\bblocking|prevents?|stuck|derail|obstruct|can't move|cannot move\b/i.test(text);
  const finished = placement.station==='Compost' || /\bfinished|obsolete|no longer|dead\b/i.test(text);

  if(obstructive){
    return {class:'obstructive',confidence:'possible',reason:'The source contains language of blockage or prevented movement.',peripheralFunction:'May still reveal a dependency or constraint.',reentry:'Re-enter when the blocked dependency is being resolved.'};
  }
  if(explicitNow || explicitMove){
    return {class:'useful-now',confidence:explicitNow?'explicit':'probable',reason:'The source contains a concrete or time-bound movement signal.',peripheralFunction:'Not applicable while it remains in the immediate order.',reentry:'Already inside the immediate order.'};
  }
  if(deferred || finished){
    return {class:'not-useful-now',confidence:'probable',reason:deferred?'The source explicitly signals deferral or concealment.':'The material appears to have reduced or ended its current claim on attention.',peripheralFunction:deferred?'Deferral may protect material from premature conversion into action.':'Retention may preserve precedent, learning or a future point of comparison.',reentry:'Re-enter if a new dependency, claimant or useful condition appears.'};
  }
  if(exploratory){
    return {class:'indeterminate',confidence:'probable',reason:'The material is exploratory; usefulness should not be decided before the inquiry establishes its own stopping condition.',peripheralFunction:'Preserves uncertainty, possibility and information generation.',reentry:'Enter the immediate order when a defensible action, dependency or finish condition emerges.'};
  }
  if(placement.station==='Harbour'){
    return {class:'enabling',confidence:'possible',reason:'The material appears to protect conditions that enable other activity rather than produce an output itself.',peripheralFunction:'Maintains baseline capacity.',reentry:'Promote when loss of the condition would materially affect active work.'};
  }
  return {class:'indeterminate',confidence:'unresolved',reason:'There is not enough evidence to judge immediate utility.',peripheralFunction:'Retained without demanding justification beyond continued intelligibility.',reentry:'Reassess when the state changes or connects to a live dependency.'};
}

function signalInterference(signals){
  const names = new Set(signals.map(s=>s.label));
  const pairs = [];
  if(names.has('curiosity') && names.has('conviction')) pairs.push({a:'curiosity',b:'conviction',kind:'possible interference',reason:'Exploratory attention and settled belief are both explicitly present; neither is granted authority over the other.'});
  if(names.has('uncertainty') && names.has('conviction')) pairs.push({a:'uncertainty',b:'conviction',kind:'tension',reason:'Uncertainty and conviction coexist in the same source.'});
  if(names.has('interest') && names.has('obligation')) pairs.push({a:'interest',b:'obligation',kind:'competition',reason:'Attraction and obligation may be competing for attention.'});
  if(names.has('urgency') && names.has('curiosity')) pairs.push({a:'urgency',b:'curiosity',kind:'constraint',reason:'Urgency may narrow exploratory bandwidth.'});
  return pairs;
}

function makeNode(source,index){
  const signals = detectSignals(source.rawText);
  const states = detectStates(source.rawText);
  const placement = stationCandidates(source.rawText);
  const utility = utilityFor(source.rawText,signals,states,placement);
  const base = stationPositions[placement.station];
  const angle = (index+1)*1.73;
  const radius = 30 + (index%3)*13;
  return {
    id:`n${index+1}`,
    sourceId:source.id,
    sourcePrompt:source.promptLabel,
    rawText:source.rawText,
    label:titleFor(source.rawText,index),
    observation:`A source object from “${source.promptLabel}” containing ${source.rawText.split(/\s+/).filter(Boolean).length} words.`,
    signals,
    internalStates:states,
    interference:signalInterference(signals),
    placement,
    utility,
    actionStatus:'none',
    position:[base[0]+Math.cos(angle)*radius,base[1]+((index%4)-1.5)*15,base[2]+Math.sin(angle)*radius]
  };
}

function addRoute(routes,a,b,kind,reason){
  if(!a || !b || a.id===b.id) return;
  if(routes.some(r=>(r.a===a.id&&r.b===b.id)||(r.a===b.id&&r.b===a.id))) return;
  routes.push({a:a.id,b:b.id,kind,reason});
}

function buildRoutes(nodes){
  const routes=[];
  for(let i=0;i<nodes.length;i++){
    for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];
      const sa=new Set(a.signals.map(s=>s.label)), sb=new Set(b.signals.map(s=>s.label));
      const shared=[...sa].filter(x=>sb.has(x));
      if(shared.length) addRoute(routes,a,b,'signal resonance',`Both sources contain ${shared.join(', ')}. This is a shared signal, not proof of a shared cause.`);
      if(a.placement.station===b.placement.station) addRoute(routes,a,b,'shared field',`Both sources have the same leading candidate placement: ${a.placement.station}.`);
      const pair=[a.placement.station,b.placement.station].sort().join(' ↔ ');
      const cross={
        'Forge ↔ Garden':'Exploration and bounded action meet here. The question is whether action serves the inquiry or prematurely closes it.',
        'Forge ↔ Harbour':'Action meets a protected condition. The question is whether movement consumes its own enabling base.',
        'Garden ↔ Resolve':'Emerging possibility meets live repair or closure. Each may alter the meaning of the other.',
        'Compost ↔ Garden':'Release meets growth. Ending one claim may create room for another without proving that it should.',
        'Forge ↔ Resolve':'Two action-like claims compete. The relationship tests dependency and sequence rather than assuming both are urgent.'
      };
      if(cross[pair]) addRoute(routes,a,b,'crossroads',cross[pair]);
      const aIn=a.utility.class==='useful-now', bIn=b.utility.class==='useful-now';
      const aOut=['not-useful-now','indeterminate'].includes(a.utility.class), bOut=['not-useful-now','indeterminate'].includes(b.utility.class);
      if((aIn&&bOut)||(bIn&&aOut)) addRoute(routes,a,b,'order boundary','One source is inside the immediate order while the other is outside or unresolved. The relation is retained without forcing the remainder into action.');
    }
  }
  return routes.slice(0,Math.max(nodes.length*2,8));
}

function applyCorrections(){
  for(const n of state.nodes){
    const c=state.corrections[n.sourceId];
    if(!c) continue;
    if(c.station && STATIONS.includes(c.station)){
      n.placement.station=c.station;n.placement.confidence='explicit';n.placement.reason='User-corrected placement.';
      const base=stationPositions[c.station]; n.position=[base[0],base[1],base[2]];
    }
    if(c.utility && UTILITIES.includes(c.utility)){
      n.utility.class=c.utility;n.utility.confidence='explicit';n.utility.reason='User-corrected utility state.';
    }
    if(c.actionStatus) n.actionStatus=c.actionStatus;
  }
}

function generateField(){
  const sources=collectSources();
  if(!sources.length){ alert('Give the field at least one source first.'); return; }
  state.sources=sources;
  state.nodes=sources.map(makeNode);
  applyCorrections();
  state.routes=buildRoutes(state.nodes);
  state.today=deriveToday(state.nodes);
  persistInputs();persistState();
  $('field').classList.add('active');
  if(!renderer) initScene();
  renderField();renderSummary();renderLedger();renderToday();renderRemainder();
  setTimeout(()=>{$('field').scrollIntoView({behavior:'smooth'});resize();},80);
}

function deriveToday(nodes){
  const candidates=[];
  for(const n of nodes){
    const t=lower(n.rawText);
    let reason='';
    if(n.actionStatus==='today') reason='Promoted by user.';
    else if(n.utility.class==='useful-now' && /\btoday|tonight|now|deadline|urgent|immediate\b/i.test(n.rawText)) reason='The source itself establishes a current time condition.';
    else if(n.utility.class==='useful-now' && n.placement.station==='Forge') reason='A concrete movement is present, but inclusion remains a candidate rather than station-driven urgency.';
    else if(n.placement.station==='Harbour' && /\bprotect|safe|health|sleep|home|steady\b/i.test(n.rawText) && /\bnow|today|need|must\b/i.test(n.rawText)) reason='A protected enabling condition appears materially current.';
    if(reason) candidates.push({...n,todayReason:reason});
  }
  const explicit=candidates.filter(n=>n.actionStatus==='today');
  const rest=candidates.filter(n=>n.actionStatus!=='today');
  return [...explicit,...rest].slice(0,4);
}

function legitimateRemainder(nodes){
  return nodes.filter(n=>['not-useful-now','indeterminate','enabling'].includes(n.utility.class) && n.actionStatus!=='today');
}

function persistInputs(){
  const inputs={free:$('freeCapture').value}; for(let i=1;i<=8;i++) inputs[`q${i}`]=$(`q${i}`).value;
  localStorage.setItem(`${STORAGE_KEY}_inputs`,JSON.stringify(inputs));
}
function persistState(){ localStorage.setItem(`${STORAGE_KEY}_state`,JSON.stringify({corrections:state.corrections})); }
function restore(){
  try{
    const inputs=JSON.parse(localStorage.getItem(`${STORAGE_KEY}_inputs`)||'{}');
    $('freeCapture').value=inputs.free||'';for(let i=1;i<=8;i++) $(`q${i}`).value=inputs[`q${i}`]||'';
    const saved=JSON.parse(localStorage.getItem(`${STORAGE_KEY}_state`)||'{}');state.corrections=saved.corrections||{};
  }catch(e){ console.warn('Could not restore Shadow Field state',e); }
}

function initScene(){
  const mount=$('three');
  scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x0d1219,.00072);
  camera=new THREE.PerspectiveCamera(isMobile()?52:45,1,1,3000);
  camera.position.set(...(isMobile()?[620,470,850]:[440,330,580]));
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.outputColorSpace=THREE.SRGBColorSpace; mount.appendChild(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=isMobile()?430:260;controls.maxDistance=1700;
  scene.add(new THREE.AmbientLight(0xffffff,2.0));
  const key=new THREE.DirectionalLight(0xf7f0df,2.7);key.position.set(420,500,300);scene.add(key);
  const rim=new THREE.PointLight(0x9bb9ff,1500,1300,2);rim.position.set(-420,160,-240);scene.add(rim);
  nodeGroup=new THREE.Group();routeGroup=new THREE.Group();scene.add(routeGroup,nodeGroup);
  raycaster=new THREE.Raycaster();pointer=new THREE.Vector2();let down=null;
  renderer.domElement.addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;if(moved>6)return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(clickables,false);if(hits.length) inspectNode(hits[0].object.userData.node.id);
  });
  resize();animate();
}

function makeLabel(text,mobile=false){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=512;canvas.height=128;
  ctx.clearRect(0,0,512,128);ctx.font=`${mobile?30:27}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(7,12,18,.86)';roundRect(ctx,10,24,492,78,18);ctx.fill();ctx.fillStyle='#f3ead9';ctx.fillText(text.length>34?`${text.slice(0,31)}…`:text,256,64);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false});const s=new THREE.Sprite(mat);s.scale.set(mobile?180:155,mobile?45:39,1);return s;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function makeRoute(a,b,cross){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=new THREE.Vector3().subVectors(end,start),len=dir.length(),mid=new THREE.Vector3().addVectors(start,end).multiplyScalar(.5);
  const geo=new THREE.CylinderGeometry(cross?1.55:1.0,cross?1.55:1.0,len,8,1,true);const mat=new THREE.MeshBasicMaterial({color:cross?0x9bb9ff:0xa2acb8,transparent:true,opacity:cross?.72:.3,depthWrite:false});
  const mesh=new THREE.Mesh(geo,mat);mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());mesh.userData.baseOpacity=mat.opacity;return mesh;
}

function renderField(){
  clickables=[];nodeGroup.clear();routeGroup.clear();
  for(const [station,pos] of Object.entries(stationPositions)){
    const geo=new THREE.SphereGeometry(station==='Crossroads'?15:10,24,18);const mat=new THREE.MeshStandardMaterial({color:colors[station],roughness:.35,metalness:.05,emissive:colors[station],emissiveIntensity:station==='Crossroads'?.38:.12,transparent:true,opacity:.56});
    const m=new THREE.Mesh(geo,mat);m.position.set(...pos);nodeGroup.add(m);const lab=makeLabel(station,isMobile());lab.position.set(pos[0],pos[1]+31,pos[2]);nodeGroup.add(lab);
  }
  const byId=new Map();
  for(const n of state.nodes){
    const geo=new THREE.SphereGeometry(17,30,22);const mat=new THREE.MeshStandardMaterial({color:nodeColor(n),roughness:.25,metalness:.08,emissive:nodeColor(n),emissiveIntensity:.30,transparent:true,opacity:nodeOpacity(n)});
    const m=new THREE.Mesh(geo,mat);m.position.set(...n.position);m.userData.node=n;nodeGroup.add(m);clickables.push(m);byId.set(n.id,n);
    const lab=makeLabel(labelForView(n),isMobile());lab.position.set(n.position[0],n.position[1]+36,n.position[2]);nodeGroup.add(lab);
  }
  for(const r of state.routes){
    const a=byId.get(r.a),b=byId.get(r.b);if(!a||!b)continue;
    if(currentView==='source') continue;
    if(currentView==='remainder' && !(isRemainder(a)&&isRemainder(b))) continue;
    const mesh=makeRoute(a.position,b.position,r.kind==='crossroads');mesh.userData.route=r;routeGroup.add(mesh);
  }
  if(selectedNodeId) inspectNode(selectedNodeId);
}
function isRemainder(n){ return ['not-useful-now','indeterminate','enabling'].includes(n.utility.class); }
function nodeColor(n){
  if(currentView==='utility'){
    const map={'useful-now':0xef766a,enabling:0x7fc1df,indeterminate:0xd9cfb5,'not-useful-now':0x9182ab,obstructive:0xd58a6c};return map[n.utility.class]||colors[n.placement.station];
  }
  if(currentView==='signals' && n.interference.length) return 0x8daef0;
  if(currentView==='remainder' && isRemainder(n)) return 0x9182ab;
  return colors[n.placement.station];
}
function nodeOpacity(n){ if(currentView==='remainder'&&!isRemainder(n)) return .16;if(currentView==='signals'&&!n.signals.length)return .25;return 1; }
function labelForView(n){ if(currentView==='utility')return n.utility.class.replaceAll('-',' ');if(currentView==='signals')return n.signals[0]?.label||'no explicit signal';if(currentView==='remainder')return isRemainder(n)?n.label:'outside view';if(currentView==='source')return n.sourcePrompt;return n.label; }

function inspectNode(id){
  const n=state.nodes.find(x=>x.id===id);if(!n)return;selectedNodeId=id;
  const source=state.sources.find(s=>s.id===n.sourceId);
  const signals=n.signals.length?n.signals.map(s=>`<span class="badge">${escapeHtml(s.label)} · ${s.confidence}</span>`).join(''):'<span class="badge">no explicit signal detected</span>';
  const states=n.internalStates.map(s=>`<span class="badge">${escapeHtml(s.label)} · ${s.confidence}</span>`).join('');
  const interference=n.interference.length?n.interference.map(x=>`<div class="evidence"><b>${escapeHtml(x.a)} ↔ ${escapeHtml(x.b)}:</b> ${escapeHtml(x.kind)}. ${escapeHtml(x.reason)}</div>`).join(''):'<div class="evidence">No signal interference rule fired.</div>';
  const routes=state.routes.filter(r=>r.a===n.id||r.b===n.id).slice(0,4).map(r=>`<div class="evidence"><b>${escapeHtml(r.kind)}:</b> ${escapeHtml(r.reason)}</div>`).join('')||'<div class="evidence">No candidate relationships.</div>';
  $('inspect').innerHTML=`
    <div class="layer"><div class="layer-label">Source</div><div>${escapeHtml(source?.rawText||n.rawText)}</div><div class="evidence">${escapeHtml(n.sourcePrompt)} · immutable in this representation</div></div>
    <div class="layer"><div class="layer-label">Observation</div><div>${escapeHtml(n.observation)}</div></div>
    <div class="layer"><div class="layer-label">Internal state</div><div class="badge-row">${states}</div></div>
    <div class="layer"><div class="layer-label">Signals</div><div class="badge-row">${signals}</div>${interference}</div>
    <div class="layer"><div class="layer-label">Immediate utility</div><div><b>${escapeHtml(n.utility.class.replaceAll('-',' '))}</b> · ${escapeHtml(n.utility.confidence)}</div><div class="evidence">${escapeHtml(n.utility.reason)}</div><div class="evidence"><b>Outside-order function:</b> ${escapeHtml(n.utility.peripheralFunction)}</div><div class="evidence"><b>Re-entry:</b> ${escapeHtml(n.utility.reentry)}</div></div>
    <div class="layer"><div class="layer-label">Candidate terrain</div><div><b>${escapeHtml(n.placement.station)}</b> · ${escapeHtml(n.placement.confidence)}</div><div class="evidence">${escapeHtml(n.placement.reason)}</div><div class="evidence">Alternatives: ${escapeHtml(n.placement.alternatives.join(', ')||'none identified')}</div></div>
    <div class="layer"><div class="layer-label">Relationships</div>${routes}</div>
    <div class="layer"><div class="layer-label">Correction</div>
      <div class="correction-grid">
        <label>Terrain<select id="stationCorrection">${STATIONS.map(s=>`<option ${s===n.placement.station?'selected':''}>${s}</option>`).join('')}</select></label>
        <label>Utility<select id="utilityCorrection">${UTILITIES.map(u=>`<option value="${u}" ${u===n.utility.class?'selected':''}>${u.replaceAll('-',' ')}</option>`).join('')}</select></label>
      </div>
      <div class="small-actions"><button id="saveCorrection" type="button">Save correction</button><button id="promoteToday" type="button">${n.actionStatus==='today'?'Remove from Today':'Promote to Today'}</button></div>
    </div>`;
  $('saveCorrection').onclick=()=>saveCorrection(n.id);
  $('promoteToday').onclick=()=>toggleToday(n.id);
}

function saveCorrection(id){
  const n=state.nodes.find(x=>x.id===id);if(!n)return;const key=n.sourceId;state.corrections[key]={...(state.corrections[key]||{}),station:$('stationCorrection').value,utility:$('utilityCorrection').value};
  if(n){const c=state.corrections[key];n.placement.station=c.station;n.placement.confidence='explicit';n.placement.reason='User-corrected placement.';n.utility.class=c.utility;n.utility.confidence='explicit';n.utility.reason='User-corrected utility state.';const base=stationPositions[c.station];n.position=[...base];}
  state.routes=buildRoutes(state.nodes);state.today=deriveToday(state.nodes);persistState();renderField();renderSummary();renderLedger();renderToday();renderRemainder();inspectNode(id);
}
function toggleToday(id){
  const n=state.nodes.find(x=>x.id===id);if(!n)return;n.actionStatus=n.actionStatus==='today'?'none':'today';const key=n.sourceId;state.corrections[key]={...(state.corrections[key]||{}),actionStatus:n.actionStatus};state.today=deriveToday(state.nodes);persistState();renderSummary();renderToday();renderRemainder();inspectNode(id);
}

function renderSummary(){
  const remainder=legitimateRemainder(state.nodes).length, today=state.today.length, inferred=state.nodes.filter(n=>n.placement.confidence!=='explicit').length, interference=state.nodes.reduce((s,n)=>s+n.interference.length,0);
  $('summary').innerHTML=[
    [state.nodes.length,'source-derived nodes'],[inferred,'candidate placements'],[interference,'signal tensions'],[remainder,'legitimate remainder'],[today,'Today candidates']
  ].map(([v,l])=>`<div class="summary-card"><b>${v}</b><span>${l}</span></div>`).join('');
}
function renderLedger(){
  $('ledger').innerHTML=state.nodes.map(n=>`<div class="ledger-row">
    <div class="ledger-cell"><b>Source</b>${escapeHtml(n.rawText)}</div>
    <div class="ledger-cell"><b>Observation</b>${escapeHtml(n.sourcePrompt)}</div>
    <div class="ledger-cell"><b>Inference</b>${escapeHtml(n.placement.station)} · ${escapeHtml(n.utility.class.replaceAll('-',' '))}</div>
    <div class="ledger-cell"><b>Action</b>${escapeHtml(n.actionStatus==='today'?'user-confirmed Today':state.today.some(t=>t.id===n.id)?'candidate Today':'none')}</div>
  </div>`).join('');
}
function renderToday(){
  const items=state.today;
  $('todayList').innerHTML=items.length?items.map(n=>`<article class="card"><h3>${escapeHtml(n.label)}</h3><div class="card-meta"><span class="badge">${escapeHtml(n.placement.station)}</span><span class="badge">${escapeHtml(n.actionStatus==='today'?'user-confirmed':'candidate')}</span></div><p>${escapeHtml(n.todayReason)}</p><p class="evidence">Source: ${escapeHtml(n.rawText)}</p></article>`).join(''):'<div class="empty">No item has a defensible claim on Today yet.</div>';
}
function renderRemainder(){
  const items=legitimateRemainder(state.nodes);
  $('remainderList').innerHTML=items.length?items.map(n=>`<article class="card"><h3>${escapeHtml(n.label)}</h3><div class="card-meta"><span class="badge">${escapeHtml(n.utility.class.replaceAll('-',' '))}</span><span class="badge">${escapeHtml(n.placement.station)}</span></div><p><b>Legitimate function:</b> ${escapeHtml(n.utility.peripheralFunction)}</p><p><b>Re-entry condition:</b> ${escapeHtml(n.utility.reentry)}</p><p class="evidence">Source: ${escapeHtml(n.rawText)}</p></article>`).join(''):'<div class="empty">No legitimate remainder identified in the current representation.</div>';
}

function setView(view){
  currentView=view;document.querySelectorAll('.view-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const notes={terrain:'Terrain · candidate placement',signals:'Signals · explicit signals and interference',utility:'Utility · relation to immediate order',remainder:'Remainder · non-immediate states retained',source:'Source · prompt provenance'};
  $('viewStatus').textContent=notes[view]||view;renderField();
}
function resetView(){ camera.position.set(...(isMobile()?[620,470,850]:[440,330,580]));controls.target.set(0,0,0);controls.update(); }
function resize(){ if(!renderer)return;const r=$('three').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix(); }
function animate(){ requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera); }

function showSecondary(id){
  if(id==='today')renderToday();else renderRemainder();
  $(id).classList.add('active');$(id).scrollIntoView({behavior:'smooth'});
}
function resetAll(){
  if(!confirm('Reset the local Shadow Field inputs and corrections in this browser?'))return;
  localStorage.removeItem(`${STORAGE_KEY}_inputs`);localStorage.removeItem(`${STORAGE_KEY}_state`);$('freeCapture').value='';for(let i=1;i<=8;i++)$(`q${i}`).value='';state={sources:[],nodes:[],routes:[],corrections:{},today:[]};$('field').classList.remove('active');$('today').classList.remove('active');$('remainder').classList.remove('active');selectedNodeId=null;
}

$('generate').addEventListener('click',generateField);
$('todayTab').addEventListener('click',()=>showSecondary('today'));
$('remainderTab').addEventListener('click',()=>showSecondary('remainder'));
$('backFromToday').addEventListener('click',()=>{$('today').classList.remove('active');$('field').scrollIntoView({behavior:'smooth'});});
$('backFromRemainder').addEventListener('click',()=>{$('remainder').classList.remove('active');$('field').scrollIntoView({behavior:'smooth'});});
$('resetAll').addEventListener('click',resetAll);
$('resetView').addEventListener('click',resetView);
document.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
window.addEventListener('resize',resize);

restore();
