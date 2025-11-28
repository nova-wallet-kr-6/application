## Nova Wallet Application

Nova Wallet adalah landing + proof-of-concept untuk agentic AI multi-wallet orchestrator. Saat ini fokus pada:

- UI hero + demo transfer menggunakan Wagmi/RainbowKit.
- Chat dock di pojok kanan bawah untuk percakapan dengan Nova AI.
- Endpoint balance check yang membaca saldo wallet di Lisk Sepolia melalui RPC Blockscout.

## Persiapan

1. Install dependencies
   ```bash
   npm install
   ```
2. Buat file `.env.local` di root dengan isi:
   ```bash
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxxxxx
   # optional override RPC
   NEXT_PUBLIC_LISK_SEPOLIA_RPC=https://sepolia-rpc.lisk.com
   ```
3. Jalankan dev server
```bash
npm run dev
   ```
4. Buka `http://localhost:3000`

## Fitur Utama

- **CryptoTransfer** – connect wallet, lihat saldo, kirim transaksi dummy.
- **ChatDock** – tombol floating yang membuka jendela chat. Pesan “berapa saldo aku?” akan men-trigger call ke `/api/wallet/balance`.
- **Balance API** – berada di `app/api/wallet/balance/route.ts`, menerima `{ address, chainId }` dan mengembalikan saldo wei & ETH dari RPC Lisk Sepolia.

## Cara Menguji Alur AI Cek Saldo

1. Connect wallet ke jaringan Lisk Sepolia.
2. Klik bubble chat → tanyakan “berapa saldo aku?”.
3. Pastikan respons AI menampilkan saldo yang sama dengan card wallet (membandingkan data dari Wagmi vs RPC).

## Catatan Lain

- Redirect `/prd` → `/` diatur pada `next.config.ts`.
- Provider RainbowKit menggunakan `projectId` dari env dan akan error jika belum diset (agar konfigurasi jelas).
