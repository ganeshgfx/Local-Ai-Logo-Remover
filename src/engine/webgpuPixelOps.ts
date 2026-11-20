const RESTORE_SHADER = `
@group(0) @binding(0) var<storage, read> watermarked: array<f32>;
@group(0) @binding(1) var<storage, read> alphaMap: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

struct Params {
  width: u32,
  height: u32,
  roiX: u32,
  roiY: u32,
  roiW: u32,
  roiH: u32,
}
@group(0) @binding(3) var<uniform> params: Params;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= params.roiW || gid.y >= params.roiH) { return; }
  
  let roiIdx = gid.y * params.roiW + gid.x;
  let frameX = params.roiX + gid.x;
  let frameY = params.roiY + gid.y;
  let frameIdx = (frameY * params.width + frameX) * 4u;
  
  let r = watermarked[frameIdx + 0u];
  let g = watermarked[frameIdx + 1u];
  let b = watermarked[frameIdx + 2u];
  
  let alpha_raw = alphaMap[roiIdx];
  let alpha = clamp(alpha_raw - 3.0/255.0, 0.0, 0.99);
  
  var rr: f32; var rg: f32; var rb: f32;
  if (alpha < 0.001) {
    rr = r; rg = g; rb = b;
  } else {
    // White diamond: logo=1.0
    rr = clamp((r - alpha) / (1.0 - alpha), 0.0, 1.0);
    rg = clamp((g - alpha) / (1.0 - alpha), 0.0, 1.0);
    rb = clamp((b - alpha) / (1.0 - alpha), 0.0, 1.0);
  }
  
  output[frameIdx + 0u] = rr;
  output[frameIdx + 1u] = rg;
  output[frameIdx + 2u] = rb;
  output[frameIdx + 3u] = watermarked[frameIdx + 3u];
}
`;

let gpuDevice: GPUDevice | null = null;
let pipeline: GPUComputePipeline | null = null;

export async function initGPUPixelOps(): Promise<boolean> {
  try {
    if (!('gpu' in navigator)) return false;
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) return false;
    gpuDevice = await adapter.requestDevice();
    if (!gpuDevice) return false;
    
    const module = gpuDevice.createShaderModule({ code: RESTORE_SHADER });
    pipeline = gpuDevice.createComputePipeline({
      layout: 'auto',
      compute: { module, entryPoint: 'main' },
    });
    return true;
  } catch {
    return false;
  }
}

export function isGPUPixelOpsAvailable(): boolean {
  return gpuDevice !== null && pipeline !== null;
}

export async function restoreFrameGPU(
  frameData: Float32Array,   // RGBA float [0,1], full frame
  alphaMap: Float32Array,    // alpha values for ROI only
  frameWidth: number,
  frameHeight: number,
  roiX: number, roiY: number, roiW: number, roiH: number
): Promise<Float32Array> {
  if (!gpuDevice || !pipeline) throw new Error('GPU not initialized');
  
  const device = gpuDevice;
  const totalFloats = frameWidth * frameHeight * 4;
  const roiFloats = roiW * roiH;
  
  const watermarkedBuf = device.createBuffer({
    size: totalFloats * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const alphaBuf = device.createBuffer({
    size: roiFloats * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const outputBuf = device.createBuffer({
    size: totalFloats * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const paramsBuf = device.createBuffer({
    size: 24,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  
  device.queue.writeBuffer(watermarkedBuf, 0, frameData);
  device.queue.writeBuffer(alphaBuf, 0, alphaMap);
  
  const paramsData = new Uint32Array([frameWidth, frameHeight, roiX, roiY, roiW, roiH]);
  device.queue.writeBuffer(paramsBuf, 0, paramsData);
  
  const bg = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: watermarkedBuf } },
      { binding: 1, resource: { buffer: alphaBuf } },
      { binding: 2, resource: { buffer: outputBuf } },
      { binding: 3, resource: { buffer: paramsBuf } },
    ],
  });
  
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(Math.ceil(roiW / 8), Math.ceil(roiH / 8));
  pass.end();
  
  const readBuf = device.createBuffer({
    size: totalFloats * 4,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  encoder.copyBufferToBuffer(outputBuf, 0, readBuf, 0, totalFloats * 4);
  device.queue.submit([encoder.finish()]);
  
  await readBuf.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(readBuf.getMappedRange().slice(0));
  readBuf.unmap();
  
  // Cleanup
  watermarkedBuf.destroy();
  alphaBuf.destroy();
  outputBuf.destroy();
  paramsBuf.destroy();
  readBuf.destroy();
  
  return result;
}
