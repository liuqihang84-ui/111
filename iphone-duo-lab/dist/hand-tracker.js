import {handFeatures} from './hand-features.js?v=4';
// Frames stay in a local Worker. Recognition assets are loaded from this same website.
export function createGestureControl({video,overlay,status,onFrame,onState,onReset}){
 const draw=overlay.getContext('2d');overlay.width=320;overlay.height=240;
 let stream=null,worker=null,raf=0,generation=0,ready=false,busy=false,lastFrame=0,lastVideo=-1,starting=false;
 const say=text=>status.textContent=text;
 function release(){cancelAnimationFrame(raf);worker?.terminate();worker=null;ready=false;busy=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;draw.clearRect(0,0,320,240);}
 function fail(text){generation++;starting=false;release();onReset?.();say(text);onState('error');}
 function calibrate(){onReset?.();say('伸出一只手');}
 async function start(){
  if(stream||starting)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){say('请使用 HTTPS 打开');onState('error');return;}
  const ticket=++generation;starting=true;onState('requesting');say('请允许摄像头访问');
  try{
   const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
   if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;video.srcObject=next;await video.play();if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   if(typeof Worker==='undefined'||typeof createImageBitmap==='undefined')throw new Error('unsupported');
   say('准备手势识别…');worker=new Worker(new URL('./hand-worker.js?v=4',import.meta.url));
   worker.onmessage=({data})=>{
    if(ticket!==generation)return;
    if(data.type==='ready'){ready=true;starting=false;onState('active');say('伸出一只手');raf=requestAnimationFrame(loop);}
    else if(data.type==='error')fail('识别未启动，点击重试');
    else if(data.type==='result'){
     busy=false;draw.clearRect(0,0,320,240);
     const features=handFeatures(data.landmarks,video.videoWidth/video.videoHeight||4/3),feedback=onFrame?.({hands:features&&!document.hidden?[features]:[],time:data.time})||{};say(feedback.status||'伸出一只手');
     if(data.landmarks){draw.strokeStyle=feedback.folding?'#a8e7d4':'#c0d9f6';draw.fillStyle=draw.strokeStyle;draw.lineWidth=1.2;for(const [a,b]of [[0,5],[5,9],[9,13],[13,17],[17,0],[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[17,18],[18,19],[19,20]]){draw.beginPath();draw.moveTo(data.landmarks[a].x*320,data.landmarks[a].y*240);draw.lineTo(data.landmarks[b].x*320,data.landmarks[b].y*240);draw.stroke();}for(const i of [4,8]){draw.beginPath();draw.arc(data.landmarks[i].x*320,data.landmarks[i].y*240,3,0,Math.PI*2);draw.fill();}}
    }
   };
   worker.onerror=event=>{event.preventDefault();if(ticket===generation)fail('识别未启动，点击重试');};worker.postMessage({type:'init'});
   next.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===next)stop();},{once:true});
  }catch(error){if(ticket!==generation)return;const messages={NotAllowedError:'请允许摄像头后重试',NotFoundError:'未检测到摄像头',NotReadableError:'摄像头被其他程序占用'};fail(messages[error.name]||'摄像头未启动，点击重试');}
 }
 function loop(time){
  if(!stream)return;raf=requestAnimationFrame(loop);
  if(!ready||busy||document.hidden||video.readyState<2||time-lastFrame<90||video.currentTime===lastVideo)return;
  busy=true;lastFrame=time;lastVideo=video.currentTime;const ticket=generation;
  createImageBitmap(video,{resizeWidth:320,resizeHeight:240,resizeQuality:'low'}).then(bitmap=>{if(ticket!==generation||!worker){bitmap.close();return;}worker.postMessage({type:'frame',bitmap,time},[bitmap]);}).catch(()=>{busy=false;});
 }
 function stop(){generation++;starting=false;release();onReset?.();onState('stopped');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)onReset?.();});window.addEventListener('pagehide',stop);
 return {start,stop,calibrate,get active(){return !!stream;}};
}

