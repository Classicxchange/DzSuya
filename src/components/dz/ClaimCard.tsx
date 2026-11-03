import { useEffect, useState } from 'react'
import { useModal } from 'connectkit'
import { AtSign, Check, Copy, Loader2, Share2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { Logo } from '@/components/Logo'
import { useDebounced, useMyDzName, useNameOwner } from '@/hooks/useDzId'
import { useClaimName } from '@/hooks/useDzActions'
import { DZID_ADDRESS, displayName, nameProblem, normalizeName } from '@/lib/dzid'
import { shortAddr } from '@/lib/format'
import { buildShareLink } from '@/lib/share'

export function ClaimCard() {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const { name: myName, isLoading, isError: nameError, refetch: refetchName } = useMyDzName(address)
  const [draft, setDraft] = useState('')
  const name = normalizeName(draft)
  const debounced = useDebounced(name)
  const problem = nameProblem(name)
  const lookup = useNameOwner(debounced)
  const { claim, busy, phase, error } = useClaimName()
  const [link, setLink] = useState<string | null>(null)

  useEffect(() => {
    if (!myName) return
    let alive = true
    void buildShareLink(`/?pay=${myName}`).then((url) => alive && setLink(url))
    return () => {
      alive = false
    }
  }, [myName])

  const checking = !problem && name.length >= 3 && (name !== debounced || lookup.isFetching)
  const taken = !problem && name === debounced && lookup.isTaken
  const available = !problem && name === debounced && name.length >= 3 && !checking && !taken && lookup.data !== undefined

  if (!DZID_ADDRESS) {
    return <div className="surface rounded-3xl p-5 text-sm text-cream-300">DZ ID is not connected yet.</div>
  }

  if (!isConnected) {
    return (
      <section className="surface rounded-3xl p-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-ember-500/15 text-ember-400">
          <AtSign className="size-6" />
        </span>
        <h2 className="display mt-3 text-xl font-bold text-cream-50">Claim your DZ ID</h2>
        <p className="mx-auto mt-1 max-w-[32ch] text-sm text-cream-300 text-pretty">
          Get a short name that points to your wallet, so people can pay you without typing an address.
        </p>
        <button onClick={() => setOpen(true)} className="btn-primary focus-ring mt-4 min-h-[52px] rounded-2xl px-6 text-sm">
          Connect wallet
        </button>
      </section>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-10 text-ember-400">
        <Loader2 className="size-6 animate-spin" />
      </div>
    )
  }

  if (nameError && !myName) {
    return (
      <section className="surface rounded-3xl p-5 text-center">
        <p className="text-sm text-cream-200">Could not check your DZ ID right now.</p>
        <button onClick={() => void refetchName()} className="btn-ghost focus-ring mt-3 min-h-[48px] rounded-2xl px-5 text-sm">
          Try again
        </button>
      </section>
    )
  }

  if (myName) {
    const copy = async () => {
      if (!link) return
      try {
        await navigator.clipboard.writeText(link)
        toast.success('Payment link copied')
      } catch {
        toast.error('Could not copy the link.')
      }
    }
    const share = async () => {
      if (!link) return
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: `Pay ${displayName(myName)} on DzSuya`, url: link })
          return
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return
        }
      }
      await copy()
    }
    return (
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ember-500 via-ember-600 to-chili-600 p-5 shadow-glow">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-gold-400/30 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <span className="eyebrow text-coal-950/80">Your DZ ID</span>
          <Logo size={34} />
        </div>
        <div className="display relative mt-6 break-all text-4xl font-bold tracking-tight text-cream-50">{displayName(myName)}</div>
        <div className="relative mt-1 font-mono text-xs text-cream-100/85">{address ? shortAddr(address) : ''}</div>
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={() => void copy()}
            disabled={!link}
            className="focus-ring flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-black/25 text-sm font-semibold text-cream-50 backdrop-blur"
          >
            <Copy className="size-4" /> Copy pay link
          </button>
          <button
            onClick={() => void share()}
            disabled={!link}
            className="focus-ring flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-cream-50 text-sm font-bold text-coal-950"
          >
            <Share2 className="size-4" /> Share
          </button>
        </div>
      </section>
    )
  }

  const onClaim = async () => {
    if (!available) return
    const ok = await claim(name)
    if (ok) {
      toast.success(`${displayName(name)} is yours`)
      setDraft('')
    }
  }

  return (
    <section className="surface rounded-3xl p-5">
      <div className="eyebrow text-ember-400">DZ ID</div>
      <h2 className="display mt-1 text-2xl font-bold text-cream-50">Claim your name</h2>
      <p className="mt-1 text-sm text-cream-300 text-pretty">
        One name per wallet, yours alone and permanent. Claiming takes two quick wallet confirmations so nobody can grab your name first.
      </p>

      <label htmlFor="dz-claim" className="sr-only">
        Choose a DZ ID
      </label>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 focus-within:border-ember-500">
        <span className="display text-xl font-bold text-ember-400">@</span>
        <input
          id="dz-claim"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={21}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yourname"
          disabled={busy}
          className="min-h-[56px] w-full bg-transparent text-lg font-semibold text-cream-50 outline-none placeholder:text-cream-300/40"
        />
        <span className="shrink-0">
          {checking && <Loader2 className="size-5 animate-spin text-cream-300" />}
          {available && <Check className="size-5 text-leaf-400" />}
          {(taken || (problem && name.length > 0)) && <X className="size-5 text-chili-500" />}
        </span>
      </div>
      <p className="mt-2 min-h-5 text-xs" role="status">
        {problem && name.length > 0 && <span className="text-chili-500">{problem}</span>}
        {taken && <span className="text-chili-500">{displayName(name)} is already taken.</span>}
        {available && <span className="text-leaf-400">{displayName(name)} is available.</span>}
        {!name && <span className="text-cream-300">3 to 20 characters: letters, numbers, underscore.</span>}
      </p>

      {error && (
        <div role="alert" className="mt-2 rounded-xl bg-chili-500/15 p-3 text-sm text-cream-50">
          {error}
        </div>
      )}

      <button
        onClick={() => void onClaim()}
        disabled={!available || busy}
        className="btn-primary focus-ring mt-3 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl text-base"
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        {phase === 'checking'
          ? 'Checking…'
          : phase === 'switching'
            ? 'Switching network…'
            : phase === 'committing'
              ? 'Step 1 of 2: confirm in your wallet…'
              : phase === 'commit-confirm'
                ? 'Reserving your name…'
                : phase === 'waiting'
                  ? 'Securing your name…'
                  : phase === 'wallet'
                    ? 'Step 2 of 2: confirm in your wallet…'
                    : phase === 'confirming'
                      ? 'Claiming…'
                      : available
                        ? `Claim ${displayName(name)}`
                        : 'Pick an available name'}
      </button>
    </section>
  )
}
