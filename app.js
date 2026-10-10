'use strict';
const $=id=>document.getElementById(id);
const defaults={mode:'text',text:'© 我的作品',font:'sans-serif',color:'#ffffff',shadow:true,size:5,opacity:65,angle:0,tile:false,position:'br',x:50,y:50,spacing:0,format:'image/png',quality:.95};
let settings={...defaults},files=[],selectedId=null,nextId=1,logo=null,logoUrl=null,busy=false,loading=false,cancelled=false,previewToken=0,toastTimer;
const validTypes=new Set(['image/jpeg','image/png','image/webp']);
let previewSource=null,previewFileId=null,previewGeometry=null,drag=null;
let resultUrls=[];
try{const saved=JSON.parse(localStorage.getItem('yinji-preset')||'null');if(saved&&[1,2].includes(saved.version)){for(const k of ['text','font','color','position'])if(typeof saved[k]==='string')settings[k]=saved[k];for(const k of ['shadow','tile'])if(typeof saved[k]==='boolean')settings[k]=saved[k];for(const [k,min,max] of [['size',1,100],['opacity',5,100],['angle',-90,90],['spacing',0,20],['quality',.7,.95],['x',0,100],['y',0,100]])if(Number.isFinite(saved[k]))settings[k]=Math.max(min,Math.min(max,saved[k]));if(saved.version===2&&typeof saved.format==='string')settings.format=saved.format;settings.text=settings.text.slice(0,200);if(!/^#[\da-f]{6}$/i.test(settings.color))settings.color=defaults.color;if(!['sans-serif','serif','monospace'].includes(settings.font))settings.font=defaults.font;if(!['original',...validTypes].includes(settings.format))settings.format=defaults.format;if(!['tl','tc','tr','ml','mc','mr','bl','bc','br','custom'].includes(settings.position))settings.position='br';}}catch{}
function notify(message,error=false){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,error?6500:3500);}
function sizeLabel(bytes){return bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
function activeFile(){return files.find(f=>f.id===selectedId)||files[0];}
function canExport(){return files.length>0&&!loading&&(settings.mode==='logo'?!!logo:!!settings.text.trim());}
function updateButtons(){const ready=canExport(),zip=$('exportMethod').value==='zip';$('exportBtn').disabled=busy||!ready;$('singleBtn').disabled=busy||!ready;$('exportMethod').disabled=busy;$('exportBtn').replaceChildren(document.createTextNode(zip?'打包下载全部图片 ':'下载全部图片 '),Object.assign(document.createElement('span'),{textContent:'↓'}));$('exportHint').textContent=zip?'全部图片打包为一个 ZIP，下载后解压即可使用。':'每张图片单独保存；浏览器提示时，请允许下载多个文件。';$('clearBtn').disabled=busy||loading||!files.length;$('addBtn').disabled=busy||loading;$('fileInput').disabled=busy||loading;$('logoUpload').disabled=busy;$('savePreset').disabled=busy;$('resetBtn').disabled=busy;$('dropzone').setAttribute('aria-disabled',String(busy||loading));$('exportSummary').textContent=files.length?`${files.length} 张图片 · ${zip?'ZIP 打包下载':'直接下载，无需解压'}`:'添加图片后即可导出';updateHandle();}
function syncSettings(){
  for(const id of ['font','color','size','opacity','angle','spacing','format','quality'])$(id).value=settings[id];$('watermarkText').value=settings.text;for(const id of ['shadow','tile'])$(id).checked=settings[id];
  $('sizeValue').textContent=`${settings.size}%`;$('opacityValue').textContent=`${settings.opacity}%`;$('angleValue').textContent=`${settings.angle}°`;$('spacingValue').textContent=`${settings.spacing}%`;$('colorHex').textContent=settings.color.toUpperCase();
  $('textSettings').hidden=settings.mode!=='text';$('logoSettings').hidden=settings.mode!=='logo';for(const mode of ['text','logo']){$(`${mode}Mode`).classList.toggle('active',settings.mode===mode);$(`${mode}Mode`).setAttribute('aria-pressed',String(settings.mode===mode));}
  $('positionSettings').hidden=settings.tile;$('spacingLabel').textContent=settings.tile?'平铺间距':'边缘留白';$('sizeHint').textContent=settings.mode==='text'?'相对于图片短边，适配不同尺寸':'Logo 可见宽度为短边的 1–100%，超出画面时自动适配';$('qualityField').hidden=settings.format==='image/png';$('quality').disabled=settings.format==='image/png';
  document.querySelectorAll('[data-pos]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.pos===settings.position);btn.setAttribute('aria-pressed',String(btn.dataset.pos===settings.position));});updateButtons();renderPreview();
}
function drawDemo(){const c=document.createElement('canvas');c.width=1600;c.height=1100;const x=c.getContext('2d'),sky=x.createLinearGradient(0,0,0,1100);sky.addColorStop(0,'#bdd0bd');sky.addColorStop(.6,'#edf0dc');sky.addColorStop(1,'#8aaa8c');x.fillStyle=sky;x.fillRect(0,0,1600,1100);x.fillStyle='#f6f3cf';x.beginPath();x.arc(1100,255,82,0,Math.PI*2);x.fill();const mountain=(points,color)=>{x.fillStyle=color;x.beginPath();x.moveTo(0,1100);for(const p of points)x.lineTo(...p);x.lineTo(1600,1100);x.closePath();x.fill();};mountain([[0,670],[240,480],[445,590],[740,330],[1060,600],[1270,395],[1600,590]],'#9eb69c');mountain([[0,760],[160,610],[340,745],[610,525],[830,690],[1080,595],[1400,760],[1600,640]],'#6e927a');mountain([[0,815],[240,775],[420,865],[700,785],[930,930],[1200,885],[1460,755],[1600,800]],'#426f59');const water=x.createLinearGradient(0,850,0,1100);water.addColorStop(0,'#749b86');water.addColorStop(1,'#c2d2bb');x.fillStyle=water;x.beginPath();x.moveTo(580,800);x.bezierCurveTo(1000,870,400,1020,1200,1100);x.lineTo(1600,1100);x.bezierCurveTo(550,980,1270,915,680,800);x.fill();x.strokeStyle='#e4ead055';x.lineWidth=2;for(let i=0;i<14;i++){const y=890+i*14;x.beginPath();x.moveTo(700+(i%3)*28,y);x.lineTo(840+i*25,y);x.stroke();}const tree=(tx,ty,s)=>{x.fillStyle='#234c3d';x.fillRect(tx-s*3,ty-s*80,s*6,s*83);for(let i=0;i<3;i++){x.beginPath();x.moveTo(tx,ty-s*(150-i*35));x.lineTo(tx-s*(30+i*12),ty-s*(65-i*30));x.lineTo(tx+s*(30+i*12),ty-s*(65-i*30));x.fill();}};for(const t of [[80,1080,2.7],[260,1140,2.2],[430,1100,1.3],[1460,1160,2.8],[1310,1100,1.8]])tree(...t);x.fillStyle='#ffffffab';x.font='15px sans-serif';x.fillText('Y I N J I   /   A   Q U I E T   M O M E N T',70,76);return c;}
const demo=drawDemo();
function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('图片无法解码'));image.src=url;});}
async function loadSource(file){const image=await loadImage(file.url);if(image.naturalWidth*image.naturalHeight>40000000)throw new Error('图片超过 4000 万像素');return image;}
function drawWatermark(ctx,w,h,s,mark){
  const geometry=WatermarkGeometry.measure(ctx,w,h,s,mark);if(!geometry)return null;
  const {bw,bh,fontSize,rw,rh,angle,short,lines,cx,cy}=geometry;
  function stamp(cx,cy){ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);ctx.globalAlpha=s.opacity/100;if(s.shadow&&s.mode==='text'){ctx.shadowColor='rgba(0,0,0,.45)';ctx.shadowBlur=fontSize*.13;ctx.shadowOffsetY=fontSize*.035;}if(s.mode==='logo'){ctx.drawImage(mark,-bw/2,-bh/2,bw,bh);}else{ctx.font=`600 ${fontSize}px ${s.font}`;ctx.fillStyle=s.color;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,0,(i-(lines.length-1)/2)*fontSize*1.28));}ctx.restore();}
  if(s.tile){const gap=short*s.spacing/100,dx=Math.max(rw+gap,fontSize*2),dy=Math.max(rh+gap,fontSize*2);let row=0;for(let y=-rh/2;y<h+rh;y+=dy,row++)for(let x=-rw/2+(row%2)*dx/2;x<w+rw;x+=dx)stamp(x,y);}else stamp(cx,cy);
  return geometry;
}
async function renderPreview(){
  const token=++previewToken,file=activeFile(),fileId=file?.id??null;let source=demo;
  if(previewSource&&previewFileId===fileId)source=previewSource;
  else{previewGeometry=null;updateHandle();try{if(file)source=await loadSource(file);}catch(e){if(token===previewToken)notify(e.message,true);return;}}
  if(token!==previewToken)return;previewSource=source;previewFileId=fileId;
  const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height,ratio=Math.min(1,1400/Math.max(w,h)),canvas=$('preview');
  canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0,canvas.width,canvas.height);
  previewGeometry=$('compare').checked?null:drawWatermark(ctx,canvas.width,canvas.height,settings,logo);
  $('previewName').textContent=file?file.name:'示例图片';$('dimensions').textContent=`${w} × ${h} px`;$('demoLabel').hidden=!!file;updateHandle();
}
function updateHandle(){
  const handle=$('watermarkHandle'),canvas=$('preview'),g=previewGeometry;
  const disabled=busy||loading||settings.tile||$('compare').checked||!g;
  handle.hidden=disabled;
  $('positionX').disabled=busy||loading||!g;$('positionY').disabled=busy||loading||!g;
  $('positionStatus').textContent=settings.position==='custom'?'自由位置':'快捷位置';
  if(g){if(document.activeElement!==$('positionX'))$('positionX').value=g.x.toFixed(1);if(document.activeElement!==$('positionY'))$('positionY').value=g.y.toFixed(1);}
  $('dragHint').textContent=settings.tile?'全图平铺已开启；关闭后可自由拖动单个水印。':$('compare').checked?'正在查看原图；关闭「查看原图」后可拖动水印。':settings.mode==='logo'&&!logo?'上传 Logo 后，即可在预览图中自由拖动。':'拖动预览图中的水印；位置会按比例应用到所有图片。';
  if(disabled)return;
  const rect=canvas.getBoundingClientRect(),stage=canvas.parentElement.getBoundingClientRect(),width=Math.max(24,g.rw*rect.width/canvas.width),height=Math.max(24,g.rh*rect.height/canvas.height);
  handle.style.width=`${width}px`;handle.style.height=`${height}px`;
  handle.style.left=`${rect.left-stage.left+g.cx/canvas.width*rect.width-width/2}px`;
  handle.style.top=`${rect.top-stage.top+g.cy/canvas.height*rect.height-height/2}px`;
  handle.setAttribute('aria-label',`拖动水印，水平 ${g.x.toFixed(1)}%，垂直 ${g.y.toFixed(1)}%；方向键微调位置`);
}
function moveWatermark(x,y){
  if(busy||loading||settings.tile||$('compare').checked||!previewGeometry)return;
  const canvas=$('preview'),next={...settings,position:'custom',x:WatermarkGeometry.clamp(x,0,100),y:WatermarkGeometry.clamp(y,0,100)},g=WatermarkGeometry.measure(canvas.getContext('2d'),canvas.width,canvas.height,next,logo);
  if(!g)return;settings.position='custom';settings.x=g.x;settings.y=g.y;
  document.querySelectorAll('[data-pos]').forEach(btn=>{btn.classList.remove('active');btn.setAttribute('aria-pressed','false');});renderPreview();
}
const handle=$('watermarkHandle');
handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||busy||loading||!previewGeometry||settings.tile||$('compare').checked)return;
  e.preventDefault();handle.focus({preventScroll:true});
  drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:previewGeometry.x,y:previewGeometry.y,original:{position:settings.position,x:settings.x,y:settings.y}};
  handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');
});
handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const rect=$('preview').getBoundingClientRect();moveWatermark(drag.x+(e.clientX-drag.startX)/rect.width*100,drag.y+(e.clientY-drag.startY)/rect.height*100);});
function finishDrag(e){if(!drag||drag.id!==e.pointerId)return;if(e.type==='pointercancel'){Object.assign(settings,drag.original);syncSettings();}drag=null;handle.classList.remove('dragging');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);}
handle.addEventListener('pointerup',finishDrag);handle.addEventListener('pointercancel',finishDrag);handle.addEventListener('lostpointercapture',()=>{drag=null;handle.classList.remove('dragging');});
handle.addEventListener('keydown',e=>{if(!previewGeometry)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta)return;e.preventDefault();const step=e.shiftKey?5:1;moveWatermark(previewGeometry.x+delta[0]*step,previewGeometry.y+delta[1]*step);});
for(const [id,axis] of [['positionX','x'],['positionY','y']]){
  const applyPositionInput=e=>{const value=$(id).valueAsNumber;if(Number.isFinite(value)&&previewGeometry)moveWatermark(axis==='x'?value:previewGeometry.x,axis==='y'?value:previewGeometry.y);if(e.type==='change'&&previewGeometry)$(id).value=previewGeometry[axis].toFixed(1);};
  $(id).addEventListener('input',applyPositionInput);$(id).addEventListener('change',applyPositionInput);
}
new ResizeObserver(updateHandle).observe($('preview'));
function renderFileList(){const list=$('fileList');list.replaceChildren();if(!files.length){const empty=document.createElement('div');empty.className='empty-list';empty.innerHTML='<span>▧</span><p>你的作品会出现在这里</p><small>添加图片后，点击缩略图切换预览</small>';list.append(empty);}for(const f of files){const row=document.createElement('div');row.className=`file-row${f.id===selectedId?' selected':''}`;row.tabIndex=0;row.setAttribute('role','button');row.setAttribute('aria-label',`预览 ${f.name}`);row.setAttribute('aria-pressed',String(f.id===selectedId));const img=document.createElement('img');img.src=f.thumbUrl;img.alt='';const meta=document.createElement('div');meta.className='file-meta';const name=document.createElement('strong');name.textContent=f.name;name.title=f.name;const detail=document.createElement('small');detail.textContent=`${f.width} × ${f.height} · ${sizeLabel(f.size)}`;meta.append(name,detail);const remove=document.createElement('button');remove.className='remove-file';remove.textContent='×';remove.setAttribute('aria-label',`移除 ${f.name}`);remove.disabled=busy||loading;remove.onclick=e=>{e.stopPropagation();removeFile(f.id);};row.append(img,meta,remove);const choose=()=>{selectedId=f.id;renderFileList();renderPreview();};row.onclick=choose;row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose();}};list.append(row);}$('countBadge').textContent=files.length;$('totalSize').textContent=files.length?`${files.length} 张 · ${sizeLabel(files.reduce((n,f)=>n+f.size,0))}`:'尚未添加图片';updateButtons();}
function releaseFile(f){URL.revokeObjectURL(f.url);URL.revokeObjectURL(f.thumbUrl);}
function removeFile(id){if(busy||loading)return;const f=files.find(f=>f.id===id);if(f)releaseFile(f);files=files.filter(f=>f.id!==id);if(selectedId===id)selectedId=files[0]?.id??null;renderFileList();renderPreview();}
async function addFiles(incoming){if(busy||loading)return;loading=true;updateButtons();let added=0,rejected=0;const reasons=new Set();for(const file of incoming){if(files.length>=100){rejected++;reasons.add('最多添加 100 张');continue;}if(!validTypes.has(file.type)){rejected++;reasons.add('仅支持 JPG、PNG、WebP');continue;}if(files.reduce((n,f)=>n+f.size,0)+file.size>200*1024*1024){rejected++;reasons.add('图片总大小不能超过 200 MB');continue;}if(files.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified)){rejected++;reasons.add('重复图片已跳过');continue;}const url=URL.createObjectURL(file);try{const image=await loadImage(url);if(image.naturalWidth*image.naturalHeight>40000000)throw new Error('单张图片不能超过 4000 万像素');const thumb=document.createElement('canvas'),scale=Math.min(1,100/Math.max(image.naturalWidth,image.naturalHeight));thumb.width=Math.max(1,Math.round(image.naturalWidth*scale));thumb.height=Math.max(1,Math.round(image.naturalHeight*scale));thumb.getContext('2d').drawImage(image,0,0,thumb.width,thumb.height);const thumbBlob=await new Promise(r=>thumb.toBlob(r,'image/png'));if(!thumbBlob)throw new Error('缩略图生成失败');files.push({id:nextId++,name:file.name,size:file.size,lastModified:file.lastModified,type:file.type,url,thumbUrl:URL.createObjectURL(thumbBlob),width:image.naturalWidth,height:image.naturalHeight});added++;if(selectedId===null)selectedId=files[0].id;image.src='';}catch(e){URL.revokeObjectURL(url);rejected++;reasons.add(e.message);}renderFileList();}loading=false;$('fileInput').value='';renderFileList();renderPreview();notify(`已添加 ${added} 张图片${rejected?`；跳过 ${rejected} 张：${[...reasons].join('，')}`:''}`,added===0&&rejected>0);}
async function addLogo(file){
  if(!file||busy)return;
  if(!validTypes.has(file.type)){notify('请选择 PNG、JPG 或 WebP Logo',true);return;}
  if(file.size>10*1024*1024){notify('Logo 不能超过 10 MB',true);return;}
  let url=URL.createObjectURL(file);
  try{
    const image=await loadImage(url);
    if(image.naturalWidth*image.naturalHeight>20000000)throw new Error('Logo 不能超过 2000 万像素');
    const prepared=trimLogo(image);
    if(prepared.trimmed){
      const blob=await toBlob(prepared.image,'image/png',1);
      URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
    }
    if(logoUrl)URL.revokeObjectURL(logoUrl);logo=prepared.image;logoUrl=url;
    const thumb=document.createElement('img');thumb.src=url;thumb.alt='当前 Logo';
    const name=document.createElement('span');name.textContent=file.name;
    $('logoInfo').replaceChildren(thumb,name);
    if(prepared.trimmed){const note=document.createElement('small');note.textContent='已自动去除透明边距，按可见图案定位';note.style.display='block';note.style.marginTop='6px';$('logoInfo').append(note);}
    settings.mode='logo';if(settings.size===5)settings.size=15;syncSettings();
    notify(prepared.trimmed?'Logo 已添加，透明边距已去除':'Logo 已添加');
  }catch(e){URL.revokeObjectURL(url);notify(e.message,true);}
  $('logoInput').value='';
}
function trimLogo(image){
  const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const bounds=WatermarkGeometry.alphaBounds(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
  if(!bounds){canvas.width=1;canvas.height=1;throw new Error('Logo 完全透明，请选择有可见内容的图片');}
  if(bounds.width===canvas.width&&bounds.height===canvas.height){canvas.width=1;canvas.height=1;return{image,trimmed:false};}
  const cropped=document.createElement('canvas');cropped.width=bounds.width;cropped.height=bounds.height;
  cropped.getContext('2d').drawImage(image,bounds.x,bounds.y,bounds.width,bounds.height,0,0,bounds.width,bounds.height);
  canvas.width=1;canvas.height=1;return{image:cropped,trimmed:true};
}
function toBlob(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('图片编码失败，请尝试较小的图片')),type,quality));}
async function processFile(file,s,mark){const source=await loadSource(file),canvas=document.createElement('canvas');canvas.width=source.naturalWidth;canvas.height=source.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器无法创建图片画布');const type=s.format==='original'?file.type:s.format;if(type==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.drawImage(source,0,0);drawWatermark(ctx,canvas.width,canvas.height,s,mark);try{const blob=await toBlob(canvas,type,s.quality);return{blob,type:blob.type};}finally{canvas.width=1;canvas.height=1;source.src='';}}
function outputName(file,type){const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type]||'png',base=file.name.replace(/\.[^.]+$/,'').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,150)||'image';return`${base}_watermarked.${ext}`;}
function uniqueName(name,used){const dot=name.lastIndexOf('.'),base=name.slice(0,dot),ext=name.slice(dot);let candidate=name,index=2;while(used.has(candidate.toLowerCase()))candidate=`${base}_${index++}${ext}`;used.add(candidate.toLowerCase());return candidate;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function clearDownloadResults(){resultUrls.forEach(url=>URL.revokeObjectURL(url));resultUrls=[];$('downloadList').replaceChildren();$('downloadResults').hidden=true;$('downloadResults').open=false;}
function showDownloadResults(entries){const links=entries.map(entry=>{const a=document.createElement('a');a.href=URL.createObjectURL(entry.blob);resultUrls.push(a.href);a.download=entry.name;a.textContent=`↓ ${entry.name}`;return a;});$('downloadList').replaceChildren(...links);$('downloadResultsSummary').textContent=`已生成 ${entries.length} 张图片 · 展开逐张下载`;$('downloadResults').hidden=false;return links;}
function setBusy(value){busy=value;document.querySelectorAll('.settings-scroll input,.settings-scroll textarea,.settings-scroll select,.settings-scroll button,.position-grid button').forEach(el=>el.disabled=value);$('textMode').disabled=value;$('logoMode').disabled=value;renderFileList();if(!value)syncSettings();}
async function exportImages(single=false){if(busy||!canExport())return;const s={...settings},mark=logo,batch=single?[activeFile()]:[...files],direct=!single&&$('exportMethod').value==='images';cancelled=false;if(!single)clearDownloadResults();setBusy(true);$('progressWrap').hidden=false;$('progress').value=0;$('cancelBtn').disabled=false;const entries=[],used=new Set(),failed=[];let total=0;try{for(let i=0;i<batch.length;i++){if(cancelled)break;$('progressText').textContent=`正在处理 ${i+1} / ${batch.length}：${batch[i].name}`;await new Promise(r=>setTimeout(r,0));try{const output=await processFile(batch[i],s,mark);if(total+output.blob.size>512*1024*1024)throw new Error('导出超过 512 MB，请分批处理');total+=output.blob.size;entries.push({name:uniqueName(outputName(batch[i],output.type),used),blob:output.blob});}catch(e){failed.push(`${batch[i].name}：${e.message}`);}$('progress').value=Math.round((i+1)/batch.length*90);}
  if(cancelled){notify('已取消导出，图片和设置已保留');return;}if(!entries.length)throw new Error(failed[0]||'没有可导出的图片');
  if(direct){const links=showDownloadResults(entries);let sent=0;for(const link of links){if(cancelled)break;$('progressText').textContent=`正在下载 ${sent+1} / ${links.length}：${link.download}`;link.click();sent++;$('progress').value=90+Math.round(sent/links.length*10);await new Promise(r=>setTimeout(r,350));}if(cancelled){$('downloadResults').open=true;notify(`已停止自动下载，已发起 ${sent} 张；其余图片可从列表下载`);return;}}
  else{$('progressText').textContent=single?'准备下载…':'正在打包 ZIP…';$('cancelBtn').disabled=true;await new Promise(r=>setTimeout(r,0));const blob=single?entries[0].blob:await WatermarkZip.makeZip(entries);download(blob,single?entries[0].name:`印记_水印图片_${entries.length}张.zip`);}
  $('progress').value=100;notify(failed.length?`已生成 ${entries.length} 张，${failed.length} 张失败：${failed[0]}`:direct?`已发起 ${entries.length} 张图片下载，未下载的可从列表补下`:`已生成 ${entries.length} 张水印图片，请查看浏览器下载`,!!failed.length);
  }catch(e){notify(`导出失败：${e.message}`,true);}finally{setBusy(false);$('progressWrap').hidden=true;}
}
$('exportMethod').addEventListener('change',updateButtons);
window.addEventListener('beforeunload',()=>resultUrls.forEach(url=>URL.revokeObjectURL(url)));
for(const id of ['size','opacity','angle','spacing','quality'])$(id).addEventListener('input',()=>{settings[id]=Number($(id).value);syncSettings();});for(const id of ['font','color','format'])$(id).addEventListener('input',()=>{settings[id]=$(id).value;syncSettings();});for(const id of ['shadow','tile'])$(id).addEventListener('change',()=>{settings[id]=$(id).checked;syncSettings();});$('watermarkText').addEventListener('input',()=>{settings.text=$('watermarkText').value;updateButtons();renderPreview();});for(const mode of ['text','logo'])$(`${mode}Mode`).onclick=()=>{if(busy)return;settings.mode=mode;syncSettings();};document.querySelectorAll('[data-pos]').forEach(btn=>btn.onclick=()=>{settings.position=btn.dataset.pos;syncSettings();});$('compare').onchange=renderPreview;
$('fileInput').onchange=e=>addFiles([...e.target.files]);const openPicker=()=>{if(!busy&&!loading)$('fileInput').click();};$('dropzone').onclick=openPicker;$('dropzone').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openPicker();}};$('addBtn').onclick=openPicker;for(const event of ['dragenter','dragover'])$('dropzone').addEventListener(event,e=>{e.preventDefault();if(!busy&&!loading)$('dropzone').classList.add('dragover');});for(const event of ['dragleave','drop'])$('dropzone').addEventListener(event,e=>{e.preventDefault();$('dropzone').classList.remove('dragover');});$('dropzone').addEventListener('drop',e=>addFiles([...e.dataTransfer.files]));document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>e.preventDefault());
$('clearBtn').onclick=()=>{if(busy||loading)return;files.forEach(releaseFile);files=[];selectedId=null;renderFileList();renderPreview();};$('logoUpload').onclick=()=>$('logoInput').click();$('logoInput').onchange=e=>addLogo(e.target.files[0]);$('exportBtn').onclick=()=>exportImages();$('singleBtn').onclick=()=>exportImages(true);$('cancelBtn').onclick=()=>{cancelled=true;$('cancelBtn').disabled=true;$('progressText').textContent='正在取消，等待当前图片完成…';};$('resetBtn').onclick=()=>{settings={...defaults};$('compare').checked=false;syncSettings();notify('已恢复默认设置');};$('savePreset').onclick=()=>{try{localStorage.setItem('yinji-preset',JSON.stringify({...settings,mode:'text',version:2}));notify('文字水印设置已保存；Logo 需在下次使用时重新添加');}catch{notify('浏览器未允许保存设置',true);}};
$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('gotIt').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('helpDialog').close();}});
syncSettings();renderFileList();
