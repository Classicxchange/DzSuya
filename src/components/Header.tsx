import { ConnectKitButton } from 'connectkit'
import { AlertTriangle, Wallet } from 'lucide-react'
import { useAccount, useSwitchChain } from 'wagmi'
import { TokenUSDC } from '@web3icons/react'
import { Logo } from '@/components/Logo'
import { useMyDzName } from '@/hooks/useDzId'
import { useUsdcBalance } from '@/hooks/useShop'
import { CHAIN_ID } from '@/lib/chain'
import { shortAddr } from '@/lib/format'
import { Amount, usdcDecimalsFor } from '@/onchain-money'

export function Header({ onHome }: { onHome: () => void }) {
  const { address, chainId, isConnected } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const { data: balance } = useUsdcBalance(address)
  const { name: dzName } = useMyDzName(address)
  const wrongChain = isConnected && chainId !== CHAIN_ID

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-coal-900/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        <button onClick={onHome} aria-label="DzSuya homepage" className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-full text-left">
          <Logo size={42} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="display block truncate text-xl font-bold text-cream-50">
              Dz<span className="text-ember-400">Suya</span>
            </span>
            <span className="eyebrow block text-gold-400">Professor Dozzie's · Woji Rd</span>
          </span>
        </button>
        <ConnectKitButton.Custom>
          {({ isConnected: connected, show, address: addr }) => {
            if (wrongChain) {
              return (
                <button
                  onClick={() => switchChain({ chainId: CHAIN_ID })}
                  disabled={isPending}
                  className="focus-ring flex h-11 items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 text-sm font-semibold text-gold-300"
                >
                  <AlertTriangle className="size-4" />
                  {isPending ? 'Switching…' : 'Switch to Arc'}
                </button>
              )
            }
            return (
              <button
                onClick={show}
                className="btn-ghost focus-ring flex h-11 items-center gap-2 rounded-full px-3.5 text-sm"
              >
                {connected && addr ? (
                  <>
                    <TokenUSDC variant="branded" size={18} />
                    <span className="tabular-nums">
                      {balance !== undefined ? Amount.fromRaw(balance, usdcDecimalsFor(CHAIN_ID)).toFixed(2) : '–'}
                    </span>
                    <span className="hidden font-mono text-xs text-cream-300 min-[380px]:inline">{dzName ? `@${dzName}` : shortAddr(addr)}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="size-4" />
                    Connect
                  </>
                )}
              </button>
            )
          }}
        </ConnectKitButton.Custom>
      </div>
    </header>
  )
}
