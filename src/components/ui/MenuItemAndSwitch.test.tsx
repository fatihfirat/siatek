import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ToggleSwitch, MenuItem, Modal } from './index';
import { Sparkles, Trash2, ArrowRight } from 'lucide-react';

describe('Ortak UI Bileşenleri — ToggleSwitch, MenuItem ve Modal Testleri', () => {
  describe('1. ToggleSwitch Bileşeni', () => {
    it('Label ve açıklama metnini semantik olarak doğru render eder', () => {
      const html = renderToString(
        <ToggleSwitch
          id="test-switch"
          label="Koyu tema"
          description="Arayüz renk modu"
          checked={true}
          onChange={() => {}}
        />
      );

      expect(html).toContain('Koyu tema');
      expect(html).toContain('Arayüz renk modu');
      expect(html).toContain('role="switch"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('checked=""');
      expect(html).toContain('ui-toggle-switch');
      expect(html).toContain('ui-toggle-switch-track');
      expect(html).toContain('ui-toggle-switch-thumb');
    });

    it('Kapalı (false) ve devre dışı (disabled) durumlarını doğru yansıtır', () => {
      const html = renderToString(
        <ToggleSwitch
          label="Bildirim sesi"
          checked={false}
          disabled={true}
          onChange={() => {}}
        />
      );

      expect(html).toContain('aria-checked="false"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('is-disabled');
    });
  });

  describe('2. MenuItem Bileşeni', () => {
    it('İkon, etiket, açıklama ve rozeti kapsayıcı kart yapısıyla render eder', () => {
      const html = renderToString(
        <MenuItem
          icon={<Sparkles aria-hidden="true" />}
          label="Yardımcı"
          description="AI Asistanı Masası"
          badge="Yeni"
          rightElement={<ArrowRight aria-hidden="true" />}
        />
      );

      expect(html).toContain('Yardımcı');
      expect(html).toContain('AI Asistanı Masası');
      expect(html).toContain('Yeni');
      expect(html).toContain('ui-menu-item');
      expect(html).toContain('ui-menu-item-icon');
      expect(html).toContain('ui-menu-item-body');
      expect(html).toContain('ui-menu-item-badge');
      expect(html).toContain('ui-menu-item-right');
    });

    it('Danger varyantı ve disabled durumunu destekler', () => {
      const html = renderToString(
        <MenuItem
          icon={<Trash2 aria-hidden="true" />}
          label="Çıkış yap"
          variant="danger"
          disabled={true}
        />
      );

      expect(html).toContain('Çıkış yap');
      expect(html).toContain('ui-menu-item-danger');
      expect(html).toContain('disabled=""');
    });
  });

  describe('3. Modal Bileşeni ve Boyutlandırma', () => {
    it('size="small" ve footer prop ile dialog yapısını eksiksiz render eder', () => {
      const html = renderToString(
        <Modal
          open={true}
          onClose={() => {}}
          title="Hesap ve tercihler"
          size="small"
          footer={<button type="button">Çıkış yap</button>}
        >
          <div>Modal İçeriği</div>
        </Modal>
      );

      expect(html).toContain('Hesap ve tercihler');
      expect(html).toContain('data-size="small"');
      expect(html).toContain('ui-dialog-body');
      expect(html).toContain('Modal İçeriği');
      expect(html).toContain('Çıkış yap');
      expect(html).toContain('<footer>');
    });
  });
});
