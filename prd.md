# PRODUCT REQUIREMENT DOCUMENT

# **Nova Wallet**
### Agentic AI Multi-Wallet Orchestration Platform

---

| **Versi** | 1.0 |
|-----------|-----|
| **Tanggal** | 20 November 2025 |
| **Owner** | Tim Produk |
| **Status** | Brainstorming & Draft |

---

## DAFTAR ISI

1. [RINGKASAN EKSEKUTIF](#1-ringkasan-eksekutif)
2. [MASALAH YANG MAU DISELESAIKAN](#2-masalah-yang-mau-diselesaikan)
3. [KONSEP & CARA KERJA](#3-konsep--cara-kerja)
4. [SIAPA YANG MAU KITA TARGET](#4-siapa-yang-mau-kita-target)
5. [FITUR-FITUR DETAIL](#5-fitur-fitur-detail)
6. [TEKNOLOGI & ARSITEKTUR](#6-teknologi--arsitektur)
7. [MODEL BISNIS](#7-model-bisnis)
8. [ROADMAP PENGEMBANGAN](#8-roadmap-pengembangan)
9. [RISIKO & MITIGASI](#9-risiko--mitigasi)
10. [NEXT STEPS](#10-next-steps)

---

## 1. RINGKASAN EKSEKUTIF

### 1.1 Apa itu Nova Wallet?

Nova Wallet adalah platform yang bikin penggunaan crypto jadi **sesimpel ngobrol sama AI**. Bayangin kamu punya MetaMask, Phantom, Trust Wallet, dan beberapa wallet lainnya. Biasanya ribet kan harus buka-buka aplikasi berbeda, ganti-ganti network, mikir gas fee, takut salah transfer?

Nova Wallet solve semua itu dengan satu cara: **AI yang ngerti bahasa manusia**. Kamu tinggal bilang "Kirim 50 USDT ke Budi" atau "Tukar 100 USDC jadi ETH", terus AI-nya yang handle semua - pilih wallet mana yang dipake, chain mana yang paling murah, validasi addressnya bener ga, kasih tau gas fee-nya, dan eksekusi transaksi.

Yang bikin lebih menarik: ada fitur **Wallet Paylink** yang bikin siapa aja bisa kirim duit ke kamu pakai **QRIS** (BCA, BRI, Mandiri, GoPay, dll), terus otomatis jadi crypto di wallet kamu. Perfect buat freelancer atau anyone yang pengen terima payment crypto tanpa ribet.

### 1.2 Kenapa Nova Wallet Menarik?

**Buat Crypto Newbie:**
- Ga perlu ngerti technical jargon. AI jelasin semua dalam bahasa Indonesia yang simple
- Ga takut salah transfer - AI validasi dulu sebelum transaksi beneran jalan
- Bisa mulai pake crypto tanpa harus belajar dulu berbulan-bulan
- Terima pembayaran via QRIS (yang udah biasa dipake) langsung jadi crypto

**Buat Power Users:**
- Manage semua wallet dari satu tempat, ga perlu buka 10 aplikasi
- AI optimize transaksi otomatis (pilih chain termurah, gas fee terbaik)
- Voice command buat speed (tinggal ngomong, transaksi jalan)
- Hemat waktu puluhan menit per hari

**Buat Freelancer/Creator:**
- Client bayar pake QRIS (mereka ga perlu ngerti crypto)
- Duit langsung masuk jadi USDT/crypto stable di wallet
- Ga perlu ribet jelasin ke client "kirim ke address ini di network Polygon" - cukup share QR code

### 1.3 Alur Utama

**CONNECT WALLET → CHAT DENGAN AI → AI EKSEKUSI → DONE**

Simple banget. Kamu connect wallet-wallet yang udah ada (MetaMask, Phantom, dll), terus tinggal ngobrol sama AI. Mau transfer? Swap? Cek balance? Check gas fee? Semua lewat chat natural language.

**Catatan Penting:** Nova Wallet **TIDAK** nyimpen private key atau seed phrase kamu. Semua tetap aman di wallet aslinya (MetaMask/Phantom/dll). Nova cuma jadi orchestrator yang bantu kamu pake wallet-wallet itu dengan lebih mudah.

---

## 2. MASALAH YANG MAU DISELESAIKAN

### 2.1 Problem di Crypto Wallet Sekarang

Dari riset yang ada dan feedback user crypto, ini masalah-masalah yang sering banget muncul:

**Newbie Kewalahan dengan Kompleksitas**

Seriously, coba bayangin orang yang baru pertama kali buka MetaMask:
- "Seed phrase itu apaan? Kenapa 12 kata random?"
- "Gas fee kok kadang $3 kadang $50 buat transfer yang sama?"
- "Network? RPC? Wei? Gwei? Slippage? Apaan semua ini?"
- "Alamat wallet kok kayak password panjang gini?"

**84%** orang yang coba crypto itu masuk karena FOMO (takut ketinggalan), tapi **85%** langsung bingung sama UI wallet yang ada. Hasilnya? **60%** abandon sebelum sempet funding wallet, **97%** yang download wallet ga pernah sukses bikin first transaction.

Ini bukan user yang bodoh - ini **design yang gagal**.

**Multi-Wallet = Multi-Ribet**

Power user biasanya punya banyak wallet:
- MetaMask buat Ethereum & EVM chains
- Phantom buat Solana  
- Keplr buat Cosmos
- Trust Wallet buat ini-itu
- Ledger buat cold storage

Tiap kali mau transaksi, harus:
1. Mikir "wallet mana yang punya token ini?"
2. Buka aplikasi/extension yang bener
3. Cek network udah bener belum
4. Manually switch network kalo salah
5. Hope ga salah pencet

Capek. Buang waktu. Prone to error.

**Gas Fee Ga Jelas**

Liat aja kasus nyata:
- User accidentally bayar **$105,000** fee buat transfer $10 (karena salah input)
- User lain rugi **$60,000** karena ga ngerti Replace-by-Fee
- **75%** user bilang gas fee "confusing and unpredictable"

Wallet yang ada cuma nampilin "35 gwei" - lah user mana ngerti gwei? Harusnya: "Gas fee: $2.80 (MEDIUM, biasanya $1-4 jam ini)".

**Takut Salah = Ga Berani Pake**

**48%** user lebih takut personal error daripada kena hack. Kenapa? Karena:
- Salah network → uang hilang permanent
- Salah address → ga bisa dibatalin
- Lost seed phrase → wallet ga bisa dibuka selamanya

Ini bikin banyak orang yang interested di crypto jadi **takut mulai**. Atau kalo udah mulai, transaksinya dikit-dikit aja karena anxiety.

**QRIS Everywhere, Crypto Nowhere**

Di Indonesia, QRIS udah massive:
- **18 juta** merchant
- **200 juta+** user aktif
- Dipake sehari-hari dari warung sampe mall

Tapi kalo mau terima payment crypto? Ribet banget:
- Harus jelasin ke client/temen cara install wallet
- Harus jelasin cara beli crypto
- Harus jelasin cara transfer ke address kamu di network yang bener
- Kebanyakan client: "ribet ah, pake transfer bank aja"

Gap ini bikin **crypto adoption stagnan** di Indonesia despite momentum yang ada.

### 2.2 Kenapa Sekarang Waktu yang Tepat?

**AI Udah Mature & Affordable**

GPT-4, Claude, Gemini - semua udah bagus banget buat understand natural language dan execute tasks. API-nya juga affordable, ga mahal-mahal amat.

**Orang Udah Terbiasa AI Assistant**

ChatGPT, Claude, voice assistant - orang udah ga asing lagi sama konsep "ngobrol sama AI buat selesain task". Jadi barrier to adoption rendah.

**Multi-Chain Era**

Dulu cuma Ethereum. Sekarang ada Solana, Polygon, Arbitrum, Optimism, Base, dan puluhan chain lainnya. Makin banyak chain = makin ribet manage manually = makin butuh orchestrator.

**QRIS Infrastructure Udah Solid**

Midtrans, Xendit, dan payment gateway lain udah mature. Integration gampang. Perfect timing buat bridge QRIS ke crypto.

**Crypto Lagi Hype Lagi**

Bull market mulai lagi, FOMO naik, newbie banyak yang mau coba. Tapi mereka butuh onboarding yang better. Ini kesempatan kita.

---

## 3. KONSEP & CARA KERJA

### 3.1 Konsep Dasar

Nova Wallet itu **bukan wallet baru**. Nova itu **orchestration layer** di atas wallet-wallet yang udah ada.

Analogi sederhananya: kamu punya 5 remote control buat TV, AC, sound system, lampu, dan kipas. Ribet kan harus ingat remote mana buat apa? Nova Wallet itu kayak **universal remote** yang bisa control semuanya, tapi lebih smart - kamu tinggal bilang "matiin AC" dan dia tau remote mana yang dipencet.

Bedanya dengan universal remote biasa: Nova pake **AI yang bisa ngobrol**. Jadi kamu ga perlu hafalin button mana buat apa. Tinggal ngomong aja.

**Yang Nova TIDAK lakukan:**
- ❌ Bikin wallet baru
- ❌ Simpan private key kamu
- ❌ Simpan seed phrase kamu  
- ❌ Akses dana kamu tanpa approval

**Yang Nova LAKUKAN:**
- ✅ Connect ke wallet-wallet existing (MetaMask, Phantom, dll)
- ✅ Bantu kamu kontrol wallet-wallet itu dengan mudah
- ✅ Provide AI assistant yang ngerti bahasa manusia
- ✅ Validasi transaksi sebelum execute biar ga salah
- ✅ Kasih rekomendasi chain/gas fee terbaik

### 3.2 Komponen Utama

**Multi-Wallet Connection**

Kamu bisa connect berbagai wallet sekaligus:
- MetaMask (EVM chains)
- Phantom (Solana)
- Trust Wallet (multi-chain)
- Coin98 (multi-chain)
- Keplr (Cosmos)
- Rabby (EVM)
- Dan lainnya

Semua wallet ini tetap independent, private key-nya tetap di aplikasi masing-masing. Nova cuma minta **permission** buat propose transactions - yang tetap kamu approve di wallet aslinya.

**Agentic AI Core**

Ini otak dari Nova Wallet. AI-nya bisa:
- **Understand natural language** dalam Bahasa Indonesia dan English
- **Parse intent** dari command kamu ("kirim", "swap", "cek saldo", dll)
- **Identify context** (wallet mana, chain mana, token apa)
- **Validate transaction** sebelum execute
- **Explain complex concepts** dalam bahasa sederhana
- **Give recommendations** berdasarkan situasi

Contoh conversation:

```
User: "Cek saldo USDT aku"

AI: "Kamu punya total 125.50 USDT di 2 wallet:
     • MetaMask (Polygon): 100 USDT
     • Trust Wallet (BSC): 25.50 USDT"

User: "Kirim 50 USDT ke alamat 0xABC...789"

AI: "Oke! Mau pakai USDT dari wallet mana?
     Recommended: MetaMask (Polygon) karena gas fee cuma $0.02
     (vs BSC $0.15)"

User: "Pakai yang recommended"

AI: "Perfect! Ini detailnya:
     • Kirim: 50 USDT
     • Dari: MetaMask (Polygon)  
     • Ke: 0xABC...789
     • Gas fee: ~$0.02
     • Total: ~50.02 USDT
     
     Lanjut?"

User: "Yes"

AI: "✅ Transaksi berhasil!
     Tx hash: 0x7d3f2a...
     Penerima akan terima dalam 30 detik"
```

**Guardian AI - Error Prevention Layer**

Sebelum **SETIAP** transaksi jalan, Guardian AI check:

1. **Address Validation**
   - Format bener ga?
   - Checksum valid ga?
   - Address flagged as scam ga? (cross-check dengan database)

2. **Network Compatibility**
   ```
   User mau kirim USDT dari Polygon ke address Ethereum?
   
   ⚠️ WARNING:
   "Address tujuan adalah Ethereum network.
   USDT kamu ada di Polygon network.
   
   Kalau kirim langsung, uang akan HILANG.
   
   Mau saya bridge dulu? (fee ~$3, waktu 5 menit)"
   ```

3. **Balance Check**
   - Saldo cukup ga buat amount + gas fee?
   - Kasih warning kalau balance bakal tinggal dikit

4. **Gas Fee Sanity Check**
   ```
   Gas fee detected: $87
   Normal gas fee: $2-5
   
   ⚠️ UNUSUALLY HIGH!
   Network lagi congested.
   
   Recommendation:
   - Wait 2-3 hours (biasanya turun)
   - Use Polygon instead ($0.02)
   ```

5. **Amount Double-Check**
   - Kalo amount > $1,000, minta konfirmasi ulang
   - User harus ketik jumlahnya manual buat confirm

**Nova AI Token System**

Nova AI Token (NOVA) adalah native cryptocurrency yang jadi "bahan bakar" buat pake AI.

**Kenapa perlu token?**
- AI API calls itu ga gratis (GPT-4, Claude, etc cost money)
- Server infrastructure cost
- Prevent spam/abuse (unlimited free = abuse)
- Sustainable business model

**How it works:**
- Simple query: 0.01 NOVA (~$0.0005)
- Complex transaction: 0.05-0.1 NOVA (~$0.0025-0.005)
- Multi-step operation: 0.2-0.5 NOVA (~$0.01-0.025)

**Free trial:**
- New user dapat 100 NOVA gratis
- Cukup buat ~50-100 transactions
- Setelah habis, beli lagi (affordable - $5 buat 1000 NOVA)

**Wallet Paylink (QRIS → Crypto)**

Ini fitur signature Nova Wallet buat Indonesia market.

**Use case:** Kamu freelancer, dapat client luar yang mau bayar. Tapi client ga ngerti crypto. Gimana?

**Old way (ribet):**
1. Jelasin ke client cara install MetaMask
2. Jelasin cara beli ETH di exchange
3. Jelasin cara transfer ke address kamu
4. Client: "ribet ah, transfer bank aja"
5. Kamu: dapat Rupiah, harus convert sendiri ke crypto (kalo mau)

**Nova Wallet way (simple):**
1. Buat Paylink (set amount, pilih crypto mau USDT/ETH/SOL/BTC)
2. Share QR code ke client
3. Client scan pakai BCA mobile/BRI/Mandiri/GoPay (QRIS)
4. Client bayar Rupiah
5. Kamu terima crypto langsung di wallet dalam 3-5 menit

**Behind the scenes:**
- Payment diterima via Midtrans (payment gateway Indonesia)
- Rupiah di-convert ke crypto via on-ramp provider
- Crypto dikirim ke wallet address kamu
- Done!

**Fee structure:**
- Midtrans fee: ~3-4% (standar payment gateway)
- Nova markup: 1%
- Total fee: ~4-5%

Example:
- Client bayar: Rp 100,000
- Fee: Rp 4,500
- Kamu terima: ~6.5 USDT (rate Rp 15,500/USDT)

Still better than PayPal (5%+ fee + exchange rate markup + withdrawal fee).

---

## 4. SIAPA YANG MAU KITA TARGET

### 4.1 Crypto Newbie (Target Utama)

**Who they are:**
- Usia 20-35 tahun
- Kerja kantoran, freelancer, atau mahasiswa
- Dengar-dengar crypto lagi hype, pengen coba
- Tech-savvy di Web2 (biasa pake apps), tapi zero knowledge Web3
- Takut salah, takut kehilangan uang

**What they want:**
- Cara masuk crypto yang **ga ribet**
- Penjelasan dalam **bahasa yang simple**
- **Safety nets** - ga mau salah transfer terus uang hilang
- Bisa mulai dengan **modal kecil**

**Why Nova cocok:**
- AI jelasin semua step by step dalam Bahasa Indonesia
- Guardian AI prevent common mistakes
- Ga perlu ngerti technical details (AI yang handle)
- Bisa mulai dengan connect wallet existing (kalo udah punya) atau pakai Paylink buat receive payment

### 4.2 Power User yang Capek Juggling

**Who they are:**
- Active di DeFi, NFT trading, multi-chain operations
- Punya 5-10 wallet berbeda
- Spend hours per day doing crypto transactions
- Frustrated dengan inefficiency

**What they want:**
- **Single interface** buat manage semua
- **Automation** buat repetitive tasks
- **Time savings** - literally hours per week
- **Smart routing** - always get best price/gas fee

**Why Nova cocok:**
- All wallets in one dashboard
- AI executes complex multi-step operations
- Voice commands for speed
- Automatic optimization (chain selection, gas fee, slippage)

### 4.3 Freelancer & Creator Indonesia

**Who they are:**
- Freelance designer, developer, content creator
- Punya client dari luar negeri
- Terima payment via PayPal/Wise (fee mahal)
- Interested in crypto tapi bingung mulai dari mana

**What they want:**
- **Easy way** buat terima payment crypto
- Client **ga perlu ngerti crypto** (ini penting!)
- **Fast conversion** ke fiat kalau perlu
- **Professional** payment system

**Why Nova cocok:**
- Wallet Paylink: client bayar via QRIS (familiar)
- Client ga perlu install wallet atau beli crypto
- Kamu terima crypto stable (USDT) instantly
- Bisa convert ke Rupiah kapan aja via exchange

---

## 5. FITUR-FITUR DETAIL

### 5.1 Multi-Wallet Connection

**How it works:**

User connect wallet via standard Web3 methods:
- **Browser extension injection** (MetaMask, Rabby)
- **WalletConnect v2** (mobile wallets, hardware wallets)
- **Read-only mode** (import address untuk tracking aja)

**Supported wallets (launch):**
- MetaMask
- Phantom
- Trust Wallet
- Coinbase Wallet
- Rabby
- Keplr
- Rainbow
- Coin98

**Supported chains (launch):**
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- BNB Chain
- Solana
- Avalanche

**What user sees:**

```
Dashboard:
┌─ Total Portfolio ─────────────────┐
│                                   │
│  $1,247.50          +8.2% (30d)  │
│  ━━━━━━━━━━━━━━━━━━━             │
│                                   │
└───────────────────────────────────┘

┌─ Wallets (3) ────────────────────┐
│                                   │
│  MetaMask         $850.00    📈   │
│  ├─ Polygon       $500           │
│  └─ Ethereum      $350           │
│                                   │
│  Phantom          $250.00    📈   │
│  └─ Solana        $250           │
│                                   │
│  Trust Wallet     $147.50    📊   │
│  └─ BSC           $147.50        │
│                                   │
└───────────────────────────────────┘
```

**Security:**
- Nova **NEVER** stores private keys
- Transactions always signed in user's native wallet
- User can revoke permissions anytime
- All data encrypted at rest & transit

### 5.2 AI Chat Interface

**Main interface:** Chat window (think ChatGPT for crypto)

**Capabilities:**

**1. Balance Queries**
```
User: "Berapa USDT aku?"

AI: "Total USDT: 125.50
    • MetaMask (Polygon): 100 USDT
    • Trust Wallet (BSC): 25.50 USDT"
```

**2. Transfers**
```
User: "Kirim 50 USDT ke Budi"

AI: "Oke! Perlu info:
    • Address Budi?
    • Dari wallet mana? (recommend: MetaMask/Polygon)
    
    Atau kamu bisa share Paylink ke Budi,
    dia bisa bayar via QRIS nanti langsung jadi USDT"
```

**3. Swaps**
```
User: "Swap 100 USDC jadi ETH"

AI: "Checking best rates...
    
    Best option:
    • 1inch (Polygon)
    • Rate: 0.0245 ETH
    • Slippage: 0.5%
    • Gas: $0.03
    
    You'll receive: ~0.0244 ETH
    
    Proceed?"
```

**4. Gas Fee Checks**
```
User: "Gas fee Ethereum sekarang berapa?"

AI: "Ethereum gas fees:
    • Low (15 min): $2.80 (25 gwei)
    • Medium (3 min): $4.20 (35 gwei)
    • High (instant): $8.50 (65 gwei)
    
    Currently: MEDIUM for this time
    Recommend: Wait 1-2 hours for LOW"
```

**5. Portfolio Analysis**
```
User: "Gimana performa portfolio aku?"

AI: "Portfolio Summary (30 days):
    
    Total Value: $1,247.50
    Change: +$94.20 (+8.2%)
    
    Top Performers:
    • SOL: +45% 🚀
    • ETH: +12% 📈
    
    Losses:
    • SHIB: -8% 📉
    
    Recommendation: Consider taking profit
    on SOL (already up 45%)"
```

**6. Educational**
```
User: "Apa itu gas fee?"

AI: "Gas fee itu biaya yang kamu bayar
    ke network buat process transaksi.
    
    Analogi: kayak ongkos tukang pos
    buat anterin paket kamu.
    
    Kenapa bisa beda-beda?
    • Network rame = fee naik
    • Network sepi = fee turun
    
    Tips hemat gas:
    • Transaksi pas network sepi
    • Pakai L2 (Polygon/Arbitrum)
    • Batch transactions kalau bisa"
```

**Voice Input (Phase 2):**
- User bisa ngomong instead of typing
- Especially useful buat power users yang multi-tasking

### 5.3 Wallet Paylink (QRIS → Crypto)

**Step-by-step flow:**

**Step 1: Create Paylink**

```
User: "Buat paylink 100 ribu"

AI: "Oke! Mau convert ke crypto apa?
    • USDT (Recommended - stable)
    • ETH
    • SOL
    • BTC"

User: "USDT"

AI: "Perfect!
    
    Payment Details:
    • Amount: Rp 100,000
    • You'll receive: ~6.5 USDT
    • Fee: ~4.5% (Rp 4,500)
    
    Generate Paylink?"

User: "Yes"

AI: "✅ Paylink Created!
    
    [QR CODE]
    
    Link: nova.link/pay/ABC123
    
    Share ini ke siapa aja. Mereka bisa
    bayar via QRIS (BCA/BRI/Mandiri/dll)
    
    Valid 24 jam"
```

**Step 2: Payer Pays (Non-crypto user)**

Payer buka link atau scan QR:

```
┌─ Payment Page ────────────────┐
│                               │
│  Bayar ke: @yourusername      │
│  Amount: Rp 100,000           │
│                               │
│  Bayar via QRIS:              │
│  ┌─────────────┐              │
│  │  [QR CODE]  │              │
│  └─────────────┘              │
│                               │
│  Supported:                   │
│  BCA • BRI • Mandiri • Jago   │
│  GoPay • OVO • Dana           │
│                               │
│  [Buka App Banking]           │
│                               │
└───────────────────────────────┘
```

Payer scan QR di app banking mereka (literally same UX kayak bayar di warteg). Bayar Rupiah. Done.

**Step 3: Processing**

```
┌─ Processing Payment ──────────┐
│                               │
│  ✅ Payment received           │
│  ⏳ Converting to USDT...      │
│  ⏳ Sending to wallet...       │
│                               │
│  Est. 3-5 minutes             │
│                               │
└───────────────────────────────┘
```

Backend:
1. Midtrans receives Rupiah payment
2. Trigger webhook ke Nova backend
3. Nova call on-ramp provider (convert Rp → USDT)
4. Send USDT to user's wallet address
5. Notify user via push notification

**Step 4: Completed**

```
User receives notification:

"💰 Payment Received!
 
 6.5 USDT delivered to MetaMask
 
 From: +62812345XXXX
 Amount paid: Rp 100,000
 
 View transaction →"
```

**Use Cases:**

1. **Freelancer Invoice**
   - Designer kirim invoice ke client
   - Client ga ngerti crypto
   - Client bayar via BCA mobile (QRIS)
   - Designer terima USDT

2. **Marketplace Payment**
   - Seller jual NFT/item
   - Buyer ga punya crypto
   - Buyer bayar Rupiah via QRIS
   - Seller terima crypto

3. **Peer-to-peer**
   - Temen pengen kasih duit tapi dia ga punya wallet
   - Share Paylink
   - Temen bayar via GoPay
   - Kamu terima crypto

### 5.4 Transaction History & Search

**AI-Powered Search:**

```
User: "Transaksi bulan ini total berapa?"

AI: "November 2025:
    • Total transactions: 23
    • Total sent: $850
    • Total received: $420
    • Net: -$430
    • Gas fees spent: $12.50"

User: "Kapan terakhir terima dari 0xABC...?"

AI: "Last received from 0xABC...789:
    • Date: 18 Nov 2025, 14:30 WIB
    • Amount: 50 USDT (Polygon)
    • Tx: 0x7d3f2a..."
```

**Export:**
- CSV export untuk tax reporting
- Compatible dengan tools kayak Koinly, CoinTracker
- Include: date, type, amount, token, chain, fee, USD value

### 5.5 Nova AI Token Management

**Dashboard:**

```
┌─ Nova AI Balance ─────────────┐
│                               │
│  Available: 45 NOVA           │
│  Usage this month: 55 NOVA    │
│                               │
│  Estimated remaining:         │
│  ~45 more commands            │
│                               │
│  [Top Up NOVA]                │
│                               │
└───────────────────────────────┘
```

**Top-up options:**
- Crypto (instant): Pay dengan MNT/ETH/USDT
- Fiat (via Midtrans): Pay dengan QRIS/transfer bank

**Pricing:**
- Starter: 100 NOVA = $5
- Regular: 500 NOVA = $20
- Power: 2000 NOVA = $75
- Pro: 10000 NOVA = $350

**Usage tracking:**
- User bisa lihat history usage
- Detail per command berapa token kepake
- Notification kalo balance <10 NOVA

---

## 6. TEKNOLOGI & ARSITEKTUR

### 6.1 Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Web3 Integration** | viem, wagmi, RainbowKit, WalletConnect v2 |
| **Backend** | Node.js, Express, PostgreSQL |
| **AI/LLM** | OpenAI GPT-4 Turbo / Anthropic Claude 3.5 |
| **Payment Gateway** | Midtrans (QRIS/bank transfer Indonesia) |
| **On-ramp** | Transak / Alchemy Pay (untuk non-IDR) |
| **Blockchain RPC** | Alchemy, QuickNode |
| **Hosting** | Vercel (frontend), AWS/Railway (backend) |
| **Database** | PostgreSQL (primary), Redis (cache) |

### 6.2 Architecture Overview

```
┌─────────────────┐
│   USER DEVICE   │
│  (Web Browser)  │
└────────┬────────┘
         │
         │ HTTPS
         ↓
┌─────────────────┐
│   FRONTEND      │
│   (Next.js)     │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    ↓         ↓             ↓              ↓
┌────────┐ ┌──────┐  ┌──────────┐  ┌───────────┐
│MetaMask│ │Phantom│  │  Backend │  │  AI API   │
│ (EVM)  │ │(Solana│  │   API    │  │ (GPT-4)   │
└────────┘ └───────┘  └────┬─────┘  └───────────┘
                           │
                  ┌────────┴─────────┬────────────┐
                  ↓                  ↓            ↓
            ┌──────────┐      ┌──────────┐  ┌─────────┐
            │PostgreSQL│      │ Midtrans │  │Blockchain│
            │(Database)│      │ (Payment)│  │  RPCs   │
            └──────────┘      └──────────┘  └─────────┘
```

**Key Points:**

**Frontend:**
- Server-side rendering untuk SEO & performance
- Client-side Web3 connections (MetaMask, WalletConnect)
- Real-time updates via WebSocket untuk transaction status

**Backend:**
- Stateless API (horizontal scaling)
- PostgreSQL untuk persistent data (users, paylinks, transactions history)
- Redis untuk caching (AI responses, blockchain data)
- Queue system untuk async processing (paylink conversions)

**Security:**
- HTTPS only
- API rate limiting
- JWT authentication
- Private keys **NEVER** touch our servers
- Encryption at rest & transit

### 6.3 AI Integration

**LLM Selection:**
- Primary: OpenAI GPT-4 Turbo (best reasoning + function calling)
- Fallback: Anthropic Claude 3.5 Sonnet (kalo GPT down)

**Prompt Engineering:**

Kita punya system prompts yang carefully crafted:

```
System Prompt (simplified):

You are Nova AI, a helpful crypto wallet assistant.

Guidelines:
- Always respond in Bahasa Indonesia (unless user uses English)
- Explain technical concepts in simple terms
- Always validate transactions before executing
- Warn users about potential mistakes
- Be concise but friendly

When user asks to send/swap:
1. Parse intent & extract: amount, token, destination
2. Check balances & validate
3. Calculate fees
4. Present clear summary
5. Wait for confirmation
6. Execute only after explicit approval

Never:
- Execute transactions without confirmation
- Provide financial advice
- Make assumptions about addresses
```

**Function Calling:**

AI punya access ke functions:
- `getBalance(wallet, chain, token)`
- `estimateGas(chain, txData)`
- `getTokenPrice(token)`
- `validateAddress(address, chain)`
- `checkGasFees(chain)`
- `searchTransactionHistory(query)`

**Cost Optimization:**
- Cache common queries
- Batch blockchain calls
- Use cheaper models untuk simple queries
- Use GPT-4 only for complex reasoning

**Expected costs:** ~$0.002-0.01 per conversation (covered by NOVA token)

### 6.4 Payment Integration (Midtrans)

**For Wallet Paylink (QRIS):**

Flow:
1. User create Paylink → Nova generate unique payment code
2. Nova call Midtrans API create payment link
3. User share QR code (generated by Midtrans)
4. Payer scan QR → pay via QRIS/bank transfer
5. Midtrans send webhook to Nova: "payment received"
6. Nova trigger crypto conversion
7. Nova send crypto to user's wallet
8. Nova notify user

**Midtrans Integration:**
- Sandbox testing sebelum production
- Webhook security (verify signature)
- Handle failed payments (refund if conversion fails)
- Support all major Indonesian payment methods

---

## 7. MODEL BISNIS

### 7.1 Revenue Streams

**1. Nova AI Token Sales**

Primary revenue source.

- User buy NOVA token untuk pake AI
- Average user consumption: ~50-100 NOVA/month
- Price: $5 per 100 NOVA
- Margin: ~60-70% (after AI API costs)

**Projected revenue (conservative):**
- 5,000 active users
- 50% buy tokens (2,500 buyers)
- Average spend: $10/month
- Monthly revenue: **$25,000**

**2. Paylink Transaction Fee**

- Fee: 1% dari transaction value
- Midtrans fee: 3-4% (user pays separately)

**Projected revenue:**
- 1,000 Paylinks per month
- Average: Rp 200,000 ($13)
- GMV: $13,000/month
- Revenue (1%): **$130/month**

(Small initially, grows as adoption increases)

**3. Premium Features (Future)**

Phase 2 revenue:
- Advanced analytics
- API access untuk developers
- White-label solutions
- Priority support

### 7.2 Cost Structure

**Monthly operational costs (estimated):**

- Hosting & infrastructure: $500-1,000
- AI API calls: $1,000-2,000
- RPC providers: $300-500
- Midtrans/payment gateway: Variable (% of GMV)
- Team salaries: $10,000-20,000 (depending on team size)

**Total monthly costs:** ~$12,000-24,000

**Break-even:** ~5,000 active users dengan 50% conversion

### 7.3 Unit Economics

**Per user (monthly):**

Revenue:
- NOVA token: $5-10
- Paylink fee: $0.50-2

Total: $5.50-12 per user per month

Costs:
- AI API: $2-3
- Infrastructure: $0.50
- Support: $0.50

Total: $3-4 per user per month

**Gross margin:** ~50-60%

Healthy margin. Scalable.

---

## 8. ROADMAP PENGEMBANGAN

**Phase 0: Prep (2 minggu)**
- Finalize PRD
- UI/UX mockups
- Setup dev environment
- Team kickoff

**Phase 1: MVP (8 minggu)**

Minggu 1-4: Core
- Wallet connection (MetaMask, Phantom, Trust)
- Basic AI chat (balance check, simple commands)
- Dashboard (portfolio view)
- Database & backend API setup

Minggu 5-8: Transactions
- Transfer functionality
- Swap integration (1inch/Uniswap)
- Guardian AI validation layer
- Transaction history

**Milestone:** Internal alpha di testnet. Team bisa connect wallet, chat dengan AI, execute simple transactions.

**Phase 2: Full Features (6 minggu)**

Minggu 9-11: Paylink
- Midtrans integration
- Paylink creation & management
- QRIS payment flow
- Crypto conversion via on-ramp

Minggu 12-14: Polish
- UI/UX improvements
- Performance optimization
- Bug fixes
- Comprehensive testing

**Milestone:** Closed beta dengan 50-100 users di testnet. Full features available.

**Phase 3: Launch (4 minggu)**
- Security audit (optional tapi recommended)
- Mainnet deployment
- Marketing preparation
- Documentation & tutorials
- Public launch!

**Phase 4: Post-Launch (3 bulan)**
- User feedback iterations
- Feature enhancements (voice input, mobile optimization)
- More wallet integrations
- More chain support
- Community building

**Phase 5: Scale (6+ bulan)**
- Advanced features (portfolio analytics, limit orders, alerts)
- API for developers
- Mobile app (iOS/Android)
- Cross-chain expansion
- International expansion (SEA countries)

---

## 9. RISIKO & MITIGASI

### 9.1 Risiko Teknis

**AI Hallucination / Wrong Commands**

Risiko: AI salah parse command, execute wrong transaction.

Mitigasi:
- Always show summary before execution
- Require explicit user confirmation
- Guardian AI double-check
- Clear transaction preview
- User can cancel anytime

**Wallet Connection Issues**

Risiko: WalletConnect ga stable, connection drop.

Mitigasi:
- Fallback mechanisms
- Retry logic
- Clear error messages
- Multiple connection methods
- Test thoroughly dengan various wallets

**Payment Gateway Downtime**

Risiko: Midtrans down, Paylink ga jalan.

Mitigasi:
- Status page (show if payment gateway down)
- Queue failed conversions untuk retry
- Backup payment gateway (Xendit)
- Clear communication ke users

### 9.2 Risiko Bisnis

**Low Adoption**

Risiko: Product launch tapi nobody uses it.

Mitigasi:
- Strong pre-launch marketing
- Referral program
- Free NOVA tokens untuk early adopters
- Partnership dengan communities
- Focus on Indonesia market first (less competition)

**Regulatory**

Risiko: Regulations change, crypto/payment restricted.

Mitigasi:
- Monitor regulatory developments
- Legal consultation
- Compliance with existing laws
- Pivot strategy if needed
- Diversify beyond Indonesia

**Competition**

Risiko: Big player (Binance, Coinbase) launch similar product.

Mitigasi:
- Speed to market (first-mover advantage)
- Indonesia-specific features (QRIS)
- Better UX for newbies
- Community-first approach
- Continuous innovation

### 9.3 Risiko Keamanan

**Phishing Attacks**

Risiko: Fake Nova Wallet sites steal user info.

Mitigasi:
- Official domain verification
- Clear branding
- User education
- Report phishing sites quickly
- Never ask for private keys/seed phrases

**Smart Contract Vulnerabilities**

Risiko: Bug di smart contract (if we build one later).

Mitigasi:
- Thorough testing
- External audits
- Bug bounty program
- Start simple, add complexity gradually
- Emergency pause mechanisms

---

## 10. NEXT STEPS

**Immediate (Minggu 1-2):**
- ✅ PRD approved & finalized
- [ ] UI/UX design mockups (Figma)
- [ ] Setup GitHub repo & project management
- [ ] Kickoff meeting with team
- [ ] Assign roles & responsibilities

**Short-term (Bulan 1-3):**
- [ ] Build MVP (wallet connection + basic AI)
- [ ] Internal testing & iteration
- [ ] Setup testnet environment
- [ ] Get feedback from small group

**Mid-term (Bulan 4-6):**
- [ ] Complete full features (including Paylink)
- [ ] Closed beta testing (50-100 users)
- [ ] Marketing preparation
- [ ] Documentation
- [ ] Mainnet launch prep

**Success Metrics (Month 3):**
- 500+ testnet users
- >70% user satisfaction
- <30% abandonment rate
- Positive feedback on AI quality
- Paylink successfully converting Rp → crypto

---

## PENUTUP

Nova Wallet bukan cuma wallet. Ini AI assistant yang bikin crypto jadi accessible buat semua orang.

**Key Differentiators:**
- AI yang beneran helpful (bukan gimmick)
- Multi-wallet orchestration (unique positioning)
- QRIS integration (Indonesia-first)
- Guardian AI untuk prevent mistakes

**Target:** Bikin crypto experience yang **sesimpel mobile banking**.

PRD ini living document. Akan di-update based on development progress dan feedback. Let's build! 🚀

---

*Last updated: 20 November 2025*