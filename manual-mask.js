/* Manual protection belongs to each image. Store normalized strokes, not full-size bitmaps. */
(function(root){
  const entries=new Map(),cache=new Map();
  function begin(key,width,height,base){
    if(entries.has(key))return entries.get(key);
    const ratio=Math.min(1,1024/Math.max(width,height));
    const entry={width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),strokes:[],base:null};
    if(base){entry.width=base.width;entry.height=base.height;const pixels=base.getContext('2d').getImageData(0,0,base.width,base.height).data;entry.base=new Uint8Array(base.width*base.height);for(let i=0;i<entry.base.length;i++)entry.base[i]=pixels[i*4+3];}
    entries.set(key,entry);return entry;
  }
  function invalidate(key){cache.delete(key);}
  function add(key,stroke){entries.get(key).strokes.push(stroke);invalidate(key);}
  function undo(key){const e=entries.get(key);if(e)e.strokes.pop();invalidate(key);}
  function clear(key){add(key,{kind:'clear'});}
  function remove(key){entries.delete(key);invalidate(key);}
  function render(key){
    if(cache.has(key)){const canvas=cache.get(key);cache.delete(key);cache.set(key,canvas);return canvas;}
    const e=entries.get(key);if(!e)return null;
    const c=document.createElement('canvas');c.width=e.width;c.height=e.height;const ctx=c.getContext('2d');
    if(e.base){const image=ctx.createImageData(c.width,c.height);for(let i=0;i<e.base.length;i++)image.data[i*4+3]=e.base[i];ctx.putImageData(image,0,0);}
    for(const s of e.strokes){
      if(s.kind==='clear'){ctx.clearRect(0,0,c.width,c.height);continue;}
      ctx.save();ctx.globalCompositeOperation=s.kind==='erase'?'destination-out':'source-over';ctx.fillStyle='#000';ctx.strokeStyle='#000';
      const p=s.points[0],q=s.points[s.points.length-1];
      if(s.kind==='rect')ctx.fillRect(Math.min(p.x,q.x)*c.width,Math.min(p.y,q.y)*c.height,Math.abs(q.x-p.x)*c.width,Math.abs(q.y-p.y)*c.height);
      else{
        const radius=Math.min(c.width,c.height)*s.radius/100;
        ctx.lineWidth=radius*2;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p.x*c.width,p.y*c.height);
        for(const point of s.points.slice(1))ctx.lineTo(point.x*c.width,point.y*c.height);
        ctx.stroke();ctx.beginPath();ctx.arc(p.x*c.width,p.y*c.height,radius,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    cache.set(key,c);while(cache.size>8)cache.delete(cache.keys().next().value);return c;
  }
  function hasArea(key){const c=render(key);if(!c)return false;return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);}
  function cloneEntry(e){return{...e,base:e.base?.slice()||null,strokes:e.strokes.map(s=>({...s,points:s.points?.map(p=>({...p}))}))};}
  function snapshot(key){return entries.has(key)?cloneEntry(entries.get(key)):null;}
  function restore(key,entry){entry?entries.set(key,cloneEntry(entry)):entries.delete(key);invalidate(key);}
  root.ManualMask={begin,add,undo,clear,remove,render,hasArea,invalidate,snapshot,restore,has:key=>entries.has(key)};
})(globalThis);
