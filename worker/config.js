/**
 * Proxy settings shared by the Worker (`worker/index.js`) and its tests.
 *
 * A separate module because the Workers runtime treats every named export of
 * the entry module as a handler and refuses to start if one is not — so
 * plain constants cannot be exported from `index.js` itself.
 */

export const PROXY_PATH = '/scalar-proxy';

/**
 * The only origins the proxy forwards to. Without this it would be an open
 * relay on our domain. Keep in step with `servers:` in `public/api.yaml` —
 * `tests/scalar-proxy.test.mjs` fails if a hosted server is missing here.
 */
export const ALLOWED_ORIGINS = new Set([
	'https://demo.consequential.io',
	'https://app.consequential.io',
]);
