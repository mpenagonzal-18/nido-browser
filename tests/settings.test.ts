import { describe, expect, it } from 'vitest';
import { defaults, SettingsSchema } from '../src/shared/settings';
describe('ajustes', () => {
  it('usa privacidad estricta y proveedores aislados por defecto', () => {
    const s = defaults();
    expect(s.historyEnabled).toBe(false);
    expect(s.allowSessionCookies).toBe(false);
    expect(s.music.remember).toBe(false);
    expect(s.providers).toHaveLength(5);
  });
  it('admite un roundtrip JSON completo', () => {
    const s = defaults();
    s.accent = '#123456';
    s.providers.reverse();
    expect(SettingsSchema.parse(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it.each([
    { accent: 'url(https://evil)' },
    { sidebarWidth: 1 },
    { suspendMinutes: 0 },
    { providers: [{ id: 'x', name: 'x', url: 'file:///etc/passwd' }] },
    {
      providers: [
        { id: 'x', name: 'x', url: 'https://a.test' },
        { id: 'x', name: 'y', url: 'https://b.test' },
      ],
    },
  ])('rechaza configuración inválida %j', (value) => {
    expect(SettingsSchema.safeParse(value).success).toBe(false);
  });
});
