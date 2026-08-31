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
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
