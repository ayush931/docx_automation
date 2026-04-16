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

    const checkerUs = nspell(affUs, dicUs);
    console.log("US Checker initialized.");
    console.log("Is 'color' correct in US?", checkerUs.correct('color'));
    console.log("Is 'colour' correct in US?", checkerUs.correct('colour'));

    const dictionaryDirUk = path.join(process.cwd(), 'node_modules', 'dictionary-en-gb');
    const [affUk, dicUk] = await Promise.all([
      fs.readFile(path.join(dictionaryDirUk, 'index.aff')),
      fs.readFile(path.join(dictionaryDirUk, 'index.dic'))
    ]);

    const checkerUk = nspell(affUk, dicUk);
    console.log("UK Checker initialized.");
    console.log("Is 'colour' correct in UK?", checkerUk.correct('colour'));
    console.log("Is 'color' correct in UK?", checkerUk.correct('color'));
    
    console.log("Success!");
  } catch (error) {
    console.error("Error with spellchecker:", error);
  }
}

test();
