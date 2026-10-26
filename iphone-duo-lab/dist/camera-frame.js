// Canvas pixels work on mobile browsers that cannot create/transfer ImageBitmap(video).
export function createFrameReader({canvas=document.createElement('canvas'),maxSize=480}={}){
 const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});
 return source=>{
  const sourceWidth=source.videoWidth||source.width,sourceHeight=source.videoHeight||source.height;
  if(!sourceWidth||!sourceHeight)throw new Error('Camera frame is not ready');
  const ratio=Math.min(1,maxSize/Math.max(sourceWidth,sourceHeight)),width=Math.max(2,Math.round(sourceWidth*ratio)),height=Math.max(2,Math.round(sourceHeight*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.drawImage(source,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data;
  return {pixels:pixels.buffer,width,height};
 };
}
