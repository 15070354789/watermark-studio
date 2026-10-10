/* Dependency-free ZIP writer. Stored entries, UTF-8 names, standard CRC-32. */
(function(root){
  const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c>>>0;}
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function header(length){const bytes=new Uint8Array(length);return{bytes,view:new DataView(bytes.buffer)};}
  async function makeZip(entries){
    const parts=[],central=[];let offset=0,centralSize=0;const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),date=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    for(const entry of entries){const name=new TextEncoder().encode(entry.name),data=new Uint8Array(await entry.blob.arrayBuffer()),crc=crc32(data),local=header(30+name.length),v=local.view;
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(10,time,true);v.setUint16(12,date,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.bytes.set(name,30);
      const c=header(46+name.length),cv=c.view;cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(12,time,true);cv.setUint16(14,date,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.bytes.set(name,46);central.push(c.bytes);centralSize+=c.bytes.length;parts.push(local.bytes,data);offset+=local.bytes.length+data.length;
    }
    const end=header(22),ev=end.view;ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
    return new Blob([...parts,...central,end.bytes],{type:'application/zip'});
  }
  root.WatermarkZip={makeZip,crc32};
})(typeof window!=='undefined'?window:globalThis);
