import fs from 'fs';
import { Document, Packer, Paragraph, TextRun } from 'docx';

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            new Paragraph({
                children: [
                    new TextRun("Here is a sample document containing both US and UK spelling variations. "),
                    new TextRun("The color of the centre is quite nice, but I realize we need to organise our thoughts before traveling. "),
                    new TextRun("In the US, we use color, center, realize, organize, and traveling. "),
                    new TextRun("In the UK, they use colour, centre, realise, organise, and travelling. "),
                    new TextRun("This should trigger the spell checker appropriately for both dialects.")
                ]
            })
        ]
    }]
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("sample.docx", buffer);
    console.log("sample.docx created.");
});
