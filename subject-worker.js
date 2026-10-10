// All image pixels stay in this worker. Only public model assets are downloaded.
let segmenter;
let queue=Promise.resolve();
self.onmessage=event=>{queue=queue.then(()=>segment(event.data));};
async function segment({id,data,width,height}){
  try{
    if(!segmenter){
      const {PreTrainedModel,AutoProcessor,env,RawImage}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
      env.allowLocalModels=false;
      env.backends.onnx.wasm.numThreads=1;
      self.RawImage=RawImage;
      const model=await PreTrainedModel.from_pretrained('Ko033/isnet-general-use-onnx',{
        revision:'5349b617911fd60c619b52f32e2b593517b78df3',device:'wasm',dtype:'q8',
        progress_callback:p=>self.postMessage({id,status:'progress',message:p.status==='progress'?`下载识别模型 ${Math.round(p.progress||0)}%`:'正在准备识别模型…'})
      });
      const processor=await AutoProcessor.from_pretrained('Ko033/isnet-general-use-onnx',{revision:'5349b617911fd60c619b52f32e2b593517b78df3'});
      segmenter={model,processor};
    }
    self.postMessage({id,status:'progress',message:'正在识别主体轮廓…'});
    const image=new self.RawImage(new Uint8ClampedArray(data),width,height,4);
    const {pixel_values}=await segmenter.processor(image);
    const {output_image}=await segmenter.model({input_image:pixel_values});
    const mask=await self.RawImage.fromTensor(output_image[0].mul(255).to('uint8')).resize(width,height);
    if(!mask)throw new Error('没有返回主体轮廓');
    const alpha=new Uint8Array(mask.width*mask.height);
    for(let i=0;i<alpha.length;i++)alpha[i]=mask.data[i*mask.channels];
    self.postMessage({id,status:'done',data:alpha.buffer,width:mask.width,height:mask.height},[alpha.buffer]);
  }catch(error){self.postMessage({id,status:'error',message:typeof error==='number'?'设备内存或推理兼容性不足，请关闭其他页面后重试':error.message||String(error)});}
}
