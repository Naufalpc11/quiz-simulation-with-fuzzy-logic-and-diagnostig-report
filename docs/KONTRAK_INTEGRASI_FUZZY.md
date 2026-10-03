# Kontrak Integrasi Modul AI Fuzzy Logic Autograding (e-SIKAP)

Dokumen ini adalah panduan spesifikasi dan kontrak integrasi antara **Modul AI Fuzzy Logic** (`backend/services/fuzzyService.js`) dengan **Tim Backend** dan **Tim Frontend**.

---

## 1. Lokasi Modul & Metode Import

Modul AI bersifat *zero-dependency* dan mendukung penuh **ES Modules** (`"type": "module"`).

```javascript
import { evaluateQuiz, evaluateItem } from '../services/fuzzyService.js';
```

---

## 2. Spesifikasi Fungsi Utama

### A. `evaluateQuiz(answersArray, totalDurationSeconds = null)`

Fungsi utama untuk mengevaluasi satu sesi kuis mahasiswa secara agregat.

#### Input Parameter
1. **`answersArray`** (`Array<Object>`): Daftar butir jawaban yang telah divalidasi kebenarannya oleh backend.
2. **`totalDurationSeconds`** (`number | null`): Total durasi pengerjaan kuis dalam detik (opsional, jika `null` akan dijumlahkan dari waktu tiap butir soal).

#### Format Tiap Objek dalam `answersArray`:
| Field | Tipe | Wajib | Keterangan & Batasan |
| :--- | :---: | :---: | :--- |
| `isCorrect` | `boolean` | Ya | Status kebenaran jawaban (`true` jika benar, `false` jika salah). Diperoleh dari perbandingan `idOpsi` terhadap kunci jawaban di DB. |
| `responseTime` | `number` | Ya | Waktu pengerjaan butir soal ini dalam satuan **detik** ($\ge 0$). |
| `difficulty` | `string` | Ya | Tingkat kesulitan: `'Mudah'` \| `'Sedang'` \| `'Sulit'` (case-insensitive). |
| `targetTime` | `number` | Opsional | Target waktu per butir soal dalam **detik** (default: `60`). |
| `soalId` / `id` | `any` | Opsional | Identifier soal dari database (akan diteruskan kembali pada detail output). |

#### Contoh Payload Input ke `evaluateQuiz`:
```javascript
const answersArray = [
  {
    soalId: 101,
    isCorrect: true,
    responseTime: 18,
    difficulty: "Mudah",
    targetTime: 60
  },
  {
    soalId: 102,
    isCorrect: false,
    responseTime: 35,
    difficulty: "Sedang",
    targetTime: 60
  },
  {
    soalId: 103,
    isCorrect: true,
    responseTime: 75,
    difficulty: "Sulit",
    targetTime: 60
  }
];

const hasil = evaluateQuiz(answersArray, 128);
```

---

### B. Format Output Hasil Evaluasi (`evaluateQuiz`)

Fungsi mengembalikan objek hasil autograding lengkap yang siap disimpan ke database dan dikirimkan ke frontend:

```json
{
  "skorFuzzy": 68.45,
  "kategoriFuzzy": "Sedang",
  "totalSoal": 3,
  "totalBenar": 2,
  "totalSalah": 1,
  "akurasi": 66.67,
  "rataRataWaktu": 42.67,
  "totalWaktuPengerjaan": 128,
  "distribusiTingkat": {
    "Sangat Rendah": 0,
    "Rendah": 1,
    "Sedang": 0,
    "Tinggi": 2
  },
  "distribusiKesulitan": {
    "Mudah": { "total": 1, "benar": 1, "akurasi": 100, "rataRataSkor": 86.04 },
    "Sedang": { "total": 1, "benar": 0, "akurasi": 0, "rataRataSkor": 40.00 },
    "Sulit": { "total": 1, "benar": 1, "akurasi": 100, "rataRataSkor": 86.04 }
  },
  "rekomendasi": "Tingkat pemahaman materi tergolong baik (sedang). Terdapat beberapa konsep yang sudah dikuasai dengan baik. Konsep dasar telah dipahami dengan baik, namun perlu penguatan pada soal-soal penalaran kompleks dan kasus aplikasi.",
  "detailItems": [
    {
      "nomorSoal": 1,
      "soalId": 101,
      "crispScore": 86.04,
      "linguisticLevel": "Tinggi",
      "firingWeights": {
        "Sangat Rendah": 0,
        "Rendah": 0,
        "Sedang": 0,
        "Tinggi": 1
      },
      "activeRules": [
        { "id": "R1", "ifBenar": true, "time": "Cepat", "difficulty": "Mudah", "thenLevel": "Tinggi", "alpha": 1 }
      ],
      "meta": {
        "isCorrect": true,
        "responseTime": 18,
        "difficulty": "Mudah",
        "targetTime": 60
      }
    }
  ]
}
```

