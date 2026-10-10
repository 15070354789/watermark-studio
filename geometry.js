/* Shared by preview, dragging and full-resolution export. Coordinates are percentages. */
(function(root){
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function measure(ctx,w,h,s,mark){
    const short=Math.min(w,h),unit=short*s.size/100,lines=s.text.split('\n');
    let bw,bh,fontSize=unit;
    if(s.mode==='logo'){
      if(!mark)return null;
      bw=unit;bh=bw*(mark.naturalHeight||mark.height)/(mark.naturalWidth||mark.width);
    }else{
      if(!s.text.trim())return null;
      ctx.font=`600 ${fontSize}px ${s.font}`;
      bw=Math.max(...lines.map(line=>ctx.measureText(line).width),1);
      bh=fontSize*1.28*lines.length;
    }
    const angle=s.angle*Math.PI/180,cos=Math.abs(Math.cos(angle)),sin=Math.abs(Math.sin(angle));
    let rw=bw*cos+bh*sin,rh=bw*sin+bh*cos;
    const margin=s.tile?0:short*s.spacing/100,fit=Math.min(1,(w-2*margin)/rw,(h-2*margin)/rh);
    bw*=fit;bh*=fit;fontSize*=fit;rw*=fit;rh*=fit;
    let cx,cy;
    if(s.position==='custom'){
      cx=clamp(w*s.x/100,margin+rw/2,w-margin-rw/2);
      cy=clamp(h*s.y/100,margin+rh/2,h-margin-rh/2);
    }else{
      const [vertical,horizontal]=s.position;
      cx=horizontal==='l'?margin+rw/2:horizontal==='r'?w-margin-rw/2:w/2;
      cy=vertical==='t'?margin+rh/2:vertical==='b'?h-margin-rh/2:h/2;
    }
    return{bw,bh,fontSize,rw,rh,cx,cy,angle,short,lines,x:cx/w*100,y:cy/h*100};
  }
  function alphaBounds(data,width,height){
    let left=width,top=height,right=-1,bottom=-1;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      if(data[(y*width+x)*4+3]===0)continue;
      if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
    }
    return right<0?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
  }
  function tilePoints(w,h,s,g){
    const diagonal=s.tileStyle==='diagonal',rotation=diagonal?g.angle:0,cos=Math.cos(rotation),sin=Math.sin(rotation);
    const gap=g.short*s.spacing/100,minStep=s.mode==='logo'?1:g.fontSize*2,dx=Math.max((diagonal?g.bw:g.rw)+gap,minStep),dy=Math.max((diagonal?g.bh:g.rh)+gap,minStep);
    // Transform image corners into lattice coordinates to cover every edge.
    const corners=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>({x:(x-w/2)*cos+(y-h/2)*sin,y:-(x-w/2)*sin+(y-h/2)*cos}));
    const left=Math.min(...corners.map(p=>p.x))-dx,right=Math.max(...corners.map(p=>p.x))+dx,top=Math.min(...corners.map(p=>p.y))-dy,bottom=Math.max(...corners.map(p=>p.y))+dy;
    const points=[];
    for(let row=Math.floor(top/dy);row<=Math.ceil(bottom/dy);row++)for(let col=Math.floor(left/dx);col<=Math.ceil(right/dx);col++){
      const x=(col+(Math.abs(row)%2)*.5)*dx,y=row*dy;
      points.push({x:w/2+x*cos-y*sin,y:h/2+x*sin+y*cos});
    }
    return points;
  }
  root.WatermarkGeometry={measure,clamp,alphaBounds,tilePoints};
})(typeof window!=='undefined'?window:globalThis);
