/* Local segmentation, shared by preview and export. Retain at most eight masks. */
(function(root){
  let worker,nextId=1;
  const pending=new Map(),cache=new Map(),inflight=new Map();
  function stop(message){if(worker)worker.terminate();worker=null;for(const request of pending.values()){clearTimeout(request.timer);request.reject(new Error(message));}pending.clear();}
  function getWorker(){
    if(!worker){
      worker=new Worker(new URL('subject-worker.js?v=9',document.baseURI),{type:'module'});
      worker.onerror=()=>stop('识别模型无法加载，可检查网络重试或手动标记主体');
      worker.onmessage=({data:r})=>{const p=pending.get(r.id);if(!p)return;if(r.status==='progress'){p.onProgress?.(r.message);return;}clearTimeout(p.timer);pending.delete(r.id);r.status==='done'?p.resolve(r):p.reject(new Error('自动识别失败，可手动标记主体：'+r.message));};
    }
    return worker;
  }
  async function identify(key,source,onProgress){
    if(cache.has(key)){const result=cache.get(key);cache.delete(key);cache.set(key,result);return result;}
    if(inflight.has(key))return inflight.get(key);
    const promise=(async()=>{
      const ratio=Math.min(1,1024/Math.max(source.naturalWidth||source.width,source.naturalHeight||source.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((source.naturalWidth||source.width)*ratio));canvas.height=Math.max(1,Math.round((source.naturalHeight||source.height)*ratio));
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      const id=nextId++,w=getWorker();
      onProgress?.('首次下载识别模型约 44 MB；图片不会上传');
      const result=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>stop('识别超时，请检查网络后重试'),300000);
        pending.set(id,{resolve,reject,timer,onProgress});w.postMessage({id,data:pixels.data.buffer,width:canvas.width,height:canvas.height},[pixels.data.buffer]);
        canvas.width=canvas.height=1;
      });
      const alpha=new Uint8Array(result.data),mask=document.createElement('canvas');mask.width=result.width;mask.height=result.height;
      const mc=mask.getContext('2d'),image=mc.createImageData(mask.width,mask.height);
      let count=0;
      for(let i=0;i<alpha.length;i++){const a=alpha[i]>=80?255:0;image.data[i*4+3]=a;count+=a>0;}
      if(count<alpha.length*.001)throw new Error('未识别到主体，可重试或手动标记主体');
      mc.putImageData(image,0,0);
      // Expand the protected contour slightly so antialiased marks do not touch it.
      const expanded=document.createElement('canvas');expanded.width=mask.width;expanded.height=mask.height;
      const ec=expanded.getContext('2d');for(const [x,y] of [[0,0],[-2,0],[2,0],[0,-2],[0,2],[-1,-1],[1,-1],[-1,1],[1,1]])ec.drawImage(mask,x,y);
      cache.set(key,expanded);while(cache.size>8)cache.delete(cache.keys().next().value);
      return expanded;
    })();
    inflight.set(key,promise);try{return await promise;}finally{inflight.delete(key);}
  }
  function forget(key){cache.delete(key);}
  root.SubjectProtection={identify,forget,peek:key=>cache.get(key)||null};
})(globalThis);
