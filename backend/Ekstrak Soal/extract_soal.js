import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// pdf-parse v2.4+ mengekspor class PDFParse langsung secara ES Module
import { PDFParse } from 'pdf-parse';

// Import supabaseAdmin dari config/db.js
import { supabaseAdmin } from '../config/db.js';

// Setup __dirname untuk ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= KONFIGURASI =================
// Path langsung ke file PDF di folder Downloads Anda
const PDF_PATH = "C:/Users/USER/Downloads/Tes Diagnostik Ejaan dan Tanda Baca untuk Perguruan Tinggi _compressed (2)_opt (1)_compressed (1).pdf";

const START_PAGE = 55;
const END_PAGE = 103;
const UPLOAD_TO_SUPABASE = process.env.UPLOAD_TO_SUPABASE !== 'false'; // Langsung masukkan ke database Supabase
// ===============================================

// Helper membersihkan spasi dan baris baru
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// Memisahkan pertanyaan dari opsi pilihan ganda A, B, C, D, E.
// Label sengaja tetap disertakan di nilai `opsi` karena kolom database
// menyimpan tampilan opsi yang akan ditampilkan ke pengguna.
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
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : soalMentah.length;
    const teksOpsi = soalMentah.substring(startIndex, endIndex).trim();

    opsiList.push({
      huruf: huruf,
      opsi: `${huruf}. ${teksOpsi}`
    });
  }

  return { pertanyaan, opsiList };
}

// Ekstraksi teks dari PDF khusus range halaman 55 sampai 103
async function extractTextFromPages(pdfPath, startPage, endPage) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`File PDF tidak ditemukan di: ${pdfPath}`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);

  const parser = new PDFParse({ data: dataBuffer });

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

// Parsing teks menjadi array objek soal
function parseSoal(fullText) {
  const rawBlocks = fullText.split(/(?:Nomor Soal\s+(\d+))/gi);
  const hasil = [];

  for (let i = 1; i < rawBlocks.length; i += 2) {
    const noSoal = rawBlocks[i].trim();
    const blockContent = rawBlocks[i + 1];

    // Ekstraksi tiap bagian dengan regex
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

    // Format pertanyaan lengkap (dengan stimulus teks)
    let pertanyaanLengkap = '';
    if (stimulus) {
      pertanyaanLengkap += `[Stimulus]:\n${stimulus}\n\n`;
    }
    pertanyaanLengkap += pertanyaan || soalMentah;

    // Petakan opsi jawaban dan tentukan kunci yang benar
    const formattedOpsi = opsiList.map(opt => ({
      opsi: opt.opsi,
      isCorrect: opt.huruf === kunci
    }));

    hasil.push({
      nomor: parseInt(noSoal, 10),
      materi: materi,
      stimulus: stimulus,
      pertanyaan: pertanyaanLengkap,
      difficulty: null,
      poin: null,
      kunci_jawaban: kunci,
      pembahasan: pembahasan,
      opsi_jawaban: formattedOpsi
    });
  }

  return hasil;
}

// Fungsi utama
async function main() {
  try {
    console.log(`🔍 Membaca PDF: ${PDF_PATH}`);
    console.log(`📄 Mengekstrak halaman ${START_PAGE} sampai ${END_PAGE}...`);

    const rawText = await extractTextFromPages(PDF_PATH, START_PAGE, END_PAGE);

    console.log('⚙️ Parsing struktur soal, opsi, kunci, dan pembahasan...');
    const daftarSoal = parseSoal(rawText);
    console.log(`✅ Berhasil mengekstrak ${daftarSoal.length} butir soal.`);

    // 1. Simpan backup ke file JSON
    const outputJsonPath = path.join(__dirname, 'hasil_ekstraksi_soal.json');
    fs.writeFileSync(outputJsonPath, JSON.stringify(daftarSoal, null, 2), 'utf-8');
    console.log(`📁 Backup data tersimpan di: ${outputJsonPath}`);

    // 2. Upload langsung ke Supabase
    if (UPLOAD_TO_SUPABASE && daftarSoal.length > 0) {
      console.log('🚀 Mulai upload ke database Supabase...');

      for (const item of daftarSoal) {
        // Insert ke tabel Soal
        const { data: soalData, error: errSoal } = await supabaseAdmin
          .from('Soal')
          .insert({
            idKuis: null, // Sesuai permintaan, dibuat null terlebih dahulu
            pertanyaan: item.pertanyaan,
            difficulty: item.difficulty,
            poin: item.poin,
            pembahasan: item.pembahasan,
            materi: item.materi
          })
          .select('idSoal')
          .single();

        if (errSoal) {
          console.error(`❌ Gagal insert soal No. ${item.nomor}:`, errSoal.message);
          continue;
        }

        const idSoal = soalData.idSoal;

        // Siapkan payload opsi jawaban
        const payloadOpsi = item.opsi_jawaban.map(opt => ({
          idSoal: idSoal,
          opsi: opt.opsi,
          isCorrect: opt.isCorrect
        }));

        if (payloadOpsi.length > 0) {
          const { error: errOpsi } = await supabaseAdmin
            .from('Opsi Jawaban')
            .insert(payloadOpsi);

          if (errOpsi) {
            console.error(`❌ Gagal insert opsi untuk soal No. ${item.nomor}:`, errOpsi.message);
          } else {
            console.log(`✔️ Soal No. ${item.nomor} & ${payloadOpsi.length} opsi berhasil dimasukkan.`);
          }
        }
      }

      console.log('🎉 Selesai! Semua data berhasil dimasukkan ke database Supabase.');
    }

  } catch (error) {
    console.error('⚠️ Terjadi kesalahan:', error.message);
  }
}

main();