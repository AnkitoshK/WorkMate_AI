const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType,
  Header,
  Footer,
  PageNumber
} = require('docx');

function parseInlineFormatting(text) {
  const runs = [];
  // Tokenize bold, code, and regular text
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: 'Segoe UI',
        size: 22,
        color: '1E293B',
      }));
    } else if (part.startsWith('`') && part.endsWith('`')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        font: 'Consolas',
        size: 20,
        color: '9333EA',
        shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
      }));
    } else if (part.startsWith('*') && part.endsWith('*')) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        italics: true,
        font: 'Segoe UI',
        size: 22,
        color: '475569',
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        font: 'Segoe UI',
        size: 22,
        color: '1E293B',
      }));
    }
  }
  return runs.length ? runs : [new TextRun({ text, font: 'Segoe UI', size: 22, color: '1E293B' })];
}

function convertMarkdownToDocx(mdFilePath, outDocxPath, titleName) {
  const content = fs.readFileSync(mdFilePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const children = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (tableRows.length > 0) {
      const docxTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      });
      children.push(docxTable);
      children.push(new Paragraph({ spacing: { after: 200 } }));
      tableRows = [];
    }
    inTable = false;
  }

  function flushCodeBlock() {
    if (codeBuffer.length > 0) {
      for (const codeLine of codeBuffer) {
        children.push(new Paragraph({
          children: [
            new TextRun({
              text: codeLine || ' ',
              font: 'Consolas',
              size: 19,
              color: '1E1E2E',
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
          spacing: { line: 260, before: 40, after: 40 },
          indent: { left: 400, right: 400 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 16, color: '6366F1' },
          },
        }));
      }
      children.push(new Paragraph({ spacing: { after: 180 } }));
      codeBuffer = [];
    }
    inCodeBlock = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // separator row: | --- | :--- |
      if (line.includes('---')) {
        continue;
      }
      inTable = true;
      const rawCells = line.split('|').slice(1, -1).map(c => c.trim());
      const isHeader = tableRows.length === 0;

      const cells = rawCells.map(cellText => {
        return new TableCell({
          children: [
            new Paragraph({
              children: parseInlineFormatting(cellText),
              spacing: { before: 80, after: 80 },
            }),
          ],
          shading: isHeader ? { type: ShadingType.CLEAR, fill: 'EEF2FF' } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
          },
        });
      });

      tableRows.push(new TableRow({ children: cells }));
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (!line.trim()) {
      children.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: line.replace('# ', '').trim(),
            bold: true,
            font: 'Segoe UI',
            size: 36,
            color: '1E3A8A', // Deep Indigo
          }),
        ],
        spacing: { before: 360, after: 180 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: '3B82F6' },
        },
      }));
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: line.replace('## ', '').trim(),
            bold: true,
            font: 'Segoe UI',
            size: 28,
            color: '1E40AF',
          }),
        ],
        spacing: { before: 300, after: 140 },
      }));
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [
          new TextRun({
            text: line.replace('### ', '').trim(),
            bold: true,
            font: 'Segoe UI',
            size: 24,
            color: '2563EB',
          }),
        ],
        spacing: { before: 240, after: 100 },
      }));
      continue;
    }

    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletText = line.trim().replace(/^[-*]\s+/, '');
      children.push(new Paragraph({
        children: parseInlineFormatting(bulletText),
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      }));
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const numText = line.trim().replace(/^\d+\.\s+/, '');
      children.push(new Paragraph({
        children: parseInlineFormatting(numText),
        numbering: { reference: 'numbered-list', level: 0 },
        spacing: { before: 60, after: 60 },
      }));
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const quoteText = line.trim().replace(/^>\s*/, '');
      children.push(new Paragraph({
        children: parseInlineFormatting(quoteText),
        indent: { left: 400 },
        border: {
          left: { style: BorderStyle.SINGLE, size: 20, color: '6366F1' },
        },
        shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
        spacing: { before: 100, after: 100 },
      }));
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      children.push(new Paragraph({
        spacing: { before: 180, after: 180 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 8, color: 'E2E8F0' },
        },
      }));
      continue;
    }

    // Standard paragraph
    children.push(new Paragraph({
      children: parseInlineFormatting(line),
      spacing: { line: 280, before: 60, after: 100 },
    }));
  }

  if (inCodeBlock) flushCodeBlock();
  if (inTable) flushTable();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `WorkMate AI — ${titleName}`,
                    font: 'Segoe UI',
                    size: 18,
                    color: '94A3B8',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Page ',
                    font: 'Segoe UI',
                    size: 18,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Segoe UI',
                    size: 18,
                    color: '94A3B8',
                  }),
                  new TextRun({
                    text: ' | Confidential — WorkMate AI Enterprise',
                    font: 'Segoe UI',
                    size: 18,
                    color: '94A3B8',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outDocxPath, buffer);
    console.log(`✓ Successfully generated Word document: ${outDocxPath} (${buffer.length} bytes)`);
  });
}

