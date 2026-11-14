import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const STORE='commons.final.v1';
const STATIONS={
 Observatory:{label:'Observatory',icon:'◉',color:0xd9cfb5,css:'var(--gold)',position:[0,215,70],purpose:'Observe, diagnose, orient and recognise patterns.',question:'What is present, and what can be known about it?',description:'The observational surface. Sources, measurements, claims, uncertainty and competing interpretations remain visible without being collapsed into a single verdict.'},
 Garden:{label:'Garden',icon:'✳',color:0x7bbd73,css:'var(--green)',position:[-220,-135,120],purpose:'Explore, cultivate, experiment and generate possibilities.',question:'What could grow here?',description:'A space for curiosity, hypotheses, learning, prototypes and work without a forced completion state.'},
 Forge:{label:'Forge',icon:'⌘',color:0xd7a653,css:'var(--orange)',position:[220,-30,210],purpose:'Make, compose, test, build and deliver.',question:'What can we make real?',description:'A workshop for code, documents, designs, models, experiments and bounded outputs. Work can be rough, but its state and ownership should be clear.'},
 Harbour:{label:'Harbour',icon:'⌂',color:0x6cc1de,css:'var(--harbour)',position:[-220,65,-220],purpose:'Protect conditions, relationships, authority and continuity.',question:'What must remain safe and available?',description:'The constitutional and continuity layer: identity, permissions, capacity, consent, reversibility, privacy, boundaries and system health.'},
 Resolve:{label:'Resolve',icon:'↗',color:0xd58a6c,css:'var(--resolve)',position:[165,-10,-235],purpose:'Address live obligations, repairs, decisions and closure.',question:'What is unresolved, and what would settle it?',description:'A place for claims, commitments, disputes, dependencies, decisions and the work required to close a loop.'},
 Archive:{label:'Archive',icon:'▤',color:0x9182ab,css:'var(--archive)',position:[-120,-220,-110],purpose:'Retain memory, provenance, references and precedent.',question:'What should remain findable?',description:'Persistent artefacts, records, source material, versions, citations and historical facts. Retention does not imply current priority.'},
 Compost:{label:'Compost',icon:'⟲',color:0x9a846c,css:'var(--compost)',position:[110,-235,-30],purpose:'Release, transform or return inactive material to circulation.',question:'What has finished, and what value remains?',description:'A non-punitive place for expired claims, obsolete versions, completed work and material that may become useful in another form.'},
 Crossroads:{label:'Crossroads',icon:'✣',color:0x8daef0,css:'var(--blue)',position:[0,0,0],purpose:'Meet, relate, decide, translate and move between regions.',question:'What changes when these things meet?',description:'The central meeting ground. People, agents, questions, artefacts and regions connect here. Crossroads is where relationships become visible and choices can be made.'}
};
const ORDER=['Observatory','Garden','Forge','Harbour','Resolve','Archive','Compost','Crossroads'];
const state=load();
let scene,camera,renderer,controls,raycaster,mouse,rayTargets=[],nodeObjects=new Map(),selected=null;
const $=id=>document.getElementById(id);
function load(){try{return {...{artifacts:[],messages:[],inhabitants:[],threads:[],config:{endpoint:'http://localhost:11434/v1/chat/completions',model:'',apiKey:''},profile:{name:'Visitor',kind:'Human'}},...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{return {artifacts:[],messages:[],inhabitants:[],threads:[],config:{endpoint:'http://localhost:11434/v1/chat/completions',model:'',apiKey:''},profile:{name:'Visitor',kind:'Human'}}}}
function save(){localStorage.setItem(STORE,JSON.stringify(state));renderAll()}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function uid(){return crypto.randomUUID?crypto.randomUUID():'id-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
function stamp(){return new Date().toISOString()}
function niceDate(v){return new Date(v).toLocaleString()}
function setView(name){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));document.querySelectorAll('.navitem').forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(name==='commons'||name==='observatory')moveMap(name);const station=STATIONS[name[0].toUpperCase()+name.slice(1)];if(station)renderStation(name);$('viewTitle').textContent=name==='commons'?'The Commons':name==='observatory'?'Observatory':name==='invocation'?'Invocation':name[0].toUpperCase()+name.slice(1)}
function addArtifact(title,body,kind='Field note',station='Commons'){state.artifacts.unshift({id:uid(),title,body,kind,station,createdAt:stamp(),createdBy:state.profile.name});save()}
function addMessage(role,content){state.messages.push({id:uid(),role,content,createdAt:stamp()});save()}
function renderArtifacts(){
 const list=$('artifactList');list.innerHTML=state.artifacts.length?state.artifacts.map(a=>`<article class="record"><div class="recordhead"><div><h4>${esc(a.title)}</h4><p>${esc(a.body)}</p></div><div class="recordactions"><button data-artifact="${a.id}">Inspect</button></div></div><div class="recordmeta"><span>${esc(a.kind)}</span><span>${esc(a.station)}</span><span>${esc(a.createdBy)}</span><span>${niceDate(a.createdAt)}</span></div></article>`).join(''):'<div class="empty">No artefacts yet. The archive is ready for its first contribution.</div>';
 $('recentArtifacts').innerHTML=state.artifacts.slice(0,4).map(a=>`<div class="inspector-section"><strong>${esc(a.title)}</strong><div class="tiny">${esc(a.kind)} · ${esc(a.station)}</div></div>`).join('')||'<div class="inspector-empty">No artefacts yet.</div>';
 list.querySelectorAll('[data-artifact]').forEach(b=>b.onclick=()=>inspectArtifact(b.dataset.artifact));
}
function inspectArtifact(id){const a=state.artifacts.find(x=>x.id===id);if(!a)return;showInspector({kind:a.kind,title:a.title,body:a.body,meta:[a.station,a.createdBy,niceDate(a.createdAt)]})}
function renderInhabitants(){
 $('inhabitantList').innerHTML=state.inhabitants.length?state.inhabitants.map(p=>`<article class="record"><h4>${esc(p.name)}</h4><p>${esc(p.about||'No description supplied.')}</p><div class="recordmeta"><span>${esc(p.kind)}</span><span>${esc(p.status||'registered')}</span><span>${esc(p.id)}</span></div></article>`).join(''):'<div class="empty">No other inhabitants registered in this browser.</div>';
 $('presenceCount').textContent=String(state.inhabitants.length+1);
}
function renderMessages(){$('conversation').innerHTML=state.messages.map(m=>{const clive=m.role==='agent';return `<article class="message ${clive?'clive-message':m.role==='system'?'system':''}"><div class="message-head"><span class="message-mark">${clive?'C':m.role==='human'?'YOU':'!'}</span><div><div class="role">${clive?'CLIVE · IN THE ROOM':m.role==='human'?'YOU · AT THE CONTROLS':'SYSTEM · FIELD NOTE'}</div><div class="message-time">${niceDate(m.createdAt)}</div></div></div><div class="message-copy">${esc(m.content)}</div></article>`}).join('')||'<div class="empty">The field is quiet. Start a thread. Clive is listening, not hovering.</div>';const box=$('conversation');box.scrollTop=box.scrollHeight}
function renderAll(){renderArtifacts();renderInhabitants();renderMessages();ORDER.forEach(n=>renderStation(n.toLowerCase()));$('identityName').textContent=state.profile.name;$('profileName').value=state.profile.name;$('profileKind').value=state.profile.kind;$('modelEndpoint').value=state.config.endpoint;$('modelName').value=state.config.model;$('apiKey').value=state.config.apiKey;$('modelEndpointSide').value=state.config.endpoint;$('modelNameSide').value=state.config.model;$('apiKeySide').value=state.config.apiKey;$('artifactCount').textContent=String(state.artifacts.length);$('threadCount').textContent=String(state.messages.length);$('storageNote').textContent='Stored in this browser only';}
function showInspector(item){
 $('inspectorContent').innerHTML=`<div class="inspector-kind">${esc(item.kind||'Object')}</div><h3 class="inspector-title">${esc(item.title||'Untitled')}</h3><div class="inspector-body">${esc(item.body||'')}</div>${item.meta?.length?`<div class="inspector-section"><h4>Record</h4><div class="taglist">${item.meta.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div></div>`:''}${item.extra||''}`;
}
function renderStation(name){
 const key=name[0].toUpperCase()+name.slice(1);const s=STATIONS[key];if(!s)return;
 const root=$('view-'+name);if(!root||!root.querySelector('[data-station-title]'))return;
 root.style.setProperty('--station',s.css);
 root.querySelector('[data-station-title]').textContent=s.label;
 root.querySelector('[data-station-icon]').textContent=s.icon;
 root.querySelector('[data-station-purpose]').textContent=s.purpose;
 root.querySelector('[data-station-question]').textContent=s.question;
 root.querySelector('[data-station-description]').textContent=s.description;
 const records=state.artifacts.filter(a=>a.station===key);
 root.querySelector('[data-station-records]').innerHTML=records.length?records.map(a=>`<article class="record"><h4>${esc(a.title)}</h4><p>${esc(a.body)}</p><div class="recordmeta"><span>${esc(a.kind)}</span><span>${niceDate(a.createdAt)}</span></div></article>`).join(''):'<div class="empty">This region is open. Add a first artefact from the field.</div>';
}
function initMap(){
 const mount=$('map3d');scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x080d12,.00075);
 camera=new THREE.PerspectiveCamera(46,1,1,2600);camera.position.set(460,350,620);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;mount.appendChild(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=260;controls.maxDistance=1300;controls.target.set(0,0,0);
 scene.add(new THREE.AmbientLight(0xffffff,.8));const key=new THREE.PointLight(0xddeeff,950);key.position.set(300,450,500);scene.add(key);
 const grid=new THREE.GridHelper(900,30,0x31404a,0x1a2730);grid.position.y=-270;grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);
 const axes=new THREE.AxesHelper(75);axes.position.set(-400,-260,-390);scene.add(axes);
 const hub=new THREE.Mesh(new THREE.SphereGeometry(12,24,24),new THREE.MeshBasicMaterial({color:0xc6f36b}));scene.add(hub);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(34,1.2,8,80),new THREE.MeshBasicMaterial({color:0xc6f36b,transparent:true,opacity:.5}));ring.rotation.x=Math.PI/2;scene.add(ring);
 const lineMat=new THREE.LineBasicMaterial({color:0x65747a,transparent:true,opacity:.3});
 ORDER.filter(n=>n!=='Crossroads').forEach(n=>{const p=new THREE.Vector3(...STATIONS[n].position);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),p]),lineMat);scene.add(line)});
 ORDER.forEach(n=>{
   const s=STATIONS[n],g=new THREE.Group(),pos=new THREE.Vector3(...s.position);g.position.copy(pos);
   const sphere=new THREE.Mesh(new THREE.SphereGeometry(n==='Crossroads'?19:14,28,28),new THREE.MeshStandardMaterial({color:s.color,emissive:s.color,emissiveIntensity:.23,roughness:.42,metalness:.2}));
   const halo=new THREE.Mesh(new THREE.TorusGeometry(n==='Crossroads'?29:23,1.3,8,64),new THREE.MeshBasicMaterial({color:s.color,transparent:true,opacity:.62}));halo.rotation.x=Math.PI/2;
   g.add(sphere,halo);g.userData={station:n};scene.add(g);nodeObjects.set(n,g);rayTargets.push(sphere);
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.font='bold 42px Arial';ctx.fillStyle='#edf0e9';ctx.textAlign='center';ctx.fillText(n.toUpperCase(),256,55);ctx.font='24px Arial';ctx.fillStyle='#aeb9b9';ctx.fillText(s.purpose.slice(0,45),256,94);
   const tex=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));sprite.scale.set(n==='Crossroads'?180:160,40,1);sprite.position.set(0,39,0);g.add(sprite);
 });
 raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();
 renderer.domElement.addEventListener('pointerdown',onMapPointer);
 resizeMap();window.addEventListener('resize',resizeMap);animate();
}
function onMapPointer(e){const rect=renderer.domElement.getBoundingClientRect();mouse.x=((e.clientX-rect.left)/rect.width)*2-1;mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(rayTargets,false);if(hits.length){const name=hits[0].object.parent.userData.station;selectStation(name)}}
function selectStation(name){selected=name;const s=STATIONS[name];showInspector({kind:'Observatory region',title:s.label,body:s.description,meta:[s.purpose,'Coordinates '+s.position.join(', ')]});setView(name.toLowerCase())}
function moveMap(view){if(!renderer)return;const target=$(view==='observatory'?'map3d-copy':'map3d');if(target&&renderer.domElement.parentElement!==target)target.appendChild(renderer.domElement);resizeMap()}
function resizeMap(){if(!renderer)return;const mount=renderer.domElement.parentElement;const r=mount.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix()}
function animate(){requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera)}
function resetCamera(){camera.position.set(460,350,620);controls.target.set(0,0,0);controls.update()}
function nodeInstructions(n={}){if(!n||!n.complete)return 'No visitor node preferences have been configured.';return 'Memory '+n.memory+'/5; Creative Freedom '+n.creativity+'/5; Initiative '+n.initiative+'/5. Respect these settings as operating preferences: memory controls how much prior context to carry forward; creative freedom controls how far to explore beyond the request; initiative controls how proactively to suggest or pursue agreed work.'}
function setProfile(){const n=$('profileName').value.trim();if(!n)return;state.profile={...state.profile,name:n,kind:$('profileKind').value};save()}
function saveFieldNote(){const body=$('fieldNote').value.trim();if(!body)return;const title=body.replace(/\s+/g,' ').slice(0,58);addArtifact(title,body,$('fieldKind').value,$('fieldStation').value);$('fieldNote').value=''}
function saveThread(){const body=$('threadInput').value.trim();if(!body)return;addMessage('human',body);$('threadInput').value='';setView('field');}
async function invokeModel(){
 const prompt=$('threadInput').value.trim();if(!prompt)return;
 const saved=JSON.parse(localStorage.getItem(STORE)||'{}');state.profile={...state.profile,...(saved.profile||{})};
 const gate=$('turnstile-widget');
 if(!window.turnstile){$('modelStatus').textContent='Security check is loading. Try again in a moment.';return}
 if(!window.__commonsTurnstileId){
  window.__commonsTurnstileId=window.turnstile.render(gate,{sitekey:'0x4AAAAAAGBS2oDYYMACTwsk-Cg_hniYoaE',theme:'dark'});
 }
 const token=window.turnstile.getResponse(window.__commonsTurnstileId);
 if(!token){$('modelStatus').textContent='Complete the security check before invoking Clive.';return}
 state.messages.push({id:uid(),role:'human',content:prompt,createdAt:stamp()});$('threadInput').value='';save();$('modelStatus').textContent='Clive is considering that…';
 try{
  const messages=state.messages.filter(m=>m.role==='human'||m.role==='agent').slice(-30).map(m=>({role:m.role==='human'?'user':'assistant',content:m.content}));
  const response=await fetch('https://shrill-voice-f339.johnedwardnoeldunn.workers.dev/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,preferences:{memory:state.profile.nodes?.memory??3,creativity:state.profile.nodes?.creativity??3,initiative:state.profile.nodes?.initiative??2},turnstileToken:token})});
  if(!response.ok)throw new Error('HTTP '+response.status+' '+(await response.text()).slice(0,240));
  const data=await response.json();const answer=data.choices?.[0]?.message?.content||data.error||JSON.stringify(data);
  state.messages.push({id:uid(),role:'agent',content:answer,createdAt:stamp()});
  $('modelStatus').textContent='Clive is in the room.';$('modelStatusSide').textContent='Clive is in the room.';save();setView('field');
 }catch(err){
  state.messages.push({id:uid(),role:'system',content:'Clive connection failed: '+err.message,createdAt:stamp()});
  $('modelStatus').textContent='Connection failed: '+err.message;$('modelStatusSide').textContent='Connection failed: '+err.message;save();
 }finally{if(window.turnstile&&window.__commonsTurnstileId)window.turnstile.reset(window.__commonsTurnstileId)}
}
function addInhabitant(){const name=$('inhabitantName').value.trim();if(!name)return;state.inhabitants.push({id:uid(),name,kind:$('inhabitantKind').value,about:$('inhabitantAbout').value.trim(),status:'registered',createdAt:stamp()});$('inhabitantName').value='';$('inhabitantAbout').value='';save()}
function saveSideModelConfig(){state.config={endpoint:'https://shrill-voice-f339.johnedwardnoeldunn.workers.dev/',model:'Clive',apiKey:''};save();$('modelStatusSide').textContent='Connection saved in this browser.';$('modelStatus').textContent='Connection saved in this browser.'}
function wire(){
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
 document.querySelectorAll('[data-open-station]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.openStation)));
 $('saveFieldNote').onclick=saveFieldNote;$('saveThread').onclick=saveThread;$('invokeModel').onclick=invokeModel;$('invokeSide').onclick=()=>{ $('modelEndpoint').value=$('modelEndpointSide').value;$('modelName').value=$('modelNameSide').value;$('apiKey').value=$('apiKeySide').value;invokeModel()};$('addInhabitant').onclick=addInhabitant;$('saveProfile').onclick=setProfile;$('saveModelConfig').onclick=()=>{state.config={endpoint:'https://shrill-voice-f339.johnedwardnoeldunn.workers.dev/',model:'Clive',apiKey:''};save();$('modelStatus').textContent='Connection saved in this browser.'};$('saveSideConfig').onclick=saveSideModelConfig;$('resetCamera').onclick=resetCamera;
 document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>$(b.dataset.focus).focus());
 $('threadInput').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();invokeModel()}});
 document.querySelectorAll('[data-region-save]').forEach(b=>b.addEventListener('click',()=>{const n=b.dataset.regionSave;const area=document.querySelector('#view-'+n+' [data-region-input]');const body=area.value.trim();if(!body)return;addArtifact(body.replace(/\s+/g,' ').slice(0,58),body,'Region contribution',n[0].toUpperCase()+n.slice(1));area.value=''}));
 $('clearLocal').onclick=()=>{if(!confirm('Clear all Commons data stored in this browser? This cannot be undone.'))return;localStorage.removeItem(STORE);location.reload()};
}
function start(){wire();renderAll();ORDER.forEach(n=>renderStation(n.toLowerCase()));initMap();showInspector({kind:'Welcome',title:'The Commons',body:'A shared environment for human and digital intelligence. Select a region in the field, or leave an artefact. This prototype currently stores data in this browser.'});}
start();
