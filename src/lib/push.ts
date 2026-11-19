import { supabase } from './supabase'
import { t } from './i18n'

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const key = (b64: string) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function currentSubscription() {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function enablePush(userId: string) {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error(t('push.denied'))
  const { data, error } = await supabase.functions.invoke('send-expiry-push', { body: { action: 'public-key' } })
  if (error || !data?.publicKey) throw new Error(t('push.noKey'))
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(data.publicKey) as BufferSource })
  const j = sub.toJSON()
  const { error: e } = await supabase.from('push_subscriptions').upsert({ endpoint: j.endpoint, user_id: userId, keys: j.keys }, { onConflict: 'endpoint' })
  if (e) throw new Error(e.message)
}

export async function disablePush() {
  const sub = await currentSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export async function testPush(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('send-expiry-push', { body: { action: 'test' } })
  if (error) return t('push.testFail')
  return data?.sent ? t('push.testSent') : t('push.testNotDelivered')
}
