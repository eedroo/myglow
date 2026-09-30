'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import type { MagicIconName } from '@/lib/icons';
import { saveNotificationPrefs } from '@/actions/notifications';
import { removePushSubscription, sendTestNotification, type DeviceInfo } from '@/actions/push';
import { currentSubscription, detectPushSupport, subscribePush, unsubscribePush, type PushSupport } from '@/lib/push/client';
import type { NotificationPrefsData } from '@/lib/validation/notifications';
import { InstallButton } from './InstallButton';
import { InstallGuide } from './InstallGuide';

const TIMES = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

type DailyKey = 'morning' | 'body' | 'night';
const DAILY: { key: DailyKey; icon: MagicIconName }[] = [
  { key: 'morning', icon: 'sun' },
  { key: 'body', icon: 'stretch' },
  { key: 'night', icon: 'moon-crescent' },
];
type PeriodKey = 'weekStart' | 'weekEnd' | 'monthStart' | 'monthEnd';
const PERIODS: { key: PeriodKey; icon: MagicIconName }[] = [
  { key: 'weekStart', icon: 'calendar' },
  { key: 'weekEnd', icon: 'journal' },
  { key: 'monthStart', icon: 'moon-stars' },
  { key: 'monthEnd', icon: 'scroll' },
];

/** "Chrome · Android", "Safari · iPhone"… (nomes próprios, sem tradução). */
function deviceLabel(ua: string | null): string {
  if (!ua) return '—';
  const os = /iPhone|iPad/.test(ua) ? (/iPad/.test(ua) ? 'iPad' : 'iPhone') : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [browser, os].filter(Boolean).join(' · ') || '—';
}

type Msg = { key: string; error?: boolean } | null;

interface NotificationSettingsProps {
  initial: NotificationPrefsData;
  devices: DeviceInfo[];
  pushConfigured: boolean;
}

