import { CryptoTransfer } from '@/components/CryptoTransfer';
import { Providers } from './providers';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 font-sans">
      <Providers>
        <CryptoTransfer />
      </Providers>
    </div>
  );
}