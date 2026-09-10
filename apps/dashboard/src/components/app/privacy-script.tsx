import { InlineScript } from "./inline-script";

const SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('privacy');
    var mode = stored === 'hidden' ? 'hidden' : 'visible';
    document.documentElement.setAttribute('data-privacy', mode);
  } catch (e) {
    document.documentElement.setAttribute('data-privacy', 'visible');
  }
})();
`;

export function PrivacyScript() {
  return <InlineScript html={SCRIPT} />;
}
