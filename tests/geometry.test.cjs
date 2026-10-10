const assert=require('node:assert/strict');
require('../geometry.js');
const {measure}=globalThis.WatermarkGeometry;
const ctx={font:'',measureText(text){return{width:text.length*parseFloat(this.font.split(' ')[1])*.6};}};
const base={mode:'text',text:'Watermark\n第二行',font:'sans-serif',size:5,angle:0,spacing:4,position:'custom',x:36,y:43};
const logo={naturalWidth:200,naturalHeight:100};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const mode of ['text','logo'])for(const angle of [-90,-35,0,48,90]){
  const s={...base,mode,angle};
  const preview=measure(ctx,1000,700,s,logo),output=measure(ctx,8000,5600,s,logo);
  for(const key of ['bw','bh','rw','rh','cx','cy','fontSize'])close(preview[key]*8,output[key]);
  close(output.x,36);close(output.y,43);
  for(const [w,h] of [[500,3000],[3000,500],[800,800]])for(const x of [-100,0,50,100,200])for(const y of [-100,0,50,100,200])for(const size of [20,50,100])for(const spacing of [0,4,20]){
    const g=measure(ctx,w,h,{...s,x,y,size,spacing},logo),margin=Math.min(w,h)*spacing/100;
    assert.ok(g.cx-g.rw/2>=margin-1e-7&&g.cx+g.rw/2<=w-margin+1e-7);
    assert.ok(g.cy-g.rh/2>=margin-1e-7&&g.cy+g.rh/2<=h-margin+1e-7);
  }
}
for(const position of ['tl','tc','tr','ml','mc','mr','bl','bc','br']){
  const g=measure(ctx,800,600,{...base,position},logo);
  const [v,h]=position;
  if(h==='l')close(g.cx-g.rw/2,24);if(h==='c')close(g.cx,400);if(h==='r')close(g.cx+g.rw/2,776);
  if(v==='t')close(g.cy-g.rh/2,24);if(v==='m')close(g.cy,300);if(v==='b')close(g.cy+g.rh/2,576);
}
assert.equal(measure(ctx,800,600,{...base,text:'  '},null),null);
assert.equal(measure(ctx,800,600,{...base,mode:'logo'},null),null);
for(const position of ['tl','tr','bl','br']){
  const g=measure(ctx,800,600,{...base,mode:'logo',size:50,spacing:0,position},{width:200,height:100});
  close(g.bw,300);close(g.bh,150);
  close(position[1]==='l'?g.cx-g.rw/2:g.cx+g.rw/2,position[1]==='l'?0:800);
  close(position[0]==='t'?g.cy-g.rh/2:g.cy+g.rh/2,position[0]==='t'?0:600);
}
const {alphaBounds}=globalThis.WatermarkGeometry;
const pixels=new Uint8ClampedArray(300*200*4);
assert.equal(alphaBounds(pixels,300,200),null);
for(let y=30;y<130;y++)for(let x=50;x<250;x++)pixels[(y*300+x)*4+3]=255;
assert.deepEqual(alphaBounds(pixels,300,200),{x:50,y:30,width:200,height:100});
pixels[3]=1;
assert.deepEqual(alphaBounds(pixels,300,200),{x:0,y:0,width:250,height:130});
console.log('PASS: preview/export scaling, 100% size, rotated bounds, flush corners, nine presets, transparent logo bounds');