export function NotificationSettings({ initial, devices, pushConfigured }: NotificationSettingsProps) {
  const t = useTranslations();
  const router = useRouter();
  const [prefs, setPrefs] = useState(initial);
  const [prefsMsg, setPrefsMsg] = useState<Msg>(null);
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deviceMsg, setDeviceMsg] = useState<Msg>(null);

  useEffect(() => {
    setSupport(detectPushSupport());
    void currentSubscription().then((s) => setEndpoint(s?.endpoint ?? null));
  }, []);

  const update = async (patch: Partial<NotificationPrefsData>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    const res = await saveNotificationPrefs(next);
    setPrefsMsg(res.ok ? { key: 'notifications.settings.saved' } : { key: res.error, error: true });
  };

  const enableDevice = async () => {
    setBusy(true);
    setDeviceMsg(null);
    const ok = await subscribePush();
    setSupport(detectPushSupport());
    const s = await currentSubscription();
    setEndpoint(s?.endpoint ?? null);
    if (!ok) setDeviceMsg({ key: detectPushSupport() === 'denied' ? 'notifications.settings.denied' : 'notifications.prompt.error', error: true });
    setBusy(false);
    router.refresh();
  };

  const disableDevice = async () => {
    setBusy(true);
    await unsubscribePush();
    setEndpoint(null);
    setBusy(false);
    router.refresh();
  };

  const remove = async (e: string) => {
    await removePushSubscription(e);
    if (e === endpoint) setEndpoint(null);
    router.refresh();
  };

  const test = async () => {
    setBusy(true);
    const res = await sendTestNotification();
    setBusy(false);
    if (!res.ok) return setDeviceMsg({ key: res.error, error: true });
    if (!res.configured) return setDeviceMsg({ key: 'notifications.settings.pushUnavailable' });
    if (res.sent > 0) return setDeviceMsg({ key: 'notifications.settings.testSent' });
    setDeviceMsg(res.devices === 0 ? { key: 'notifications.settings.testNone' } : { key: 'notifications.settings.testFailed', error: true });
  };

  const label = (key: string) => t(`notifications.settings.${key}` as 'notifications.settings.morning');

  return (
    <div className="mg-notify-settings">
      <CheckChip icon="sparkles" label={label('enabled')} checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      <p className="mg-notify-settings__status">{label('hint')}</p>

      <fieldset className="mg-notify-settings__section" disabled={!prefs.enabled}>
        <legend className="mg-notify-settings__label">{label('daily')}</legend>
        {DAILY.map(({ key, icon }) => {
          const timeKey = `${key}Time` as const;
          const onKey = `${key}Enabled` as const;
          return (
            <div key={key} className="mg-notify-settings__row">
              <CheckChip icon={icon} label={label(key)} checked={prefs[onKey]} onCheckedChange={(v) => update({ [onKey]: v })} />
              <label className="mg-visually-hidden" htmlFor={`notify-${key}-time`}>
                {t('notifications.settings.time', { label: label(key) })}
              </label>
              <select
                id={`notify-${key}-time`}
                className="mg-select mg-notify-settings__time"
                value={prefs[timeKey]}
                disabled={!prefs[onKey]}
                onChange={(e) => update({ [timeKey]: e.target.value })}
              >
                {TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>

      <fieldset className="mg-notify-settings__section" disabled={!prefs.enabled}>
        <legend className="mg-notify-settings__label">{label('periods')}</legend>
        {PERIODS.map(({ key, icon }) => (
          <CheckChip key={key} icon={icon} label={label(key)} checked={prefs[key]} onCheckedChange={(v) => update({ [key]: v })} />
        ))}
        <CheckChip icon="flame" label={label('lastCall')} checked={prefs.lastCall} onCheckedChange={(v) => update({ lastCall: v })} />
        <p className="mg-notify-settings__status">{label('lastCallHint')}</p>
      </fieldset>
      {prefsMsg && (
        <p className={prefsMsg.error ? 'mg-notify-settings__status mg-notify-settings__status--error' : 'mg-notify-settings__status'} role="status">
          {t(prefsMsg.key)}
        </p>
      )}

      <section className="mg-notify-settings__section mg-notify-settings__device" aria-labelledby="notify-device-title">
        <h3 id="notify-device-title" className="mg-notify-settings__label">
          {label('device')}
        </h3>
        {!pushConfigured && <p className="mg-notify-settings__status">{label('pushUnavailable')}</p>}
        {support === 'ios-needs-install' && <InstallGuide />}
        {support === 'unsupported' && <p className="mg-notify-settings__status">{label('unsupported')}</p>}
        {support === 'denied' && <p className="mg-notify-settings__status">{label('denied')}</p>}
        {support === 'supported' && (
          <>
            <p className="mg-notify-settings__status">{endpoint ? label('deviceOn') : label('deviceOff')}</p>
            <div className="mg-notify-settings__row">
              {endpoint ? (
                <Button variant="ghost" onClick={disableDevice} loading={busy}>
                  {label('disableDevice')}
                </Button>
              ) : (
                <Button onClick={enableDevice} loading={busy}>
                  {label('enableDevice')}
                </Button>
              )}
              <Button variant="subtle" onClick={test} disabled={busy}>
                {label('test')}
              </Button>
            </div>
          </>
        )}
        {deviceMsg && (
          <p className={deviceMsg.error ? 'mg-notify-settings__status mg-notify-settings__status--error' : 'mg-notify-settings__status'} role="status" aria-live="polite">
            {t(deviceMsg.key)}
          </p>
        )}
        <InstallButton />
      </section>

      <section className="mg-notify-settings__section" aria-labelledby="notify-devices-title">
        <h3 id="notify-devices-title" className="mg-notify-settings__label">
          {label('devices')}
        </h3>
        {devices.length === 0 ? (
          <p className="mg-notify-settings__status">{label('noDevices')}</p>
        ) : (
          <ul className="mg-notify-settings__devices">
            {devices.map((d) => (
              <li key={d.endpoint}>
                <span>
                  {deviceLabel(d.userAgent)}
                  {d.endpoint === endpoint && ` · ${label('device')}`}
                </span>
                <Button variant="subtle" onClick={() => remove(d.endpoint)}>
                  {label('remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
