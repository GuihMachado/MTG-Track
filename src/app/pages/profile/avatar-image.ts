/**
 * Reduz a imagem escolhida a um quadrado de `size`px e devolve uma data URL.
 *
 * O app não tem storage de arquivo: o ícone viaja no corpo do PUT e vive numa
 * coluna text. Por isso o recorte e a compressão acontecem aqui, antes de
 * enviar — um JPEG de celular tem 4 MB, e o mesmo rosto em 256px tem ~25 KB.
 *
 * O recorte é "cover" centralizado: a foto preenche o quadrado sem distorcer.
 */
export async function readSquareImage(file: File, size: number): Promise<string> {
  const bitmap = await loadImage(file);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas indisponível.');

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);

  // WebP é bem menor que JPEG na mesma qualidade; navegador que não encoda
  // WebP devolve PNG, que a API também aceita.
  return canvas.toDataURL('image/webp', 0.9);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Arquivo não é imagem.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Imagem inválida.'));
    };

    image.src = url;
  });
}
