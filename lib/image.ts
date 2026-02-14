export async function processCoverImage(file: File): Promise<string> {
  const imageBitmap = await readImage(file);
  const sourceWidth = imageBitmap.width;
  const sourceHeight = imageBitmap.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = 16 / 9;

  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;
  if (sourceRatio > targetRatio) {
    cropWidth = Math.round(sourceHeight * targetRatio);
  } else {
    cropHeight = Math.round(sourceWidth / targetRatio);
  }

  const cropX = Math.max(0, Math.round((sourceWidth - cropWidth) / 2));
  const cropY = Math.max(0, Math.round((sourceHeight - cropHeight) / 2));
  const outputWidth = Math.min(2048, cropWidth);
  const outputHeight = Math.round(outputWidth / targetRatio);

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法创建画布上下文");
  }

  context.drawImage(
    imageBitmap,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return canvas.toDataURL("image/jpeg", 0.78);
}

async function readImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}
