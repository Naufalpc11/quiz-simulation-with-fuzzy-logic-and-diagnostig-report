// services/soalExtractor.js
import { PDFParse } from 'pdf-parse';
import { supabaseAdmin } from '../config/db.js';

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function parseSoalDanOpsi(soalMentah) {
  const regexOpsi = /(?:^|\n)\s*([A-E])\.\s+/gi;
  const matches = [...soalMentah.matchAll(regexOpsi)];

  if (matches.length === 0) {
    return { pertanyaan: soalMentah.trim(), opsiList: [] };
  }

  const pertanyaan = soalMentah.substring(0, matches[0].index).trim();
  const opsiList = [];

  for (let i = 0; i < matches.length; i++) {
    const huruf = matches[i][1].toUpperCase();
    const startIndex = matches[i].index + matches[i][0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : soalMentah.length;
    const teksOpsi = soalMentah.substring(startIndex, endIndex).trim();

    opsiList.push({ huruf, opsi: `${huruf}. ${teksOpsi}` });
  }

  return { pertanyaan, opsiList };
}

export async function extractTextFromBuffer(buffer, startPage, endPage) {
  const parser = new PDFParse({ data: buffer });

  try {
    const pages = Array.from(
      { length: endPage - startPage + 1 },
      (_, index) => startPage + index,
    );
    const result = await parser.getText({ partial: pages });
    return result.text;
  } finally {
    await parser.destroy();
  }
}

export function parseSoal(fullText) {
  const rawBlocks = fullText.split(/(?:Nomor Soal\s+(\d+))/gi);
  const hasil = [];

  for (let i = 1; i < rawBlocks.length; i += 2) {
    const noSoal = rawBlocks[i].trim();
    const blockContent = rawBlocks[i + 1] || '';

    const materiMatch = blockContent.match(/Materi\s+([\s\S]*?)(?=Jenjang Kognitif|Kemampuan Uji|Stimulus Soal|Soal)/i);
    const stimulusMatch = blockContent.match(/Stimulus Soal\s+([\s\S]*?)(?=(?:\n|^)\s*Soal\s+)/i);
    const soalMatch = blockContent.match(/(?:^|\n)\s*Soal\s+([\s\S]*?)(?=(?:\n|^)\s*(?:Kunci\s+Jaw\s*aban|Jaw\s*aban)\s+)/i);
    const kunciMatch = blockContent.match(/(?:Kunci\s+Jaw\s*aban|Jaw\s*aban)\s+([A-E])/i);
    const pembahasanMatch = blockContent.match(/Pembahasan\s+([\s\S]*?)(?=$)/i);

    const materi = materiMatch ? cleanText(materiMatch[1]) : '';
    const stimulus = stimulusMatch ? cleanText(stimulusMatch[1]) : '';
    const soalMentah = soalMatch ? cleanText(soalMatch[1]) : '';
    const kunci = kunciMatch ? kunciMatch[1].toUpperCase().trim() : '';
    const pembahasan = pembahasanMatch ? cleanText(pembahasanMatch[1]) : '';

    const { pertanyaan, opsiList } = parseSoalDanOpsi(soalMentah);

    let pertanyaanLengkap = '';
    if (stimulus) pertanyaanLengkap += `[Stimulus]:\n${stimulus}\n\n`;
    pertanyaanLengkap += pertanyaan || soalMentah;

    hasil.push({
      nomor: parseInt(noSoal, 10),
      materi,
      stimulus,
      pertanyaan: pertanyaanLengkap,
      difficulty: null,
      poin: null,
      kunci_jawaban: kunci,
      pembahasan,
      opsi_jawaban: opsiList.map((opt) => ({
        opsi: opt.opsi,
        isCorrect: opt.huruf === kunci,
      })),
    });
  }

  return hasil;
}

export async function uploadSoalToSupabase(daftarSoal, idKuis) {
  const laporan = { berhasil: [], gagal: [] };

  for (const item of daftarSoal) {
    if (item.opsi_jawaban.filter((o) => o.isCorrect).length !== 1) {
      laporan.gagal.push({ nomor: item.nomor, alasan: 'Harus memiliki tepat satu kunci jawaban' });
      continue;
    }

    const { data: soalData, error: errSoal } = await supabaseAdmin
      .from('Soal')
      .insert({
        idKuis,
        urutan: item.nomor,
        pertanyaan: item.pertanyaan,
        difficulty: item.difficulty,
        poin: item.poin,
        pembahasan: item.pembahasan,
        materi: item.materi,
      })
      .select('idSoal')
      .single();

    if (errSoal) {
      laporan.gagal.push({ nomor: item.nomor, alasan: errSoal.message });
      continue;
    }

    const payloadOpsi = item.opsi_jawaban.map((opt) => ({
      idSoal: soalData.idSoal,
      opsi: opt.opsi,
      isCorrect: opt.isCorrect,
    }));

    if (payloadOpsi.length > 0) {
      const { error: errOpsi } = await supabaseAdmin.from('OpsiJawaban').insert(payloadOpsi);

      if (errOpsi) {
        // rollback soal agar tidak ada soal tanpa opsi
        await supabaseAdmin.from('Soal').delete().eq('idSoal', soalData.idSoal);
        laporan.gagal.push({ nomor: item.nomor, alasan: `Gagal insert opsi: ${errOpsi.message}` });
        continue;
      }
    }

    laporan.berhasil.push({ nomor: item.nomor, jumlahOpsi: payloadOpsi.length });
  }

  return laporan;
}