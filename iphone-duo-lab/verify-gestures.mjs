import assert from 'node:assert/strict';
import {createGestureInterpreter} from './dist/gesture-input.js';
import {handFeatures} from './dist/hand-features.js';
const state={theta:.4,phi:1.2,fold:180},base={x:.5,y:.6,area:.05,pose:'neutral',pinch:1.3,pinchReady:false};
let time=0,checks=0;
function frames(g,hand,n=1,snapshot=state){let result,actions=[];for(let i=0;i<n;i++){time+=90;result=g.update({time,hands:hand?[hand]:[]},snapshot);actions.push(...result.actions);}return {result,actions};}
let g=createGestureInterpreter();
assert.equal(frames(g,{...base,pose:'open'},3).actions.length,0);checks++;
let r=frames(g,{...base,pose:'open'},12);assert.equal(r.actions.filter(a=>a.kind==='grip'&&a.open).length,1);checks++;
assert.equal(frames(g,{...base,pose:'open'},20).actions.filter(a=>a.kind==='grip').length,0);checks++;
r=frames(g,{...base,pose:'closed'},12);assert(r.actions.some(a=>a.kind==='grip'&&!a.open));checks++;
g=createGestureInterpreter();frames(g,base,8);r=frames(g,{...base,x:.36},15);assert(r.actions.at(-1).theta>state.theta);checks++;
g=createGestureInterpreter();frames(g,base,8);r=frames(g,{...base,x:.64},15);assert(r.actions.at(-1).theta<state.theta);checks++;
g=createGestureInterpreter();frames(g,base,8);assert.equal(frames(g,{...base,x:.501},15).actions.length,0);checks++;
g=createGestureInterpreter();frames(g,base,8);
for(let i=0;i<20;i++)assert.equal(frames(g,{...base,pose:i%2?'open':'closed'}).actions.filter(a=>a.kind==='grip').length,0);checks+=20;
r=frames(g,{...base,pinch:.14,pinchReady:true},35);let folds=r.actions.filter(a=>a.kind==='fold');assert(folds.length>0);assert(folds.at(-1).value<1);checks+=2;
let previous=state.fold;for(const a of folds){assert(Math.abs(a.value-previous)<=120*.09+1e-6);previous=a.value;checks++;}
r=frames(g,{...base,pose:'open',pinch:1.4},40,{...state,fold:0});folds=r.actions.filter(a=>a.kind==='fold');assert(folds.at(-1).value>179);assert(!r.actions.some(a=>a.kind==='grip'&&a.open));checks+=2;
frames(g,{...base,pose:'closed'},12);r=frames(g,{...base,pose:'open'},12);assert(r.actions.some(a=>a.kind==='grip'&&a.open));checks++;
assert.equal(frames(g,null,2).actions.length,0);assert.equal(frames(g,{...base,x:.8},3).actions.length,0);checks+=2;
frames(g,base,8);r=frames(g,{...base,x:.95},1);assert(!r.result.active);checks++;
const open=Array.from({length:21},()=>({x:.5,y:.6,z:0}));
open[0]={x:.5,y:.8,z:0};[[1,.42,.74],[2,.34,.68],[3,.28,.61],[4,.24,.55],[5,.43,.59],[6,.43,.45],[7,.43,.36],[8,.43,.28],[9,.5,.56],[10,.5,.39],[11,.5,.29],[12,.5,.21],[13,.57,.58],[14,.57,.43],[15,.57,.33],[16,.57,.25],[17,.63,.63],[18,.63,.51],[19,.63,.43],[20,.63,.36]].forEach(([i,x,y])=>open[i]={x,y,z:0});
assert.equal(handFeatures(open).pose,'open');checks++;
const fist=structuredClone(open);for(const [m,p,d,t]of [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]){fist[p]={x:open[m].x,y:open[m].y-.06,z:0};fist[d]={x:open[m].x+.02,y:open[m].y+.03,z:0};fist[t]={x:open[m].x+.015,y:open[m].y+.09,z:0};}
assert.equal(handFeatures(fist).pose,'closed');assert.equal(handFeatures(fist).pinchReady,false);checks+=2;
const pinch=structuredClone(fist);for(const i of [5,6,7,8])pinch[i]=open[i];pinch[4]={x:open[8].x+.01,y:open[8].y+.01,z:0};
const feature=handFeatures(pinch);assert(feature.pinch<.2);assert(feature.pinchReady);checks+=2;
for(const points of [open,fist,pinch])for(const factor of [.65,.9,1.1]){const transformed=points.map(p=>({x:.5+(p.x-.5)*factor,y:.5+(p.y-.5)*factor,z:p.z*factor}));assert.equal(handFeatures(points).pose,handFeatures(transformed).pose);assert(Math.abs(handFeatures(points).pinch-handFeatures(transformed).pinch)<1e-6);const mirrored=points.map(p=>({...p,x:1-p.x}));assert.equal(handFeatures(points).pose,handFeatures(mirrored).pose);checks+=3;}
assert.equal(handFeatures(null),null);checks++;
console.log('Single-hand gesture checks passed: '+checks+'. Pinch priority/release, fist/palm, motion directions, dwell, loss, scale and handedness.');

