/* VELORA AI Orkestrator: menyisipkan kartu ke tab AI Ecosystem. Dimuat setelah script utama. */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    if (document.getElementById('aiOrchestrator')) return;
    var anchor = Array.from(document.querySelectorAll('.card')).find(function (c) {
      var h = c.querySelector('h2'); return h && /Integrasi Platform/i.test(h.textContent);
    });
    if (!anchor) return;
    var card = document.createElement('div');
    card.className = 'card'; card.id = 'aiOrchestrator';
    card.innerHTML =
      '<h2>AI Orkestrator <span class="muted">Multi-agen</span></h2>' +
      '<div class="ecosystem-note" style="margin-bottom:9px;">Satu asisten yang membagi tugas ke agen: Analis Stok, Pemasaran, Desainer, dan Keuangan. Memakai URL dan token yang sama dengan AI Designer Studio.</div>' +
      '<textarea id="orcMessage" maxlength="2000" placeholder="Contoh: Stok apa yang menipis dan buatkan caption promo untuk produk terlaris"></textarea>' +
      '<div style="margin-top:8px;"><button type="button" class="btn-primary" id="btnOrcSend">Tanya Orkestrator</button></div>' +
      '<div id="orcStatus" class="designer-status" role="status" aria-live="polite"></div>' +
      '<div id="orcReply" style="white-space:pre-wrap;margin-top:8px;"></div>';
    anchor.parentNode.insertBefore(card, anchor);

    function ctx() {
      try {
        var L = [];
        (state.barang || []).slice(0, 40).forEach(function (b) { L.push('Stok: ' + b.nama + ' ' + b.stok + ' ' + (b.uom || '') + ' (batas ' + (b.limit == null ? '-' : b.limit) + ')'); });
        (state.recipes || []).slice(0, 20).forEach(function (r) { L.push('Produk: ' + r.nama + ', harga jual ' + formatRp(getRecipeTotalSellPrice(r))); });
        (state.salesLog || []).slice(-30).forEach(function (x) { L.push('Penjualan: ' + (x.namaProduk || x.nama || '?') + ' x' + (x.qty || '') + ' total ' + (x.totalHarga || '')); });
        return L.join('\n').slice(0, 5500);
      } catch (e) { return ''; }
    }
    async function send() {
      var status = document.getElementById('orcStatus'), out = document.getElementById('orcReply');
      var message = document.getElementById('orcMessage').value.trim();
      if (!message) { status.textContent = 'Tulis pertanyaan dulu.'; status.className = 'designer-status err'; return; }
      status.textContent = 'Orkestrator bekerja, mohon tunggu...'; status.className = 'designer-status'; out.textContent = '';
      try {
        var res = await fetch(designerApiUrl('/api/ai/orchestrator'), { method: 'POST', headers: designerHeaders(true), body: JSON.stringify({ message: message, context: ctx() }) });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
        out.textContent = data.reply || '(jawaban kosong)';
        status.textContent = 'Selesai' + (data.agents && data.agents.length ? ' · agen dipakai: ' + data.agents.join(', ') : ' · dijawab langsung');
        status.className = 'designer-status ok';
      } catch (e) {
        status.textContent = e instanceof TypeError ? 'Tidak bisa menjangkau server. Periksa URL, internet, dan Deployment Protection.' : e.message;
        status.className = 'designer-status err';
      }
    }
    document.getElementById('btnOrcSend').addEventListener('click', send);
  });
})();
