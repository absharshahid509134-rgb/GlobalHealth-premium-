import React from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Shown when a stored session could not be verified because the network or the
 * server was unavailable. The session is kept (not signed out) and private
 * content stays hidden until the server confirms it.
 */
export function SessionRestoreRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="grid min-h-[60dvh] place-items-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <WifiOff className="mx-auto h-10 w-10 text-medical-700" aria-hidden="true" />
        <h2 className="text-xl font-bold text-slate-900">We could not reach GlobalHealth</h2>
        <p className="text-sm text-slate-600">
          Your sign-in is still saved on this device. Check your connection and try again — you will not be signed out.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-medical-700 px-5 py-3 font-semibold text-white hover:bg-medical-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-medical-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
