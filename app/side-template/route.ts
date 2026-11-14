// Bundle the exact checkout's sources. A branch preview must never fetch main.
import sourceHTML from '../../side-template/index.html?raw';
import curves from '../../side-template/om-curves.js?raw';
import tuning from '../../side-template/curve-tuning.js?raw';
import upper from '../../side-template/upper-curve-handles.js?raw';
import presets from '../../side-template/presets.js?raw';
import defaults from '../../side-template/defaults.js?raw';
import dxf from '../../side-template/om-dxf.js?raw';
import dread from '../../side-template/dread-pdf.js?raw';
import plan00 from '../../side-template/plan00-reference.js?raw';
import developed from '../../side-template/developed-side.js?raw';
import printFix from '../../side-template/print-fix.js?raw';

export async function GET() {
  // Preset-aware reset loads before legacy defaults. Geometry precedes print.
  const scripts = [curves, tuning, upper, presets, defaults, dxf, dread, plan00, developed, printFix];
  const closingBody = sourceHTML.lastIndexOf('</body>');
  if (closingBody < 0 || scripts.some(script => !script.trim())) {
    return new Response('Side Template Generator is temporarily unavailable.', { status: 502 });
  }
  const html = sourceHTML.slice(0, closingBody) +
    scripts.map(script => `<script>${script.replace(/<\/script/gi, '<\\/script')}</script>`).join('') +
    sourceHTML.slice(closingBody);
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
    },
  });
}
