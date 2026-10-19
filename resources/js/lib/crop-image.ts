export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface CropImageOptions {
    maxBytes?: number;
    maxDimension?: number;
}

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2048;

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);

                    return;
                }

                reject(new Error('The browser could not prepare this image.'));
            },
            type,
            quality,
        );
    });
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
    fileName = 'image.jpg',
    options: CropImageOptions = {},
): Promise<File> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    const scale = Math.min(
        1,
        maxDimension / Math.max(cropPixels.width, cropPixels.height),
    );
    canvas.width = Math.max(1, Math.round(cropPixels.width * scale));
    canvas.height = Math.max(1, Math.round(cropPixels.height * scale));
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // JPEG is supported by old mobile browsers and is dramatically smaller
    // than a full-resolution PNG created from a camera photo. A white base also
    // keeps zoomed-out areas readable instead of turning transparent pixels
    // black during JPEG encoding.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        image,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    for (const quality of [0.88, 0.78, 0.68, 0.58]) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);

        if (blob.size <= maxBytes) {
            return new File([blob], fileName, { type: 'image/jpeg' });
        }
    }

    throw new Error(
        'The cropped image is still larger than 5 MB. Zoom in further or choose a smaller image.',
    );
}
