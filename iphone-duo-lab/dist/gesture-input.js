// Pure gesture interpretation: no DOM, camera, network, or model side effects.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const step=(a,b,limit)=>a+clamp(b-a,-limit,limit);
const hints={explode:'双手靠近后拉开，控制拆解',fold:'单手左右移动，控制折叠',view:'单手转动视角 · 双手缩放'};
export function createGestureInterpreter({holdMs=550}={}){
 let signature='',since=0,lastTime=0,reference=null,filtered=null,output=null;
 function reset(){signature='';since=0;lastTime=0;reference=null;filtered=null;output=null;}
 function update(frame,mode,snapshot){
  const now=frame.time,hands=(frame.hands||[]).slice(0,2).sort((a,b)=>a.x-b.x);
  const valid=mode==='explode'?hands.length===2:mode==='fold'?hands.length===1:hands.length>0;
  if(!valid){reset();return {active:false,status:!hands.length?'将手掌放入画面下半区':mode==='fold'?'折叠模式只需一只手':'请将两只手分开放入画面'};}
  const key=mode+'/'+hands.length,dt=lastTime?clamp((now-lastTime)/1000,.001,.1):.065;
  const raw={x:hands[0].x,y:hands[0].y,d:hands.length===2?Math.hypot(hands[1].x-hands[0].x,hands[1].y-hands[0].y):0};
  if(key!==signature||now-lastTime>350){signature=key;since=now;reference=null;output=null;filtered={...raw};}
  lastTime=now;const alpha=1-Math.exp(-dt/.14);for(const k of ['x','y','d'])filtered[k]+=(raw[k]-filtered[k])*alpha;
  if(now-since<holdMs)return {active:false,status:'保持手掌稳定…'};
  if(!reference){reference={...filtered,...snapshot};output={fold:snapshot.fold,explode:snapshot.explode,ratio:1,theta:snapshot.theta,phi:snapshot.phi};return {active:true,status:hints[mode]};}
  if(mode==='fold'){
   const dx=Math.abs(filtered.x-reference.x)<.012?0:filtered.x-reference.x;
   const desired=clamp(reference.fold+dx*360,0,180),value=step(output.fold,desired,85*dt);
   if(Math.abs(value-output.fold)<.02)return {active:true,status:hints[mode]};output.fold=value;return {active:true,status:hints[mode],action:{kind:'fold',value}};
  }
  if(mode==='explode'){
   const dd=Math.abs(filtered.d-reference.d)<.010?0:filtered.d-reference.d;
   const desired=clamp(reference.explode+dd*2.8,0,1),value=step(output.explode,desired,.28*dt);
   if(Math.abs(value-output.explode)<.0002)return {active:true,status:hints[mode]};output.explode=value;return {active:true,status:hints[mode],action:{kind:'explode',value}};
  }
  if(hands.length===2){const desired=clamp(filtered.d/Math.max(reference.d,.12),.4,2.8),ratio=step(output.ratio,desired,1.8*dt);output.ratio=ratio;return {active:true,status:hints.view,action:{kind:'zoom',distance:reference.distance/ratio}};}
  const dx=Math.abs(filtered.x-reference.x)<.012?0:filtered.x-reference.x,dy=Math.abs(filtered.y-reference.y)<.012?0:filtered.y-reference.y;
  output.theta=step(output.theta,reference.theta-dx*2.8,1.3*dt);output.phi=step(output.phi,clamp(reference.phi+dy*1.4,.15,Math.PI-.15),.9*dt);
  return {active:true,status:hints.view,action:{kind:'rotate',theta:output.theta,phi:output.phi}};
 }
 return {update,reset};
}
