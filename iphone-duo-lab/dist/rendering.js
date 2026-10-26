import * as THREE from 'three';
// Small three-pass HDR bloom pipeline using Three.js only.
export function createStudio(renderer,scene,camera){
 renderer.toneMapping=THREE.NoToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.HemisphereLight('#dbe4fa','#16171e',.72));
 const key=new THREE.DirectionalLight('#fff9ef',3.8);key.position.set(-8,13,17);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-18;key.shadow.camera.right=18;key.shadow.camera.top=18;key.shadow.camera.bottom=-18;key.shadow.normalBias=.04;key.shadow.radius=4;scene.add(key);
 for(const [color,intensity,x,y,z]of [['#dce8ff',1.3,12,3,-9],['#fff5e8',3.0,-8,10,-15],['#ffffff',1.8,9,-5,13],['#f2d9c0',1.0,-12,1,-6]]){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);}
 const studio=new THREE.Scene();studio.background=new THREE.Color('#101218');
 for(const [x,y,z,w,h,power,color]of [[-8,3,4,3,16,4,'#e4edff'],[7,6,0,2,18,7,'#ffffff'],[0,9,4,11,6,6,'#fff7ed'],[0,-6,6,10,2,2,'#a8c8ef']]){const m=new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(power),side:THREE.DoubleSide});const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);}
 const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromScene(studio,.015,.1,100);scene.environment=env.texture;scene.environmentIntensity=.7;pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:'#020307',metalness:0,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-8.1;ground.visible=false;scene.add(ground);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=256;const cx=shadowCanvas.getContext('2d'),gr=cx.createRadialGradient(128,128,5,128,128,128);gr.addColorStop(0,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=gr;cx.fillRect(0,0,256,256);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(25,15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,opacity:.8}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-8.07;scene.add(shadow);
 const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});rt.samples=4;const blurA=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:false}),blurB=blurA.clone();
 const quadScene=new THREE.Scene(),quadCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),null);quadScene.add(quad);
 const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
 const bright=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;void main(){vec3 c=texture2D(image,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(1.1,2.5,l),1.);}',uniforms:{image:{value:rt.texture}}});
 const blur=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;void main(){vec3 c=texture2D(image,vUv).rgb*.227027;c+=(texture2D(image,vUv+direction*1.384615).rgb+texture2D(image,vUv-direction*1.384615).rgb)*.316216;c+=(texture2D(image,vUv+direction*3.230769).rgb+texture2D(image,vUv-direction*3.230769).rgb)*.070270;gl_FragColor=vec4(c,1.);}',uniforms:{image:{value:blurA.texture},direction:{value:new THREE.Vector2()}}});
 const composite=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform sampler2D bloom;uniform float exposure;void main(){vec3 c=(texture2D(image,vUv).rgb+texture2D(bloom,vUv).rgb*.15)*exposure;c=clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);c=mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));vec2 p=vUv-.5;c*=1.-.18*dot(p,p);gl_FragColor=vec4(c,1.);}',uniforms:{image:{value:rt.texture},bloom:{value:blurA.texture},exposure:{value:1.05}}});
 let bw=1,bh=1;
 function resize(w,h){rt.setSize(w,h);bw=Math.max(1,Math.floor(w/4));bh=Math.max(1,Math.floor(h/4));blurA.setSize(bw,bh);blurB.setSize(bw,bh);}
 function draw(mat,target){quad.material=mat;renderer.setRenderTarget(target);renderer.render(quadScene,quadCam);}
 function render(){renderer.setRenderTarget(rt);renderer.render(scene,camera);draw(bright,blurA);blur.uniforms.image.value=blurA.texture;blur.uniforms.direction.value.set(1/bw,0);draw(blur,blurB);blur.uniforms.image.value=blurB.texture;blur.uniforms.direction.value.set(0,1/bh);draw(blur,blurA);draw(composite,null);}
 return {render,resize,shadow,ground};
}
