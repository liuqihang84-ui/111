import {handFeatures} from './hand-features.js?v=5';
import {createFrameReader} from './camera-frame.js?v=5';
// Camera pixels stay in a local Worker. No video is uploaded.
export function createGestureControl({video,overlay,status,onFrame,onState,onReset,requestStream=constraints=>navigator.mediaDevices.getUserMedia(constraints)}){
 const draw=overlay.getContext('2d'),readFrame=createFrameReader();overlay.width=320;overlay.height=240;
 let stream=null,worker=null,raf=0,generation=0,ready=false,busy=false,lastFrame=0,starting=false,initTimer=0,watchTimer=0,sentAt=0,restarts=0,captureErrors=0,frames=0,results=0,aspect=4/3;
 const say=text=>status.textContent=text,phase=name=>status.dataset.phase=name;
 function release(){clearTimeout(initTimer);clearInterval(watchTimer);cancelAnimationFrame(raf);worker?.terminate();worker=null;ready=false;busy=false;stream?.getTracks().forEach(t=>t.stop());stream=null;video.pause();video.srcObject=null;draw.clearRect(0,0,overlay.width,overlay.height);}
 function fail(text){generation++;starting=false;release();onReset?.();phase('error');say(text);onState('error');}
 function calibrate(){if(!ready)return;onReset?.();say('识别中 · 伸出一只手');}
 function bootWorker(ticket){
  clearTimeout(initTimer);worker?.terminate();ready=false;busy=false;phase('loading');say(restarts?'正在恢复手势识别…':'正在加载手势识别…');
  const current=new Worker(new URL('./hand-worker.js?v=5',import.meta.url));worker=current;
  initTimer=setTimeout(()=>{if(ticket===generation&&!ready)fail('识别加载超时，点击重试');},45000);
  current.onmessage=({data})=>{
   if(ticket!==generation||worker!==current)return;
   if(data.type==='ready'){clearTimeout(initTimer);ready=true;starting=false;phase('ready');onState('active');say('识别中 · 手掌靠近镜头');}
   else if(data.type==='error'){console.warn('Hand tracking:',data.message);fail('识别中断，点击重试');}
   else if(data.type==='result'){
    busy=false;results++;status.dataset.results=String(results);draw.clearRect(0,0,overlay.width,overlay.height);
    const features=handFeatures(data.landmarks,data.aspect||aspect),feedback=onFrame?.({hands:features&&!document.hidden?[features]:[],time:data.time})||{};
    phase(features?'tracking':'searching');say(features?(feedback.status||'已识别到手'):'识别中 · 手掌靠近镜头');
    if(data.landmarks){
     draw.strokeStyle=feedback.folding?'#a8e7d4':'#c0d9f6';draw.fillStyle=draw.strokeStyle;draw.lineWidth=1.5;
     for(const [a,b]of [[0,5],[5,9],[9,13],[13,17],[17,0],[0,1],[1,2],[2,3],[3,4],[5,6],[6,7],[7,8],[9,10],[10,11],[11,12],[13,14],[14,15],[15,16],[17,18],[18,19],[19,20]]){draw.beginPath();draw.moveTo(data.landmarks[a].x*overlay.width,data.landmarks[a].y*overlay.height);draw.lineTo(data.landmarks[b].x*overlay.width,data.landmarks[b].y*overlay.height);draw.stroke();}
     for(const i of [4,8]){draw.beginPath();draw.arc(data.landmarks[i].x*overlay.width,data.landmarks[i].y*overlay.height,3,0,Math.PI*2);draw.fill();}
    }
   }
  };
  current.onerror=event=>{event.preventDefault();if(ticket===generation&&worker===current)fail('识别未启动，点击重试');};
  current.postMessage({type:'init'});
 }
 async function start(){
  if(stream||starting)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){phase('error');say('请使用 HTTPS 打开');onState('error');return;}
  const ticket=++generation;starting=true;frames=0;results=0;restarts=0;captureErrors=0;phase('camera');onState('requesting');say('请允许摄像头访问');
  try{
   const next=await requestStream({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}},audio:false});
   if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;video.srcObject=next;await video.play();if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   if(typeof Worker==='undefined')throw new Error('unsupported');
   bootWorker(ticket);raf=requestAnimationFrame(loop);
   watchTimer=setInterval(()=>{if(ticket!==generation||!ready||!busy||document.hidden||performance.now()-sentAt<5000)return;if(restarts++===0){onReset?.();bootWorker(ticket);}else fail('识别未响应，点击重试');},1000);
   next.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===next)stop();},{once:true});
  }catch(error){if(ticket!==generation)return;const messages={NotAllowedError:'请允许摄像头后重试',NotFoundError:'未检测到摄像头',NotReadableError:'摄像头被其他程序占用'};fail(messages[error.name]||'摄像头未启动，点击重试');}
 }
 function loop(time){
  if(!stream)return;raf=requestAnimationFrame(loop);
  if(!ready||busy||document.hidden||video.readyState<2||time-lastFrame<100)return;
  try{
   const frame=readFrame(video);aspect=frame.width/frame.height;
   if(overlay.width!==frame.width||overlay.height!==frame.height){overlay.width=frame.width;overlay.height=frame.height;}
   busy=true;lastFrame=time;sentAt=performance.now();frames++;captureErrors=0;status.dataset.frames=String(frames);
   worker.postMessage({type:'frame',...frame,time},[frame.pixels]);
  }catch(error){busy=false;lastFrame=time;if(++captureErrors>=3){console.warn('Camera frame:',error);fail('画面读取失败，点击重试');}}
 }
 function stop(){generation++;starting=false;release();onReset?.();phase('stopped');onState('stopped');}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)onReset?.();});window.addEventListener('pagehide',stop);
 return {start,stop,calibrate,get active(){return !!stream;},get diagnostics(){return {ready,frames,results,busy,phase:status.dataset.phase};}};
}

