const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function handFeatures(landmarks,aspect=4/3){
 if(landmarks?.length!==21||!landmarks.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 const p=landmarks.map(v=>({x:v.x*aspect,y:v.y,z:(v.z||0)*aspect})),distance=(a,b)=>Math.hypot(p[a].x-p[b].x,p[a].y-p[b].y,p[a].z-p[b].z);
 const angle=(a,b,c)=>{const u=[p[a].x-p[b].x,p[a].y-p[b].y,p[a].z-p[b].z],v=[p[c].x-p[b].x,p[c].y-p[b].y,p[c].z-p[b].z];return Math.acos(clamp(u.reduce((s,x,i)=>s+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v)||1),-1,1))*180/Math.PI;};
 const scale=Math.max(distance(5,17),distance(0,9)*.65);if(scale<.025)return null;
 const joints=[[5,6,8],[9,10,12],[13,14,16],[17,18,20]],angles=joints.map(([a,b,c])=>angle(a,b,c)),extended=joints.map(([a,b,c],i)=>angles[i]>135&&distance(c,0)>distance(b,0)*1.04);
 const count=extended.filter(Boolean).length,pinch=distance(4,8)/scale,closed=count===0&&angles.reduce((a,b)=>a+b,0)/4<130,open=count===4&&distance(4,9)>scale*.5;
 const center=[0,5,9,13,17].reduce((s,i)=>({x:s.x+landmarks[i].x/5,y:s.y+landmarks[i].y/5}),{x:0,y:0});
 return {x:1-center.x,y:center.y,area:scale*scale,pose:closed?'closed':open?'open':'neutral',pinch,pinchReady:!closed&&(angles[0]>105||extended[0]),extended:count};
}
