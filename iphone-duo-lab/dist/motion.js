// Deterministic staged motion. Coordinates are in 10 mm units.
export const STAGES=[{end:.12,name:'01 / 释放外部紧固件'},{end:.32,name:'02 / 分离屏幕与背盖'},{end:.47,name:'03 / 移除屏蔽与支撑层'},{end:.72,name:'04 / 提取电池、主板与影像模组'},{end:.90,name:'05 / 展开连接与声学组件'},{end:1,name:'06 / 展示框架与铰链'}];
export const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const phase=(p,a,b)=>smooth((p-a)/(b-a));
export function motionFor(id,p,side='L',index=0,external=false){
 const sign=side==='L'?-1:1;
 if(id==='inner')return [0,0,10*phase(p,.13,.31)];
 if(id==='outer'||id==='glass')return [0,0,-10.2*phase(p,.13,.31)];
 if(id==='shield')return [0,0,5.4*phase(p,.32,.46)];
 if(id==='screws'){if(external)return [0,-2.5*phase(p,.01,.115),0];return [0,0,-7.25*phase(p,.32,.46)];}
 if(id==='frameL'||id==='frameR')return [sign*1.0*phase(p,.91,1),0,0];
 if(id==='hinge')return [0,0,2.1*phase(p,.79,.90)];
 if(id==='innerCamera')return [0,1.1*phase(p,.66,.72),3.2*phase(p,.48,.65)];
 if(['batteryL','batteryR','board','mainCamera','ultraCamera'].includes(id)){
  const t=phase(p,.48,.64),fan=phase(p,.64,.72);
  return [sign*(id==='board'?.65:2.1)*fan,(id.includes('Camera')?1.1:id==='batteryR'?-.2:0)*fan,-3.65*t];
 }
 const t=phase(p,.73,.83),fan=phase(p,.83,.90);
 if(id==='frontCamera')return [-1.6*fan,1.5*fan,-3.65*t];
 if(id==='flex')return [0,0,3.05*phase(p,.48,.70)];
 return [sign*2.1*fan,(id==='speaker'?index===0?1.2:-1.35:id==='taptic'?-1.35:id==='usb'?-2.0:id==='ioBoard'?-.45:0)*fan,-3.65*t];
}
// A continuous developable sheet and its matching rigid right-hand body transform.
export function foldedPoint(x,y,z,angle){
 const theta=(180-angle)*Math.PI/180,b=.05;
 if(theta<.00001)return [x,y,.275+z];
 let xx=x,zz=.275,a=0;
 if(x>-b){const u=Math.min(x+b,2*b),k=theta/(2*b);a=k*u;xx=-b+Math.sin(a)/k;zz=.275+(1-Math.cos(a))/k;if(x>b){xx+=(x-b)*Math.cos(theta);zz+=(x-b)*Math.sin(theta);}}
 return [xx-z*Math.sin(a),y,zz+z*Math.cos(a)];
}
export function rightBodyTransform(angle){const t=(180-angle)*Math.PI/180,b=.05;if(t<.00001)return {theta:0,x:0,z:0};const k=t/(2*b),tx=-b+Math.sin(t)/k-b*Math.cos(t),tz=(1-Math.cos(t))/k-b*Math.sin(t);return {theta:-t,x:tx+Math.sin(t)*.275,z:.275+tz-Math.cos(t)*.275};}
