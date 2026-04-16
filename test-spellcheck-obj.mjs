import nspell from 'nspell';
import fs from 'fs/promises';
import path from 'path';

async function test() {
  try {
    const dictionaryDirUs = path.join(process.cwd(), 'node_modules', 'dictionary-en-us');
    const [affUs, dicUs] = await Promise.all([
      fs.readFile(path.join(dictionaryDirUs, 'index.aff')),
      fs.readFile(path.join(dictionaryDirUs, 'index.dic'))
    ]);

    const checkerUs = nspell({ aff: affUs, dic: dicUs });
    console.log("US Checker initialized with object.");
    console.log("Is 'color' correct in US?", checkerUs.correct('color'));
    
    console.log("Success!");
  } catch (error) {
    console.error("Error with spellchecker (object):", error);
  }
}

test();
