// One hand. Pinch is latched until a fist or hand loss, so releasing a pinch cannot dismantle.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createGestureInterpreter({holdMs=300,poseHoldMs=450,pinchHoldMs=160}={}){
 let lastTime=0,since=0,reference=null,filtered=null,theta=0,fold=180,candidate=null,candidateSince=0,committed=null,pinchSince=null,folding=false,previous=null,missingSince=null;
 function reset(){lastTime=0;since=0;reference=null;filtered=null;candidate=null;candidateSince=0;committed=null;pinchSince=null;folding=false;previous=null;missingSince=null;}
 function update(frame,snapshot){
  const hand=frame.hands?.length===1?frame.hands[0]:null,now=frame.time;
  if(!hand||!Number.isFinite(hand.x)){if(missingSince===null)missingSince=now;if(now-missingSince>800)reset();return {active:false,status:'伸出一只手',actions:[],folding};}
  if(missingSince!==null){const preserveFold=folding&&now-missingSince<=800;reset();folding=preserveFold;since=now;filtered={x:hand.x,pinch:hand.pinch};theta=snapshot.theta;fold=snapshot.fold;lastTime=now;}
  const dt=lastTime?clamp((now-lastTime)/1000,.001,.12):.09;
  const jump=previous&&(Math.abs(hand.x-previous.x)>.24||hand.area/previous.area>3||hand.area/previous.area<.3);
  if(!lastTime||now-lastTime>2500||jump){reset();since=now;filtered={x:hand.x,pinch:hand.pinch};theta=snapshot.theta;fold=snapshot.fold;}
  lastTime=now;previous={x:hand.x,area:Math.max(hand.area||.05,.001)};
  const alpha=1-Math.exp(-dt/.12);filtered.x+=(hand.x-filtered.x)*alpha;filtered.pinch+=(hand.pinch-filtered.pinch)*alpha;
  if(now-since<holdMs)return {active:false,status:'保持手掌片刻…',actions:[],folding:false};
  if(!reference)reference={x:filtered.x,theta:snapshot.theta,phi:snapshot.phi};
  const actions=[],dx=Math.abs(filtered.x-reference.x)<.014?0:filtered.x-reference.x;
  const next=theta+clamp(reference.theta-dx*3.6-theta,-1.8*dt,1.8*dt);
  if(Math.abs(next-theta)>.0008){theta=next;actions.push({kind:'rotate',theta,phi:reference.phi});}
  if(hand.pinchReady&&filtered.pinch<.32){if(pinchSince===null)pinchSince=now;if(now-pinchSince>=pinchHoldMs&&!folding){folding=true;committed=null;candidate=null;fold=snapshot.fold;}}
  else pinchSince=null;
  const pose=hand.pose==='closed'?'closed':!folding&&hand.pose==='open'?'open':null;
  if(candidate!==pose){candidate=pose;candidateSince=now;}
  if(pose&&committed!==pose&&now-candidateSince>=poseHoldMs){committed=pose;actions.push({kind:'grip',open:pose==='open'});if(pose==='closed')folding=false;}
  if(folding&&hand.pose!=='closed'){
   const desired=clamp((filtered.pinch-.23)/.9,0,1)*180,nextFold=fold+clamp(desired-fold,-120*dt,120*dt);
   if(Math.abs(nextFold-fold)>.05){fold=nextFold;actions.push({kind:'fold',value:fold});}
  }
  const status=folding?'捏合折叠 · 分开展开':committed==='closed'?'握拳 · 组装':committed==='open'?'张手 · 拆解':'左右移动旋转';
  return {active:true,status,actions,folding};
 }
 return {update,reset};
}

