const assert=require('node:assert/strict');
require('../geometry.js');
const G=globalThis.WatermarkGeometry;
const ctx={measureText:t=>({width:t.length*20})};
const s={mode:'text',text:'印记',font:'sans-serif',size:5,angle:-30,tile:true,tileStyle:'diagonal',spacing:3,position:'br'};
const g=G.measure(ctx,800,600,s,null),points=G.tilePoints(800,600,s,g);
assert(points.some(p=>p.x<0)&&points.some(p=>p.x>800));
assert(points.some(p=>p.y<0)&&points.some(p=>p.y>600));
const doubled=G.tilePoints(1600,1200,s,{...g,bw:g.bw*2,bh:g.bh*2,rw:g.rw*2,rh:g.rh*2,fontSize:g.fontSize*2,short:g.short*2});
assert.equal(points.length,doubled.length);
points.forEach((p,i)=>{assert(Math.abs(p.x*2-doubled[i].x)<1e-8);assert(Math.abs(p.y*2-doubled[i].y)<1e-8);});
assert(Math.abs((points[1].y-points[0].y)/(points[1].x-points[0].x)-Math.tan(-Math.PI/6))<1e-8);
const straight=G.tilePoints(800,600,{...s,tileStyle:'straight'},g);
assert.equal(straight[0].y,straight[1].y);
// Tile spacing must not shrink the watermarks as a single corner margin would.
assert.equal(G.measure(ctx,800,600,{...s,spacing:0},null).bw,g.bw);
console.log('PASS: diagonal lattice, all-edge coverage, normalized preview/export positions, horizontal layout');
