'use strict';
// A photo is the outer loop: each shop receives its own untouched-source render.
globalThis.ShopBatch={
  plan(photos,shops){return photos.flatMap(file=>shops.map(shop=>({file,shop})));},
  name(file,type,shop,index){
    const clean=value=>value.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'image';
    const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[type]||'png';
    return `${clean(file.name.replace(/\.[^.]+$/,''))}_${String(index+1).padStart(2,'0')}_${clean(shop.name)}_watermarked.${ext}`;
  }
};
