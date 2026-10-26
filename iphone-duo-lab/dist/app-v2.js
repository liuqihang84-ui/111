import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createDuo} from './model-v2.js';
import {createStudio} from './rendering.js';
import {PARTS} from './parts.js';
import {STAGES,smooth} from './motion.js';
import {createGestureControl} from './hand-tracker.js';
import {createGestureInterpreter} from './gesture-input.js';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={selected:'glass',hover:null,explode:0,target:0,fold:180,foldTarget:180,view:'rear',filter:'all',labels:false,isolate:false,wireframe:false,playing:false,direction:1,framing:true,userCamera:false,white:true};
let renderer,scene,camera,controls,duo,studio,toastTimer,baseDistance=35,sequenceStart=0,sequenceFrom=0,sequenceTo=1,sequenceDuration=13500;
let gestureMode='explode',gestureInterpreter,gestureActive=false,gestureControlling=false,pointerInteraction=false,gestureResumeAt=0;
const spherical=new THREE.Spherical(),goalSpherical=new THREE.Spherical(),goalCenter=new THREE.Vector3(),v3=new THREE.Vector3();
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function make(tag,cls,html=''){const e=document.createElement(tag);e.className=cls;e.innerHTML=html;return e;}
function icon(name){return `<svg><use href="#i-${name}"/></svg>`;}
function prepareUI(){
 document.title='Duo / Inside — 重新看见精密';
 document.querySelector('.intro .eyebrow').innerHTML='<span class="live-dot"></span> ANATOMY OF A FOLDABLE';document.querySelector('.intro-sub').textContent='每一层，都值得看见。';
 document.querySelector('.brand-tag').textContent='ENGINEERING EXPLORER';document.querySelector('.nav-link.active').innerHTML='探索';document.querySelector('.nav-link[data-dialog="structureDialog"]').textContent='结构说明';document.querySelector('.nav-link[data-dialog="sourcesDialog"]').textContent='参考资料';
 $('assembledView').textContent='外观';$('assembledView').classList.add('active');$('explodedView').textContent='拆解';$('explodedView').classList.remove('active');
 const tabs=document.querySelector('.view-tabs');const front=make('button','','内屏');front.id='frontView';const folded=make('button','','折叠');folded.id='foldedView';tabs.append($('assembledView'),front,folded,$('explodedView'));
 const title=make('div','stage-title','<span id="modeNumber">01 / EXTERIOR</span><span id="phaseText">整机外观</span>');$('stage').append(title);
 const finish=make('div','finish-switch','<span class="finish-name">Star White</span><button class="active" data-finish="white" aria-label="星白色" title="Star White" style="--swatch:#deddd6"></button><button data-finish="dark" aria-label="夜空色" title="Night Sky" style="--swatch:#424855"></button>');$('stage').append(finish);
 const toggles=make('div','panel-toggles',`<button id="partsToggle" aria-label="部件清单">${icon('layers')}<span>部件</span></button><button id="immersive" aria-label="沉浸模式">${icon('expand')}<span>沉浸</span></button>`);$('stage').append(toggles);
 const close=make('button','inspector-close','×');close.setAttribute('aria-label','收起部件详情');document.querySelector('.detail-panel').prepend(close);close.onclick=()=>{document.body.classList.remove('inspect-open');requestFrame();};
 const rear=make('button','rear-view',`${icon('rotate')}<span>旋转至背面</span>`);rear.id='rearView';$('stage').append(rear);
 $('explodeRange').value=0;$('explodeValue').textContent='0%';$('toggleLabels').classList.remove('active');$('toggleLabels').setAttribute('aria-pressed','false');
 document.querySelector('.part-symbol').hidden=true;document.querySelector('.page-footer>span:first-child').innerHTML='<span class="live-dot"></span> 交互结构研究';document.querySelector('.page-footer>span:last-child').textContent='V2.0 / PROCEDURAL STUDIO';
 const structure=$('structureDialog').querySelector('p');structure.textContent='内屏采用连续曲面，在铰链区域弯折；外侧边角为大圆角，靠铰链的两条接合边近乎方直。外观状态使用完整脊盖，内部关节只在拆解后呈现。';
 $('helpDialog').querySelectorAll('article p')[1].textContent='点击部件会先移除它前面的覆盖件，再沿安全方向提取。拖动底部进度条可前后检查完整拆解顺序。';
 $('teardownLink').href='https://www.ifixit.com/News/119895/iphone-duo-teardown';$('teardownLink').querySelector('small').textContent='双电池、平面化主板、相机与铰链';
 for(const b of document.querySelectorAll('[data-dialog]'))b.onclick=()=>$(b.dataset.dialog).showModal();
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();}}));
 // Primary controls only. All explanatory text lives behind an explicit action.
 document.title='Duo / Inside';document.querySelector('h1').innerHTML='iPhone Duo';
 const actions=make('div','header-actions');document.querySelector('.topbar').append(actions);
 const partsButton=$('partsToggle');partsButton.setAttribute('aria-expanded','false');actions.append(partsButton);
 $('cameraButton').innerHTML=icon('camera')+'<span>手势</span>';$('cameraButton').setAttribute('aria-pressed','false');actions.append($('cameraButton'));
 const more=make('button','more-button','⋯');more.id='moreControls';more.setAttribute('aria-label','更多视图操作');more.setAttribute('aria-expanded','false');actions.append(more);
 const help=document.querySelector('.top-help');help.innerHTML=icon('info');help.setAttribute('aria-label','操作指南');help.title='操作指南';actions.append(help);
 document.querySelector('.control-dock').prepend(document.querySelector('.view-tabs'));
 $('partSearch').placeholder='搜索部件';document.querySelector('.panel-note').hidden=true;
 const details=make('button','detail-more','详情');details.id='detailMore';details.setAttribute('aria-expanded','false');document.querySelector('.detail-panel').append(details);
 const guide=$('helpDialog').querySelectorAll('article p');guide[0].textContent='拖动旋转，滚轮或双指缩放。';guide[1].textContent='点击部件，可拆解或单独查看。';guide[2].textContent='折叠前自动归位，拆解前自动展开。';guide[3].textContent='拆解：双手开合。折叠：单手左右移动。视角：单手旋转、双手缩放。';
 $('helpDialog').querySelectorAll('article h3')[3].textContent='手势控制';
 const references=make('button','reference-button','参考资料');references.type='button';references.onclick=()=>{$('helpDialog').close();$('sourcesDialog').showModal();};$('helpDialog').querySelector('form').append(references);
 const modes=make('div','gesture-modes','<button data-gesture-mode="explode" class="active" aria-pressed="true">拆解</button><button data-gesture-mode="fold" aria-pressed="false">折叠</button><button data-gesture-mode="view" aria-pressed="false">视角</button>');document.querySelector('.camera-head').after(modes);
 const value=make('output','gesture-value','0%');value.id='gestureValue';value.setAttribute('aria-live','off');document.querySelector('.camera-head').append(value);
 document.querySelector('.camera-actions span').textContent='仅在本机处理';$('calibrateCamera').textContent='校准';
 const instructions=make('p','gesture-instruction','双手靠近后拉开');instructions.id='gestureInstruction';modes.after(instructions);
}
function init(){
 prepareUI();const view=$('viewport');renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#090c12');view.append(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#090c12');scene.fog=new THREE.FogExp2('#090c12',.007);
 camera=new THREE.PerspectiveCamera(31,1,.1,250);camera.position.set(-20,10,-28);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.3;controls.maxDistance=140;controls.autoRotateSpeed=.45;controls.target.set(0,0,0);controls.update();
 controls.addEventListener('start',()=>{state.userCamera=true;state.framing=false;pointerInteraction=true;gestureInterpreter?.reset();});
 controls.addEventListener('end',()=>{pointerInteraction=false;gestureResumeAt=performance.now()+600;});
 duo=createDuo();scene.add(duo.root);duo.finish(true);studio=createStudio(renderer,scene,camera);
 resize();new ResizeObserver(resize).observe(view);
 select('glass');document.body.classList.remove('inspect-open');buildLabels();bind();cameraControls();duo.update(0,180,.016,state.selected,null,false,false);duo.root.updateMatrixWorld(true);frameGoal();applyFrame(1);baseDistance=camera.position.distanceTo(controls.target);
 $('loading').hidden=true;
 let last=performance.now(),lastHUD=0,frameCount=0,frameTime=0;
 function tick(now){requestAnimationFrame(tick);const elapsed=(now-last)/1000,dt=Math.min(elapsed,.05);last=now;if(document.hidden)return;
  if(state.playing){const t=Math.min((now-sequenceStart)/sequenceDuration,1);state.target=THREE.MathUtils.lerp(sequenceFrom,sequenceTo,smooth(t));if(t>=1){state.playing=false;$('playSequence').textContent='▶';$('playSequence').setAttribute('aria-label','播放拆解动画');}}
  const ease=reduced?1:1-Math.exp(-dt*7);const safeProgress=state.target>0&&state.fold<179.9?0:state.target,safeFold=state.explode>.002?180:state.foldTarget;state.explode+=(safeProgress-state.explode)*ease;state.fold+=(safeFold-state.fold)*ease;
  duo.update(state.explode,state.fold,dt,state.selected,state.hover,state.isolate,state.wireframe);duo.root.updateMatrixWorld(true);
  if(state.isolate){const delta=duo.anchor(state.selected).sub(controls.target).multiplyScalar(ease);controls.target.add(delta);camera.position.add(delta);}
  if(state.framing||state.playing&&!state.userCamera){frameGoal();applyFrame(reduced?1:1-Math.exp(-dt*3.8));}
  controls.update();studio.shadow.material.opacity=THREE.MathUtils.lerp(.78,.35,state.explode);updateLabels();studio.render();
  frameCount++;frameTime+=elapsed;
  if(now-lastHUD>180){hud();lastHUD=now;if(frameTime>1.2){$('renderStatus').textContent=`STUDIO · ${Math.min(120,Math.round(frameCount/frameTime))} FPS`;frameTime=0;frameCount=0;}}
 }
 requestAnimationFrame(tick);
 // Diagnostics are mirrored into the DOM for development-only inspection.
 $('viewport').dataset.version='3.0';$('viewport').dataset.components=String(duo.registry.size);$('viewport').dataset.fasteners=String(duo.screwCount);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();toast('图形上下文中断，请刷新以重新构建。');});
}
function resize(){if(!renderer)return;const view=$('viewport'),w=view.clientWidth,h=view.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const b=renderer.getDrawingBufferSize(new THREE.Vector2());studio?.resize(b.x,b.y);if(!state.isolate){state.framing=true;state.userCamera=false;}}
function modelBounds(){return duo.bounds();}
function frameGoal(){
 const b=state.isolate?duo.bounds(state.selected):modelBounds();b.getCenter(goalCenter);
 const direction=state.view==='rear'?new THREE.Vector3(-.62,.30,-1.65):new THREE.Vector3(.55,.27,1.7);if(state.isolate&&state.selected==='screws')direction.set(.5,-.7,-1.6);
 if(state.explode>.02&&!state.isolate){const sign=state.view==='rear'?-1:1;direction.set(sign*THREE.MathUtils.lerp(.65,1.45,state.explode),.38,sign*1.6);}
 direction.normalize();const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right).normalize();let hw=0,hh=0,depth=0;
 for(let i=0;i<8;i++){const corner=new THREE.Vector3(i&1?b.min.x:b.max.x,i&2?b.min.y:b.max.y,i&4?b.min.z:b.max.z).sub(goalCenter);hw=Math.max(hw,Math.abs(corner.dot(right)));hh=Math.max(hh,Math.abs(corner.dot(up)));depth=Math.max(depth,Math.abs(corner.dot(direction)));}
 const w=$('viewport').clientWidth,h=$('viewport').clientHeight,wide=w>1150,mid=w>750,panels=document.body.classList.contains('inspect-open')||document.querySelector('.parts-panel').classList.contains('open'),hf=state.isolate?.76:wide?(panels?.66:.84):mid?.76:.88,vf=state.isolate?.72:.74;
 const tan=Math.tan(camera.fov*Math.PI/360),radius=Math.max(hh/(tan*vf),hw/(tan*camera.aspect*hf))+depth*1.04;
 goalSpherical.setFromVector3(direction.multiplyScalar(Math.max(radius,1.1)));goalCenter.y+=w<700?.2:-.95;
}
function applyFrame(t){spherical.setFromVector3(camera.position.clone().sub(controls.target));let da=goalSpherical.theta-spherical.theta;da=Math.atan2(Math.sin(da),Math.cos(da));spherical.theta+=da*t;spherical.phi=THREE.MathUtils.lerp(spherical.phi,goalSpherical.phi,t);spherical.radius=THREE.MathUtils.lerp(spherical.radius,goalSpherical.radius,t);controls.target.lerp(goalCenter,t);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));}
function requestFrame(){state.userCamera=false;state.framing=true;controls.autoRotate=false;$('autoRotate').classList.remove('active');}
function leaveIsolation(){state.isolate=false;document.body.classList.remove('is-isolated');updateButtons();}
function resetManual(){for(const p of duo.registry.values()){p.target=0;p.focusIndex=null;for(const n of p.nodes)n.userData.extraTarget=0;}}
function setProgress(value){leaveIsolation();state.playing=false;state.target=THREE.MathUtils.clamp(value,0,1);if(value>0){state.foldTarget=180;state.view='front';}resetManual();requestFrame();$('playSequence').textContent='▶';hud();}
function setView(name){leaveIsolation();resetManual();state.playing=false;state.target=0;state.view=name==='front'?'front':'rear';state.foldTarget=name==='folded'?0:180;requestFrame();$('playSequence').textContent='▶';hud();}
function startSequence(to,duration=13500){leaveIsolation();resetManual();state.foldTarget=180;state.view='front';sequenceFrom=state.explode;sequenceTo=to;sequenceDuration=duration;sequenceStart=performance.now();state.playing=true;requestFrame();$('playSequence').textContent='Ⅱ';$('playSequence').setAttribute('aria-label','暂停拆解动画');}
function hud(){
 const value=Math.round(state.explode*100);$('explodeRange').value=value;$('explodeValue').textContent=value+'%';fill($('explodeRange'));$('foldRange').value=Math.round(state.foldTarget);$('foldValue').textContent=Math.round(state.foldTarget)+'°';fill($('foldRange'));
 const disassembled=state.target>.005,phase=STAGES.find(s=>state.explode<=s.end)||STAGES.at(-1);$('phaseText').textContent=disassembled?phase.name:state.foldTarget<90?'合拢 · 外屏视图':state.view==='rear'?'背面 · 双摄与外屏':'展开 · 连续柔性内屏';$('modeNumber').textContent=disassembled?'02 / EXPLODED':'01 / EXTERIOR';$('stageSub').textContent=disassembled?'SEQUENTIAL DISASSEMBLY':'TITANIUM · CERAMIC SHIELD';
 $('zoomReadout').textContent=Math.round(baseDistance/camera.position.distanceTo(controls.target)*100)+'%';
 $('assembledView').classList.toggle('active',!disassembled&&state.view==='rear'&&state.foldTarget>90);$('frontView').classList.toggle('active',!disassembled&&state.view==='front');$('foldedView').classList.toggle('active',!disassembled&&state.foldTarget<90);$('explodedView').classList.toggle('active',disassembled);
 $('viewport').dataset.progress=String(value);$('viewport').dataset.fold=String(Math.round(state.fold));$('viewport').dataset.selected=state.selected;
 document.body.classList.toggle('fold-mode',(state.target<.01&&state.foldTarget<179.9)||(gestureActive&&gestureMode==='fold'));
 if($('gestureValue'))$('gestureValue').textContent=gestureMode==='fold'?Math.round(state.fold)+'°':gestureMode==='explode'?Math.round(state.explode*100)+'%':Math.round(baseDistance/camera.position.distanceTo(controls.target)*100)+'%';
}
function fill(r){r.style.setProperty('--progress',`${(r.value-r.min)/(r.max-r.min)*100}%`);}
function buildList(){const q=$('partSearch').value.trim().toLowerCase();$('partsList').replaceChildren();$('partCount').textContent=PARTS.length;const list=PARTS.filter(p=>(state.filter==='all'||p.category===state.filter)&&`${p.name} ${p.en} ${p.specs.flat().join(' ')}`.toLowerCase().includes(q));
 for(const p of list){const b=make('button','part-row'+(state.selected===p.id?' active':''),`<span class="part-number">${String(PARTS.indexOf(p)+1).padStart(2,'0')}</span><span class="part-row-name">${p.name}<small>${p.en}</small></span><span class="part-indicator"></span>`);b.dataset.part=p.id;b.setAttribute('aria-label',p.name);b.setAttribute('aria-pressed',String(state.selected===p.id));b.onclick=()=>select(p.id);$('partsList').append(b);}if(!list.length)$('partsList').append(make('p','empty-list','未找到相关部件'));
}
function select(id,detach=false,index=null){
 const p=duo.registry.get(id);if(!p)return;const old=state.selected;state.selected=id;p.focusIndex=index;$('detailTitle').textContent=p.name+(index===null?'':` #${String(index+1).padStart(2,'0')}`);$('detailCategory').textContent=p.system;$('detailSubtitle').textContent=p.subtitle;$('detailDescription').textContent=p.description;$('partEnglish').textContent=p.en;$('detailIndex').textContent=`${String(PARTS.findIndex(p=>p.id===id)+1).padStart(2,'0')} / ${PARTS.length}`;$('detailSource').textContent=p.source;
 $('detailSpecs').replaceChildren();for(const [k,v]of p.specs){const row=make('div',''),dt=make('dt','',''),dd=make('dd','','');dt.textContent=k;dd.textContent=v;row.append(dt,dd);$('detailSpecs').append(row);}
 if(detach){const external=['inner','outer','glass'].includes(id);const goal=external?.32:id==='shield'?.47:id==='frameL'||id==='frameR'||id==='hinge'?1:.90;const destination=Math.max(state.explode,goal);if(destination-state.explode>.02)startSequence(destination,Math.max(4000,(destination-state.explode)*11000));if(index!==null){const n=p.nodes[index];n.userData.extraTarget=n.userData.extraTarget?0:.7;}else p.target=p.target?0:.7;requestFrame();}
 if(state.isolate){state.view=['inner','shield','flex','innerCamera'].includes(id)?'front':'rear';requestFrame();}document.body.classList.add('inspect-open');document.querySelector('.parts-panel').classList.remove('open');$('partsToggle').setAttribute('aria-expanded','false');document.querySelector('.detail-panel').scrollTop=0;document.querySelector('.detail-panel').classList.remove('expanded');$('detailMore').setAttribute('aria-expanded','false');$('detailMore').textContent='详情';buildList();updateButtons();
}
function updateButtons(){const p=duo.registry.get(state.selected),active=p.focusIndex!==null?p.nodes[p.focusIndex].userData.extraTarget:p.target;$('detachPart').querySelector('span').textContent=active?'复位':'拆解';$('isolatePart').querySelector('span').textContent=state.isolate?'返回':'聚焦';$('isolatePart').classList.toggle('active',state.isolate);}
const labels=new Map();
function buildLabels(){for(const p of PARTS){const b=make('button','model-label',`${p.name}<small>${p.id==='inner'?'7.6″':p.id==='mainCamera'||p.id==='ultraCamera'?'48 MP':p.id==='board'?'A20 PRO':''}</small>`);b.hidden=true;b.onclick=()=>select(p.id,true);$('labels').append(b);labels.set(p.id,b);}}
function updateLabels(){const w=$('viewport').clientWidth,h=$('viewport').clientHeight,placed=[];for(const [id,e]of labels){if(state.isolate||state.explode<.12||!state.labels&&id!==state.selected||state.labels&&!duo.registry.get(id).label&&id!==state.selected){e.hidden=true;continue;}const v=duo.anchor(id).project(camera),x=(v.x*.5+.5)*w;let y=(-v.y*.5+.5)*h+22;const inBounds=v.z<1&&v.z>-1&&x>(w>900?270:42)&&x<w-(w>1150?280:42)&&y>120&&y<h-140;if(!inBounds){e.hidden=true;continue;}for(const [px,py]of placed)if(Math.abs(x-px)<130&&Math.abs(y-py)<28)y+=30;e.hidden=false;e.classList.toggle('selected',id===state.selected);e.style.left=x+'px';e.style.top=y+'px';placed.push([x,y]);}}
function bind(){
 $('partSearch').oninput=buildList;for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{state.filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));buildList();};
 $('assembledView').onclick=()=>{setGestureMode('view');setView('rear');};$('frontView').onclick=()=>{setGestureMode('view');setView('front');};$('foldedView').onclick=()=>{setGestureMode('fold');setView('folded');};$('explodedView').onclick=()=>{setGestureMode('explode');startSequence(1);};
 $('explodeRange').oninput=e=>setProgress(Number(e.target.value)/100);$('foldRange').oninput=e=>{leaveIsolation();state.playing=false;state.target=0;resetManual();state.foldTarget=Number(e.target.value);state.view=state.foldTarget<100?'rear':'front';requestFrame();hud();};
 $('playSequence').onclick=()=>{if(state.playing){state.playing=false;$('playSequence').textContent='▶';return;}startSequence(state.explode>.95?0:1);};
 $('detachPart').onclick=()=>select(state.selected,true,duo.registry.get(state.selected).focusIndex);
 $('isolatePart').onclick=()=>{state.isolate=!state.isolate;document.body.classList.toggle('is-isolated',state.isolate);const p=duo.registry.get(state.selected);if(state.selected==='screws'&&p.focusIndex===null){p.focusIndex=0;$('detailTitle').textContent=p.name+' #01';}if(state.isolate)state.view=['inner','shield','flex','innerCamera'].includes(state.selected)?'front':'rear';requestFrame();updateButtons();};
 for(const [id,d]of [['prevPart',-1],['nextPart',1]])$(id).onclick=()=>{const p=duo.registry.get(state.selected);if(state.selected==='screws'&&state.isolate){select('screws',false,((p.focusIndex??0)+d+p.nodes.length)%p.nodes.length);requestFrame();}else select(PARTS[(PARTS.findIndex(p=>p.id===state.selected)+d+PARTS.length)%PARTS.length].id);};
 $('resetView').onclick=()=>{requestFrame();toast('已恢复产品取景');};$('rearView').onclick=()=>{state.view=state.view==='rear'?'front':'rear';if(state.explode>.02)state.view='rear';requestFrame();};
 $('autoRotate').onclick=()=>{state.framing=false;state.userCamera=true;controls.autoRotate=!controls.autoRotate;$('autoRotate').classList.toggle('active',controls.autoRotate);};$('toggleLabels').onclick=()=>{state.labels=!state.labels;$('toggleLabels').classList.toggle('active',state.labels);$('toggleLabels').setAttribute('aria-pressed',String(state.labels));};$('wireframe').onclick=()=>{state.wireframe=!state.wireframe;$('wireframe').classList.toggle('active',state.wireframe);$('wireframe').setAttribute('aria-pressed',String(state.wireframe));};
 document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{state.white=b.dataset.finish==='white';duo.finish(state.white);document.querySelectorAll('[data-finish]').forEach(x=>x.classList.toggle('active',x===b));document.querySelector('.finish-name').textContent=state.white?'Star White':'Night Sky';});
 $('partsToggle').onclick=()=>{const open=document.querySelector('.parts-panel').classList.toggle('open');$('partsToggle').setAttribute('aria-expanded',String(open));if(open)document.body.classList.remove('inspect-open');requestFrame();};$('immersive').onclick=()=>document.body.classList.toggle('immersive');$('exploreNav').onclick=()=>document.body.classList.remove('immersive');
 $('moreControls').onclick=()=>{const open=document.body.classList.toggle('tools-open');$('moreControls').setAttribute('aria-expanded',String(open));};
 $('detailMore').onclick=()=>{const open=document.querySelector('.detail-panel').classList.toggle('expanded');$('detailMore').setAttribute('aria-expanded',String(open));$('detailMore').textContent=open?'收起':'详情';};
 $('fullscreen').onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{toast('浏览器不支持全屏，可使用沉浸模式。');}};
 $('screenshot').onclick=()=>{studio.render();const a=document.createElement('a');a.download='duo-inside-studio.png';a.href=renderer.domElement.toDataURL('image/png');a.click();toast('三维画面已保存');};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),canvas=renderer.domElement;let down=null;
 function hit(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(duo.pickables,false).find(h=>{let n=h.object;while(n){if(!n.visible)return false;n=n.parent;}return true;});}
 canvas.onpointerdown=e=>{if(e.button===0)down=[e.clientX,e.clientY,performance.now()];};canvas.onpointerup=e=>{if(!down)return;const d=down;down=null;if(Math.hypot(e.clientX-d[0],e.clientY-d[1])>5||performance.now()-d[2]>800)return;const h=hit(e);if(h)select(h.object.userData.partId,true,h.object.userData.partId==='screws'?h.object.userData.partNode:null);};canvas.onpointermove=e=>{if(e.buttons)return;const h=hit(e);state.hover=h?.object.userData.partId??null;canvas.style.cursor=h?'pointer':'grab';};canvas.onpointerleave=()=>{state.hover=null;down=null;};canvas.onpointercancel=()=>down=null;
 document.onkeydown=e=>{if(e.target instanceof HTMLInputElement||document.querySelector('dialog[open]'))return;const k=e.key.toLowerCase();if(k==='r')requestFrame();if(k==='l')$('toggleLabels').click();if(k==='w')$('wireframe').click();if(k===' '){e.preventDefault();$('playSequence').click();}if(k==='/'){e.preventDefault();document.querySelector('.parts-panel').classList.add('open');$('partsToggle').setAttribute('aria-expanded','true');$('partSearch').focus();}if(k==='escape'){leaveIsolation();document.querySelector('.parts-panel').classList.remove('open');document.body.classList.remove('immersive','inspect-open','tools-open');$('partsToggle').setAttribute('aria-expanded','false');requestFrame();}};
}
function setGestureMode(mode){gestureMode=mode;gestureControlling=false;gestureInterpreter?.reset();document.querySelectorAll('[data-gesture-mode]').forEach(b=>{const active=b.dataset.gestureMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});if($('gestureInstruction'))$('gestureInstruction').textContent=mode==='fold'?'单手左右移动':mode==='explode'?'双手靠近后拉开':'单手旋转 · 双手缩放';hud();}
function cameraControls(){
 gestureInterpreter=createGestureInterpreter();
 const gesture=createGestureControl({video:$('cameraVideo'),overlay:$('cameraOverlay'),status:$('cameraStatus'),onReset:()=>{gestureInterpreter.reset();gestureControlling=false;},onFrame:frame=>{
  if(pointerInteraction||frame.time<gestureResumeAt){gestureInterpreter.reset();return {active:false,status:'鼠标操作中'};}
  const orbit=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),result=gestureInterpreter.update(frame,gestureMode,{fold:state.fold,explode:state.explode,theta:orbit.theta,phi:orbit.phi,distance:orbit.radius});
  if(!result.active)gestureControlling=false;const action=result.action;if(!action)return result;
  if(action.kind==='fold'||action.kind==='explode'){
   if(!gestureControlling){leaveIsolation();resetManual();requestFrame();gestureControlling=true;}state.playing=false;$('playSequence').textContent='▶';
   if(action.kind==='fold'){state.target=0;state.foldTarget=action.value;state.view=action.value<100?'rear':'front';}else{state.target=action.value;state.foldTarget=180;state.view='front';}
   state.framing=true;state.userCamera=false;
   if(action.kind==='fold'&&state.explode>.02)result.status='先组装，再折叠';if(action.kind==='explode'&&state.fold<179)result.status='先展开，再拆解';
  }else{
   state.framing=false;state.userCamera=true;controls.autoRotate=false;const offset=camera.position.clone().sub(controls.target);
   if(action.kind==='zoom')camera.position.lerp(controls.target.clone().addScaledVector(offset.normalize(),THREE.MathUtils.clamp(action.distance,controls.minDistance,controls.maxDistance)),.18);
   else camera.position.lerp(controls.target.clone().add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(offset.length(),action.phi,action.theta))),.18);
  }
  return result;
 },onState:s=>{gestureActive=s==='active';$('cameraButton').classList.toggle('active',gestureActive);$('cameraButton').setAttribute('aria-pressed',String(gestureActive));$('cameraButton').disabled=s==='requesting';if(s==='stopped'){$('cameraCard').hidden=true;gestureControlling=false;}hud();}});
 document.querySelectorAll('[data-gesture-mode]').forEach(b=>b.onclick=()=>setGestureMode(b.dataset.gestureMode));setGestureMode('explode');
 $('cameraButton').onclick=()=>{if(gesture.active){$('cameraCard').hidden=!$('cameraCard').hidden;return;}$('cameraCard').hidden=false;gesture.start();};$('stopCamera').onclick=()=>gesture.stop();$('calibrateCamera').onclick=()=>gesture.active?gesture.calibrate():gesture.start();
}
try{init();}catch(e){console.error(e);$('loading').hidden=false;$('loading').querySelector('p').textContent='渲染未能启动';$('loading').querySelector('small').textContent='请使用开启硬件加速的 WebGL 2 浏览器。';}
