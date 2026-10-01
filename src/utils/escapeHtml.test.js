import { escapeHtml } from './escapeHtml';

it('turns markup from names or AI answers into plain text', () => {
  expect(escapeHtml('Mario <img src=x onerror="alert(1)"> & co')).toBe(
    'Mario &lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; co'
  );
  expect(escapeHtml(null)).toBe('');
});