async function main() {
  const easyGuideMd = path.join(__dirname, '..', 'docs', 'EASY_UNDERSTANDING_GUIDE.md');
  const easyGuideDocx = path.join(__dirname, '..', 'docs', 'WorkMate_AI_Easy_Understanding_Guide.docx');

  const userManualMd = path.join(__dirname, '..', 'docs', 'user_manual.md');
  const userManualDocx = path.join(__dirname, '..', 'docs', 'WorkMate_AI_User_Manual.docx');

  const masterMd = path.join(__dirname, '..', 'docs', 'WorkMate_AI_Master_Project_Documentation.md');
  const masterDocx = path.join(__dirname, '..', 'docs', 'WorkMate_AI_Master_Project_Documentation.docx');
  const parentFolderDocx = path.join(__dirname, '..', '..', 'WorkMate_AI_Master_Project_Documentation.docx');

  const compManualMd = path.join(__dirname, '..', 'docs', 'COMPREHENSIVE_OPERATIONS_MANUAL.md');
  const compManualDocx = path.join(__dirname, '..', 'docs', 'WorkMate_AI_Complete_Operations_Manual.docx');
  const compParentFolderDocx = path.join(__dirname, '..', '..', 'WorkMate_AI_Complete_Operations_Manual.docx');

  const deepDiveMd = path.join(__dirname, '..', 'docs', 'WORKMATE_AI_DEEP_DIVE_LEARNING_GUIDE.md');
  const deepDiveDocx = path.join(__dirname, '..', 'docs', 'WorkMate_AI_Deep_Dive_Learning_Guide.docx');
  const deepDiveParentFolderDocx = path.join(__dirname, '..', '..', 'WorkMate_AI_Deep_Dive_Learning_Guide.docx');

  console.log('Converting Markdown files to styled .docx documents...');
  await convertMarkdownToDocx(deepDiveMd, deepDiveDocx, 'WorkMate AI - Deep Dive Learning & Architecture Guide');
  await convertMarkdownToDocx(easyGuideMd, easyGuideDocx, 'Easy Understanding Guide & Flow');
  await convertMarkdownToDocx(userManualMd, userManualDocx, 'User Manual & End-to-End System Guide');
  await convertMarkdownToDocx(masterMd, masterDocx, 'Master Full-Stack Project Documentation (All Modules)');
  await convertMarkdownToDocx(compManualMd, compManualDocx, 'Complete Operations Manual & System Guide (Exhaustive)');

  // Copy files to parent folder, downloads, and desktop
  try {
    fs.copyFileSync(deepDiveDocx, deepDiveParentFolderDocx);
    fs.copyFileSync(masterDocx, parentFolderDocx);
    fs.copyFileSync(compManualDocx, compParentFolderDocx);
    console.log(`✓ Copied deep dive guide to parent directory: ${deepDiveParentFolderDocx}`);

    const userProfile = process.env.USERPROFILE || 'C:\\Users\\ankit';
    const downloadsPath = path.join(userProfile, 'Downloads', 'WorkMate_AI_Deep_Dive_Learning_Guide.docx');
    const desktopPath = path.join(userProfile, 'OneDrive', 'Desktop', 'WorkMate_AI_Deep_Dive_Learning_Guide.docx');

    fs.copyFileSync(deepDiveDocx, downloadsPath);
    console.log(`✓ Copied deep dive guide to Downloads: ${downloadsPath}`);

    if (fs.existsSync(path.dirname(desktopPath))) {
      fs.copyFileSync(deepDiveDocx, desktopPath);
      console.log(`✓ Copied deep dive guide to Desktop: ${desktopPath}`);
    }
  } catch (err) {
    console.warn('Note on file copy:', err.message);
  }
  console.log('All .docx files generated successfully!');
}

main().catch(err => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
