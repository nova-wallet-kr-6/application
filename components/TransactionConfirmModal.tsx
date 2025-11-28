import React from "react";

export interface TransactionPreviewData {
	success: boolean;
	preview: {
		fromAddress: string;
		toAddress: string;
		amount: number;
		amountFormatted: string;
		tokenSymbol: string;
		chainId: number;
		chainName: string;
		gasEstimate: string;
		totalEstimate: string;
	};
	validations: {
		hasBalance: boolean;
		issues: string[];
	};
}

interface TransactionConfirmModalProps {
	open: boolean;
	preview: TransactionPreviewData | null;
	onConfirm: () => void;
	onCancel: () => void;
	isProcessing: boolean;
	error?: string;
}

export const TransactionConfirmModal: React.FC<TransactionConfirmModalProps> = ({
	open,
	preview,
	onConfirm,
	onCancel,
	isProcessing,
	error,
}) => {
	if (!open || !preview) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 px-4">
			<div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-2xl">
				<div className="mb-4">
					<h3 className="text-lg font-semibold">Konfirmasi Transaksi</h3>
					<p className="text-sm text-slate-400">
						{preview.preview.chainName}
					</p>
				</div>

				<div className="space-y-3 rounded-2xl bg-slate-800/70 p-4 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Jumlah</span>
						<span className="font-semibold text-slate-50">
							{preview.preview.amountFormatted}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Penerima</span>
						<span className="font-mono text-[11px] text-slate-100">
							{preview.preview.toAddress}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Perkiraan Gas</span>
						<span className="text-slate-100">
							{preview.preview.gasEstimate}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-slate-400">Perkiraan Total</span>
						<span className="text-slate-100">
							{preview.preview.totalEstimate}
						</span>
					</div>
				</div>

				{preview.validations.issues.length > 0 && (
					<div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
						<p className="font-semibold mb-2">Perlu diperhatikan:</p>
						<ul className="list-disc space-y-1 pl-4">
							{preview.validations.issues.map((issue) => (
								<li key={issue}>{issue}</li>
							))}
						</ul>
					</div>
				)}

				{error && (
					<p className="mt-3 rounded-2xl bg-red-500/10 px-3 py-2 text-sm text-red-200">
						{error}
					</p>
				)}

				<div className="mt-6 flex flex-col gap-3 sm:flex-row">
					<button
						onClick={onCancel}
						className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
						disabled={isProcessing}
					>
						Batal
					</button>
					<button
						onClick={onConfirm}
						disabled={!preview.success || isProcessing}
						className="flex-1 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{isProcessing ? "Mengirim..." : "Konfirmasi & Kirim"}
					</button>
				</div>
			</div>
		</div>
	);
};

