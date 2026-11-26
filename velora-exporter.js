/* VELORA external export helpers — dependency-free browser module. */
(function () {
  'use strict';
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
  function csv(value) {
    const s = value == null ? '' : String(value);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function rowsForState(state) {
    const rows = [['jenis','id','nama','qty','satuan','harga_unit','harga_jual','hpp','batas_stok','tanggal','keterangan','data_json']];
    (state.barang || []).forEach(x => rows.push(['stok',x.id,x.nama,x.stok,x.uom,x.hargaUnit,'','',''+x.limit,'','','']));
    (state.stokLog || []).forEach(x => rows.push(['riwayat_stok',x.id || '',x.nama || x.namaBarang || '',x.qty,x.uom || '', '', '', '', '', x.waktu || x.createdAt || '', x.keterangan || x.catatan || '', JSON.stringify(x)]));
    (state.recipes || []).forEach(x => rows.push(['produk',x.id,x.nama,'','', '',x.hargaJual || '',x.hpp || '', '', '', '',JSON.stringify(x)]));
    (state.salesLog || []).forEach(x => rows.push(['penjualan',x.id || '',x.namaProduk || x.nama || '',x.qty || '',x.uom || '', '',x.totalHarga || '', '', '',x.waktu || x.createdAt || '',x.keterangan || '',JSON.stringify(x)]));
    return rows;
  }
  window.VeloraExternalExporter = {
    exportJson(state) {
      const payload = { app: 'VELORA', exportedAt: new Date().toISOString(), data: state };
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }), `velora-backup-${stamp()}.json`);
    },
    exportCsv(state) {
      const content = '\ufeff' + rowsForState(state).map(row => row.map(csv).join(',')).join('\r\n');
      downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), `velora-data-${stamp()}.csv`);
    },
    exportExcel(state) {
      const rows = rowsForState(state);
      const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1">' +
        rows.map((row, i) => '<tr>' + row.map(cell => `<${i === 0 ? 'th' : 'td'}>${String(cell == null ? '' : cell).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</${i === 0 ? 'th' : 'td'}>`).join('') + '</tr>').join('') +
        '</table></body></html>';
      downloadBlob(new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }), `velora-data-${stamp()}.xls`);
    }
  };
})();
