const fs = require('fs');
const PDFDocument = require('pdfkit');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('../documents/BNS.pdf'));

doc.fontSize(25).text('Bharatiya Nyaya Sanhita (BNS) 2023 - Extract', 100, 100);
doc.fontSize(12).moveDown().text(
  'Section 309: Robbery.\n' +
  'Whoever commits robbery shall be punished with rigorous imprisonment for a term which may extend to ten years, and shall also be liable to fine.\n\n' +
  'If the robbery is committed on the highway between sunset and sunrise, the imprisonment may be extended to fourteen years.\n\n' +
  'A robbery case involves theft coupled with the fear of instant death, hurt, or wrongful restraint.'
);

doc.end();