---

### C. `evaluateItem({ isCorrect, responseTime, difficulty, targetTime = 60 })`

Fungsi evaluasi untuk satu butir soal tunggal. Mengembalikan:
```javascript
{
  crispScore: 86.04,          // Nilai kontinu [0 - 100] via Centroid Defuzzification (CoG)
  linguisticLevel: 'Tinggi',  // 'Sangat Rendah' | 'Rendah' | 'Sedang' | 'Tinggi'
  firingWeights: { ... },     // Derajat aktivasi 4 himpunan output
  activeRules: [ ... ],       // Daftar aturan Mamdani (R1 - R18) yang aktif
  meta: { ... }
}
```

---

## 3. Aturan Keamanan & Alur Integrasi Tim Backend (Security Rule)

> [!CAUTION]
> **Zero-Trust Client Rule:** Frontend **dilarang keras** mengirimkan status `isCorrect`. Status kebenaran jawaban wajib ditentukan di sisi Backend dengan membandingkan `idOpsi` pilihan mahasiswa terhadap kunci jawaban (`OpsiJawaban.isCorrect = true`).

### Alur Rekomendasi untuk Tim Backend:
1. **Frontend Request:**
   ```json
   POST /api/pengerjaan/submit
   {
     "idKuis": "uuid-kuis",
     "durasiPengerjaanTotal": 128,
     "jawaban": [
       { "idSoal": 101, "idOpsi": 201, "responseTime": 18 },
       { "idSoal": 102, "idOpsi": 204, "responseTime": 35 }
     ]
   }
   ```
2. **Backend Validation & Ground Truth:**
   - Ambil `Soal` dan `OpsiJawaban` milik `idKuis` dari database Supabase.
   - Periksa: `const isCorrect = Boolean(selectedOpsi && selectedOpsi.isCorrect === true)`.
   - Ambil `difficulty` dan `targetTime` langsung dari tabel `Soal` (fallback: `difficulty = 'Sedang'`, `targetTime = 60`).
3. **Panggil Modul AI:**
   - Jalankan `evaluateQuiz(itemsUntukEvaluasi, durasiPengerjaanTotal)`.
4. **Simpan ke Database Supabase:**
   - Simpan ringkasan hasil ke tabel `PengerjaanKuis`.
   - Simpan rincian jawaban per butir ke tabel `JawabanMahasiswa`.
   - *(Lihat skrip DDL SQL usulan pada [`docs/skema-usulan-pengerjaan.sql`](skema-usulan-pengerjaan.sql))*.

---

## 4. Contoh Kode Pemanggilan Backend (Template Controller)

```javascript
import { supabaseAdmin } from '../config/db.js';
import { evaluateQuiz } from '../services/fuzzyService.js';

export const handleQuizSubmission = async (req, res) => {
  const { idKuis, durasiPengerjaanTotal, jawaban } = req.body;

  // 1. Ambil soal dan opsi dari DB
  const { data: soalList } = await supabaseAdmin
    .from('Soal')
    .select('idSoal, difficulty, targetTime, opsi:OpsiJawaban(idOpsi, isCorrect)')
    .eq('idKuis', idKuis);

  const soalMap = new Map(soalList.map((s) => [String(s.idSoal), s]));

  // 2. Susun payload autograding yang aman
  const items = jawaban.map((ans) => {
    const master = soalMap.get(String(ans.idSoal));
    const selectedOpsi = master?.opsi?.find((o) => String(o.idOpsi) === String(ans.idOpsi));
    
    return {
      soalId: ans.idSoal,
      isCorrect: Boolean(selectedOpsi && selectedOpsi.isCorrect === true),
      responseTime: Math.max(0, Number(ans.responseTime) || 0),
      difficulty: master?.difficulty ?? 'Sedang',
      targetTime: Number(master?.targetTime) > 0 ? Number(master.targetTime) : 60,
    };
  });

  // 3. Hitung skor autograding
  const hasilFuzzy = evaluateQuiz(items, durasiPengerjaanTotal);

  // 4. Return respon ke mahasiswa
  return res.status(201).json({ status: 'success', data: hasilFuzzy });
};
```
