const assert=require('node:assert/strict');
require('../shop-batch.js');
const photos=[{name:'主图1.png'},{name:'主图2.webp'}],shops=[{name:'彩色店'},{name:'黑白店'},{name:'三号店'}];
const jobs=ShopBatch.plan(photos,shops);
assert.equal(jobs.length,6);
assert.deepEqual(jobs.map(j=>[j.file.name,j.shop.name]),[
 ['主图1.png','彩色店'],['主图1.png','黑白店'],['主图1.png','三号店'],
 ['主图2.webp','彩色店'],['主图2.webp','黑白店'],['主图2.webp','三号店']
]);
assert.equal(ShopBatch.plan(photos,shops.slice(0,1)).length,2);
assert.equal(ShopBatch.plan(photos,[]).length,0);
assert.equal(ShopBatch.name(photos[0],'image/png',shops[1],1),'主图1_02_黑白店_watermarked.png');
assert.equal(ShopBatch.name({name:'a:b.jpg'},'image/webp',{name:'店/铺'},0),'a_b_01_店_铺_watermarked.webp');
assert.deepEqual(ShopBatch.plan([photos[0]],[shops[2],shops[0]]).map(j=>j.shop.name),['三号店','彩色店']);
console.log('PASS: photo × ordered shop planning, selected-shop export and safe filenames');
