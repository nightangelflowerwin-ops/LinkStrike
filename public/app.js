import * as THREE from '/vendor/three.js';
import {WALLS,move} from '/world.js';
const $=id=>document.getElementById(id),canvas=$('game');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch{$('lobby-status').textContent='This browser needs WebGL enabled to render the arena.';throw new Error('WebGL unavailable');}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene();scene.background=new THREE.Color('#b8c9ce');scene.fog=new THREE.Fog('#b8c9ce',35,95);
const camera=new THREE.PerspectiveCamera(77,innerWidth/innerHeight,.05,120);camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight('#eef4e4','#7a5c41',2.6));const sun=new THREE.DirectionalLight('#ffe4ae',3.8);sun.position.set(-18,35,-14);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:.1,far:80});sun.shadow.bias=-.001;scene.add(sun);
function mat(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
function surface(color,scale){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,128,128);let seed=17;for(let i=0;i<4500;i++){seed=(seed*16807)%2147483647;const x=seed%128;seed=(seed*16807)%2147483647;g.fillStyle=i%2?'#ffffff0c':'#0000000c';g.fillRect(x,seed%128,2,2);}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(scale,scale);t.colorSpace=THREE.SRGBColorSpace;return t;}
const plaster=mat('#ceb182'),trim=mat('#866744'),stone=mat('#9c8870'),metal=mat('#3c4748'),wood=mat('#71573e'),dark=mat('#283333');
function box(x,y,z,w,h,d,m,group=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
plaster.map=surface('#ceb182',2);const sand=mat('#ffffff');sand.map=surface('#bfa477',35);box(0,-.12,0,100,.24,100,sand);
for(const b of WALLS){box(b.x,b.h/2,b.z,b.w,b.h,b.d,plaster);box(b.x,b.h-.05,b.z,b.w+.08,.17,b.d+.08,trim);
  if(b.h>3&&b.w<15){for(let i=-1;i<=1;i++)box(b.x+i*b.w/3,b.h*.65,b.z+b.d/2+.025,.45,.72,.05,dark);}
  if(b.h<2.5){box(b.x,.12,b.z,b.w+.05,.18,b.d+.05,wood);box(b.x,b.h-.2,b.z,b.w+.05,.18,b.d+.05,wood);for(let i=-1;i<=1;i++)box(b.x+i*b.w/3,b.h/2,b.z+b.d/2+.03,.12,b.h,.04,wood);}
}
// Distant silhouettes create a skyline without changing the collision map.
for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=36+(i%4)*2;box(Math.sin(a)*r,2+i%4,Math.cos(a)*r,4+i%3,4+(i%4)*2,4,stone);}
const foliage=mat('#536b44');
for(const [x,z]of [[-19,-10],[18,10],[-10,19],[10,-19]]){const trunk=box(x,2,z,.32,4,.32,wood);for(let i=0;i<5;i++){const leaf=box(x+Math.sin(i*1.26)*.9,4,z+Math.cos(i*1.26)*.9,2.8,.12,.4,foliage);leaf.rotation.y=-i*1.26;leaf.rotation.z=.24;}}
const ring=new THREE.Mesh(new THREE.RingGeometry(3.8,3.88,64),new THREE.MeshBasicMaterial({color:'#9a815b',side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.012;scene.add(ring);
// Render repeated scenery in batches instead of hundreds of separate draw calls.
const scenery=new Map();for(const mesh of [...scene.children])if(mesh.isMesh&&mesh.geometry.type==='BoxGeometry'){if(!scenery.has(mesh.material))scenery.set(mesh.material,[]);scenery.get(mesh.material).push(mesh);}
for(const [material,meshes]of scenery){const batch=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,meshes.length),matrix=new THREE.Matrix4();meshes.forEach((mesh,i)=>{const p=mesh.geometry.parameters;matrix.compose(mesh.position,mesh.quaternion,new THREE.Vector3(p.width,p.height,p.depth));batch.setMatrixAt(i,matrix);scene.remove(mesh);mesh.geometry.dispose();});batch.castShadow=true;batch.receiveShadow=true;scene.add(batch);}
const weapon=new THREE.Group();camera.add(weapon);scene.add(camera);weapon.position.set(.3,-.29,-.55);
box(0,0,0,.09,.1,.45,metal,weapon);box(0,-.07,.04,.07,.11,.22,dark,weapon);const grip=box(0,-.16,.09,.055,.16,.07,dark,weapon);grip.rotation.x=-.2;box(0,-.14,-.02,.06,.19,.11,metal,weapon);box(0,.035,-.34,.045,.04,.25,metal,weapon);box(0,.08,-.06,.022,.055,.045,dark,weapon);box(0,.045,-.37,.024,.038,.035,dark,weapon);box(0,-.01,.29,.08,.1,.15,wood,weapon);
const flash=new THREE.Mesh(new THREE.ConeGeometry(.075,.22,6),new THREE.MeshBasicMaterial({color:'#ffe6a5',transparent:true,opacity:.9}));flash.rotation.x=-Math.PI/2;flash.position.set(0,.03,-.54);weapon.add(flash);flash.visible=false;weapon.visible=false;
const peers=new Map(),tracers=[],correction=new THREE.Vector3();let serverOffset=0,hudSignature='',scoreSignature='',vy=0,frameSamples=[],metricAt=0;
const perf=document.createElement('div');perf.id='performance';perf.style.cssText='position:fixed;right:20px;bottom:100px;font:11px monospace;color:#e9fb70;pointer-events:none;opacity:.65';document.body.append(perf);
let roomId=(location.pathname.match(/^\/(?:r|play)\/([a-f0-9]{10})$/)||[])[1],myId=null,ws=null,state=null,me=null,started=false,yaw=0,pitch=0,lastSend=0,lastFire=0,firing=false,recoil=0,fireUntil=0,lastTime=performance.now(),lastHealth=100,pendingPractice=false,noticeTimer,connectionGeneration=0,audio=null,wasAlive=true,softCapture=false,dragAim=false;
const embedded=location.pathname.startsWith('/play/');if(embedded){document.body.classList.add('embedded');const a=document.createElement('a');a.id='open-game';a.textContent='OPEN FULL GAME ↗';a.href='/r/'+roomId;a.target='_blank';a.rel='noopener';document.body.append(a);}
const keys=new Set(),local={x:0,y:0,z:0};
try{$('name').value=localStorage.getItem('linkstrike.name')||'Guest';}catch{}
if(roomId){$('create').innerHTML='JOIN THIS ARENA <span>↗</span>';$('practice').hidden=true;$('lobby-status').textContent='You have an invite. Choose a callsign and join.';}
function status(text){$('lobby-status').textContent=text;}
function notice(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,2500);}
async function enter(practice=false){
  if(matchMedia('(pointer: coarse)').matches){$('unsupported').hidden=false;return;}
  pendingPractice=practice;$('create').disabled=true;$('practice').disabled=true;status('Preparing your arena...');
  try{if(!roomId){const res=await fetch('/api/rooms',{method:'POST'}),data=await res.json();if(!res.ok)throw new Error(data.error||'Could not create room');roomId=data.id;history.pushState(null,'','/r/'+roomId);}
    try{localStorage.setItem('linkstrike.name',$('name').value);}catch{}
    connect();
  }catch(e){status(e.message);$('create').disabled=false;$('practice').disabled=false;}
}
$('create').addEventListener('click',e=>{e.preventDefault();enter();});
$('join-form').addEventListener('submit',e=>{e.preventDefault();enter();});$('practice').onclick=()=>enter(true);
function connect(){
  const gen=++connectionGeneration;state=null;me=null;myId=null;ws?.close();const sock=ws=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/ws/${roomId}`);
  let welcomed=false;const timeout=setTimeout(()=>{if(!welcomed)sock.close();},8000);
  sock.onopen=()=>send({t:'join',name:$('name').value.trim()||'Guest'});
  sock.onmessage=e=>{if(gen!==connectionGeneration)return;let m;try{m=JSON.parse(e.data);}catch{return;}
    if(m.t==='welcome'){welcomed=true;clearTimeout(timeout);myId=m.id;started=true;$('lobby').hidden=true;$('hud').hidden=false;document.body.classList.add('playing');$('room-label').textContent='SUNBREAK / '+roomId.slice(0,5).toUpperCase();weapon.visible=true;showOverlay('Ready to drop in?','Click below to enter the arena. Escape releases your mouse.');if(pendingPractice){send({t:'practice'});pendingPractice=false;}return;}
    if(m.t==='state'){const old=me;state=m;me=m.players.find(p=>p.id===myId);if(!me)return;
      if(!old||old.hp<=0&&me.hp>0){Object.assign(local,{x:me.x,y:me.y,z:me.z});yaw=Math.atan2(me.x,me.z);pitch=0;lastHealth=100;correction.set(0,0,0);vy=0;}
      else{const err=Math.hypot(me.x-local.x,me.z-local.z);const amount=err>2?1:.3;const dx=(me.x-local.x)*amount,dz=(me.z-local.z)*amount,dy=(me.y-local.y)*.35;local.x+=dx;local.z+=dz;local.y+=dy;if(err<=2){correction.x-=dx;correction.z-=dz;correction.y-=dy;}else correction.set(0,0,0);if(me.y===0&&local.y<.03){local.y=0;vy=0;}}
      if(me.hp<lastHealth){$('damage').style.opacity='.7';setTimeout(()=>$('damage').style.opacity='0',140);tone(95,.08,.07);}
      serverOffset=performance.now()-m.now;lastHealth=me.hp;syncPeers(m.players);for(const ev of m.events)handleEvent(ev);updateHud();
    }
  };
  sock.onclose=()=>{clearTimeout(timeout);if(gen!==connectionGeneration)return;firing=false;keys.clear();document.exitPointerLock?.();if(!welcomed){status('This room is unavailable. It may have expired or the server restarted. Create a new arena from the home page.');$('create').disabled=false;$('practice').disabled=false;}else{showOverlay('Connection lost','Your match connection closed. Reconnect to try again.');$('resume').hidden=true;$('retry').hidden=false;}};
  sock.onerror=()=>status('Could not connect to the game server.');
}
function send(m){if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(m));}
function showOverlay(title,text){$('overlay-title').textContent=title;$('overlay-text').textContent=text;$('overlay').hidden=false;$('resume').hidden=false;$('retry').hidden=true;}
$('resume').onclick=async()=>{if(!me||me.hp<=0||state?.winner)return;try{audio??=new AudioContext();await audio.resume();await canvas.requestPointerLock();}catch{softCapture=true;canvas.tabIndex=0;canvas.focus();$('overlay').hidden=true;send({t:'active',value:true});$('hint').textContent='WASD move  /  Hold right mouse and drag to aim  /  Left click fire  /  R reload  /  Space jump  /  Esc pause';notice('Mouse capture unavailable here. Hold right mouse and drag to aim.');}};
$('retry').onclick=()=>{showOverlay('Connecting...','Reconnecting to your arena.');connect();};$('exit').onclick=()=>location.href='/';
$('invite').onclick=async()=>{const link=location.origin+'/r/'+roomId;try{await navigator.clipboard.writeText(link);notice('Invite copied. Send it to a friend.');}catch{showOverlay('Your arena link',link);}};
canvas.addEventListener('click',()=>{if(softCapture&&$('overlay').hidden)fireWeapon(performance.now());else if(started&&me?.hp>0&&!state?.winner&&!document.pointerLockElement)$('resume').click();});
document.addEventListener('pointerlockchange',()=>{const lock=document.pointerLockElement===canvas;if(lock)softCapture=false;send({t:'active',value:lock});if(lock)$('overlay').hidden=true;else{firing=false;keys.clear();sendInput();if(started&&me?.hp>0&&!state?.winner&&ws?.readyState===WebSocket.OPEN)showOverlay('TAKE A BREATHER.','The match continues while paused. Click to jump back in.');}});
function controlActive(){return document.pointerLockElement===canvas||softCapture;}
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas&&!(softCapture&&dragAim))return;yaw-=e.movementX*.0022;pitch=Math.max(-1.3,Math.min(1.3,pitch-e.movementY*.0022));});
document.addEventListener('keydown',e=>{if(!started||!controlActive())return;if(e.code==='Escape'&&softCapture){softCapture=false;dragAim=false;firing=false;keys.clear();send({t:'active',value:false});sendInput();showOverlay('TAKE A BREATHER.','Click to return to the arena.');return;}if(['Tab','Space','KeyW','KeyA','KeyS','KeyD','KeyR'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='KeyR')send({t:'reload'});if(e.code==='Tab')$('scoreboard').hidden=false;});
document.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Tab')$('scoreboard').hidden=true;});window.addEventListener('blur',()=>{send({t:'active',value:false});firing=false;keys.clear();$('scoreboard').hidden=true;sendInput();});window.addEventListener('focus',()=>{if(controlActive()&&$('overlay').hidden)send({t:'active',value:true});});document.addEventListener('visibilitychange',()=>{if(document.hidden){send({t:'active',value:false});firing=false;keys.clear();sendInput();}});
document.addEventListener('mousedown',e=>{if(e.target!==canvas||!controlActive())return;if(e.button===0){firing=true;fireWeapon(performance.now());}if(e.button===2&&softCapture)dragAim=true;});document.addEventListener('mouseup',e=>{if(e.button===0)firing=false;if(e.button===2)dragAim=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
function inputs(){const live=controlActive()&&$('overlay').hidden;return{f:live?(Number(keys.has('KeyW'))-Number(keys.has('KeyS'))):0,s:live?(Number(keys.has('KeyD'))-Number(keys.has('KeyA'))):0,jump:live&&keys.has('Space'),yaw,pitch};}
function sendInput(){send({t:'input',...inputs()});}
function tone(freq,duration=.05,volume=.06){if(!audio||audio.state!=='running')return;const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(25,freq*.3),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function fireWeapon(now){if(!controlActive()||!me||me.hp<=0||state?.winner||me.reloadAt||now-lastFire<145)return;lastFire=now;if(me.ammo>0){sendInput();send({t:'fire'});recoil=.7;$('crosshair').style.transform='translate(-50%,-50%) scale(1.35)';setTimeout(()=>$('crosshair').style.transform='',100);fireUntil=now+45;tone(170,.075,.12);}else send({t:'reload'});}
function handleEvent(ev){
  if(ev.t==='shot'){const points=[new THREE.Vector3(...ev.o),new THREE.Vector3(...ev.o).addScaledVector(new THREE.Vector3(...ev.d),ev.distance)],line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#ffdfa0',transparent:true,opacity:.75}));scene.add(line);tracers.push({line,end:performance.now()+80});if(ev.from!==myId)tone(110,.04,.015);}
  if(ev.t==='hit'&&ev.from===myId){$('hitmarker').style.opacity='1';$('hitmarker').style.color=ev.headshot?'#ffba63':'#e9fb70';setTimeout(()=>$('hitmarker').style.opacity='0',150);tone(550,.05,.045);}
  if(ev.t==='kill'){const row=document.createElement('div');row.className='feedline';row.append(document.createTextNode(ev.from));const middle=document.createElement('strong');middle.textContent=ev.headshot?'◆':'→';row.append(middle,document.createTextNode(ev.to));$('feed').prepend(row);setTimeout(()=>row.remove(),5000);while($('feed').children.length>5)$('feed').lastChild.remove();}
}
function avatar(p){const g=new THREE.Group(),uniform=mat(p.bot?'#b3663f':'#52696a'),helmet=mat('#35484c');box(0,.8,0,.55,.72,.35,uniform,g);box(0,1.45,0,.37,.38,.37,helmet,g);box(-.15,.27,0,.16,.54,.2,dark,g);box(.15,.27,0,.16,.54,.2,dark,g);box(-.34,.92,0,.15,.65,.17,uniform,g);box(.34,.92,0,.15,.65,.17,uniform,g);box(.2,1,-.37,.09,.1,.6,metal,g);
  const label=document.createElement('canvas');label.width=256;label.height=48;const ctx=label.getContext('2d');ctx.fillStyle='#152027dd';ctx.fillRect(0,0,256,48);ctx.fillStyle=p.bot?'#ffd18a':'#e9fb70';ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.fillText((p.bot?'BOT / ':'')+p.name,128,31);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(label),depthTest:true}));tag.position.y=2.1;tag.scale.set(1.6,.3,1);g.add(tag);g.position.set(p.x,p.y,p.z);scene.add(g);return g;}
function syncPeers(players){const ids=new Set();for(const p of players){if(p.id===myId)continue;ids.add(p.id);let peer=peers.get(p.id);if(!peer){peer={mesh:avatar(p),target:p,history:[]};peers.set(p.id,peer);}peer.target=p;peer.history.push({...p,time:state.now});while(peer.history.length>8)peer.history.shift();peer.mesh.visible=p.hp>0;}for(const [id,p]of peers)if(!ids.has(id)){scene.remove(p.mesh);p.mesh.traverse(o=>{o.geometry?.dispose();});peers.delete(id);}}
function updateHud(){
  const signature=[me.hp,me.ammo,me.reserve,me.reloadAt,state.now<me.protectedUntil,me.kills,state.players.length].join(':');if(signature!==hudSignature){hudSignature=signature;
  $('health').textContent=me.hp;$('healthbar').style.width=me.hp+'%';$('healthbar').style.background=me.hp<35?'#ff876f':'#e9fb70';$('ammo').replaceChildren(document.createTextNode(me.ammo+' '));const reserve=document.createElement('span');reserve.textContent='/ '+me.reserve;$('ammo').append(reserve);$('weapon-status').textContent=me.reloadAt?'RELOADING...':state.now<me.protectedUntil?'SPAWN SHIELD / 2 SEC':'CARBINE / AUTO';$('score').textContent=me.kills+' / 20';$('population').textContent=state.players.filter(p=>!p.bot).length+' ONLINE'+(state.players.some(p=>p.bot)?' + BOTS':'');
  }const standings=[...state.players].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths);const sig=standings.map(p=>[p.id,p.name,p.kills,p.deaths].join(':')).join('|');if(sig!==scoreSignature){scoreSignature=sig;const tbody=$('scores');tbody.replaceChildren();for(const p of [...state.players].sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths)){const row=document.createElement('tr');if(p.id===myId)row.className='me';for(const v of [p.name+(p.bot?' [BOT]':''),p.kills,p.deaths]){const td=document.createElement('td');td.textContent=v;row.append(td);}tbody.append(row);}}
  if(state.winner){if(document.pointerLockElement)document.exitPointerLock();showOverlay(state.winner.toUpperCase()+' WINS.','Next match starts in '+Math.max(0,Math.ceil((state.resetAt-state.now)/1000))+' seconds.');$('resume').hidden=true;}
  else if(me.hp<=0){if(document.pointerLockElement)document.exitPointerLock();showOverlay('YOU’RE DOWN.','Respawning in '+Math.max(0,Math.ceil((me.respawnAt-state.now)/1000))+' seconds.');$('resume').hidden=true;}
  else if(!wasAlive||$('resume').hidden){showOverlay('BACK IN THE FIGHT.','You respawned with a fresh magazine. Click to rejoin.');}
  wasAlive=me.hp>0;weapon.visible=me.hp>0&&!state.winner;
}
function frame(now){const frameMs=now-lastTime,dt=Math.min(.05,frameMs/1000);lastTime=now;
  if(started&&me){if(now-lastSend>50){sendInput();lastSend=now;}const i=inputs();if(me.hp>0&&!state?.winner){const n=Math.max(1,Math.hypot(i.f,i.s));move(local,(-Math.sin(yaw)*i.f+Math.cos(yaw)*i.s)/n*6*dt,(-Math.cos(yaw)*i.f-Math.sin(yaw)*i.s)/n*6*dt);}
    if(me.hp>0&&!state?.winner){if(i.jump&&local.y===0)vy=5.6;if(local.y>0||vy>0){vy-=16*dt;local.y=Math.max(0,local.y+vy*dt);if(local.y===0)vy=0;}}correction.multiplyScalar(Math.exp(-12*dt));camera.position.set(local.x+correction.x,local.y+correction.y+(me.hp>0?1.6:.65),local.z+correction.z);camera.rotation.set(pitch,yaw,0);recoil=Math.max(0,recoil-dt*7);const moving=!!(i.f||i.s);weapon.position.y=-.29+(moving?Math.sin(now*.012)*.009:0)-recoil*.025;weapon.rotation.x=recoil*.12+(me.reloadAt?Math.sin(Math.min(1,(1600-(me.reloadAt-state.now))/1600)*Math.PI)*.7:0);flash.visible=now<fireUntil;
    if(firing)fireWeapon(now);
    for(const p of peers.values()){const t=now-serverOffset-100,h=p.history;while(h.length>2&&h[1].time<=t)h.shift();const a=h[0],b=h[1]||a,f=b.time===a.time?1:THREE.MathUtils.clamp((t-a.time)/(b.time-a.time),0,1);p.mesh.position.set(THREE.MathUtils.lerp(a.x,b.x,f),THREE.MathUtils.lerp(a.y,b.y,f),THREE.MathUtils.lerp(a.z,b.z,f));const angle=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));p.mesh.rotation.y=a.yaw+angle*f;const speed=Math.hypot(b.x-a.x,b.z-a.z);const stride=speed>.02?Math.sin(now*.013)*.3:0;p.mesh.children[2].rotation.x=stride;p.mesh.children[3].rotation.x=-stride;}
    const sec=Math.max(0,Math.ceil((state.ends-state.now)/1000));$('timer').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
  }else{const t=now*.000035;camera.position.set(25+Math.sin(t)*3,14,25+Math.cos(t)*3);camera.lookAt(0,1,0);}
  for(let i=tracers.length-1;i>=0;i--)if(now>tracers[i].end){const line=tracers[i].line;scene.remove(line);line.geometry.dispose();line.material.dispose();tracers.splice(i,1);}
  renderer.render(scene,camera);if(frameMs>0&&frameMs<1000)frameSamples.push(frameMs);if(now-metricAt>1000){const values=frameSamples.sort((a,b)=>a-b);const median=values[Math.floor(values.length*.5)]||0,p95=values[Math.floor(values.length*.95)]||0;perf.textContent=`${Math.round(1000/(median||16.7))} FPS / ${renderer.info.render.calls} DRAWS`;perf.dataset.metrics=JSON.stringify({medianMs:+median.toFixed(2),p95Ms:+p95.toFixed(2),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});frameSamples=[];metricAt=now;}requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});requestAnimationFrame(frame);
