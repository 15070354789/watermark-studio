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
    const margin=short*s.spacing/100,fit=Math.min(1,(w-2*margin)/rw,(h-2*margin)/rh);
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
  root.WatermarkGeometry={measure,clamp,alphaBounds};
})(typeof window!=='undefined'?window:globalThis);
