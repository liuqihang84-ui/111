import * as THREE from 'three';
import {PARTS} from './parts.js';
import {motionFor,foldedPoint,rightBodyTransform,phase} from './motion.js';

// Apple exterior dimensions: 164.6 x 117.8 x 5.2 mm. Inner-view coordinates:
// LEFT = cover display / USB / I/O. RIGHT = rear cameras / logic board / Taptic.
export function createDuo(){
 const root=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();root.add(left,right);
 const registry=new Map(PARTS.map(p=>[p.id,{...p,nodes:[],meshes:[],outlines:[],target:0,current:0,focusIndex:null}]));
 const pickables=[],foldSurfaces=[],finishMeshes=[];let lastFold=-1,lastSelection='',lastWire=false,screwCount=0;
 const material=(color,metalness=.1,roughness=.4,extras={})=>new THREE.MeshPhysicalMaterial({color,metalness,roughness,...extras});
 const titanium=material('#c5c6c8',1,.2,{clearcoat:.4}),polished=material('#eef0f1',1,.13),black=material('#090b0e',.18,.31),rubber=material('#17191c',0,.72),gold=material('#b9975a',.86,.28),copper=material('#ba7738',.65,.4),silver=material('#a9afb3',.9,.3),foil=material('#999d9c',.75,.46),boardMat=material('#19392f',.38,.6),lensMat=material('#182d40',.7,.08,{clearcoat:1});
 const backMat=material('#e9e8e3',.16,.26,{clearcoat:1,clearcoatRoughness:.14});
 const xs=[...Array.from({length:82},(_,i)=>-8.16+i/81*8.11),...Array.from({length:20},(_,i)=>-.05+(i+1)/20*.1),...Array.from({length:82},(_,i)=>.05+(i+1)/82*8.11)];
 function shape(w,h,r=.6,innerSide=null){const s=new THREE.Shape(),x=-w/2,y=-h/2;let a=[r,r,r,r];if(innerSide==='right')a=[r,.035,.035,r];if(innerSide==='left')a=[.035,r,r,.035];const [bl,br,tr,tl]=a;s.moveTo(x+bl,y);s.lineTo(x+w-br,y);s.quadraticCurveTo(x+w,y,x+w,y+br);s.lineTo(x+w,y+h-tr);s.quadraticCurveTo(x+w,y+h,x+w-tr,y+h);s.lineTo(x+tl,y+h);s.quadraticCurveTo(x,y+h,x,y+h-tl);s.lineTo(x,y+bl);s.quadraticCurveTo(x,y,x+bl,y);return s;}
 function extrude(s,d,mat,bevel=.018){const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:16});g.translate(0,0,-d/2);return new THREE.Mesh(g,mat);}
 function plate(w,h,d,r,m,innerSide=null){return extrude(shape(w,h,r,innerSide),d,m,Math.min(.016,d*.2));}
 function box(w,h,d,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);return o;}
 function cylinder(r,d,m,x=0,y=0,z=0,n=48){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d,n),m);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
 function ring(r,t,m,x=0,y=0,z=0){const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),m);o.position.set(x,y,z);return o;}
 function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
 function stamp(w,h,t){return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,transparent:true,depthWrite:false,roughness:.65,polygonOffset:true,polygonOffsetFactor:-2}));}
 function node(id,side,xyz=[0,0,0],external=false){const p=registry.get(id),n=new THREE.Group();n.position.fromArray(xyz);n.userData={partId:id,base:n.position.clone(),side,external,index:p.nodes.length,extra:0,extraTarget:0};(side==='R'?right:left).add(n);p.nodes.push(n);return n;}
 function add(n,o,finish=false){n.add(o);if(finish)finishMeshes.push(o);return o;}
 const W=8.21,H=11.78,C=4.125;
 // Asymmetric halves: square-ish hinge edges and rounded OUTER corners.
 for(const [side,x,id]of [['L',-C,'frameL'],['R',C,'frameR']]){
  const n=node(id,side,[x,0,0]);const s=shape(W-.044,H-.044,.65,side==='L'?'right':'left');const hole=new THREE.Path(shape(W-.20,H-.20,.58,side==='L'?'right':'left').getPoints());s.holes.push(hole);add(n,extrude(s,.46,titanium,.022),true);
  for(const z of [-.264,.264]){const s=shape(W-.035,H-.035,.65,side==='L'?'right':'left');s.holes.push(new THREE.Path(shape(W-.10,H-.10,.61,side==='L'?'right':'left').getPoints()));const trim=extrude(s,.012,polished,.002);trim.position.z=z;add(n,trim,true);}
  // Interior mounting ledges stay inside the cavity.
  for(const yy of [-5.56,5.56])add(n,box(7.7,.10,.10,silver,0,yy,.12));
  for(const yy of [-4.65,3.9]){const seam=box(.035,.095,.45,rubber,side==='L'?-4.1:4.1,yy,0);add(n,seam);}
  for(let k=0;k<7;k++){const o=cylinder(.040,.07,black,-1.35+k*.145,5.86,0,12);o.rotation.x=0;add(n,o);}
  if(side==='R'){
   for(const xx of [1.55,2.63]){const key=plate(.82,.11,.18,.05,polished);key.position.set(xx,5.90,0);add(n,key,true);}
   for(const [yy,hh]of [[2.45,1.35],[-2.5,1.25]]){const key=plate(.105,hh,.22,.05,polished);key.position.set(4.14,yy,0);add(n,key,true);}
  }
 }
 const wallpaper=texture(2048,1440,(ctx,w,h)=>{
  const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#101d39');g.addColorStop(.40,'#282a58');g.addColorStop(.70,'#596482');g.addColorStop(1,'#12233a');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  // Original procedural silk-like ribbons, not downloaded imagery.
  for(let j=0;j<2;j++){ctx.save();ctx.translate(w*(j?.68:.32),h*.65);ctx.rotate(j?-.5:.52);for(let i=0;i<90;i++){const t=i/89;ctx.beginPath();ctx.ellipse(0,0,200+t*420,60+t*130,0,0,Math.PI*2);ctx.strokeStyle=`hsla(${j?205+35*t:25+20*t},${45+30*t}%,${15+60*t}%,${.08+.17*Math.sin(t*Math.PI)})`;ctx.lineWidth=8;ctx.stroke();}ctx.restore();}
  ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='300 158px Arial';ctx.fillText('9:41',w/2,310);ctx.font='27px Arial';ctx.fillStyle='#edf0f8d9';ctx.fillText('Monday, October 26',w/2,365);ctx.fillStyle='#ffffffb0';ctx.beginPath();ctx.roundRect(w*.44,h-40,w*.12,6,3);ctx.fill();
 });
 const outerTex=texture(840,1180,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,'#10203a');g.addColorStop(.45,'#465975');g.addColorStop(1,'#bd9689');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w*.3,h*.7);ctx.rotate(-.6);for(let i=0;i<65;i++){ctx.beginPath();ctx.ellipse(0,0,130+i*5,40+i*2.8,0,0,Math.PI*2);ctx.strokeStyle=`rgba(218,232,255,${.03+i/1200})`;ctx.lineWidth=7;ctx.stroke();}ctx.restore();ctx.fillStyle='#f5f7ff';ctx.textAlign='center';ctx.font='100px Arial';ctx.fillText('9:41',w/2,300);ctx.font='23px Arial';ctx.fillText('Monday, October 26',w/2,345);ctx.fillStyle='#fff9';ctx.beginPath();ctx.roundRect(w*.36,h-32,w*.28,5,3);ctx.fill();});
 // ONE continuous, rounded, bendable inner screen; no center bezels or gap.
 const screenNode=node('inner','L',[0,0,0]);
 function foldingSurface(w,h,r,z,m){
  const xlist=xs.map(x=>x/8.16*(w/2)),ny=12,positions=[],uvs=[],indices=[];
  for(let i=0;i<xlist.length;i++){const x=xlist[i],edge=Math.max(0,Math.abs(x)-(w/2-r)),extent=h/2-r+Math.sqrt(Math.max(0,r*r-edge*edge));for(let j=0;j<=ny;j++){const y=(j/ny-.5)*2*extent;positions.push(x,y,.275+z);uvs.push((x+w/2)/w,j/ny);}}
  for(let i=0;i<xlist.length-1;i++)for(let j=0;j<ny;j++){const a=i*(ny+1)+j,b=a+ny+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,m);add(screenNode,mesh);foldSurfaces.push({mesh,rest:positions.slice(),z});return mesh;
 }
 foldingSurface(16.29,11.61,.61,-.018,black);
 const screenMat=material('#ffffff',.02,.22,{map:wallpaper,emissiveMap:wallpaper,emissive:'#ffffff',emissiveIntensity:.24,clearcoat:.42,clearcoatRoughness:.18,side:THREE.DoubleSide});foldingSurface(15.91,11.15,.48,.005,screenMat);
 foldingSurface(16.27,11.59,.6,-.045,material('#20232a',.8,.42,{side:THREE.DoubleSide}));
 const screenEdgeMaterial=new THREE.LineBasicMaterial({color:new THREE.Color().setRGB(.35,1.7,3.2),transparent:true,opacity:.7,toneMapped:false,depthWrite:false});const screenLoop=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(shape(16.29,11.61,.61).getPoints(48).map(p=>new THREE.Vector3(p.x,p.y,.282))),screenEdgeMaterial);screenLoop.visible=false;screenNode.add(screenLoop);registry.get('inner').outlines.push(screenLoop);
 // Back glass is on the RIGHT, with real clearances around the lens barrels.
 const rear=node('glass','R',[C,0,-.267]);const rearShape=shape(W-.10,H-.10,.60,'left');
 const cameraXs=[6.58,4.64],cameraY=4.30;
 for(const x of cameraXs){const hole=new THREE.Path();hole.absellipse(x-C,cameraY,.82,.82,0,Math.PI*2,true);rearShape.holes.push(hole);}
 add(rear,extrude(rearShape,.045,backMat,.012),true);
 const islandShape=shape(5.95,2.03,.94);for(const x of cameraXs){const hole=new THREE.Path();hole.absellipse(x-5.11,0,.82,.82,0,Math.PI*2,true);islandShape.holes.push(hole);}
 const island=extrude(islandShape,.11,backMat,.03);island.position.set(5.11-C,cameraY,-.10);add(rear,island,true);
 const logoTex=texture(256,256,ctx=>{ctx.fillStyle='#92949a';ctx.beginPath();ctx.ellipse(107,139,39,48,-.18,0,Math.PI*2);ctx.ellipse(146,139,39,48,.18,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(181,116,20,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';ctx.beginPath();ctx.ellipse(140,65,9,22,.65,0,Math.PI*2);ctx.fill();});
 const logo=stamp(1.25,1.25,logoTex);logo.position.set(0,-.3,-.04);logo.rotation.y=Math.PI;add(rear,logo);
 add(rear,cylinder(.16,.025,material('#f5efde',.08,.15),3.03-C,3.98,-.21));add(rear,cylinder(.075,.022,black,3.03-C,4.69,-.21,20));
 // External cover display belongs to the LEFT half. Its camera is a round hole.
 const cover=node('outer','L',[-C,0,-.27]);const coverShape=shape(W-.09,H-.09,.60,'right'),coverHole=new THREE.Path();coverHole.absellipse(-7.47+C,5.06,.215,.215,0,Math.PI*2,true);coverShape.holes.push(coverHole);add(cover,extrude(coverShape,.045,black,.008));
 const coverFaceShape=shape(W-.36,H-.37,.50,'right'),faceHole=new THREE.Path();faceHole.absellipse(-7.47+C,5.06,.215,.215,0,Math.PI*2,true);coverFaceShape.holes.push(faceHole);const coverPlane=extrude(coverFaceShape,.008,material('#ffffff',.02,.16,{map:outerTex,emissiveMap:outerTex,emissive:'#ffffff',emissiveIntensity:.24,clearcoat:1}),.001);
 let ps=coverPlane.geometry.attributes.position,uv=coverPlane.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,1-(ps.getX(i)+(W-.36)/2)/(W-.36),(ps.getY(i)+(H-.37)/2)/(H-.37));uv.needsUpdate=true;coverPlane.position.z=-.032;add(cover,coverPlane);
 const outerCam=node('frontCamera','L',[-7.47,5.06,-.315]);add(outerCam,cylinder(.18,.016,black));add(outerCam,cylinder(.11,.019,lensMat,0,0,-.014));add(outerCam,ring(.13,.012,polished,0,0,-.023));
 const batteryPrint=texture(768,1024,(ctx,w,h)=>{ctx.fillStyle='#303438';ctx.font='bold 34px Arial';ctx.fillText('Li-ion',60,120);ctx.font='19px Arial';for(const [i,s]of ['RECHARGEABLE BATTERY','DUAL CELL POWER SYSTEM','DO NOT PUNCTURE','RECYCLE RESPONSIBLY'].entries())ctx.fillText(s,60,195+i*37);ctx.font='90px Arial';ctx.fillText('♲',60,500);ctx.font='16px monospace';ctx.fillText('19.1 Wh / SYSTEM TOTAL',60,720);for(let i=0;i<68;i++)ctx.fillRect(60+i*6,805,i%4?2:4,90);});
 // Cavity layout uses separate, non-overlapping footprints.
 for(const [id,side,x,w,h,y]of [['batteryL','L',-C,6.95,8.9,0],['batteryR','R',5.05,5.25,7.35,-.75]]){
  const n=node(id,side,[x,y,-.015]);let s=shape(w,h,.15);
  if(id==='batteryR'){s=new THREE.Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.lineTo(-w/2,-.80);s.lineTo(-4.25,-.80);s.lineTo(-4.25,-h/2);s.closePath();}
  add(n,extrude(s,.245,foil,.025));const face=new THREE.Mesh(new THREE.ShapeGeometry(s),new THREE.MeshStandardMaterial({map:batteryPrint,transparent:true,roughness:.7,depthWrite:false,side:THREE.DoubleSide}));const pos=face.geometry.attributes.position,uv=face.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,1-(pos.getX(i)+w/2)/w,(pos.getY(i)+h/2)/h);face.position.z=-.15;add(n,face);
  for(const yy of [-h/2+.09,h/2-.09])add(n,box(w-.22,.025,.025,silver,0,yy,-.14));add(n,box(.38,.55,.025,copper,-w/2+.4,h/2+.24,-.05));
 }
 // Logic board: right half, next to the notched battery. Fine detail is deterministic.
 const pcb=node('board','R',[1.43,1.88,-.055]);add(pcb,plate(1.47,6.48,.07,.10,boardMat));add(pcb,box(1.80,.82,.07,boardMat,.55,3.0,0));
 const chipTex=texture(512,512,ctx=>{ctx.textAlign='center';ctx.fillStyle='#a5aab3';ctx.font='bold 82px Arial';ctx.fillText('A20',256,240);ctx.font='36px Arial';ctx.fillText('PRO',256,302);ctx.font='16px monospace';ctx.fillStyle='#737985';ctx.fillText('APPLE SILICON',256,375);});
 for(const [x,y,w,h]of [[0,1.15,1.23,1.32],[0,-.6,1.12,1.12],[0,-2.24,1.10,.62],[.6,3,.70,.55]]){
  const chip=plate(w,h,.085,.035,material('#22252b',.55,.4));chip.position.set(x,y,-.08);add(pcb,chip);for(let i=0;i<10;i++){add(pcb,box(.045,.035,.028,gold,x-w/2-.025,y-h/2+.07+i*(h-.14)/9,-.06));add(pcb,box(.045,.035,.028,gold,x+w/2+.025,y-h/2+.07+i*(h-.14)/9,-.06));}
 }
 const mark=stamp(1.1,1.1,chipTex);mark.position.set(0,1.15,-.133);mark.rotation.y=Math.PI;add(pcb,mark);
 for(let i=0;i<72;i++){const o=box(.13,.045,.045,i%3?rubber:gold,i%2?.59:-.59,-3+i*.083,-.072);add(pcb,o);}
 for(let i=0;i<16;i++){const pts=[new THREE.Vector3(-.48+i*.06,-3.1,-.039),new THREE.Vector3(-.48+i*.06,-1.9+i*.025,-.039),new THREE.Vector3(.56,-1.4+i*.025,-.039)];add(pcb,new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#8c7246'})));}
 const io=node('ioBoard','L',[-C,-5.05,-.035]);add(io,plate(5.8,.56,.065,.06,boardMat));for(let i=0;i<24;i++)add(io,box(.07,.09,.035,i%2?gold:black,-2.45+i*.21,0,-.07));
 // Each rear camera is a solid lens barrel, coating, aperture and sensor housing.
 for(const [id,x,r]of [['mainCamera',cameraXs[0],.69],['ultraCamera',cameraXs[1],.65]]){
  const n=node(id,'R',[x,cameraY,-.13]);add(n,plate(1.47,1.47,.18,.16,silver));add(n,cylinder(r,.20,black,0,0,-.17));add(n,ring(r+.025,.035,polished,0,0,-.29));add(n,ring(r-.04,.027,titanium,0,0,-.30));
  for(let i=0;i<4;i++)add(n,cylinder(r-.08-i*.085,.020,i%2?material('#173045',.7,.07):material('#111725',.65,.06),0,0,-.30-i*.018));
  add(n,ring(r-.15,.016,material('#536485',.9,.11),0,0,-.379));add(n,cylinder(.19,.02,black,0,0,-.382));add(n,cylinder(.13,.018,material('#233b53',.75,.06),0,0,-.397));
  const glint=material('#95bdd9',.3,.05,{transparent:true,opacity:.65});add(n,cylinder(.06,.009,glint,-.17,.16,-.403));add(n,box(.4,.28,.025,copper,-.9,-.2,.02));
 }
 const innerCam=node('innerCamera','R',[1.07,5.26,.095]);add(innerCam,plate(.52,.52,.10,.06,silver));add(innerCam,cylinder(.17,.12,black,0,0,.05));add(innerCam,cylinder(.12,.012,lensMat,0,0,.12));
 const speakerPositions=[['L',-3.6,5.15,4.6],['R',6.65,-5.12,1.95]];
 for(const [side,x,y,w]of speakerPositions){const n=node('speaker',side,[x,y,-.025]);add(n,plate(w,.63,.23,.12,rubber));for(let i=0;i<14;i++)add(n,cylinder(.026,.009,black,-w/2+.20+i*(w-.4)/13,0,-.13,10));}
 const taptic=node('taptic','R',[3.05,-5.12,-.02]);add(taptic,plate(3.28,.63,.22,.08,silver));add(taptic,box(2.6,.42,.025,rubber,0,0,-.13));for(let i=0;i<16;i++)add(taptic,box(.04,.30,.015,copper,-.7+i*.09,0,-.15));
 const usb=node('usb','L',[-C,-5.82,-.01]);add(usb,plate(.95,.25,.31,.1,silver));add(usb,plate(.77,.16,.34,.07,black));add(usb,box(.70,.035,.24,rubber));for(let i=0;i<12;i++)add(usb,box(.022,.015,.15,gold,-.31+i*.057,0,-.12));
 // Speaker ports and bottom screws are on actual external edges, not sticker dots.
 for(const [side,c]of [['L',-C],['R',C]]){const n=registry.get(side==='L'?'frameL':'frameR').nodes[0];for(const center of [-2.8,2.8])for(let i=0;i<5;i++){const o=cylinder(.035,.075,black,center+i*.14,-5.87,0,12);o.rotation.x=0;add(n,o);}}
 // Front support layers, separately lifted AFTER the continuous screen clears.
 for(const [side,c]of [['L',-C],['R',C]]){const n=node('shield',side,[c,0,.16]);const s=shape(W-.22,H-.31,.49,side==='L'?'right':'left');if(side==='R'){const hole=new THREE.Path();hole.absellipse(1.07-c,5.26,.40,.40,0,Math.PI*2,true);s.holes.push(hole);}add(n,extrude(s,.035,material('#4e545d',.86,.4),.005));for(let i=0;i<5;i++)add(n,box(W-.55,.018,.008,black,0,-4.6+i*2.3,.024));}
 // Fold-tolerant accordion interconnect remains close to the center axis.
 for(const [side,c]of [['L',-.60],['R',.60]]){const n=node('flex',side,[c,1.35,.06]);for(let i=0;i<9;i++){const seg=box(.12,.53,.018,copper,-.48+i*.12,0,(i%2)*.04);add(n,seg);}for(let k=0;k<5;k++)add(n,box(1.1,.018,.008,gold,0,-.2+k*.1,.06));}
 // Smooth exterior spine. Internal joints are revealed only in the final stage.
 const hg=node('hinge','L',[0,0,0]);const spine=new THREE.Mesh(new THREE.CylinderGeometry(.29,.29,11.51,48,1,false,0,Math.PI),titanium);spine.position.z=-.22;spine.userData.exteriorSpine=true;add(hg,spine,true);
 for(let i=0;i<13;i++){const joint=plate(.33,.66,.08,.045,silver);joint.position.set(0,-5.0+i*.83,.045);joint.userData.hingeInternal=true;add(hg,joint);if(i%3===0){const gear=ring(.15,.025,gold,0,-5+i*.83,.04);gear.userData.hingeInternal=true;add(hg,gear);}}
 // Fasteners include real recessed driver silhouettes and helical thread geometry.
 function fastener(type){const g=new THREE.Group(),r=type==='penta'?.075:.065;g.add(cylinder(r*.53,.15,silver,0,0,-.065,16));g.add(cylinder(r,.038,silver,0,0,.027,28));g.add(ring(r*.9,.008,polished,0,0,.048));const pts=[];for(let i=0;i<=54;i++){const a=i/54*Math.PI*7;pts.push(new THREE.Vector3(Math.cos(a)*r*.58,Math.sin(a)*r*.58,-.13+i/54*.135));}g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),54,.0055,3,false),polished));if(type==='penta'){const s=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5,rr=i%2?r*.25:r*.62;i?s.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):s.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}s.closePath();const m=new THREE.Mesh(new THREE.ShapeGeometry(s),black);m.position.z=.049;g.add(m);}else if(type==='super'){g.add(cylinder(r*.36,.006,black,0,0,.051));g.add(ring(r*.48,.013,polished,0,0,.053));}else{g.add(box(r*1.2,r*.2,.005,black,0,0,.049));g.add(box(r*.2,r*1.2,.005,black,0,0,.05));}return g;}
 for(const [side,c]of [['L',-C],['R',C]]){
  for(const x of [-1.02,1.02]){const n=node('screws',side,[c+x,-5.87,-.02],true);const f=fastener('penta');f.rotation.x=Math.PI/2;add(n,f);screwCount++;}
  for(let i=0;i<14;i++){const x=i<8?(i%2?-3.81:3.81):-2.8+(i-8)%3*2.8,y=i<8?-4.8+Math.floor(i/2)*3.2:i<11?-5.43:5.43;const n=node('screws',side,[c+x,y,-.18]);const f=fastener('cross');f.rotation.y=Math.PI;add(n,f);screwCount++;}
 }
 for(const [x,y]of [[1.15,4.5],[1.15,1.7],[1.15,-1.2],[7.4,4.8],[3.9,4.8]]){const n=node('screws','R',[x,y,-.20]);const f=fastener('super');f.rotation.y=Math.PI;add(n,f);screwCount++;}
 // Cache materials/outline meshes ONCE; selection no longer recreates material work every frame.
 const edgeMaterial=new THREE.LineBasicMaterial({color:new THREE.Color().setRGB(.35,1.7,3.2),transparent:true,opacity:.65,depthWrite:false,toneMapped:false});
 for(const p of registry.values())for(const n of p.nodes){n.userData.rotation=n.rotation.clone();n.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.partId=p.id;o.userData.partNode=n.userData.index;p.meshes.push(o);pickables.push(o);}});for(const m of p.meshes.filter(m=>m.parent===n).slice(0,3)){if(m.geometry.type==='ExtrudeGeometry'){const line=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,35),edgeMaterial);line.position.copy(m.position);line.rotation.copy(m.rotation);line.visible=false;n.add(line);p.outlines.push(line);}}}
 const paths=new THREE.Group();root.add(paths);const guideMat=new THREE.LineDashedMaterial({color:'#6a9cbd',transparent:true,opacity:.15,dashSize:.09,gapSize:.13,depthWrite:false});
 for(const id of ['inner','outer','glass','batteryL','batteryR']){const p=registry.get(id),n=p.nodes[0],off=motionFor(id,1,n.userData.side,n.userData.index);const a=n.userData.base.clone(),b=a.clone().add(new THREE.Vector3(...off));const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),guideMat);l.computeLineDistances();paths.add(l);}
 function update(progress,fold,dt,selected,hover,isolate,wireframe){
  const rig=rightBodyTransform(fold);right.rotation.y=rig.theta;right.position.set(rig.x,0,rig.z);
  if(Math.abs(lastFold-fold)>.002){for(const f of foldSurfaces){const pos=f.mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=foldedPoint(f.rest[i*3],f.rest[i*3+1],f.z,fold);pos.setXYZ(i,...v);}pos.needsUpdate=true;f.mesh.geometry.computeVertexNormals();f.mesh.geometry.computeBoundingSphere();f.mesh.geometry.computeBoundingBox();}lastFold=fold;}
  for(const p of registry.values()){
   p.current+=(p.target-p.current)*(1-Math.exp(-dt*7));p.moving=false;
   for(const n of p.nodes){const oldX=n.position.x,oldY=n.position.y,oldZ=n.position.z;n.userData.extra+=(n.userData.extraTarget-n.userData.extra)*(1-Math.exp(-dt*7));const off=motionFor(p.id,progress,n.userData.side,n.userData.index,n.userData.external);const extra=(p.current+n.userData.extra)*phase(progress,.70,.76);const normal=p.id==='inner'||p.id==='shield'||p.id==='flex'||p.id==='hinge'||p.id==='innerCamera'?1:-1;off[2]+=extra*normal*.65;n.position.copy(n.userData.base).add(new THREE.Vector3(...off));if(Math.abs(oldX-n.position.x)+Math.abs(oldY-n.position.y)+Math.abs(oldZ-n.position.z)>.0005)p.moving=true;n.rotation.copy(n.userData.rotation);if(p.id==='screws')n.rotation.z+=phase(progress,n.userData.external?.01:.32,n.userData.external?.115:.46)*Math.PI*6;n.visible=!isolate||p.id===selected;if(isolate&&p.id==='screws'&&p.focusIndex!==null)n.visible=n.userData.index===p.focusIndex;
    if(p.id==='hinge')for(const o of n.children){if(o.userData.hingeInternal)o.visible=progress>.80||isolate;if(o.userData.exteriorSpine){o.visible=progress<.86&&!isolate;const closed=(180-fold)/180;o.position.z=-.22+closed*.525;o.scale.set((.12+closed*.20)/.29,1,(.12+closed*.20)/.29);}}
   }
  }
  for(const p of registry.values())for(const o of p.outlines)o.visible=(p.moving&&progress>.01||(p.id===selected&&progress>.03)||p.id===hover)&&!isolate&&fold>179;
  if(wireframe!==lastWire){for(const p of registry.values())for(const m of p.meshes)m.material.wireframe=wireframe;lastWire=wireframe;}
  paths.visible=progress>.2&&!isolate&&fold>179;
 }
 function bounds(id){const b=new THREE.Box3(),temporary=new THREE.Box3(),entries=id?[registry.get(id)]:[...registry.values()];for(const p of entries)for(const m of p.meshes){if(p.focusIndex!==null&&id&&m.userData.partNode!==p.focusIndex)continue;let parent=m,visible=true;while(parent){if(!parent.visible){visible=false;break;}parent=parent.parent;}if(!visible)continue;if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();temporary.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);b.union(temporary);}return b;}
 function anchor(id){return bounds(id).getCenter(new THREE.Vector3());}
 function finish(white){for(const m of finishMeshes){if(m.material===titanium||m.material===polished)m.material.color.set(white?'#c5c6c8':'#687080');if(m.material===backMat)m.material.color.set(white?'#e9e8e3':'#282b36');}}
 root.updateMatrixWorld(true);return {root,left,right,registry,pickables,update,anchor,bounds,finish,screwCount};
}
