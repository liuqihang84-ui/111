// Browser-local foreground/YCbCr contour tracking. No video leaves the browser.
export function createGestureControl({video,overlay,status,onFrame,onState,onReset}){
 const w=160,h=120,work=document.createElement('canvas');work.width=w;work.height=h;
 const ctx=work.getContext('2d',{willReadFrequently:true}),draw=overlay.getContext('2d');overlay.width=320;overlay.height=240;
 const mask=new Uint8Array(w*h),clean=new Uint8Array(w*h),visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let stream=null,raf=0,generation=0,background=null,remaining=0,lastFrame=0,lastMessage='';
 function say(s){if(s!==lastMessage){status.textContent=s;lastMessage=s;}}
 function calibrate(){background=null;remaining=25;onReset?.();say('移开双手，校准背景…');}
 async function start(){
  if(stream)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){say('请在 HTTPS 或 localhost 中使用摄像头');onState('error');return;}
  const ticket=++generation;onState('requesting');say('请允许摄像头访问');
  try{
   const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480}},audio:false});
   if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   stream=next;video.srcObject=next;await video.play();
   if(ticket!==generation){next.getTracks().forEach(t=>t.stop());return;}
   next.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===next)stop();},{once:true});calibrate();onState('active');raf=requestAnimationFrame(loop);
  }catch(e){if(ticket!==generation)return;const current=stream;stream=null;current?.getTracks().forEach(t=>t.stop());video.srcObject=null;const messages={NotAllowedError:'请在浏览器中允许摄像头，然后重试',NotFoundError:'未检测到摄像头',NotReadableError:'摄像头被占用，请关闭其他程序后重试'};say(messages[e.name]||'摄像头连接失败，请重试');onState('error');}
 }
 function components(){
  const result=[];visited.fill(0);
  for(let y=25;y<h-3;y++)for(let x=3;x<w-3;x++){
   const start=y*w+x;if(!clean[start]||visited[start])continue;
   let head=0,tail=0,area=0,sx=0,sy=0,minX=w,minY=h,maxX=0,maxY=0;queue[tail++]=start;visited[start]=1;
   while(head<tail){const n=queue[head++],ny=(n/w)|0,nx=n%w;area++;sx+=nx;sy+=ny;minX=Math.min(minX,nx);maxX=Math.max(maxX,nx);minY=Math.min(minY,ny);maxY=Math.max(maxY,ny);
    for(const d of [-1,1,-w,w]){const k=n+d;if(k<0||k>=mask.length)continue;const kx=k%w,ky=(k/w)|0;if(kx<3||kx>=w-3||ky<25||Math.abs(kx-nx)>1||!clean[k]||visited[k])continue;visited[k]=1;queue[tail++]=k;}
   }
   const ww=maxX-minX+1,hh=maxY-minY+1,cx=sx/area,cy=sy/area;
   const faceZone=cx>w*.32&&cx<w*.68&&minY<40;
   if(area>60&&area<3600&&ww>6&&hh>9&&area/(ww*hh)>.18&&!faceZone)result.push({cx,cy,area,minX,minY,maxX,maxY});
  }
  result.sort((a,b)=>b.area-a.area);if(result.length<2)return result.slice(0,1);
  const first=result[0],second=result.find((p,i)=>i>0&&Math.hypot(p.cx-first.cx,p.cy-first.cy)>28);return second?[first,second]:[first];
 }
 function loop(time){
  if(!stream)return;raf=requestAnimationFrame(loop);if(time-lastFrame<65||video.readyState<2)return;lastFrame=time;
  if(document.hidden){onFrame?.({hands:[],time});return;}
  ctx.drawImage(video,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data;draw.clearRect(0,0,320,240);
  if(remaining){if(!background)background=new Float32Array(pixels);else for(let k=0;k<pixels.length;k++)background[k]=background[k]*.8+pixels[k]*.2;remaining--;if(!remaining)say('将手掌放入画面下半区');return;}
  mask.fill(0);clean.fill(0);
  for(let i=0;i<w*h;i++){const k=i*4,r=pixels[k],g=pixels[k+1],b=pixels[k+2],cb=128-.168736*r-.331264*g+.5*b,cr=128+.5*r-.418688*g-.081312*b,diff=(Math.abs(r-background[k])+Math.abs(g-background[k+1])+Math.abs(b-background[k+2]))/3;mask[i]=cb>72&&cb<135&&cr>130&&cr<181&&r>35&&r>g*.83&&diff>18?1:0;}
  for(let y=25;y<h-3;y++)for(let x=3;x<w-3;x++){const i=y*w+x;if(mask[i]&&mask[i-1]+mask[i+1]+mask[i-w]+mask[i+w]>=2)clean[i]=1;}
  const blobs=components(),hands=blobs.map(p=>({x:1-p.cx/w,y:p.cy/h,area:p.area/(w*h)}));const feedback=onFrame?.({hands,time})||{};say(feedback.status||'将手掌放入画面下半区');
  draw.strokeStyle=feedback.active?'#b5d7ff':'#7c8da3';draw.fillStyle=draw.strokeStyle;draw.lineWidth=1.3;
  for(const p of blobs){draw.strokeRect(p.minX*2,p.minY*2,(p.maxX-p.minX)*2,(p.maxY-p.minY)*2);draw.beginPath();draw.arc(p.cx*2,p.cy*2,3,0,Math.PI*2);draw.fill();}
  if(blobs.length===2){draw.setLineDash([4,4]);draw.beginPath();draw.moveTo(blobs[0].cx*2,blobs[0].cy*2);draw.lineTo(blobs[1].cx*2,blobs[1].cy*2);draw.stroke();draw.setLineDash([]);}
 }
 function stop(){generation++;cancelAnimationFrame(raf);const current=stream;stream=null;current?.getTracks().forEach(t=>t.stop());video.pause();video.srcObject=null;draw.clearRect(0,0,320,240);background=null;onReset?.();onState('stopped');}
 window.addEventListener('pagehide',stop);return {start,stop,calibrate,get active(){return !!stream;}};
}
