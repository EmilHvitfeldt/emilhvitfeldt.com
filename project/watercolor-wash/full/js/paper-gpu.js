// Ported from the wtrclred source (ShellWatercolorPaperGpu.ts).
// Classic script (see random.js for why); uses sitePaperShader from
// paper-shader.js and the viewport helpers, loaded earlier in index.html.

/** Initializes the WebGPU paper shader and returns its cleanup hook. */
async function initializePaperShader(target) {
  const gpu = navigator.gpu;
  if (!gpu) return undefined;

  const adapter = await gpu.requestAdapter({ powerPreference: "low-power" });
  if (!adapter) return undefined;

  const device = await adapter.requestDevice();
  const context = target.paperCanvas.getContext("webgpu");
  if (!context) return undefined;
  const gpuContext = context;

  const format = gpu.getPreferredCanvasFormat();
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({ code: sitePaperShader }),
      entryPoint: "vertexMain",
    },
    fragment: {
      module: device.createShaderModule({ code: sitePaperShader }),
      entryPoint: "fragmentMain",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list",
    },
  });
  const uniformBuffer = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });

  let configured = false;
  let disposed = false;
  let paperResizeFrame = 0;

  function render() {
    if (disposed) return;

    const { cssHeight, cssWidth, height, width } = targetSize(target.maxDpr);
    if (!configured || target.paperCanvas.width !== width || target.paperCanvas.height !== height) {
      target.paperCanvas.width = width;
      target.paperCanvas.height = height;
      target.paperCanvas.style.width = `${cssWidth}px`;
      target.paperCanvas.style.height = `${cssHeight}px`;
      gpuContext.configure({ device, format, alphaMode: "premultiplied" });
      configured = true;
    }

    device.queue.writeBuffer(uniformBuffer, 0, paperUniformValues(width, height).buffer);

    const commandEncoder = device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: gpuContext.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(3);
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
    target.fallbackLayer?.style.setProperty("opacity", "0.1");
    target.fallbackCanvas?.style.setProperty("opacity", "0.16");
  }

  function queuePaperResize() {
    if (paperResizeFrame !== 0) return;
    paperResizeFrame = requestAnimationFrame(() => {
      paperResizeFrame = 0;
      render();
    });
  }

  const removeViewportListeners = addShellViewportListeners(queuePaperResize);
  render();

  return () => {
    disposed = true;
    if (paperResizeFrame !== 0) cancelAnimationFrame(paperResizeFrame);
    removeViewportListeners();
    gpuContext.unconfigure();
  };
}

function targetSize(maxDpr) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const { width, height } = getShellViewportSize();

  return {
    cssHeight: height,
    cssWidth: width,
    width: Math.max(1, Math.round(width * dpr)),
    height: Math.max(1, Math.round(height * dpr)),
  };
}

function paperUniformValues(width, height) {
  const seed = ((width + 29) * 0.61803398875 + (height + 17) * 0.41421356237) % 1 || 0.27182818284;

  return new Float32Array([width, height, seed, 0.88, 0.32, 0.56, 0.24, 0.42, 0.06, 0, 0, 0.72, 0, -0.56, -0.26, 0, 0, 0, 0, 0]);
}
