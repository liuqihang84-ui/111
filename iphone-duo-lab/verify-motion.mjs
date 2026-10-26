import assert from 'node:assert/strict';
import {motionFor,foldedPoint,rightBodyTransform} from './dist/motion.js';
let checks=0;
for(let i=0;i<=1000;i++){
 const p=i/1000,inner=motionFor('inner',p)[2],shield=motionFor('shield',p)[2],rear=motionFor('glass',p,'R')[2],battery=motionFor('batteryR',p,'R')[2];
 assert(.230+inner>.207+shield,'The display must clear the support plate');checks++;
 assert(-.2325+rear<-.1625+battery,'The rear cover must clear the battery');checks++;
 if(Math.abs(battery)>.001){assert(rear<-10,'Covers must finish removal before cells move');assert(shield>5.3,'Supports must finish removal before cells move');checks+=2;}
 const board=motionFor('board',p,'R'),cell=motionFor('batteryR',p,'R');
 assert(2.165+board[0]<2.425+cell[0]||-1.36+board[1]>-1.55+cell[1],'The logic board must clear the notched battery');checks++;
 const main=motionFor('mainCamera',p,'R'),uw=motionFor('ultraCamera',p,'R');assert(4.64+.735+uw[0]<6.58-.735+main[0],'Rear camera modules must remain separated');checks++;
}
for(let angle=0;angle<=180;angle++){
 const rig=rightBodyTransform(angle),t=-rig.theta;
 for(const x of [.3,4.1,7.8])for(const z of [-.045,.005]){const actual=foldedPoint(x,2,z,angle),expectedX=Math.cos(t)*x-Math.sin(t)*(.275+z)+rig.x,expectedZ=Math.sin(t)*x+Math.cos(t)*(.275+z)+rig.z;assert(Math.abs(actual[0]-expectedX)<1e-9);assert(Math.abs(actual[2]-expectedZ)<1e-9);checks+=2;}
 const left=foldedPoint(-3,1,.005,angle);assert.equal(left[0],-3);assert.equal(left[2],.28);checks+=2;
}
assert(Math.abs((rightBodyTransform(0).z+.52)*10-11.3)<.05);checks++;
console.log(`Motion checks passed: ${checks}. 1001 disassembly samples; 181 fold angles; critical layer clearance and continuous screen/body alignment.`);
