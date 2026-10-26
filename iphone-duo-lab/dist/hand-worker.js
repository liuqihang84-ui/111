// Classic Worker: dynamic module import keeps importScripts available to the WASM loader.
let detector=null;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{
   const {HandLandmarker,FilesetResolver}=await import('./vendor/vision/vision_bundle.mjs');
   const assets=await FilesetResolver.forVisionTasks(new URL('./vendor/vision/wasm',self.location.href).href);
   detector=await HandLandmarker.createFromOptions(assets,{baseOptions:{modelAssetPath:new URL('./vendor/vision/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.65,minHandPresenceConfidence:.65,minTrackingConfidence:.6});
   self.postMessage({type:'ready'});
  }catch(error){self.postMessage({type:'error',message:String(error)});}return;
 }
 if(data.type==='frame'){
  try{const result=detector.detectForVideo(data.bitmap,data.time);self.postMessage({type:'result',time:data.time,landmarks:result.landmarks[0]||null});}
  catch(error){self.postMessage({type:'error',message:String(error)});}
  finally{data.bitmap.close();}
 }
};
