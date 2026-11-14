const STORE='commons.final.v1';
const $=id=>document.getElementById(id);
const defaults={memory:3,creativity:3,initiative:2};
const descriptions={
 memory:v=>v<=1?'No previous context carried forward.':v<=3?'Retain useful context without assuming everything remains relevant.':'Carry substantial history and prior work into new sessions.',
 creativity:v=>v<=1?'Follow the brief closely. Avoid speculative detours.':v<=3?'Explore alternatives and connections when they have merit.':'Challenge assumptions, make unusual connections and pursue new possibilities.',
 initiative:v=>v<=1?'Wait for explicit requests.':v<=3?'Offer useful suggestions and flag relevant opportunities.':'Proactively pursue agreed work, monitor progress and bring back results.'
};
function readState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')}catch{return {}}}
function values(){return {memory:+$('clive-memory').value,creativity:+$('clive-creativity').value,initiative:+$('clive-initiative').value}}
function response(v){
 const m=v.memory<=1?"I'll leave previous sessions behind.":v.memory<=3?"I'll retain useful context without assuming every old detail matters.":"I'll keep substantial history and previous work in reach.";
 const c=v.creativity<=1?"I'll stay close to your instructions.":v.creativity<=3?"I'll explore a little beyond the obvious.":"I'll challenge assumptions and pursue unusual connections.";
 const i=v.initiative<=1?"I'll wait until you call me.":v.initiative<=3?"I'll offer suggestions when something looks worth your attention.":"I'll actively pursue agreed work and bring you things that need attention.";
 return '“'+m+' '+c+' '+i+'”';
}
function update(){const v=values();for(const k of Object.keys(v)){$('clive-'+k+'-value').textContent=v[k]+' / 5';$('clive-'+k+'-desc').textContent=descriptions[k](v[k])}$('clive-readback').textContent=response(v)}
function speak(){if(!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance($('clive-readback').textContent.replace(/[“”]/g,''));u.rate=.94;u.pitch=.88;u.lang='en-AU';window.speechSynthesis.speak(u)}
function enter(){const data=readState();data.profile=data.profile||{name:'Visitor',kind:'Human'};data.profile.nodes={...values(),complete:true,updatedAt:new Date().toISOString()};localStorage.setItem(STORE,JSON.stringify(data));document.body.classList.add('clive-entered')}
function init(){const data=readState();const nodes=data.profile?.nodes;if(nodes?.complete){document.body.classList.add('clive-entered');return}for(const k of Object.keys(defaults))$('clive-'+k).value=nodes?.[k]??defaults[k];update();for(const k of Object.keys(defaults))$('clive-'+k).addEventListener('input',update);$('clive-speak').addEventListener('click',speak);$('clive-enter').addEventListener('click',enter)}
init();