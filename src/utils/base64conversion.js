const fs = require('fs');

export function base64ToImage(base64Data, fileName) {
  const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  const imageBuffer = Buffer.from(matches[2], 'base64');

  fs.writeFileSync(fileName, imageBuffer, 'binary');

  console.log('Image saved:', fileName);
}
