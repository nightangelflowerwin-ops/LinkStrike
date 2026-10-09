import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {WebSocketServer,WebSocket} from 'ws';
import {randomBytes} from 'node:crypto';
import {WALLS,SPAWNS,move,wallDistance,rayBox,blocked} from './world.js';

const root=fileURLToPath(new URL('./public/',import.meta.url));
const rooms=new Map();
const publicOrigin=process.env.PUBLIC_ORIGIN?.replace(/\/$/,'');
if(publicOrigin){const u=new URL(publicOrigin);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw new Error('PUBLIC_ORIGIN must be an HTTPS origin, for example https://game.example.com');}
const escapeAttribute=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token=()=>randomBytes(5).toString('hex');
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/favicon.ico'){res.writeHead(204);return res.end();}
  if(req.method==='POST'&&url.pathname==='/api/rooms'){
    if(rooms.size>=100)return json(res,503,{error:'Room limit reached. Try again later.'});
    const id=token();makeRoom(id);return json(res,201,{id,url:'/r/'+id});
  }
  if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,rooms:rooms.size});
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const routes={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/card-preview.png':'card-preview.png','/embed-test':'embed-test.html'};
  let path=routes[url.pathname];
  const match=url.pathname.match(/^\/(r|play)\/([a-f0-9]{10})$/);
  if(match)path='index.html';
  try{
    let content=url.pathname==='/vendor/three.js'?await readFile(new URL('./node_modules/three/build/three.module.js',import.meta.url)):url.pathname==='/vendor/three.core.js'?await readFile(new URL('./node_modules/three/build/three.core.js',import.meta.url)):url.pathname==='/world.js'?await readFile(new URL('./world.js',import.meta.url)):path?await readFile(root+path):null;
    if(!content){res.writeHead(404);return res.end('Not found');}
    if(path==='index.html'&&match&&publicOrigin){const origin=escapeAttribute(publicOrigin),id=match[2];content=content.toString().replace('</head>',`<meta name="twitter:card" content="player"><meta name="twitter:title" content="LinkStrike | Join this arena"><meta name="twitter:description" content="An original browser arena shooter. Keyboard and mouse required."><meta name="twitter:image" content="${origin}/card-preview.png"><meta name="twitter:player" content="${origin}/play/${id}"><meta name="twitter:player:width" content="480"><meta name="twitter:player:height" content="480"></head>`);}
    res.writeHead(200,{'content-security-policy':"frame-ancestors 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com",'content-type':url.pathname.endsWith('.png')?'image/png':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html','x-content-type-options':'nosniff','cache-control':'no-cache'});res.end(content);
  }catch{res.writeHead(500);res.end('Could not load game');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048});
server.on('upgrade',(req,socket,head)=>{
  const id=(req.url.match(/^\/ws\/([a-f0-9]{10})$/)||[])[1];
  if(!id||!rooms.has(id)){socket.write('HTTP/1.1 404 Not Found\r\n\r\n');return socket.destroy();}
  if(req.headers.origin){try{if(new URL(req.headers.origin).host!==req.headers.host)throw 0;}catch{return socket.destroy();}}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req,id));
});
function makeRoom(id){const room={id,players:new Map(),events:[],round:1,ends:Date.now()+300000,winner:null,resetAt:0,seq:0,emptyAt:Date.now(),humanCount:0};rooms.set(id,room);return room;}
function spawn(room,p){const candidates=SPAWNS.map(([x,z])=>({x,z,dist:Math.min(...[...room.players.values()].filter(q=>q!==p&&q.hp>0).map(q=>Math.hypot(q.x-x,q.z-z)),100)}));candidates.sort((a,b)=>b.dist-a.dist);const s=candidates[Math.floor(Math.random()*Math.min(2,candidates.length))];Object.assign(p,{x:s.x,z:s.z,y:0,vy:0,hp:100,ammo:30,reserve:120,reloadAt:0,respawnAt:0,protectedUntil:Date.now()+1800,input:{f:0,s:0,jump:false,yaw:0,pitch:0},lastShot:0});}
function player(room,name,bot=false){const p={id:token(),name:name.slice(0,18),bot,active:false,kills:0,deaths:0,yaw:0,pitch:0,joined:Date.now(),lastSeen:Date.now(),ws:null};spawn(room,p);room.players.set(p.id,p);return p;}
function event(room,e){room.events.push({...e,seq:++room.seq});}
function bots(room){const count=[...room.players.values()].filter(p=>p.bot).length;if(count)return;for(let i=0;i<3;i++)player(room,['Rook','Sable','Echo'][i],true);}
wss.on('connection',(ws,req,id)=>{
  const room=rooms.get(id);if(room.humanCount>=12){ws.close(1008,'Room full');return;}
  room.humanCount++;const p=player(room,'Guest');p.ws=ws;room.emptyAt=0;
  ws.on('pong',()=>{p.lastSeen=Date.now();});
  ws.send(JSON.stringify({t:'welcome',id:p.id,room:id,walls:WALLS}));
  let bucket=0,bucketAt=Date.now();
  ws.on('message',raw=>{const now=Date.now();if(now-bucketAt>1000){bucket=0;bucketAt=now;}if(++bucket>120)return ws.close(1008,'Too many messages');p.lastSeen=now;let m;try{m=JSON.parse(raw);}catch{return;}
    if(m.t==='join'&&typeof m.name==='string')p.name=m.name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'Guest';
    if(m.t==='active')p.active=m.value===true;
    if(m.t==='input'&&[m.f,m.s,m.yaw,m.pitch].every(Number.isFinite)){
      p.input={f:Math.max(-1,Math.min(1,m.f)),s:Math.max(-1,Math.min(1,m.s)),jump:m.jump===true,yaw:m.yaw,pitch:Math.max(-1.3,Math.min(1.3,m.pitch))};
      p.lastInput=now;
      p.yaw=m.yaw%(Math.PI*2);p.pitch=p.input.pitch;
    }
    if(m.t==='fire')shoot(room,p,now);
    if(m.t==='reload')reload(p,now);
    if(m.t==='practice'&&room.humanCount===1)bots(room);
  });
  ws.on('close',()=>{room.players.delete(p.id);room.humanCount--;if(!room.humanCount)room.emptyAt=Date.now();});
});
function reload(p,now){if(p.hp>0&&!p.reloadAt&&p.ammo<30&&p.reserve>0)p.reloadAt=now+1600;}
function shoot(room,p,now){
  if(room.winner||p.hp<=0||p.reloadAt||now-p.lastShot<140)return;
  if(!p.ammo){reload(p,now);return;}
  p.lastShot=now;p.ammo--;p.protectedUntil=0;
  const shotYaw=p.yaw+(p.bot?(Math.random()-.5)*.09:0),shotPitch=p.pitch+(p.bot?(Math.random()-.5)*.06:0);
  const o=[p.x,p.y+1.6,p.z],d=[-Math.sin(shotYaw)*Math.cos(shotPitch),Math.sin(shotPitch),-Math.cos(shotYaw)*Math.cos(shotPitch)];
  let distance=Math.min(70,wallDistance(o,d)),target=null,headshot=false;
  for(const q of room.players.values()){
    if(q===p||q.hp<=0||now<q.protectedUntil||p.bot&&(q.bot||!q.active))continue;
    const hit=rayBox(o,d,[q.x-.35,q.y,q.z-.35],[q.x+.35,q.y+1.85,q.z+.35]);
    if(hit<distance){distance=hit;target=q;headshot=o[1]+d[1]*hit>q.y+1.45;}
  }
  event(room,{t:'shot',from:p.id,o,d,distance});
  if(target){const damage=p.bot?(headshot?28:18):(headshot?65:34);target.hp=Math.max(0,target.hp-damage);event(room,{t:'hit',from:p.id,to:target.id,damage,headshot});
    if(!target.hp){p.kills++;target.deaths++;target.respawnAt=now+2400;event(room,{t:'kill',from:p.name,to:target.name,headshot});if(p.kills>=20)endRound(room,p.name,now);}
  }
}
function endRound(room,winner,now){room.winner=winner;room.resetAt=now+7000;event(room,{t:'round',winner});}
// A small navigation grid keeps practice bots from walking endlessly into cover.
function routeTo(p,q){const cell=(x,z)=>[Math.max(0,Math.min(20,Math.round((x+20)/2))),Math.max(0,Math.min(20,Math.round((z+20)/2)))];const start=cell(p.x,p.z),goal=cell(q.x,q.z),key=(x,z)=>x+z*21;const queue=[start],parent=new Map([[key(...start),null]]);let head=0;
  while(head<queue.length){const [x,z]=queue[head++];if(x===goal[0]&&z===goal[1]){const path=[];let k=key(x,z);while(parent.get(k)!==null){path.unshift({x:(k%21)*2-20,z:Math.floor(k/21)*2-20});k=parent.get(k);}return path;}
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(nx<0||nz<0||nx>20||nz>20||parent.has(k)||blocked(nx*2-20,nz*2-20,.55))continue;parent.set(k,key(x,z));queue.push([nx,nz]);}
  }return[];
}
let last=Date.now(),lastPing=0;
const ticker=setInterval(()=>{
  const now=Date.now(),dt=Math.min(.08,(now-last)/1000);last=now;
  for(const [id,room]of rooms){
    if(room.emptyAt&&now-room.emptyAt>300000){rooms.delete(id);continue;}
    if(!room.humanCount)continue;
    if(room.resetAt&&now>=room.resetAt){room.round++;room.ends=now+300000;room.winner=null;room.resetAt=0;for(const p of room.players.values()){p.kills=0;p.deaths=0;spawn(room,p);}}
    if(!room.winner&&now>=room.ends){const top=[...room.players.values()].sort((a,b)=>b.kills-a.kills)[0];endRound(room,top?.name||'No winner',now);}
    for(const p of room.players.values()){
      if(!p.bot&&now-p.lastSeen>30000){p.ws?.close(1001,'Connection idle');continue;}
      if(!p.bot&&now-lastPing>=5000&&p.ws?.readyState===WebSocket.OPEN)p.ws.ping();
      if(!p.bot&&now-(p.lastInput||0)>350)p.input={...p.input,f:0,s:0,jump:false};
      if(p.hp<=0){if(now>=p.respawnAt)spawn(room,p);continue;}
      if(p.reloadAt&&now>=p.reloadAt){const n=Math.min(30-p.ammo,p.reserve);p.ammo+=n;p.reserve-=n;p.reloadAt=0;}
      if(room.winner)continue;
      if(p.bot){
        const targets=[...room.players.values()].filter(q=>!q.bot&&q.active&&q.hp>0);targets.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));const q=targets[0];p.input={f:0,s:0,jump:false};
        if(q){const dist=Math.hypot(q.x-p.x,q.z-p.z);p.yaw=Math.atan2(-(q.x-p.x),-(q.z-p.z));p.pitch=Math.atan2(q.y-p.y-.65,dist);const clear=wallDistance([p.x,p.y+1.6,p.z],[-Math.sin(p.yaw),0,-Math.cos(p.yaw)])>dist;
          if(now-(p.routeAt||0)>850){p.route=routeTo(p,q);p.routeAt=now;}
          while(p.route?.length&&Math.hypot(p.route[0].x-p.x,p.route[0].z-p.z)<.6)p.route.shift();const waypoint=clear?q:p.route?.[0];
          if(waypoint&&(!clear||dist>10)){const dx=waypoint.x-p.x,dz=waypoint.z-p.z,n=Math.max(.1,Math.hypot(dx,dz));p.input={f:(-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz)/n*.55,s:(Math.cos(p.yaw)*dx-Math.sin(p.yaw)*dz)/n*.55,jump:false};}
          if(clear&&now-p.lastShot>1300)shoot(room,p,now);if(!p.ammo)reload(p,now);
        }
      }
      const i=p.input,scale=Math.max(1,Math.hypot(i.f,i.s));const dx=(-Math.sin(p.yaw)*i.f+Math.cos(p.yaw)*i.s)/scale*6*dt,dz=(-Math.cos(p.yaw)*i.f-Math.sin(p.yaw)*i.s)/scale*6*dt;move(p,dx,dz);
      if(i.jump&&p.y===0)p.vy=5.6;p.vy-=16*dt;p.y=Math.max(0,p.y+p.vy*dt);if(p.y===0)p.vy=0;
    }
    const state={t:'state',now,round:room.round,ends:room.ends,winner:room.winner,resetAt:room.resetAt,players:[...room.players.values()].map(p=>({id:p.id,name:p.name,bot:p.bot,x:p.x,y:p.y,z:p.z,yaw:p.yaw,pitch:p.pitch,hp:p.hp,kills:p.kills,deaths:p.deaths,ammo:p.ammo,reserve:p.reserve,reloadAt:p.reloadAt,respawnAt:p.respawnAt,protectedUntil:p.protectedUntil})),events:room.events.splice(0)};
    const data=JSON.stringify(state);for(const p of room.players.values())if(p.ws?.readyState===WebSocket.OPEN&&p.ws.bufferedAmount<100000)p.ws.send(data);
  }
  if(now-lastPing>=5000)lastPing=now;
},50);
const port=Number(process.env.PORT)||4173;
server.listen(port,'0.0.0.0',()=>console.log(`LinkStrike running at http://localhost:${port}`));
function shutdown(){clearInterval(ticker);for(const ws of wss.clients)ws.terminate();wss.close();server.close(()=>process.exit(0));}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
