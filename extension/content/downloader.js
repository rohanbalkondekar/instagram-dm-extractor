/**
 * Blob-based file download utility.
 * Shared execution context with other content scripts.
 */

/* exported ChatDownloader */
// eslint-disable-next-line no-var
var ChatDownloader = (() => {
  'use strict';

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, filename, 'application/json');
  }

  function downloadMarkdown(text, filename) {
    downloadFile(text, filename, 'text/markdown');
  }

  function downloadHtml(html, filename) {
    downloadFile(html, filename, 'text/html;charset=utf-8');
  }

  function downloadCsv(csv, filename) {
    downloadFile(csv, filename, 'text/csv;charset=utf-8');
  }

  return { downloadFile, downloadJson, downloadMarkdown, downloadHtml, downloadCsv };
})();
