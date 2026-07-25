export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', reject);
        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}

export async function getCroppedImageFile(
    imageSrc: string,
    cropPixels: CropArea,
    fileName = 'image.png',
): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = cropPixels.width;
    canvas.height = cropPixels.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // Zooming out can push the crop area past the source image's edges —
    // leave those pixels untouched (canvas is transparent by default) rather
    // than drawing anything, and export as PNG so that transparency survives.
    ctx.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        cropPixels.width,
        cropPixels.height,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));

                return;
            }

            resolve(new File([blob], fileName, { type: 'image/png' }));
        }, 'image/png');
    });
}
